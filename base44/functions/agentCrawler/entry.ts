// Backend function: Agent-focused crawler
// Runs under Automations every 5 minutes. Fetches up to 'budget' pages per run guided by agent objective.

import { base44 } from "@/api/base44Client";

export default async function handler(event, ctx) {
  // event.payload may carry agent_id for targeted runs; otherwise iterate enabled agents
  const MAX_PER_RUN = 300;
  const nowIso = new Date().toISOString();

  // Load agents that are marked loop_enabled (as a proxy for active) or those passed in
  const agents = event?.payload?.agent_id
    ? await base44.entities.SiteAgent.filter({ id: event.payload.agent_id })
    : await base44.entities.SiteAgent.list("-updated_date", 50);

  for (const agent of agents) {
    if (!agent.loop_enabled) continue; // respect agent toggle

    // Open a CrawlRun record
    const run = await base44.entities.CrawlRun.create({
      agent_id: agent.id,
      started_at: nowIso,
      budget: MAX_PER_RUN,
      notes: `Autonomous crawl for objective: ${agent.objective}`
    });

    let fetched = 0, errored = 0;

    // Step 1: Generate prioritized targets from objective + recent logs
    const recentLogs = await base44.entities.SiteAgentLog.filter({ agent_id: agent.id }, "-created_date", 10);
    const contextSummary = recentLogs.map(l => l.summary).filter(Boolean).join("; ");

    const targetSchema = { type: 'object', properties: { seeds: { type: 'array', items: { type: 'string' } }, queries: { type: 'array', items: { type: 'string' } } } };
    const targetRes = await base44.integrations.Core.InvokeLLM({
      prompt: `Based on the agent's objective and context, propose up to 25 high-value seeds (URLs) and 15 focused search queries for math/ML-relevant sources only. Avoid socials and generic news.\nObjective: ${agent.objective}\nContext: ${contextSummary}`,
      add_context_from_internet: true,
      response_json_schema: targetSchema
    });
    const seeds = Array.isArray(targetRes?.seeds) ? targetRes.seeds : [];
    const queries = Array.isArray(targetRes?.queries) ? targetRes.queries : [];

    // Insert seeds as CrawlItems if new
    const existingQueued = await base44.entities.CrawlItem.filter({ agent_id: agent.id }, "-created_date", 1000);
    const seen = new Set(existingQueued.map(i => i.url));
    const toCreate = seeds.filter(u => typeof u === 'string' && u.startsWith('http')).filter(u => !seen.has(u)).slice(0, 200).map(url => ({
      agent_id: agent.id,
      url,
      domain: safeDomain(url),
      priority: 5,
      depth: 0,
      status: 'queued',
      discovered_from: 'seed'
    }));
    if (toCreate.length) {
      if (base44.entities.CrawlItem.bulkCreate) await base44.entities.CrawlItem.bulkCreate(toCreate); else for (const r of toCreate) await base44.entities.CrawlItem.create(r);
    }

    // Step 2: Pull next batch by priority
    const queue = await base44.entities.CrawlItem.filter({ agent_id: agent.id, status: 'queued' }, "-priority", MAX_PER_RUN);

    // Step 3: Fetch pages using Core.Fetch via InvokeLLM contextual retrieval (HTML->markdown)
    for (const item of queue) {
      if (fetched >= MAX_PER_RUN) break;
      try {
        await base44.entities.CrawlItem.update(item.id, { status: 'fetching' });
        const fetchedRes = await base44.integrations.Core.InvokeLLM({
          prompt: `Fetch and extract the main textual content from this URL. Return JSON with title, content (markdown), content_type. URL: ${item.url}`,
          add_context_from_internet: true,
          response_json_schema: { type: 'object', properties: { title: { type: 'string' }, content: { type: 'string' }, content_type: { type: 'string' } } }
        });
        const title = (fetchedRes?.title || '').slice(0, 180);
        const content = String(fetchedRes?.content || '').slice(0, 200000); // cap
        const tokens = Math.ceil((content.split(/\s+/).length || 0) * 1.3);
        await base44.entities.CrawlItem.update(item.id, {
          status: 'fetched',
          title,
          content,
          content_type: fetchedRes?.content_type || 'text/markdown',
          tokens_estimate: tokens,
          fetched_at: new Date().toISOString()
        });
        fetched += 1;

        // Step 4: If page is highly relevant, store as MathBook and index to agent AI
        if (isRelevantToObjective(agent.objective, title, content)) {
          const book = await base44.entities.MathBook.create({
            title: title || deriveTitleFromUrl(item.url),
            author: item.domain || 'Web Source',
            category: 'other',
            extracted_content: content,
            processed_content: content,
            processing_status: 'completed',
            word_count: content.split(/\s+/).length
          });
          await ensureAgentAIAndIndex(agent, book, base44);
        }

        // Step 5: Discover new links from the page (simple regex) and enqueue shallow children
        const childUrls = extractLinks(content).filter(u => u.startsWith('http')).slice(0, 20);
        const newChildren = childUrls.filter(u => !seen.has(u)).map(url => ({
          agent_id: agent.id,
          url,
          domain: safeDomain(url),
          priority: 3,
          depth: (item.depth || 0) + 1,
          status: 'queued',
          discovered_from: item.url
        })).slice(0, 200);
        if (newChildren.length) {
          if (base44.entities.CrawlItem.bulkCreate) await base44.entities.CrawlItem.bulkCreate(newChildren); else for (const r of newChildren) await base44.entities.CrawlItem.create(r);
          newChildren.forEach(c => seen.add(c.url));
        }
      } catch (e) {
        errored += 1;
        await base44.entities.CrawlItem.update(item.id, { status: 'error', error_message: String(e || '') });
      }
    }

    await base44.entities.CrawlRun.update(run.id, { finished_at: new Date().toISOString(), pages_fetched: fetched, pages_errored: errored });
    await base44.entities.SiteAgentLog.create({ agent_id: agent.id, type: 'action', success: true, summary: `Crawler fetched ${fetched} pages`, message: JSON.stringify({ run_id: run.id, fetched, errored }) });
  }
}

