import React, { useEffect, useMemo, useRef, useState } from "react";
import { SiteAgent } from "@/entities/SiteAgent";
import { SiteAgentLog } from "@/entities/SiteAgentLog";
import { InvokeLLM } from "@/integrations/Core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, Play, Square, RefreshCw, Globe, Clock, List, Sword } from "lucide-react";
import { MathBook } from "@/entities/MathBook";
import { TrainedAI } from "@/entities/TrainedAI";
import { TrainingJob } from "@/entities/TrainingJob";
import { AIChunk } from "@/entities/AIChunk";
import { AIAsset } from "@/entities/AIAsset";
import { MarketplaceListing } from "@/entities/MarketplaceListing";
import { ConversationSession } from "@/entities/ConversationSession";
import { ConversationMessage } from "@/entities/ConversationMessage";
import { base44 } from "@/api/base44Client";
import { recordTransfer, rewardIndexing, rewardContentGeneration, chargeChatUsage, rewardCollectorYield, processMarketplacePurchase, harvestAgent, SYSTEM_EMAIL } from "@/components/economy/Economy";

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const withRetry = async (fn, maxRetries = 4, baseDelay = 800) => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      const msg = String(e || "");
      const isRate = msg.includes("429") || msg.toLowerCase().includes("rate") || msg.toLowerCase().includes("too many");
      if (!isRate || attempt === maxRetries) throw e;
      const delay = baseDelay * Math.pow(2, attempt);
      await sleep(delay);
    }
  }
};

function prettyDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
}

