import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TrainedAI } from '@/entities/TrainedAI';
import { MathBook } from '@/entities/MathBook';
import { TrainingJob } from '@/entities/TrainingJob';
import { AIChunk } from '@/entities/AIChunk';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Brain, MessageSquare, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { InvokeLLM } from "@/integrations/Core";
import { AIAsset } from '@/entities/AIAsset';
import { MarketplaceListing } from '@/entities/MarketplaceListing';
import { User } from '@/entities/User';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const statusColors = {
  queued: "bg-blue-100 text-blue-800",
  preprocessing: "bg-yellow-100 text-yellow-800",
  pattern_analysis: "bg-orange-100 text-orange-800",
  numerical_mapping: "bg-purple-100 text-purple-800",
  logic_integration: "bg-indigo-100 text-indigo-800",
  training: "bg-amber-100 text-amber-800",
  completed: "bg-green-100 text-green-800",
  error: "bg-red-100 text-red-800"
};

const statusDescriptions = {
  queued: "Waiting to start training",
  preprocessing: "Preparing mathematical content",
  pattern_analysis: "Analyzing numerical patterns",
  numerical_mapping: "Mapping coefficient relationships",
  logic_integration: "Integrating logical structures",
  training: "Deep pattern learning in progress",
  completed: "Ready for conversations",
  error: "Training encountered an error"
};