function safeDomain(url) {
  try { return new URL(url).hostname; } catch { return ''; }
}
function deriveTitleFromUrl(url) { try { const u = new URL(url); return u.pathname.replace(/\/+/, '/').split('/').filter(Boolean).slice(-1)[0] || u.hostname; } catch { return url; } }
function extractLinks(markdown) {
  const links = [];
  const re = /\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g; let m;
  while ((m = re.exec(markdown)) !== null) { links.push(m[1]); }
  return Array.from(new Set(links)).slice(0, 100);
}
function isRelevantToObjective(objective, title, content) {
  const s = `${title}\n${content}`.toLowerCase();
  const q = (objective || '').toLowerCase();
  // crude check: all query tokens must appear at least once among top-N words
  const terms = q.split(/[^a-z0-9]+/).filter(t => t.length > 3).slice(0, 5);
  return terms.length === 0 ? false : terms.every(t => s.includes(t));
}

async function ensureAgentAIAndIndex(agent, book, base44) {
  // find or create dedicated AI
  const aiName = `[Agent] ${agent.name}`;
  let aiList = await base44.entities.TrainedAI.filter({ name: aiName }, "-updated_date", 1);
  let ai = aiList && aiList[0];
  if (!ai) {
    ai = await base44.entities.TrainedAI.create({
      name: aiName,
      source_books: [book.id],
      specialization: 'general_mathematics',
      training_status: 'queued',
      training_progress: 0,
      use_math_pipeline: true
    });
  } else {
    const books = Array.isArray(ai.source_books) ? ai.source_books : [];
    if (!books.includes(book.id)) {
      await base44.entities.TrainedAI.update(ai.id, { source_books: [...books, book.id], training_status: 'training' });
    }
  }
  // Create simple chunks
  const chunkText = (text, chunkSize = 1500, overlap = 150) => {
    const out = []; const s = String(text || ""); let i = 0;
    while (i < s.length) { const end = Math.min(i + chunkSize, s.length); out.push(s.slice(i, end)); if (end >= s.length) break; i = Math.max(0, end - overlap); }
    return out;
  };
  const chunks = chunkText(book.extracted_content || book.processed_content || "");
  const records = chunks.map((c, idx) => ({ ai_id: ai.id, book_id: book.id, chunk_index: idx, content: c }));
  if (records.length) {
    if (base44.entities.AIChunk.bulkCreate) await base44.entities.AIChunk.bulkCreate(records); else for (const r of records) await base44.entities.AIChunk.create(r);
  }
  // finalize job update for display
  let jobs = await base44.entities.TrainingJob.filter({ ai_id: ai.id }, "-updated_date", 1);
  let job = jobs && jobs[0];
  if (!job) job = await base44.entities.TrainingJob.create({ ai_id: ai.id, status: 'indexing', progress: 0, chunk_count: 0 });
  await base44.entities.TrainingJob.update(job.id, { status: 'completed', progress: 100, chunk_count: (job.chunk_count || 0) + records.length });
  await base44.entities.TrainedAI.update(ai.id, { training_status: 'completed', training_progress: 100 });
}