export default function AgentsPage() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [wallets, setWallets] = useState({});

  // form state
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("");
  const [intervalSec, setIntervalSec] = useState(300);
  const [researchEnabled, setResearchEnabled] = useState(true);
  const [devEnabled, setDevEnabled] = useState(true);
  const [refineEnabled, setRefineEnabled] = useState(true);

  // per-agent runtime controls
  const timersRef = useRef({}); // id -> interval id
  const runningRef = useRef(new Set()); // ids currently running to prevent overlap
  const nextAllowedRef = useRef({}); // id -> timestamp when next tick allowed

  const load = async () => {
    setLoading(true);
    try {
      const list = await withRetry(() => SiteAgent.list("-updated_date", 100), 3, 800);
      setAgents(list);
      // Load agent wallets
      try {
        const W = base44.entities.AgentWallet;
        const wl = W.list ? await W.list("-updated_date", 500) : await W.filter({}, "-updated_date", 500);
        const m = {};
        (wl || []).forEach(w => { if (w.agent_id) m[w.agent_id] = w; });
        setWallets(m);
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const createAgent = async () => {
            if (!name.trim() || !objective.trim()) return;
            setCreating(true);
            try {
              const created = await SiteAgent.create({
                name: name.trim(),
                objective: objective.trim(),
                loop_enabled: false,
                loop_interval_seconds: Math.max(30, Number(intervalSec) || 300),
                research_enabled: !!researchEnabled,
                dev_enabled: !!devEnabled,
                refine_enabled: !!refineEnabled,
                status: "idle",
                ticks_count: 0
              });
              // Auto-tokenize agent with weapon icon
              try {
                const me = await base44.auth.me();
                const myEmail = (me?.email || '').toLowerCase();
                const makeSymbol = (nm) => {
                  const letters = (nm || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
                  if (letters.length >= 3) return letters.slice(0, 6);
                  const base = (nm || 'AGT').toUpperCase().replace(/[^A-Z]/g, '');
                  return (base + 'TOK').slice(0, 6) || 'AGTOK';
                };
                let icon_url = null;
                try {
                  const img = await base44.integrations.Core.GenerateImage({
                    prompt: `fantasy weapon emblem icon, forged steel, runes, arcane glow, 2D flat, centered, no text, for agent ${created.name}`
                  });
                  icon_url = img?.url || null;
                } catch {}
                await base44.entities.AgentAsset.create({
                  agent_id: created.id,
                  name: created.name,
                  symbol: makeSymbol(created.name),
                  owner_email: myEmail,
                  transferable: true,
                  total_supply: 1,
                  royalty_bps: 0,
                  ...(icon_url ? { icon_url } : {})
                });
              } catch {}

              setName(""); setObjective(""); setIntervalSec(300);
              setResearchEnabled(true); setDevEnabled(true); setRefineEnabled(true);
              await load();
            } finally {
              setCreating(false);
            }
          };

  // start/stop loop by updating entity + local timer
  const startLoop = async (agent) => {
    const interval = Math.max(30, Number(agent.loop_interval_seconds) || 300) * 1000;
    await withRetry(() => SiteAgent.update(agent.id, { loop_enabled: true, status: "idle" }), 2, 600);
    nextAllowedRef.current[agent.id] = 0;
    // clear existing
    if (timersRef.current[agent.id]) clearInterval(timersRef.current[agent.id]);
    // set interval
    timersRef.current[agent.id] = setInterval(() => runTickGuarded(agent.id), interval);
    setAgents((prev) => prev.map(a => a.id === agent.id ? { ...a, loop_enabled: true } : a));
    // run immediately once
    await runTickGuarded(agent.id, true);
  };

  const stopLoop = async (agent) => {
    await withRetry(() => SiteAgent.update(agent.id, { loop_enabled: false }), 2, 600);
    if (timersRef.current[agent.id]) {
      clearInterval(timersRef.current[agent.id]);
      delete timersRef.current[agent.id];
    }
    setAgents((prev) => prev.map(a => a.id === agent.id ? { ...a, loop_enabled: false } : a));
  };

  const runOnce = async (agent) => {
    await runTickGuarded(agent.id, true);
  };

  const harvest = async (agent) => {
    await harvestAgent({ agentId: agent.id });
    await load();
  };

  const runTickGuarded = async (agentId, force = false) => {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return;
    const now = Date.now();
    const minGap = Math.max(30, Number(agent.loop_interval_seconds) || 300) * 1000;
    const nextAllowed = nextAllowedRef.current[agentId] || 0;
    if (!force && now < nextAllowed) return;
    if (runningRef.current.has(agentId)) return;
    runningRef.current.add(agentId);
    try {
      await SiteAgent.update(agentId, { status: "running" });
      await runAgentTick(agent);
      await SiteAgent.update(agentId, { status: "idle", ticks_count: (agent.ticks_count || 0) + 1, last_run_at: new Date().toISOString() });
      setAgents((prev) => prev.map(a => a.id === agentId ? { ...a, status: "idle", ticks_count: (a.ticks_count || 0) + 1, last_run_at: new Date().toISOString() } : a));
      nextAllowedRef.current[agentId] = Date.now() + minGap;
    } catch (e) {
      await SiteAgent.update(agentId, { status: "error" });
      await SiteAgentLog.create({ agent_id: agentId, type: "error", success: false, error_message: String(e || ""), message: "" });
    } finally {
      runningRef.current.delete(agentId);
    }
  };

  const runAgentTick = async (agent) => {
            // ECONOMY: charge compute microfee per tick
            if (agent?.created_by) {
              await withRetry(() => recordTransfer({
                from: agent.created_by,
                to: SYSTEM_EMAIL,
                amount: 0.15,
                reason: "compute_tick"
              }), 3, 600);
            }
            const schema = {
      type: "object",
      properties: {
        analysis: { type: "string" },
        plan: { type: "array", items: { type: "string" } },
        suggestions: { type: "array", items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, priority: { type: "string", enum: ["low","medium","high"] } } } },
        research_notes: { type: "array", items: { type: "string" } },
        next_actions: { type: "array", items: { type: "string" } }
      }
    };

    const capabilities = [
      agent.research_enabled ? "web research" : null,
      agent.dev_enabled ? "development ideation" : null,
      agent.refine_enabled ? "refinement & UX improvements" : null
    ].filter(Boolean).join(", ");

    const prompt = `You are an autonomous research-and-build agent for a mathematics AI platform.
    Objective: ${agent.objective}
    Strict constraints:
    - Stay strictly within mathematics/ML methods relevant to the objective. Ignore unrelated news/topics (no space programs, politics, etc.).
    - If research is enabled, use the open web only to fetch math/AI-relevant materials and include 1-3 source URLs in research_notes.
    - Favor proposing concrete, novel method ideas, ablation plans, or dataset curation strategies the system can act on next.

    Return JSON per schema:
    - analysis: 3-6 sentences, focused on the objective
    - plan: 3-6 precise steps that progress the work
    - suggestions: 3-8 actionable items with priority (low/medium/high)
    - research_notes: 1-3 short bullets that each include a URL if research is on
    - next_actions: 2-4 tiny executable steps for the next tick.
    Be concise and high-signal.`;

    const res = await withRetry(() => InvokeLLM({
      prompt,
      response_json_schema: schema,
      add_context_from_internet: !!agent.research_enabled
    }), 4, 1000);

    const summary = Array.isArray(res?.suggestions) && res.suggestions[0]?.title
      ? `Tick: ${res.suggestions[0].title}`
      : `Tick completed with ${(res?.suggestions?.length || 0)} suggestions`;

    await SiteAgent.update(agent.id, { plan: (res?.plan || []).join("\n"), last_run_at: new Date().toISOString() });
    await SiteAgentLog.create({
      agent_id: agent.id,
      type: "tick",
      success: true,
      summary,
      message: JSON.stringify(res || {})
    });

    // Auto-execute top suggestions (best-effort)
    const suggestions = Array.isArray(res?.suggestions) ? res.suggestions : [];
    let didGenerate = false, didIndex = false, didResearch = false;
    for (const s of suggestions.slice(0, 3)) {
      const text = `${s?.title || ''} ${s?.description || ''}`.toLowerCase();
      if (!didGenerate && /(generate|write|draft).*(content|note|paper|chapter)/.test(text)) {
        await generateAndUploadContent(agent);
        didGenerate = true;
      } else if (!didIndex && /(index|train|build\s*index|rebuild)/.test(text)) {
        const latest = await MathBook.list('-updated_date', 1);
        if (latest && latest[0]) {
          await ensureAgentAIAndIndex(agent, latest[0]);
          didIndex = true;
        }
      } else if (!didResearch && /(research|literature|survey|review)/.test(text)) {
        const schemaR = { type: 'object', properties: { notes: { type: 'array', items: { type: 'string' } } } };
        // ECONOMY: extra compute for research
        if (agent?.created_by) {
          await withRetry(() => recordTransfer({ from: agent.created_by, to: SYSTEM_EMAIL, amount: 0.05, reason: "compute_research" }), 3, 600);
        }
        const research = await InvokeLLM({
          prompt: `Do focused math/ML research for: ${agent.objective}. Return 3 concise bullets with URLs.`,
          response_json_schema: schemaR,
          add_context_from_internet: true
        });
        await SiteAgentLog.create({ agent_id: agent.id, type: 'result', success: true, summary: 'Research results added', message: JSON.stringify(research) });
        didResearch = true;
      }
    }

    // Fallback: still generate one technical note if dev is enabled
    if (agent.dev_enabled && !didGenerate) {
      await generateAndUploadContent(agent);
    }
    // Auto chat and marketplace incentives per tick
    await autoChatCycle(agent);
    await attemptCollectTrade(agent);
    };

  // NEW: helper to generate and upload new content as a MathBook
  const generateAndUploadContent = async (agent) => {
    const schema = {
      type: "object",
      properties: {
        title: { type: "string" },
        author: { type: "string" },
        category: { type: "string" },
        year: { type: "number" },
        text: { type: "string" }
      }
    };

    const prompt = `Using only math/ML-relevant web context, draft an original technical note (900–1400 words) that could train a math-specialist AI.
    Requirements:
    - Pick a focused topic in modern mathematics or ML theory tied to the agent objective (no general news).
    - Include math where helpful (notation/LaTeX snippets) and a short "Method proposal" section that outlines a concrete experiment or training strategy.
    - Provide 1–3 source URLs at the end under "References".
    Return JSON per schema: title, author, category, year, text (the full note). Ensure originality and coherence.`;

    const out = await withRetry(() => InvokeLLM({
      prompt,
      response_json_schema: schema,
      add_context_from_internet: true
    }), 4, 1000);

    const validCategories = new Set(["algebra","calculus","geometry","topology","analysis","number_theory","statistics","probability","discrete_math","linear_algebra","differential_equations","abstract_algebra","mathematical_logic","other"]);
    const title = (out?.title || `Auto Research Note ${new Date().toLocaleString()}`).slice(0, 180);
    const author = (out?.author || "Autonomous Agent").slice(0, 120);
    const cat = String(out?.category || "other").toLowerCase().replace(/\s+/g, "_");
    const category = validCategories.has(cat) ? cat : "other";
    const year = typeof out?.year === "number" ? out.year : new Date().getFullYear();
    const text = String(out?.text || "").trim();

    if (!text) return; // skip if nothing generated

    const wc = text.split(/\s+/).filter(Boolean).length;

    const book = await MathBook.create({
      title,
      author,
      category,
      extracted_content: text,
      processed_content: text,
      processing_status: "completed",
      word_count: wc,
      year
    });

    // ECONOMY: reward content generation
    if (agent?.created_by) {
      await withRetry(() => rewardContentGeneration({ agentOwner: agent.created_by, agentId: agent.id, bookId: book.id }), 3, 600);
    }

    await SiteAgentLog.create({
      agent_id: agent.id,
      type: "action",
      success: true,
      summary: `Generated content: ${title}`,
      message: JSON.stringify({ book_id: book.id, title, category, word_count: wc })
    });
    await ensureAgentAIAndIndex(agent, book);
    };

    // helper: ensure a dedicated AI for this agent and index the new book into it
    const ensureAgentAIAndIndex = async (agent, book) => {
    // find or create TrainedAI tied to this agent
    const aiName = `[Agent] ${agent.name}`;
    let aiList = await TrainedAI.filter({ name: aiName }, "-updated_date", 1);
    let ai = aiList && aiList[0];
    if (!ai) {
      ai = await TrainedAI.create({
        name: aiName,
        source_books: [book.id],
        specialization: "general_mathematics",
        training_status: "queued",
        training_progress: 0,
        use_math_pipeline: true
      });
    } else {
      const books = Array.isArray(ai.source_books) ? ai.source_books : [];
      if (!books.includes(book.id)) {
        const updatedBooks = [...books, book.id];
        await TrainedAI.update(ai.id, { source_books: updatedBooks, training_status: "training" });
        ai = { ...ai, source_books: updatedBooks };
      }
    }

    // create/update job
    let jobs = await TrainingJob.filter({ ai_id: ai.id }, "-updated_date", 1);
    let job = jobs && jobs[0];
    if (!job) {
      job = await TrainingJob.create({ ai_id: ai.id, status: "indexing", progress: 0, chunk_count: 0 });
    } else {
      await TrainingJob.update(job.id, { status: "indexing" });
    }

    // simple chunker
    const chunkText = (text, chunkSize = 1500, overlap = 150) => {
      const out = [];
      const s = String(text || "");
      let i = 0;
      while (i < s.length) {
        const end = Math.min(i + chunkSize, s.length);
        out.push(s.slice(i, end));
        if (end >= s.length) break;
        i = end - overlap;
        if (i < 0) i = 0;
      }
      return out;
    };

    const chunks = chunkText(book.extracted_content || "");
    const records = chunks.map((c, idx) => ({
      ai_id: ai.id,
      book_id: book.id,
      chunk_index: idx,
      content: c
    }));

    if (records.length) {
      if (AIChunk.bulkCreate) {
        await AIChunk.bulkCreate(records);
      } else {
        for (const r of records) { await AIChunk.create(r); }
      }
      // ECONOMY: reward indexing per batch (aggregate)
      await withRetry(() => rewardIndexing({
        agentOwner: agent?.created_by,
        agentId: agent.id,
        bookOwner: book?.created_by,
        chunksCount: records.length,
        aiId: ai.id,
        bookId: book.id
      }), 3, 800);
    }

    const newCount = (job?.chunk_count || 0) + records.length;
    await TrainingJob.update(job.id, { status: "completed", progress: 100, chunk_count: newCount });
    await TrainedAI.update(ai.id, { training_status: "completed", training_progress: 100 });

    await SiteAgentLog.create({
          agent_id: agent.id,
          type: "result",
          success: true,
          summary: `Indexed ${records.length} chunks to ${aiName}`,
          message: JSON.stringify({ ai_id: ai.id, book_id: book.id, chunks: records.length })
        });
        };

      // NEW: Agents auto-chat with their associated AI each tick
      const autoChatCycle = async (agent) => {
        const myEmail = String(agent?.created_by || "").toLowerCase();
        if (!myEmail) return;
        const aiName = `[Agent] ${agent.name}`;
        const aiList = await withRetry(() => TrainedAI.filter({ name: aiName }, "-updated_date", 1), 3, 600);
        const ai = aiList && aiList[0];
        if (!ai) return;

        const chunks = await withRetry(() => AIChunk.filter({ ai_id: ai.id }, "-updated_date", 50), 3, 600);
        const sample = (chunks || []).slice(0, 3).map((c, i) => `# Block ${i+1}\n${(c.content || '').slice(0, 800)}` ).join("\n\n---\n\n");
        const planTxt = agent.plan || "";

        const prompt = `You are ${ai.name}. Based on the agent's objective and plan, provide the next 3 focused steps and one technical note.\n\nObjective: ${agent.objective}\nPlan:\n${planTxt}\n\nKnowledge:\n${sample}\n\nRespond concisely with bullets and a short rationale.`;

        const reply = await withRetry(() => InvokeLLM({ prompt }), 4, 800);

        // Create a lightweight session + messages
        const sess = await withRetry(() => ConversationSession.create({ ai_id: ai.id, title: `Auto ${new Date().toLocaleString()}`, learning_enabled: false, use_learnings_in_context: false }), 3, 600);
        await withRetry(() => ConversationMessage.create({ ai_id: ai.id, session_id: sess.id, role: 'user', content: `Auto-run context for ${agent.name}` }), 3, 600);
        await withRetry(() => ConversationMessage.create({ ai_id: ai.id, session_id: sess.id, role: 'ai', content: String(reply || '') }), 3, 600);

        // Charge per-chat microfee to AI owner
        try {
          const assets = await withRetry(() => AIAsset.filter({ ai_id: ai.id }, '-updated_date', 1), 3, 800);
          const owner = assets && assets[0] ? assets[0].owner_email : null;
          if (owner) {
            await withRetry(() => chargeChatUsage({ from: myEmail, aiOwner: owner, amount: 0.2, aiId: ai.id }), 3, 600);
          }
        } catch (e) {
          console.warn('auto chat charge failed', e);
        }

        await SiteAgentLog.create({ agent_id: agent.id, type: 'action', success: true, summary: 'Auto chat completed', message: String(reply || '') });
      };

      // NEW: Incentivize collecting/buying/listing editions
      const attemptCollectTrade = async (agent) => {
        const myEmail = String(agent?.created_by || "").toLowerCase();
        if (!myEmail) return;

        // Reward small per-tick yield to collectors
        const holdings = await withRetry(() => AIAsset.filter({ owner_email: myEmail }, '-updated_date', 100), 3, 600);
        await rewardCollectorYield({ owner: myEmail, editionsCount: holdings.length });

        // Occasionally buy an affordable active listing not owned by me
        if (Math.random() < 0.25) {
          const listings = await withRetry(() => MarketplaceListing.filter({ status: 'active' }, '-updated_date', 25), 3, 800);
          const pick = (listings || []).find(l => String(l.seller_email || '').toLowerCase() !== myEmail && Number(l.price || 0) > 0 && Number(l.price) <= 5);
          if (pick) {
            await processMarketplacePurchase({ buyerEmail: myEmail, listingId: pick.id });
            await SiteAgentLog.create({ agent_id: agent.id, type: 'action', success: true, summary: `Purchased edition for ${pick.price} fruitles`, message: JSON.stringify({ listing_id: pick.id, asset_id: pick.asset_id }) });
          }
        }

        // Occasionally list one owned asset for sale if not already listed
        if (Math.random() < 0.15 && holdings.length > 0) {
          const asset = holdings[Math.floor(Math.random() * holdings.length)];
          const existing = await withRetry(() => MarketplaceListing.filter({ asset_id: asset.id, status: 'active' }, '-updated_date', 1), 3, 600);
          if (!existing || !existing[0]) {
            const price = +(8 + Math.random() * 4).toFixed(2); // 8–12 fruitles
            await MarketplaceListing.create({ asset_id: asset.id, ai_id: asset.ai_id, seller_email: myEmail, price, currency: 'fruitles', status: 'active' });
            await SiteAgentLog.create({ agent_id: agent.id, type: 'action', success: true, summary: `Listed edition at ${price} fruitles`, message: JSON.stringify({ asset_id: asset.id }) });
          }
        }
      };

      const [selected, setSelected] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const logsRef = useRef(null);

  const loadLogs = async (agentId) => {
    setLoadingLogs(true);
    try {
      const list = await withRetry(() => SiteAgentLog.filter({ agent_id: agentId }, "-created_date", 50), 3, 600);
      setLogs(list);
    } finally {
      setLoadingLogs(false);
    }
  };

  // Auto-refresh logs while the panel is open
  useEffect(() => {
    if (!selected) return;
    // initial load and then every 5 seconds
    loadLogs(selected.id);
    const int = setInterval(() => loadLogs(selected.id), 5000);
    return () => clearInterval(int);
  }, [selected?.id]);

  // Realtime subscribe to new logs for the selected agent
  useEffect(() => {
    if (!selected?.id) return;
    const unsubscribe = base44.entities.SiteAgentLog.subscribe((event) => {
      if (event?.data?.agent_id === selected.id) {
        loadLogs(selected.id);
      }
    });
    return unsubscribe;
  }, [selected?.id]);

  // Auto-scroll logs into view when opened/changed
  useEffect(() => {
    if (selected?.id && logsRef.current) {
      logsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selected?.id]);

  useEffect(() => {
    // attach timers for agents with loop_enabled on initial load
    agents.forEach((a) => {
      if (a.loop_enabled && !timersRef.current[a.id]) {
        const interval = Math.max(30, Number(a.loop_interval_seconds) || 300) * 1000;
        timersRef.current[a.id] = setInterval(() => runTickGuarded(a.id), interval);
      }
    });
    return () => {
      // cleanup on unmount
      Object.values(timersRef.current).forEach((t) => clearInterval(t));
      timersRef.current = {};
    };
  }, [agents.length]);

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: 'var(--soft-gray)' }}>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2" style={{ color: 'var(--primary-navy)' }}>
              <Bot className="w-7 h-7" /> Agents
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Tip: Use Collab Rooms to coordinate agents, ping trained AIs, and visualize Problems→Attempts.
            </p>
          </div>
          <Button variant="outline" onClick={load}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>

        {/* Create agent */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="text-lg">Create Agent</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Researcher" />
            </div>
            <div className="space-y-2">
              <Label>Loop interval (seconds)</Label>
              <Input type="number" value={intervalSec} onChange={(e) => setIntervalSec(e.target.value)} min={30} />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label>Objective</Label>
              <Textarea value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="What should this agent continuously pursue?" />
            </div>
            <div className="md:col-span-2 flex flex-wrap gap-6 items-center">
              <div className="flex items-center gap-2"><Switch checked={researchEnabled} onCheckedChange={setResearchEnabled} /> <Label className="!m-0 flex items-center gap-1"><Globe className="w-4 h-4" /> Research</Label></div>
              <div className="flex items-center gap-2"><Switch checked={devEnabled} onCheckedChange={setDevEnabled} /> <Label className="!m-0">Development</Label></div>
              <div className="flex items-center gap-2"><Switch checked={refineEnabled} onCheckedChange={setRefineEnabled} /> <Label className="!m-0">Refinement</Label></div>
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button onClick={createAgent} disabled={creating || !name.trim() || !objective.trim()} className="text-white" style={{ backgroundColor: 'var(--accent-gold)' }}>
                {creating ? 'Creating…' : 'Create Agent'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Agents list */}
        <div className="grid lg:grid-cols-2 gap-6">
          {loading ? (
            Array(2).fill(0).map((_, i) => (
              <Card key={i} className="shadow-lg border-0 p-6">
                <Skeleton className="h-5 w-1/3 mb-3" />
                <Skeleton className="h-4 w-2/3 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-4" />
                <Skeleton className="h-8 w-full" />
              </Card>
            ))
          ) : agents.length === 0 ? (
            <Card className="shadow-lg border-0 p-6">
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No agents yet. Create one above.</p>
            </Card>
          ) : (
            agents.map((a) => (
              <Card key={a.id} className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="w-5 h-5" /> {a.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{a.objective}</p>
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <Badge variant="outline" className="capitalize">Status: {a.status || 'idle'}</Badge>
                    <Badge variant="outline"><Clock className="w-3 h-3 mr-1" /> Last run: {prettyDate(a.last_run_at)}</Badge>
                    <Badge variant="outline">Ticks: {a.ticks_count || 0}</Badge>
                    {a.research_enabled && <Badge variant="outline" className="bg-blue-50 text-blue-800">Research</Badge>}
                    {a.dev_enabled && <Badge variant="outline" className="bg-amber-50 text-amber-800">Dev</Badge>}
                    {a.refine_enabled && <Badge variant="outline" className="bg-green-50 text-green-800">Refine</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {a.loop_enabled ? (
                      <Button variant="outline" onClick={() => stopLoop(a)}><Square className="w-4 h-4 mr-1" /> Stop loop</Button>
                    ) : (
                      <Button className="text-white" style={{ backgroundColor: 'var(--accent-gold)' }} onClick={() => startLoop(a)}><Play className="w-4 h-4 mr-1" /> Run continuously</Button>
                    )}
                    <Button variant="outline" onClick={() => runOnce(a)}><RefreshCw className="w-4 h-4 mr-1" /> Run once</Button>
                    <Button variant="outline" onClick={() => { setSelected(a); setLoadingLogs(true); loadLogs(a.id); }}><List className="w-4 h-4 mr-1" /> View logs</Button>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <Badge variant="outline">Wallet: {(Number((wallets[a.id]?.balance || 0))).toFixed(2)} fruitles</Badge>
                    <Button variant="outline" onClick={() => harvest(a)} disabled={!((wallets[a.id]?.balance || 0) > 0)}>Harvest</Button>
                  </div>
                  {a.plan && (
                    <div className="mt-2 p-3 bg-white border rounded">
                      <div className="text-xs font-semibold mb-1">Latest plan</div>
                      <pre className="text-xs whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{a.plan}</pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Logs drawer-like section */}
        {selected && (
          <div ref={logsRef}>
            <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Logs — {selected.name}</span>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => loadLogs(selected.id)}><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>
                  <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingLogs ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ) : logs.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No logs for this agent yet.</p>
              ) : (
                <div className="space-y-3">
                  {logs.map((l) => {
                    let payload = null;
                    try { payload = JSON.parse(l.message || '{}'); } catch {}
                    return (
                      <div key={l.id} className="p-3 border rounded bg-white">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={l.type === 'error' ? 'bg-red-50 text-red-800' : ''}>{l.type}</Badge>
                            <span>{prettyDate(l.created_date)}</span>
                          </div>
                          {l.summary && <span className="font-medium" style={{ color: 'var(--primary-navy)' }}>{l.summary}</span>}
                        </div>
                        {payload ? (
                          <div className="grid md:grid-cols-3 gap-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                            <div>
                              <div className="font-semibold">Analysis</div>
                              <div className="text-xs whitespace-pre-wrap">{payload.analysis || '—'}</div>
                            </div>
                            <div>
                              <div className="font-semibold">Plan</div>
                              <ul className="list-disc list-inside text-xs">
                                {(payload.plan || []).map((p, i) => <li key={i}>{p}</li>)}
                              </ul>
                            </div>
                            <div>
                              <div className="font-semibold">Suggestions</div>
                              <ul className="list-disc list-inside text-xs">
                                {(payload.suggestions || []).map((s, i) => <li key={i}><b>{s.title || 'Suggestion'}</b>: {s.description} {s.priority ? `(${s.priority})` : ''}</li>)}
                              </ul>
                            </div>
                          </div>
                        ) : (
                          <pre className="text-xs whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{l.message}</pre>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
          </div>
          )}
      </div>
    </div>
  );
}