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
import { Bot, Play, Square, RefreshCw, Globe, Clock, List } from "lucide-react";

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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const createAgent = async () => {
    if (!name.trim() || !objective.trim()) return;
    setCreating(true);
    try {
      await SiteAgent.create({
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

    const prompt = `You are a continuous site agent for a mathematics AI platform.
Objective: ${agent.objective}
Capabilities enabled: ${capabilities || "none"}.

Produce JSON per schema with:
- analysis: what you found and why it matters
- plan: 3-6 concrete steps (brief)
- suggestions: 3-8 actionable items with priority
- research_notes: brief link-backed notes if web research is on
- next_actions: the very next minimal steps to execute next tick
Keep it concise and high-signal.`;

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
  };

  const [selected, setSelected] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const loadLogs = async (agentId) => {
    setLoadingLogs(true);
    try {
      const list = await withRetry(() => SiteAgentLog.filter({ agent_id: agentId }, "-created_date", 50), 3, 600);
      setLogs(list);
    } finally {
      setLoadingLogs(false);
    }
  };

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
              Run continuously looped research, development, and refinement while this page is open. For 24/7 background agents, enable backend functions.
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
                    <Button variant="outline" onClick={() => { setSelected(a); loadLogs(a.id); }}><List className="w-4 h-4 mr-1" /> View logs</Button>
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
        )}
      </div>
    </div>
  );
}