export default function TrainingMonitorPage() {
  const [trainedAIs, setTrainedAIs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [processingAI, setProcessingAI] = useState(null);

  const [refreshing, setRefreshing] = useState(false);
  // Add TTL gate to prevent too-frequent refreshes
  const nextAllowedRef = useRef(0);
  const [rateLimited, setRateLimited] = useState(false);
  const [rateMessage, setRateMessage] = useState("");
  const retryTimersRef = useRef({});
  const aiCooldownRef = useRef({});

  // mint/list editions state
  const [issueCount, setIssueCount] = useState({}); // {aiId: number}
  const [issuePrice, setIssuePrice] = useState({}); // {aiId: number}
  const [issuingAI, setIssuingAI] = useState(null); // aiId while issuing
  const [issueRoyalty, setIssueRoyalty] = useState({}); // {aiId: number} in percent

  // Optimistic local state helpers to keep UI in sync in near real-time
  const upsertJobLocal = useCallback((aiId, patch) => {
    setJobs((prev) => {
      const idx = prev.findIndex((j) => j.ai_id === aiId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...patch, ai_id: aiId };
        return next;
      }
      return [...prev, { ai_id: aiId, ...patch }];
    });
  }, []);

  const patchAIStatusLocal = useCallback((aiId, patch) => {
    setTrainedAIs((prev) => prev.map((a) => (a.id === aiId ? { ...a, ...patch } : a)));
  }, []);

  // Retry/backoff helpers to handle 429 rate limits
  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
  const withRetry = useCallback(async (fn, maxRetries = 5, baseDelay = 400) => {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (e) {
        const msg = String(e || '');
        const isRate =
          msg.includes('429') ||
          msg.toLowerCase().includes('too many') ||
          msg.toLowerCase().includes('rate');
        if (!isRate || attempt === maxRetries) {
          throw e;
        }
        const delay = baseDelay * Math.pow(2, attempt);
        console.warn(`Rate limit hit, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
        await sleep(delay);
      }
    }
  }, []);

  // unified, rate-limit-safe refresher with retry/backoff and guard
  const refreshAll = useCallback(async (force = false) => {
    const now = Date.now();
    if (processingAI) return;
    // Allow manual refresh (force=true) to bypass cooldown check
    if (!force && now < nextAllowedRef.current) return;
    // Removed the block that would rate-limit a forced refresh, now it always proceeds.
    if (refreshing) return; // Prevent concurrent refreshes
    setRefreshing(true);
    try {
      setIsLoading(true);
      // Use limits and stronger backoff to ease server pressure
      const ais = await withRetry(() => TrainedAI.list('-created_date', 30), 6, 800);
      setTrainedAIs(ais);
      const allJobs = await withRetry(() => TrainingJob.list('-updated_date', 50), 6, 800);
      setJobs(allJobs);
      // Success: set next allowed with jitter (20s + 0-5s)
      const jitter = Math.floor(Math.random() * 5000);
      nextAllowedRef.current = Date.now() + 20000 + jitter;
      setRateLimited(false);
      setRateMessage("");
    } catch (e) {
      // On error (likely 429), brief cooldown (45s + jitter)
      const msg = String(e || '');
      if (msg.includes('429') || msg.toLowerCase().includes('rate')) {
        const jitter = Math.floor(Math.random() * 10000);
        nextAllowedRef.current = Date.now() + 45000 + jitter;
        setRateLimited(true);
        const waitSec = Math.ceil((nextAllowedRef.current - Date.now()) / 1000);
        setRateMessage(`Rate limit hit. Pausing refresh for ~${waitSec}s; training can still run.`);
      }
      console.warn('refreshAll failed:', e);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [refreshing, withRetry, processingAI]);

  useEffect(() => {
    // Initial load
    refreshAll();

    // Poll every 60s; skip when tab is hidden; TTL/cooldown gates extra calls
    const interval = setInterval(() => {
      if (document.hidden) return; // Don't refresh if tab is not visible
      refreshAll(); // TTL will gate if called too soon
    }, 60000); // Increased to 60s to reduce API pressure

    return () => clearInterval(interval);
  }, [refreshAll]);

  // Simple tokenizer/keyword extraction
  const toKeywords = (text) => {
    const stop = new Set(['the','a','an','and','or','of','to','in','on','for','is','are','be','with','this','that','as','by','at','from','it','its','into','their','your','you','we','our','us']);
    return (text || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w && !stop.has(w) && w.length > 2)
      .slice(0, 30);
  };

  const extractNumbers = (text) => {
    const nums = (text || '').match(/-?\d+(?:\.\d+)?/g);
    return nums ? nums.slice(0, 50) : [];
  };

  const chunkText = (text, chunkSize = 1500, overlap = 150) => {
    const chunks = [];
    if (!text) return chunks;
    let i = 0;
    while (i < text.length) {
      const end = Math.min(i + chunkSize, text.length);
      const slice = text.slice(i, end);
      chunks.push(slice);
      if (end >= text.length) break;
      i = end - overlap;
      if (i < 0) i = 0;
    }
    return chunks;
  };

  const estimateTokens = (str) => Math.ceil((str || '').length / 4);

  // Add math-aware helpers (used only when math pipeline is enabled)
  const extractLatexMacros = (text) => {
    const matches = text.match(/\\[a-zA-Z]+/g) || [];
    // normalize and dedupe
    return Array.from(new Set(matches.map(m => m.trim()))).slice(0, 80);
  };
  const extractLatexEnvs = (text) => {
    const matches = Array.from(text.matchAll(/\\begin\{([^}]+)\}/g)).map(m => m[1]);
    return Array.from(new Set(matches)).slice(0, 50);
  };
  const extractSymbolsSet = (text) => {
    // Common math symbols and greek letters (basic coverage)
    const uniMatches = text.match(/[∑∫∞≤≥≈≃≅≡→⇒↦⊗⊕∧∨∀∃∈∉∂∇±×÷⋅∴⇒⇔αβγδϵεζηθικλμνξοπρστυφχψωΑΒΓΔΘΛΞΠΣΦΨΩ]/g) || [];
    const greekMacros = Array.from(text.matchAll(/\\(alpha|beta|gamma|delta|epsilon|varepsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|omicron|pi|rho|sigma|tau|upsilon|phi|varphi|chi|psi|omega)/g)).map(m => `\\${m[1]}`);
    return Array.from(new Set([...uniMatches, ...greekMacros])).slice(0, 80);
  };

  // architecture tag extractor
  const extractArchitectureTags = (text, preset = 'auto', extra = []) => {
    const t = (text || '').toLowerCase();
    const tags = new Set();
    const addIf = (cond, tag) => { if (cond) tags.add(tag); };
    addIf(/daisy\s*tree|q-regular|breadth[-\s]?first/.test(t), 'daisy_tree');
    addIf(/phase[-\s]?state|h[_\s]*\u03c4|h\s*[\u03c4\tau]/.test(t) || /truncated.*phase/.test(t), 'phase_state');
    addIf(/exotic\s+loops?|non[-\s]?holomorphic|wirtinger|anti[-\s]?holomorphic/.test(t), 'exotic_loops');
    addIf(/curvature|divergence[-\s]?free|incompressible|vortex|streamline/.test(t), 'curvature_anomaly');
    addIf(/operad|sheaf|fr[eé]chet|modular\s+operad|hk?r|derived|quillen|monoidal/.test(t), 'operadic_sheaf');
    addIf(/hamiltonian|energy\s+(numbers|cost|functional)|gibbs|trace/.test(t), 'energy_numbers');
    addIf(/tensor\s+field|non[-\s]?commutative|geometric\s+algebra/.test(t), 'tensor_nc');
    // preset bias: add a tag if preset chosen
    if (preset === 'daisy_phase_exotic_curvature') {
      ['daisy_tree','phase_state','exotic_loops','curvature_anomaly'].forEach(x => tags.add(x));
    } else if (preset === 'energy_numbers_operadic') {
      ['energy_numbers','operadic_sheaf'].forEach(x => tags.add(x));
    }
    (extra || []).forEach(x => tags.add(String(x).toLowerCase()));
    return Array.from(tags).slice(0, 12);
  };

  const formatETA = (secs) => {
    if (secs == null || Number.isNaN(secs) || secs === Infinity) return "calculating...";
    const s = Math.max(0, Math.floor(secs));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const r = s % 60;
    if (h > 0) return `${h}h ${m}m ${r}s`;
    if (m > 0) return `${m}m ${r}s`;
    return `${r}s`;
  };

  const buildKnowledgeIndex = async (ai) => {
    setProcessingAI(ai.id);
      // Pause background refresh while training to reduce API pressure
      nextAllowedRef.current = Date.now() + 60000;
      if (retryTimersRef.current[ai.id]) { clearTimeout(retryTimersRef.current[ai.id]); delete retryTimersRef.current[ai.id]; }
      // If AI is cooling down due to rate limits, skip immediate restart
      if (aiCooldownRef.current[ai.id] && Date.now() < aiCooldownRef.current[ai.id]) {
        setProcessingAI(null);
        return;
      }
    try {
      // Ensure job exists (resume if exists)
      let jobList = await TrainingJob.filter({ ai_id: ai.id });
      let job = jobList && jobList[0];
      if (!job) {
        job = await TrainingJob.create({ ai_id: ai.id, status: 'queued', progress: 0, chunk_count: 0 });
      } else {
        await withRetry(() => TrainingJob.update(job.id, { status: 'preprocessing', last_error: null }), 3);
      }
      // Optimistic: reflect preprocessing immediately
      upsertJobLocal(ai.id, { status: 'preprocessing', progress: job?.progress || 0, chunk_count: job?.chunk_count || 0, eta_seconds: null, throughput_cpm: null, notes: null });


      // Update TrainedAI's status to reflect training has started
      await withRetry(() => TrainedAI.update(ai.id, { training_status: 'training', training_progress: 0 }), 3);
      // Optimistic AI update
      patchAIStatusLocal(ai.id, { training_status: 'training', training_progress: 0 });

      // Load source books
      const books = await Promise.all(
        (ai.source_books || []).map(async (bookId) => {
          const res = await MathBook.filter({ id: bookId });
          return res && res[0] ? res[0] : null;
        })
      );
      const validBooks = books.filter(Boolean);
      const totalContent = validBooks.map(b => b.extracted_content || '').join('\n');
      const totalTokenEstimate = estimateTokens(totalContent);

      // Total chunks (per-book)
      const perBookChunks = validBooks.map(b => chunkText(b.extracted_content || ''));
      const totalChunks = perBookChunks.reduce((sum, arr) => sum + arr.length, 0);

      // Resume from job.chunk_count
      let createdChunks = job?.chunk_count || 0;
      let lastAiProgress = job?.progress || 0;

      // Throughput/ETA state (indexing)
      let lastTick = Date.now();
      let emaCpm = null; // chunks per minute EMA

      await withRetry(() => TrainingJob.update(job.id, {
        status: 'indexing',
        progress: Math.min(lastAiProgress, 90), // Cap initial progress to leave room for analysis
        chunk_count: createdChunks,
        token_count_estimate: totalTokenEstimate,
        remaining_chunks: Math.max(0, totalChunks - createdChunks),
        throughput_cpm: emaCpm || 0,
        eta_seconds: null,
        notes: null
      }), 3);
      // Optimistic job update
      upsertJobLocal(ai.id, {
        status: 'indexing',
        progress: Math.min(lastAiProgress, 90),
        chunk_count: createdChunks,
        token_count_estimate: totalTokenEstimate,
        remaining_chunks: Math.max(0, totalChunks - createdChunks),
        throughput_cpm: 0,
        eta_seconds: null,
        notes: null
      });

      const batchBase = 2; // smaller batches reduce 429 risk further to avoid 429s
      for (let bIndex = 0; bIndex < validBooks.length; bIndex++) {
        const book = validBooks[bIndex];
        const chunks = perBookChunks[bIndex];

        // Resume per book from last chunk_index
        const lastForBookChunks = await AIChunk.filter({ ai_id: ai.id, book_id: book.id }, '-chunk_index', 1);
        const startFrom = lastForBookChunks && lastForBookChunks[0] ? (lastForBookChunks[0].chunk_index + 1) : 0;

        if (startFrom >= chunks.length) continue;

        for (let i = startFrom; i < chunks.length; i += batchBase) {
          const now = Date.now();
          const batch = chunks.slice(i, Math.min(i + batchBase, chunks.length));
          const records = batch.map((c, idx) => {
            const baseKeywords = toKeywords(c);
            const nums = extractNumbers(c);

            let latex_macros = [];
            let latex_envs = [];
            let symbols = [];
            let finalKeywords = baseKeywords;

            if (ai.use_math_pipeline) {
              latex_macros = extractLatexMacros(c);
              latex_envs = extractLatexEnvs(c);
              symbols = extractSymbolsSet(c);
              const envKw = latex_envs.map(e => String(e).toLowerCase());
              const macroKw = latex_macros.map(m => m.replace(/^\\/, '').toLowerCase());
              finalKeywords = Array.from(new Set([...finalKeywords, ...envKw, ...macroKw]));
            }

            let architecture_tags = [];
            if (ai.neural_architecture) {
              const preset = (ai.neural_architecture_options && ai.neural_architecture_options.preset) || 'auto';
              const extra = (ai.neural_architecture_options && ai.neural_architecture_options.extra_tags) || [];
              architecture_tags = extractArchitectureTags(c, preset, extra);
              finalKeywords = Array.from(new Set([...finalKeywords, ...architecture_tags]));
            }

            return {
              ai_id: ai.id,
              book_id: book.id,
              chunk_index: i + idx,
              content: c,
              keywords: finalKeywords,
              numbers: nums,
              ...(ai.use_math_pipeline ? { latex_macros, latex_envs, symbols } : {}),
              ...(ai.neural_architecture ? { architecture_tags } : {})
            };
          });

          await withRetry(() => AIChunk.bulkCreate(records), 6);
          const deltaSec = (Date.now() - lastTick) / 1000;
          lastTick = Date.now();

          createdChunks += records.length;

          // Update EMA throughput (chunks per minute)
          const instCpm = records.length / (deltaSec / 60 || 1);
          emaCpm = emaCpm == null ? instCpm : (emaCpm * 0.7 + instCpm * 0.3);

          const remaining = Math.max(0, totalChunks - createdChunks);
          const etaSec = emaCpm && emaCpm > 0 ? Math.round((remaining / emaCpm) * 60) : null;

          const progress = totalChunks > 0 ? Math.min(95, Math.round((createdChunks / totalChunks) * 100)) : 95;

          await withRetry(
            () => TrainingJob.update(job.id, {
              status: 'indexing',
              progress,
              chunk_count: createdChunks,
              token_count_estimate: totalTokenEstimate,
              remaining_chunks: remaining,
              throughput_cpm: Math.round(emaCpm),
              eta_seconds: etaSec,
              notes: null // Clear any transient notes on successful update
            }),
            4
          );
          // Optimistic progress update
          upsertJobLocal(ai.id, {
            status: 'indexing',
            progress,
            chunk_count: createdChunks,
            token_count_estimate: totalTokenEstimate,
            remaining_chunks: remaining,
            throughput_cpm: Math.round(emaCpm),
            eta_seconds: etaSec,
            notes: null
          });

          // Throttle TrainedAI updates (only every >=5% change)
          if (progress >= lastAiProgress + 5 || progress === 95 || lastAiProgress === 0) {
            await withRetry(() => TrainedAI.update(ai.id, { training_status: 'training', training_progress: progress }), 3);
            // Optimistic AI update
            patchAIStatusLocal(ai.id, { training_status: 'training', training_progress: progress });
            lastAiProgress = progress;
          }

          // Gentle pacing to avoid rate limits (slightly slower to reduce 429s)
          await sleep(1200);
        }
      }

      // Move to analysis phase
      const analyzeProgress = Math.max(lastAiProgress, Math.min(95, (createdChunks && totalChunks) ? Math.round((createdChunks / totalChunks) * 100) : 95));
      await withRetry(() => TrainingJob.update(job.id, { status: 'analyzing', progress: analyzeProgress, chunk_count: createdChunks, token_count_estimate: totalTokenEstimate, eta_seconds: null, throughput_cpm: null, notes: null }), 3);
      // Optimistic job update
      upsertJobLocal(ai.id, { status: 'analyzing', progress: analyzeProgress, chunk_count: createdChunks, token_count_estimate: totalTokenEstimate, eta_seconds: null, throughput_cpm: null, notes: null });
      await withRetry(() => TrainedAI.update(ai.id, { training_status: 'pattern_analysis', training_progress: analyzeProgress }), 3);
      patchAIStatusLocal(ai.id, { training_status: 'pattern_analysis', training_progress: analyzeProgress });

      // If deep learning enabled, perform multi-pass analysis with ETA; else complete
      if (ai.deep_learning) {
        const mode = (ai.deep_options && ai.deep_options.mode) || 'standard';
        const passes = (ai.deep_options && ai.deep_options.passes) || (mode === 'exhaustive' ? 3 : 2);
        const perCallChunks = 3;
        const targetBatches = mode === 'exhaustive' ? 36 : mode === 'deep' ? 18 : 8;

        // Get a sample of chunks for analysis (prefer ones with numbers/latex)
        const allChunks = await AIChunk.filter({ ai_id: ai.id }, '-updated_date', 1000);
        const rankForAnalysis = (ch) => {
          let s = 0;
          s += (ch.numbers?.length || 0) * 1.5;
          s += (ch.latex_macros?.length || 0) * 1.0;
          s += (ch.symbols?.length || 0) * 0.8;
          s += Math.min((ch.content || '').length / 800, 1);
          return s;
        };
        const sorted = [...allChunks].sort((a, b) => rankForAnalysis(b) - rankForAnalysis(a));
        const analysisSet = sorted.slice(0, perCallChunks * targetBatches);

        // Throughput/ETA state (analysis)
        let batchesDone = 0;
        let lastAnalTick = Date.now();
        let emaBpm = null; // batches/min
        const foundNumPatterns = new Set();
        const foundLogicMaps = new Set();
        const foundInsights = [];

        const totalBatches = targetBatches * passes;

        for (let p = 0; p < passes; p++) {
          for (let i = 0; i < analysisSet.length; i += perCallChunks) {
            const batch = analysisSet.slice(i, i + perCallChunks);
            const batchText = batch.map((c) => `# C${c.chunk_index}\n${c.content}`).join('\n\n---\n\n');

            const prompt = `You are a mathematical pattern analyst. Extract bullet lists of numerical coefficient patterns, logic system mappings, and cross-pattern insights from the batch below.
Be compact, technical, and specific.`;

            const schema = {
              type: "object",
              properties: {
                numerical_coefficients: { type: "array", items: { type: "string" } },
                logic_mappings: { type: "array", items: { type: "string" } },
                pattern_insights: { type: "array", items: { type: "string" } }
              }
            };

            const res = await withRetry(() => InvokeLLM({
              prompt: `${prompt}\n\nCorpus Batch:\n${batchText}\n\nReturn only JSON per schema.`,
              response_json_schema: schema
            }), 5, 1200);

            (res.numerical_coefficients || []).forEach(s => foundNumPatterns.add(String(s)));
            (res.logic_mappings || []).forEach(s => foundLogicMaps.add(String(s)));
            (res.pattern_insights || []).forEach(s => foundInsights.push(String(s)));

            batchesDone += 1;

            // Update EMA throughput (batches per minute) and ETA
            const now2 = Date.now();
            const deltaSec2 = (now2 - lastAnalTick) / 1000;
            lastAnalTick = now2;
            const instBpm = 1 / (deltaSec2 / 60 || 1);
            emaBpm = emaBpm == null ? instBpm : (emaBpm * 0.7 + instBpm * 0.3);

            const remainingBatches = Math.max(0, totalBatches - batchesDone);
            const etaSec = emaBpm && emaBpm > 0 ? Math.round((remainingBatches / emaBpm) * 60) : null;

            const prog = Math.min(99, analyzeProgress + Math.floor((batchesDone / totalBatches) * (100 - analyzeProgress - 1)));

            await withRetry(() => TrainingJob.update(job.id, {
              status: 'analyzing',
              progress: prog,
              analysis_batches_done: batchesDone,
              analysis_batches_total: totalBatches,
              throughput_cpm: Math.round(emaBpm),
              eta_seconds: etaSec,
              notes: null
            }), 3);
            // Optimistic job update
            upsertJobLocal(ai.id, {
              status: 'analyzing',
              progress: prog,
              analysis_batches_done: batchesDone,
              analysis_batches_total: totalBatches,
              throughput_cpm: Math.round(emaBpm),
              eta_seconds: etaSec,
              notes: null
            });

            if (prog >= lastAiProgress + 2) {
              await withRetry(() => TrainedAI.update(ai.id, { training_status: 'pattern_analysis', training_progress: prog }), 3);
              patchAIStatusLocal(ai.id, { training_status: 'pattern_analysis', training_progress: prog });
              lastAiProgress = prog;
            }

            await sleep(1800);
          }
        }

        // Save consolidated analysis on AI
        const numPatternsText = Array.from(foundNumPatterns).slice(0, 80).map(s => `• ${s}`).join('\n');
        const logicMapsText = Array.from(foundLogicMaps).slice(0, 80).map(s => `• ${s}`).join('\n');
        const insightsText = foundInsights.slice(0, 120).map(s => `• ${s}`).join('\n');

        await withRetry(() => TrainedAI.update(ai.id, {
          numerical_coefficients: numPatternsText || null,
          logic_mappings: logicMapsText || null,
          pattern_insights: insightsText || null
        }), 3);
        // No specific patchAIStatusLocal here, as it's not a status/progress update for immediate visual feedback

      }

      // Completed
      await withRetry(() => TrainingJob.update(job.id, { status: 'completed', progress: 100, eta_seconds: 0, throughput_cpm: null, notes: null }), 3);
      upsertJobLocal(ai.id, { status: 'completed', progress: 100, eta_seconds: 0, throughput_cpm: null, notes: null });
      await withRetry(() => TrainedAI.update(ai.id, { training_status: 'completed', training_progress: 100 }), 3);
      patchAIStatusLocal(ai.id, { training_status: 'completed', training_progress: 100 });

    } catch (e) {
      console.error('Indexing error', e);
      try {
        const errStrFull = String(e || '');
        const isRate = errStrFull.includes('429') || errStrFull.toLowerCase().includes('rate');
        const errStr = errStrFull.slice(0, 500);
        let jobList = await TrainingJob.filter({ ai_id: ai.id });
        if (jobList[0]) {
          await TrainingJob.update(jobList[0].id, {
            status: isRate ? 'queued' : 'error',
            last_error: isRate ? null : errStr,
            eta_seconds: null,
            throughput_cpm: null,
            notes: isRate ? 'Paused by rate limit; click Start/Resume to continue.' : null
          });
        }
        await TrainedAI.update(ai.id, { training_status: isRate ? 'training' : 'error' });
        // Optimistic reflections
        upsertJobLocal(ai.id, { status: isRate ? 'queued' : 'error', last_error: isRate ? null : errStr, notes: isRate ? 'Rate limit hit. Auto-resuming shortly...' : null });
        patchAIStatusLocal(ai.id, { training_status: isRate ? 'training' : 'error' });
        // Schedule auto-resume when rate-limited
        if (isRate && !retryTimersRef.current[ai.id]) {
          const waitMs = 60000 + Math.floor(Math.random() * 15000);
          retryTimersRef.current[ai.id] = setTimeout(() => {
            delete retryTimersRef.current[ai.id];
            buildKnowledgeIndex(ai);
          }, waitMs);
        }
      } catch (updateError) {
        console.error("Failed to update job or AI with error status:", updateError);
      }
    } finally {
      setProcessingAI(null);
      // consolidate post-process refresh calls to a single refreshAll() to reduce API pressure
      await refreshAll();
    }
  };

  // Add a manual finalize helper for stuck jobs or to skip long analysis
  const finalizeTraining = useCallback(async (aiId, jobId) => {
    if (!aiId || !jobId) return;
    try {
      await TrainingJob.update(jobId, { status: 'completed', progress: 100, eta_seconds: 0, notes: 'Manually finalized (analysis skipped)' });
      await TrainedAI.update(aiId, { training_status: 'completed', training_progress: 100 });
      alert(`AI training for ${aiId} manually finalized.`);
    } catch (error) {
      console.error('Failed to finalize training:', error);
      alert('Failed to finalize training. Please try again.');
    } finally {
      await refreshAll(true);
    }
  }, [refreshAll]);

  // helper to create a compact symbol and append an index
  const makeSymbol = (name, idx) => {
    const letters = (name || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const base = letters.length >= 3 ? letters.slice(0, 6) : ((name || 'AI').toUpperCase().replace(/[^A-Z]/g, '') + 'TOK').slice(0, 6) || 'AIOWN';
    const suffix = String(idx + 1);
    return (base + suffix).slice(0, 8);
  };

  // issue N editions and list them on the marketplace
  const issueEditionsToMarketplace = async (ai) => {
    const count = parseInt(issueCount[ai.id] || 0, 10);
    const price = parseFloat(issuePrice[ai.id] || 0);
    const royaltyPct = parseFloat(issueRoyalty[ai.id] ?? '5'); // default 5%
    const royalty_bps = isNaN(royaltyPct) ? 0 : Math.round(Math.max(0, Math.min(100, royaltyPct)) * 100);

    if (isNaN(count) || count <= 0) {
      alert('Please enter a valid number of copies (>= 1).');
      return;
    }
    if (isNaN(price) || price <= 0) {
      alert('Please enter a valid price (> 0).');
      return;
    }

    setIssuingAI(ai.id);
    try {
      const me = await User.me();
      if (!me) {
        alert('You must be logged in to issue AI editions.');
        return;
      }
      const myEmail = (me.email || "").toLowerCase();

      for (let i = 0; i < count; i++) {
        const asset = await AIAsset.create({
          ai_id: ai.id,
          name: `${ai.name} — Edition ${i + 1}`,
          symbol: makeSymbol(ai.name, i),
          owner_email: myEmail,
          transferable: true,
          royalty_bps,
          description: `Edition ${i + 1} of the ${ai.name} AI. Trained with deep mathematical patterns and logic integration.`
        });

        await MarketplaceListing.create({
          asset_id: asset.id,
          ai_id: ai.id,
          seller_email: myEmail,
          price,
          currency: 'fruitles', // Changed currency to 'fruitles'
          status: 'active'
        });
      }

      alert(`${count} edition${count > 1 ? 's' : ''} of ${ai.name} issued and listed on the marketplace.`);
      setIssueCount(prev => ({ ...prev, [ai.id]: '' }));
      setIssuePrice(prev => ({ ...prev, [ai.id]: '' }));
      setIssueRoyalty(prev => ({ ...prev, [ai.id]: '' }));
    } catch (error) {
      console.error('Error issuing editions:', error);
      alert('Failed to issue editions. Please try again. Error: ' + error.message);
    } finally {
      setIssuingAI(null);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8" style={{backgroundColor: 'var(--soft-gray)'}}>
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center mb-8"
        >
          <div>
            <h1 className="text-4xl font-bold mb-2" style={{color: 'var(--primary-navy)'}}>
              AI Training Monitor
            </h1>
            <p className="text-lg" style={{color: 'var(--text-secondary)'}}>
              Track the training progress of your custom AI entities
            </p>
          </div>
          <Button
            onClick={() => refreshAll(true)} // Manual refresh (gated during cooldown)
            variant="outline"
            className="flex items-center gap-2"
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </motion.div>

        {rateLimited && (
          <p className="text-sm mb-4" style={{color: 'var(--text-secondary)'}}>
            {rateMessage}
          </p>
        )}

        {trainedAIs.length === 0 ? (
          <Card className="shadow-lg border-0 text-center p-12">
            <Brain className="w-16 h-16 mx-auto mb-4" style={{color: 'var(--text-secondary)'}} />
            <h3 className="text-xl font-semibold mb-2" style={{color: 'var(--primary-navy)'}}>
              No AI Training Started
            </h3>
            <p className="mb-4" style={{color: 'var(--text-secondary)'}}>
              Create your first custom AI to begin pattern analysis
            </p>
            <Link to={createPageUrl("TrainAI")}>
              <Button style={{backgroundColor: 'var(--accent-gold)'}} className="text-white">
                Start Training AI
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-6">
            <AnimatePresence>
              {trainedAIs.map((ai, index) => {
                const job = jobs.find(j => j.ai_id === ai.id);
                const jobStatus = job?.status || 'queued';
                const jobProgress = job?.progress || 0;
                const coolingDown = aiCooldownRef.current && aiCooldownRef.current[ai.id] && Date.now() < aiCooldownRef.current[ai.id];
                const cooldownMs = coolingDown ? (aiCooldownRef.current[ai.id] - Date.now()) : 0;

                const progressText =
                  jobStatus === 'preprocessing' ? 'Preparing mathematical content for processing' :
                  jobStatus === 'indexing' ? 'Indexing source texts into knowledge chunks' :
                  jobStatus === 'analyzing' ? 'Analyzing numeric and logical patterns' :
                  jobStatus === 'completed' ? 'Ready for conversations' :
                  jobStatus === 'error' ? 'Indexing encountered an error' :
                  statusDescriptions[ai.training_status] || "Waiting to start training";

                const etaLine = (job?.eta_seconds != null || job?.throughput_cpm != null) && jobStatus !== 'completed' && jobStatus !== 'error' ? (
                  <p className="text-sm mt-1" style={{color: 'var(--text-secondary)'}}>
                    {job?.eta_seconds != null ? `ETA ~ ${formatETA(job.eta_seconds)}` : 'ETA calculating...'}
                    {job?.throughput_cpm != null ? ` • ~${Math.max(0, Math.round(job.throughput_cpm))} ${jobStatus === 'indexing' ? 'chunks/min' : 'batches/min'}` : ''}
                  </p>
                ) : null;

                return (
                <motion.div
                  key={ai.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="shadow-lg border-0">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center gap-2 text-xl">
                            <Brain className="w-6 h-6" style={{color: 'var(--accent-gold)'}} />
                            {ai.name}
                          </CardTitle>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <Badge className={statusColors[ai.training_status]}>
                              {ai.training_status.replace(/_/g, ' ')}
                            </Badge>
                            <Badge variant="outline">
                              {ai.specialization.replace(/_/g, ' ')}
                            </Badge>
                            {ai.use_math_pipeline && (
                              <Badge variant="outline" className="bg-purple-100 text-purple-800">
                                Math+
                              </Badge>
                            )}
                            {ai.deep_learning && (
                              <Badge variant="outline" className="bg-amber-100 text-amber-800">
                                Deep
                              </Badge>
                            )}
                            {/* Neural Architecture badge */}
                            {ai.neural_architecture && (
                              <Badge variant="outline" className="bg-teal-100 text-teal-800">
                                Neural Arch
                              </Badge>
                            )}
                            {/* NEW: Finetune indicator */}
                            {ai.finetune && (
                              <Badge variant="outline" className="bg-rose-100 text-rose-800">
                                Finetune
                              </Badge>
                            )}
                            <span className="text-sm ml-2" style={{color: 'var(--text-secondary)'}}>
                              {ai.source_books.length} training documents
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {ai.training_status === 'completed' && (
                            <Link to={createPageUrl(`AIChat?ai=${ai.id}`)}>
                              <Button size="sm" style={{backgroundColor: 'var(--accent-gold)'}} className="text-white">
                                <MessageSquare className="w-4 h-4 mr-1" />
                                Chat
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Training progress */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">Training Progress</span>
                          <span className="text-sm font-bold">{jobProgress || 0}%</span>
                        </div>
                        <Progress value={jobProgress || 0} className="h-3" />
                        <p className="text-sm mt-1" style={{color: 'var(--text-secondary)'}}>
                          {progressText}
                        </p>
                      </div>

                      {/* Pattern Analysis Results */}
                      {(ai.pattern_insights || ai.numerical_coefficients || ai.logic_mappings) && (
                        <div className="p-4 bg-amber-50 rounded-lg border">
                          <h4 className="font-semibold mb-1" style={{color: 'var(--primary-navy)'}}>
                            Pattern Analysis Results
                          </h4>
                          {ai.numerical_coefficients && (
                            <>
                              <p className="text-sm font-semibold mt-2" style={{color: 'var(--primary-navy)'}}>Numerical Patterns:</p>
                              <pre className="text-xs whitespace-pre-wrap mt-1" style={{color: 'var(--text-secondary)'}}>{ai.numerical_coefficients}</pre>
                            </>
                          )}
                          {ai.logic_mappings && (
                            <>
                              <p className="text-sm font-semibold mt-2" style={{color: 'var(--primary-navy)'}}>Logic Mappings:</p>
                              <pre className="text-xs whitespace-pre-wrap mt-1" style={{color: 'var(--text-secondary)'}}>{ai.logic_mappings}</pre>
                            </>
                          )}
                          {ai.pattern_insights && (
                            <>
                              <p className="text-sm font-semibold mt-2" style={{color: 'var(--primary-navy)'}}>Cross-Pattern Insights:</p>
                              <pre className="text-xs whitespace-pre-wrap mt-1" style={{color: 'var(--text-secondary)'}}>{ai.pattern_insights}</pre>
                            </>
                          )}
                        </div>
                      )}

                      {/* Knowledge Index section (balanced tags) */}
                      <div className="p-4 bg-white rounded-lg border">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold" style={{color: 'var(--primary-navy)'}}>Knowledge Index</h4>
                          <Badge variant="outline" className={statusColors[jobStatus]}>
                            {jobStatus.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <div className="text-sm flex flex-wrap items-center gap-3" style={{color: 'var(--text-secondary)'}}>
                          <span>{job?.chunk_count ? `${job.chunk_count} chunks` : 'No chunks yet'}</span>
                          {job?.token_count_estimate ? <span>• {job.token_count_estimate.toLocaleString()} tokens est.</span> : null}
                          {jobStatus === 'indexing' && typeof job?.remaining_chunks === 'number' && job.remaining_chunks > 0 ? <span>• {job.remaining_chunks} remaining</span> : null}
                          {jobStatus === 'analyzing' && job?.analysis_batches_total ? <span>• {job.analysis_batches_done || 0}/{job.analysis_batches_total} batches</span> : null}
                        </div>
                        {etaLine}
                        <div className="mt-3">
                          <Progress value={jobProgress} className="h-2" />
                        </div>
                        {/* Non-blocking notes and errors */}
                        {job?.notes && (
                          <p className="text-sm mt-2 text-amber-600">{job.notes}</p>
                        )}
                        {coolingDown && (
                          <p className="text-sm mt-1" style={{color: 'var(--text-secondary)'}}>
                            Auto-resume in ~{Math.ceil(cooldownMs / 1000)}s
                          </p>
                        )}
                        {job?.status === 'error' && job?.last_error && (
                          <p className="text-sm mt-2 text-red-600">Error: {job.last_error}</p>
                        )}
                        <div className="flex items-center gap-2 mt-3">
                          <Button
                            size="sm"
                            onClick={() => buildKnowledgeIndex(ai)}
                            disabled={processingAI === ai.id || coolingDown}
                            className="text-white"
                            style={{backgroundColor: 'var(--accent-gold)'}}
                          >
                            {processingAI === ai.id
                              ? 'Indexing...'
                              : coolingDown
                                ? 'Cooling down...'
                                : (ai.training_status === 'completed' || jobStatus === 'completed'
                                    ? 'Rebuild Training'
                                    : 'Start/Resume Training')}
                          </Button>

                          {/* NEW: Finalize (skip analysis) to unstick completion */}
                          {job && job.id && jobStatus !== 'completed' && (job.chunk_count || 0) > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-300 text-red-700 hover:bg-red-50"
                              onClick={() => finalizeTraining(ai.id, job.id)}
                              disabled={processingAI === ai.id}
                            >
                              Finalize (skip analysis)
                            </Button>
                          )}

                          {/* Optional quick manual refresh for this card */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => refreshAll(true)}
                            disabled={refreshing}
                          >
                            {refreshing ? 'Refreshing...' : 'Refresh'}
                          </Button>
                        </div>
                      </div>

                      {/* NEW: Finetune indicator */}
                      {ai.finetune && ai.finetune_options && (
                        <div className="p-4 bg-white rounded-lg border">
                          <h4 className="font-semibold mb-2" style={{color: 'var(--primary-navy)'}}>Fine-tuning Plan</h4>
                          <p className="text-sm" style={{color: 'var(--text-secondary)'}}>
                            Base: {(ai.finetune_options.base_model || '—').replace(/_/g,' ')} • Method: {ai.finetune_options.peft_method || '—'} • Epochs: {ai.finetune_options.epochs ?? '—'} • Batch: {ai.finetune_options.batch_size ?? '—'} • Max seq: {ai.finetune_options.max_seq_len ?? '—'}
                          </p>
                          {ai.finetune_options.notes && (
                            <p className="text-xs mt-1" style={{color: 'var(--text-secondary)'}}>{ai.finetune_options.notes}</p>
                          )}
                          <p className="text-xs mt-2" style={{color: 'var(--text-secondary)'}}>
                            Note: This is a saved configuration; backend fine-tuning is not executed by this app.
                          </p>
                        </div>
                      )}

                      {/* Editions issuing box (moved outside of Knowledge Index container) */}
                      <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                        <h4 className="font-semibold mb-2" style={{color: 'var(--primary-navy)'}}>Issue Editions to Marketplace</h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                          <div className="space-y-1">
                            <Label htmlFor={`copies-${ai.id}`} className="text-sm">Copies</Label>
                            <Input
                              id={`copies-${ai.id}`}
                              type="number"
                              min="1"
                              step="1"
                              placeholder="e.g., 5"
                              value={issueCount[ai.id] ?? ''}
                              onChange={(e) => setIssueCount(prev => ({ ...prev, [ai.id]: e.target.value }))}
                              disabled={issuingAI === ai.id || ai.training_status !== 'completed'}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor={`price-${ai.id}`} className="text-sm">Price (fruitles)</Label>
                            <Input
                              id={`price-${ai.id}`}
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="e.g., 25"
                              value={issuePrice[ai.id] ?? ''}
                              onChange={(e) => setIssuePrice(prev => ({ ...prev, [ai.id]: e.target.value }))}
                              disabled={issuingAI === ai.id || ai.training_status !== 'completed'}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor={`royalty-${ai.id}`} className="text-sm">Royalty (%)</Label>
                            <Input
                              id={`royalty-${ai.id}`}
                              type="number"
                              min="0"
                              max="100"
                              step="0.5"
                              placeholder="e.g., 5"
                              value={issueRoyalty[ai.id] ?? '5'}
                              onChange={(e) => setIssueRoyalty(prev => ({ ...prev, [ai.id]: e.target.value }))}
                              disabled={issuingAI === ai.id || ai.training_status !== 'completed'}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-sm opacity-0 md:opacity-0">.</Label>
                            <Button
                              className="w-full text-white"
                              style={{backgroundColor: 'var(--accent-gold)'}}
                              disabled={issuingAI === ai.id || ai.training_status !== 'completed'}
                              onClick={() => issueEditionsToMarketplace(ai)}
                            >
                              {issuingAI === ai.id ? 'Issuing...' : 'Issue & List'}
                            </Button>
                          </div>
                        </div>
                        <p className="text-xs mt-2" style={{color: 'var(--text-secondary)'}}>
                          Creates the specified number of transferable editions owned by you and lists them for sale in the marketplace. Royalties are paid to the original creator on future sales.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );})}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}