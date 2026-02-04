import { base44 } from "@/api/base44Client";

// Chunk helper
function chunkText(text, chunkSize = 1500, overlap = 150) {
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
}

async function ensureAIForAgent(agent, bookIds) {
  const aiName = agent?.name ? `[Agent] ${agent.name}` : `[Agent] ${agent?.id || "Unknown"}`;
  let aiList = await base44.entities.TrainedAI.filter({ name: aiName }, "-updated_date", 1);
  let ai = aiList && aiList[0];
  if (!ai) {
    ai = await base44.entities.TrainedAI.create({
      name: aiName,
      source_books: bookIds,
      specialization: "general_mathematics",
      training_status: "queued",
      training_progress: 0,
      use_math_pipeline: true
    });
  } else {
    const books = Array.isArray(ai.source_books) ? ai.source_books : [];
    const merged = Array.from(new Set([...(books||[]), ...bookIds]));
    if (merged.length !== books.length) {
      await base44.entities.TrainedAI.update(ai.id, { source_books: merged, training_status: "training" });
      ai = { ...ai, source_books: merged };
    }
  }
  return ai;
}

async function indexBooksIntoAI(ai, books) {
  // create/update job
  let jobs = await base44.entities.TrainingJob.filter({ ai_id: ai.id }, "-updated_date", 1);
  let job = jobs && jobs[0];
  if (!job) {
    job = await base44.entities.TrainingJob.create({ ai_id: ai.id, status: "indexing", progress: 0, chunk_count: 0 });
  } else {
    await base44.entities.TrainingJob.update(job.id, { status: "indexing" });
  }

  let totalChunks = 0;
  for (const book of books) {
    const chunks = chunkText(book.extracted_content || book.processed_content || "");
    const records = chunks.map((c, idx) => ({ ai_id: ai.id, book_id: book.id, chunk_index: idx, content: c }));
    if (records.length) {
      if (base44.entities.AIChunk.bulkCreate) {
        await base44.entities.AIChunk.bulkCreate(records);
      } else {
        for (const r of records) { await base44.entities.AIChunk.create(r); }
      }
      totalChunks += records.length;
    }
  }

  await base44.entities.TrainingJob.update(job.id, { status: "completed", progress: 100, chunk_count: (job?.chunk_count || 0) + totalChunks });
  await base44.entities.TrainedAI.update(ai.id, { training_status: "completed", training_progress: 100 });
}

export async function runBuildAutomation(room, task) {
  // Create BuildJob (running)
  const job = await base44.entities.BuildJob.create({
    room_id: room.id,
    task_id: task.id,
    agent_ids: room.agent_ids || [],
    status: "running",
    started_at: new Date().toISOString()
  });

  // Fetch agents
  const agents = [];
  for (const id of (room.agent_ids || [])) {
    const list = await base44.entities.SiteAgent.filter({ id }, "-updated_date", 1);
    if (list && list[0]) agents.push(list[0]);
  }

  // Create Problems and initial Attempts per agent
  for (const agent of agents) {
    const problem = await base44.entities.Problem.create({
      agent_id: agent.id,
      title: task.title,
      statement: task.description || task.title,
      difficulty: "intermediate",
      source: "derived",
      status: "in_progress"
    });

    // Seed an initial attempt via LLM (quick analysis)
    const schema = { type: 'object', properties: { approach: { type: 'string' }, solution: { type: 'string' }, result: { type: 'string', enum: ['solved','partial','failed'] }, confidence: { type: 'number' } } };
    const out = await base44.integrations.Core.InvokeLLM({
      prompt: `Agent objective: ${agent.objective}. Task: ${task.title}. Context: ${task.description||''}. Provide short approach and proposed solution. Use 'result' among solved/partial/failed and confidence 0..1.`,
      response_json_schema: schema,
      add_context_from_internet: false
    });
    const attempt = await base44.entities.ProblemAttempt.create({
      problem_id: problem.id,
      agent_id: agent.id,
      approach: out?.approach || 'Initial build attempt',
      solution: out?.solution || '',
      result: out?.result || 'partial',
      confidence: typeof out?.confidence === 'number' ? out.confidence : 0.5,
      created_via: 'llm'
    });
    await base44.entities.Problem.update(problem.id, { latest_attempt_id: attempt.id, status: out?.result === 'solved' ? 'solved' : 'in_progress' });
    await base44.entities.SiteAgentLog.create({ agent_id: agent.id, type: 'action', success: true, summary: `Build started for task: ${task.title}`, message: JSON.stringify({ problem_id: problem.id, task_id: task.id }) });
  }

  // Train on all completed documents for each agent AI
  const books = await base44.entities.MathBook.filter({ processing_status: 'completed' }, '-updated_date', 200);
  for (const agent of agents) {
    const ai = await ensureAIForAgent(agent, books.map(b=>b.id));
    await indexBooksIntoAI(ai, books);
  }

  // Finish job
  await base44.entities.BuildJob.update(job.id, { status: "completed", finished_at: new Date().toISOString() });
}