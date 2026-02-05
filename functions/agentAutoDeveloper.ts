// Backend function: Agent Auto-Developer (scheduled daily)
// For each enabled AgentAutoSchedule at the configured UTC time (once per day),
// 1) Generate development ideas
// 2) Create a LaTeX MathBook per top idea
// 3) Draft ProposedCodeChange records (not auto-applying code here)

import { base44 } from "@/api/base44Client";

export default async function handler(event, ctx) {
  const now = new Date();
  const nowUtc = new Date(now.toISOString());
  const hh = String(nowUtc.getUTCHours()).padStart(2, '0');
  const mm = String(nowUtc.getUTCMinutes()).padStart(2, '0');
  const today = nowUtc.toISOString().slice(0, 10); // YYYY-MM-DD

  // Load enabled schedules
  const schedules = await base44.entities.AgentAutoSchedule.filter({ enabled: true }, '-created_date', 200);

  for (const sched of schedules) {
    const agentId = sched.agent_id;
    if (!agentId) continue;

    // Run once per day near the scheduled minute (±10 minutes window)
    const due = isWithinWindow(`${hh}:${mm}`, String(sched.time_utc || '09:00'), 10) && String(sched.last_run_date || '') !== today;
    if (!due) continue;

    const agentList = await base44.entities.SiteAgent.filter({ id: agentId }, '-updated_date', 1);
    const agent = agentList && agentList[0];
    if (!agent) continue;

    // Open run
    const run = await base44.entities.AutoDevRun.create({ agent_id: agent.id, started_at: new Date().toISOString(), status: 'running' });

    try {
      // Gather short context
      const recentLogs = await base44.entities.SiteAgentLog.filter({ agent_id: agent.id }, '-created_date', 12);
      const context = (recentLogs || []).map(l => l.summary || '').filter(Boolean).slice(0, 8).join(' | ');

      // 1) Generate ideas
      const ideaSchema = { type: 'object', properties: { ideas: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, rationale: { type: 'string' } }, required: ['title'] } } } };
      const ideaRes = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an autonomous web developer agent improving a React+Tailwind app.\nObjective: ${agent.objective}\nContext: ${context}\nPropose 2-3 high-impact, safely-scoped improvements that can be completed today. Return ideas with title and 1-2 sentence rationale.`,
        add_context_from_internet: false,
        response_json_schema: ideaSchema
      });
      const ideas = Array.isArray(ideaRes?.ideas) ? ideaRes.ideas.slice(0, 3) : [];

      // 2) For the top idea, generate a concise LaTeX note/book
      const top = ideas[0];
      let createdBook = null;
      if (top) {
        const texRes = await base44.integrations.Core.InvokeLLM({
          prompt: `Write a concise LaTeX document (use plain LaTeX, not Markdown) summarizing the plan to implement: \n"${top.title}".\nInclude sections: Overview, Impact, Implementation Steps, Potential Risks. Ensure it compiles (use\\documentclass{article}).`,
          add_context_from_internet: false,
          response_json_schema: { type: 'object', properties: { latex: { type: 'string' }, title: { type: 'string' } } }
        });
        const latex = String(texRes?.latex || '').trim();
        const bookTitle = (texRes?.title || `AutoDev: ${top.title}`).slice(0, 180);
        if (latex) {
          createdBook = await base44.entities.MathBook.create({
            title: bookTitle,
            author: `[Agent] ${agent.name}`,
            category: 'other',
            extracted_content: latex,
            processing_status: 'completed',
          });
        }
      }

      // 3) Draft ProposedCodeChange records (JSON plan -> PR-ready actions)
      const changeSchema = {
        type: 'object',
        properties: {
          changes: {
            type: 'array', items: {
              type: 'object',
              properties: {
                file_path: { type: 'string' },
                change_type: { type: 'string' },
                rationale: { type: 'string' },
                find: { type: 'string' },
                replace: { type: 'string' },
                replace_all: { type: 'boolean' },
                content: { type: 'string' },
              }, required: ['file_path', 'change_type']
            }
          }
        }
      };
      const changeRes = await base44.integrations.Core.InvokeLLM({
        prompt: `Given a React + Tailwind + shadcn/ui app with entities and pages (flat /pages), propose 1-3 precise code edits for the idea: "${top?.title || 'Improve UX'}".\nRules:\n- Only edit existing files using find/replace pairs (safe, small diffs) or create new files with full content.\n- Use flat page paths like pages/Feature.js and components/... for components.\n- Prefer minimal, reversible edits.\nReturn JSON changes.`,
        add_context_from_internet: false,
        response_json_schema: changeSchema
      });
      const changes = Array.isArray(changeRes?.changes) ? changeRes.changes.slice(0, 3) : [];

      for (const ch of changes) {
        await base44.entities.ProposedCodeChange.create({
          run_id: run.id,
          agent_id: agent.id,
          file_path: String(ch.file_path || ''),
          change_type: normalizeChangeType(ch.change_type),
          find: ch.find || undefined,
          replace: ch.replace || undefined,
          replace_all: typeof ch.replace_all === 'boolean' ? ch.replace_all : false,
          content: ch.content || undefined,
          rationale: ch.rationale || '',
          status: 'proposed'
        });
      }

      const summaries = ideas.map(i => i.title).filter(Boolean);
      await base44.entities.AutoDevRun.update(run.id, {
        finished_at: new Date().toISOString(),
        status: 'completed',
        idea_summaries: summaries,
        notes: createdBook ? `Created LaTeX book: ${createdBook.title}` : undefined
      });
      await base44.entities.AgentAutoSchedule.update(sched.id, { last_run_date: today });
      await base44.entities.SiteAgentLog.create({ agent_id: agent.id, type: 'action', success: true, summary: `AutoDev completed (${summaries.length} ideas)`, message: JSON.stringify({ run_id: run.id, ideas: summaries }) });
    } catch (e) {
      await base44.entities.AutoDevRun.update(run.id, { finished_at: new Date().toISOString(), status: 'error', notes: String(e || '') });
      await base44.entities.SiteAgentLog.create({ agent_id: agent.id, type: 'error', success: false, summary: 'AutoDev error', message: String(e || '') });
    }
  }
}

function isWithinWindow(nowHHMM, targetHHMM, minutesWindow = 10) {
  try {
    const [nh, nm] = String(nowHHMM).split(':').map(Number);
    const [th, tm] = String(targetHHMM).split(':').map(Number);
    const n = nh * 60 + nm;
    const t = th * 60 + tm;
    return Math.abs(n - t) <= minutesWindow;
  } catch { return false; }
}

function normalizeChangeType(t) {
  const v = String(t || '').toLowerCase();
  if (v === 'create' || v === 'modify' || v === 'delete') return v;
  return 'modify';
}