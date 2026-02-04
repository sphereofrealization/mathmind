import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { TrainedAI } from '@/entities/TrainedAI';
import { AIChunk } from '@/entities/AIChunk';
import { InvokeLLM } from '@/integrations/Core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Brain, User, Send, Loader2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { ConversationSession } from '@/entities/ConversationSession';
import { ConversationMessage } from '@/entities/ConversationMessage';
import { AILearning } from '@/entities/AILearning';
import { AIModelProfile } from '@/entities/AIModelProfile';
import { Switch } from '@/components/ui/switch';
import { AIAsset } from '@/entities/AIAsset';
import { base44 } from '@/api/base44Client';
import { chargeChatUsage } from '@/components/economy/Economy';


const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const withRetry = async (fn, maxRetries = 5, baseDelay = 600) => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      const msg = String(e || '');
      const isRate = msg.includes('429') || msg.toLowerCase().includes('rate') || msg.toLowerCase().includes('too many');
      if (!isRate || attempt === maxRetries) {
        throw e;
      }
      const delay = baseDelay * Math.pow(2, attempt);
      await sleep(delay);
    }
  }
};
const limitText = (s, n = 1600) => {
  const str = String(s || '');
  return str.length > n ? str.slice(0, n) + '…' : str;
};

export default function AIChatPage() {
  const location = useLocation();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAI, setSelectedAI] = useState(null);
  const [availableAIs, setAvailableAIs] = useState([]);
  const messagesEndRef = useRef(null);

  const [session, setSession] = useState(null);
  const [learningEnabled, setLearningEnabled] = useState(true);
  const [useLearningsInContext, setUseLearningsInContext] = useState(true);
  const [learnCount, setLearnCount] = useState(0);
  const nextLearnAllowedRef = useRef(0);

  const [modelProfile, setModelProfile] = useState(null);
  const [useProfile, setUseProfile] = useState(true);
  const [useSeeds, setUseSeeds] = useState(true);

  // helper: lightweight keyword extractor
  const toKeywords = (text) => {
    return (text || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w && w.length > 2)
      .slice(0, 30);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    loadAIs();
  }, []);

  // When AI is selected (via ?ai=...), create a session and seed welcome msg
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const aiId = params.get('ai');
    if (aiId && availableAIs.length > 0) {
      const ai = availableAIs.find(a => a.id === aiId);
      if (ai) {
        setSelectedAI(ai);
        setMessages([{
          role: 'ai',
          content: `Hello! I'm ${ai.name}, a specialized AI trained on your mathematical content. I focus on ${ai.specialization.replace(/_/g, ' ')} and have deep knowledge of the patterns within your uploaded texts. What would you like to explore?`
        }]);
        // Start session
        (async () => {
          const s = await ConversationSession.create({
            ai_id: ai.id,
            title: `Chat ${new Date().toLocaleString()}`,
            learning_enabled: true,
            use_learnings_in_context: true
          });
          setSession(s);
          setLearningEnabled(s.learning_enabled);
          setUseLearningsInContext(s.use_learnings_in_context);
          const allLearnings = await AILearning.filter({ ai_id: ai.id });
          setLearnCount(allLearnings.length);
          // Load model profile if exists
          const prof = await AIModelProfile.filter({ ai_id: ai.id }, '-updated_date', 1);
          setModelProfile(prof && prof.length > 0 ? prof[0] : null);
        })();
      }
    }
  }, [availableAIs, location.search]);

  // Persist session learning toggles when changed (debounced + backoff to avoid 429)
  useEffect(() => {
    if (!session) return;
    if (session.learning_enabled === learningEnabled && session.use_learnings_in_context === useLearningsInContext) return;
    const timer = setTimeout(async () => {
      try {
        await withRetry(() => ConversationSession.update(session.id, {
          learning_enabled: learningEnabled,
          use_learnings_in_context: useLearningsInContext
        }), 3, 800);
        setSession(prev => prev ? { ...prev, learning_enabled: learningEnabled, use_learnings_in_context: useLearningsInContext } : prev);
      } catch (e) {
        console.warn('Throttled session update failed:', e);
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [learningEnabled, useLearningsInContext, session]);

  const loadAIs = async () => {
    const completedAIs = await TrainedAI.filter({ training_status: 'completed' });
    setAvailableAIs(completedAIs);
  };

  // Learn from the latest turn
  const performLearning = async (userText, aiText, userMsgId = null, aiMsgId = null) => {
    if (!selectedAI || !learningEnabled) return;
    const now = Date.now();
    if (now < nextLearnAllowedRef.current) return; // simple rate gate
    nextLearnAllowedRef.current = now + 8000; // 8s between learn calls

    const schema = {
      type: "object",
      properties: {
        snippets: { type: "array", items: { type: "string" } }
      }
    };
    const prompt = `From the conversation turn below, extract 1-3 compact, reusable learnings that would help future answers with this AI.
Rules:
- Be specific and factual (patterns, preference, corrections, domain facts).
- Avoid PII and ephemeral details; keep under 200 chars each.
- No duplication; each snippet should stand alone.

User: ${userText}
AI: ${aiText}

Return JSON per schema.`;
    try {
      const res = await withRetry(() => InvokeLLM({ prompt, response_json_schema: schema }), 4, 800);
      const snippets = Array.isArray(res?.snippets) ? res.snippets : [];
      let created = 0;
      for (const snip of snippets.slice(0, 3)) {
        const text = String(snip || '').trim();
        if (!text) continue;
        await AILearning.create({
          ai_id: selectedAI.id,
          session_id: session?.id,
          source_message_ids: [userMsgId, aiMsgId].filter(Boolean),
          text,
          keywords: toKeywords(text),
          status: 'ready',
          visibility: 'private'
        });
        created += 1;
      }
      if (created > 0) {
        const all = await AILearning.filter({ ai_id: selectedAI.id });
        setLearnCount(all.length);
      }
    } catch (err) {
      console.error("Error performing learning:", err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !selectedAI) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const chunks = await withRetry(() => AIChunk.filter({ ai_id: selectedAI.id }, '-updated_date', 600), 3, 600);
      if (!chunks || chunks.length === 0) {
        setMessages(prev => [...prev, { role: 'ai', content: 'I don’t have an index of my knowledge yet. Please go to Training Monitor and click “Build Index” for this AI.' }]);
        setIsLoading(false);
        return;
      }

      // NEW: fetch learnings and rank if enabled
      let learnings = [];
      if (useLearningsInContext) {
        learnings = await withRetry(() => AILearning.filter({ ai_id: selectedAI.id }, '-updated_date', 100), 3, 600);
      }

      const qKeywords = (userMessage.content.toLowerCase().match(/[a-z]{3,}/g) || []);
      const qNumbers = (userMessage.content.match(/-?\d+(?:\.\d+)?/g) || []);
      const scoreChunk = (ch) => {
        let score = 0;
        const kw = new Set((ch.keywords || []).map(s => String(s).toLowerCase()));
        qKeywords.forEach(k => { if (kw.has(k)) score += 1; });
        const nums = new Set((ch.numbers || []).map(String));
        qNumbers.forEach(n => { if (nums.has(String(n))) score += 2; });
        if ((ch.content || '').toLowerCase().includes('limbertwig')) score += 2.5;
        // Boost math features if enabled
        if (selectedAI.use_math_pipeline || selectedAI.deep_learning) {
          score += Math.min((ch.latex_macros?.length || 0) * 0.2, 2);
          score += Math.min((ch.symbols?.length || 0) * 0.1, 1);
        }
        // NEW: architecture tag alignment boost
        if (selectedAI.neural_architecture && ch.architecture_tags && ch.architecture_tags.length) {
          const tagSet = new Set(ch.architecture_tags);
          // direct tag mention in query
          const tagMatches = ['daisy','phase','exotic','curvature','operad','sheaf','energy','tensor','non-commutative']
            .filter(t => userMessage.content.toLowerCase().includes(t));
          score += Math.min(tagMatches.length * 1.2, 3);
          // generic boost
          score += Math.min(ch.architecture_tags.length * 0.1, 1);
        }
        // Slight prior for medium length
        const len = (ch.content || '').length;
        if (len > 400 && len < 2200) score += 0.5;
        return score;
      };

      const scoreLearning = (l) => {
        let s = 0;
        const kw = new Set((l.keywords || []).map(x => String(x).toLowerCase()));
        qKeywords.forEach(k => { if (kw.has(k)) s += 1.2; });
        const hasNums = /-?\d+(?:\.\d+)?/.test(l.text || '');
        if (hasNums) s += 0.5;
        // slight recency prior
        s += 0.2;
        return s;
      };

      const rankedChunks = chunks
        .map(ch => ({ ch, s: scoreChunk(ch) }))
        .sort((a, b) => b.s - a.s)
        .slice(0, 6)
        .map(r => r.ch);

      const topLearns = (useLearningsInContext ? learnings : [])
        .map(l => ({ l, s: scoreLearning(l) }))
        .sort((a, b) => b.s - a.s)
        .slice(0, 3)
        .map(r => r.l);

      // Compose system/style prompt
      const basePersona =
        selectedAI.specialization === 'numerical_patterns'
          ? `You are ${selectedAI.name}, specialized in numerical pattern analysis. Detect patterns in coefficients, sequences, and quantitative relations; show explicit derivations.`
          : selectedAI.specialization === 'logic_systems'
          ? `You are ${selectedAI.name}, specialized in logic system mapping. Analyze formal structures, logical relationships, and meta-logic implications with precision.`
          : selectedAI.specialization === 'cross_pattern_analysis'
          ? `You are ${selectedAI.name}, specialized in cross-pattern analysis. Bridge numerical patterns and logical systems, making connections explicit and justified.`
          : `You are ${selectedAI.name}, a mathematical intelligence embodying the indexed texts. Be rigorous, cite reasoning steps, and avoid hand-waving.`;

      const profileStyle = useProfile && modelProfile?.style_guide ? modelProfile.style_guide : '';
      const articulation = useProfile && modelProfile?.articulation ? `Articulation mode: ${modelProfile.articulation}.` : '';
      const strength = useProfile && modelProfile ? `Personality strength: ${modelProfile.personality_strength ?? 0.7}.` : '';

      const nameHintsLimbertwig = (selectedAI.name || '').toLowerCase().includes('limbertwig');
      const corpusHintsLimbertwig = rankedChunks.some(b => (b.content || '').toLowerCase().includes('limbertwig'));
      const styleFromAI = (selectedAI.response_style || '').trim();

      const limbertwigDirective = `Operate in the Limbertwig mathematical meta-language present in the corpus: adopt its symbols, operators, and coefficient syntax. Do not hedge or claim the language “is not established”; if a construct is ambiguous, infer from nearby patterns and proceed consistently. Prefer compact Limbertwig formulations; include a one-line plain-English gloss only if explicitly requested.`;

      const styleDirective =
        profileStyle
          ? profileStyle
          : styleFromAI
          ? styleFromAI
          : (nameHintsLimbertwig || corpusHintsLimbertwig)
          ? limbertwigDirective
          : '';

      const guardrails = `Rules:
- Ground every claim in the knowledge blocks and learnings; do not invent external facts.
- Do not output generic disclaimers like “not explicitly established”.
- Prefer equations, symbol macros (e.g., LaTeX-style \\alpha, \\otimes), and coefficient vectors if available.
- If numeric details are present, compute explicitly and show steps.
`;

      // Few-shot seeds (optional)
      const seedsBlock = useSeeds && modelProfile?.seed_examples?.length
        ? modelProfile.seed_examples.slice(0, 3).map((ex, i) => (
`Example ${i+1}
User: ${ex.user}
AI: ${ex.ai}`)).join('\n\n')
        : '';

      const examplesSection = seedsBlock ? `\n\nGuiding examples:\n${seedsBlock}\n` : '';

      const profileSection = styleDirective || articulation || strength
        ? `\nStyle guide:\n${styleDirective}${articulation ? `\n${articulation}` : ''}${strength ? `\n${strength}` : ''}\n`
        : '';

      const contextBlocks = [
        ...rankedChunks.map((c, i) => `# Block ${i+1}\n${limitText(c.content, 1600)}`),
        ...(useLearningsInContext ? topLearns.map((l, i) => `# Learning ${i+1}\n${l.text}`) : [])
      ].join('\n\n---\n\n');

      const systemPrompt = `${basePersona}
${profileSection}${examplesSection}${guardrails}

Use ONLY the following indexed knowledge blocks and stored learnings to answer. Do not mention "blocks" explicitly; speak from the knowledge as your own.

${contextBlocks}

Question: ${userMessage.content}

Answer:`;

      const aiResponse = await withRetry(() => InvokeLLM({ prompt: systemPrompt }), 5, 1000);
      // Save messages
      let userMsgId = null, aiMsgId = null;
      try {
        const urec = await ConversationMessage.create({
          ai_id: selectedAI.id,
          session_id: session?.id,
          role: 'user',
          content: userMessage.content
        });
        userMsgId = urec?.id || null;
      } catch (e) {
        console.error("Failed to save user message:", e);
      }
      setMessages(prev => [...prev, { role: 'ai', content: aiResponse }]);
      try {
        const arec = await ConversationMessage.create({
          ai_id: selectedAI.id,
          session_id: session?.id,
          role: 'ai',
          content: aiResponse
        });
        aiMsgId = arec?.id || null;
        } catch (e) {
        console.error("Failed to save AI message:", e);
        }

        // ECONOMY: per-chat microfee routed to AI owner
        try {
        const me = await base44.auth.me();
        const assets = await withRetry(() => AIAsset.filter({ ai_id: selectedAI.id }, '-updated_date', 1), 3, 800);
        const owner = assets && assets[0] ? assets[0].owner_email : null;
        if (me?.email && owner) {
          await withRetry(() => chargeChatUsage({ from: me.email, aiOwner: owner, amount: 0.2, aiId: selectedAI.id }), 3, 800);
        }
        } catch (e) {
        console.warn('chat usage charge failed', e);
        }

      // Perform learning from this turn
      await performLearning(userMessage.content, aiResponse, userMsgId, aiMsgId);

      await withRetry(() => TrainedAI.update(selectedAI.id, {
        conversation_count: (selectedAI.conversation_count || 0) + 1
      }), 3, 800);

    } catch (error) {
      console.error("AI response error:", error);
      setMessages(prev => [...prev, { role: 'ai', content: 'I apologize, but I’m having trouble processing that question right now. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!selectedAI) {
    return (
      <div className="min-h-screen p-4 md:p-8" style={{backgroundColor: 'var(--soft-gray)'}}>
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6" style={{color: 'var(--primary-navy)'}}>
            Select an AI to Chat With
          </h1>

          {availableAIs.length === 0 ? (
            <Card className="text-center p-12">
              <Brain className="w-16 h-16 mx-auto mb-4" style={{color: 'var(--text-secondary)'}} />
              <h3 className="text-xl font-semibold mb-2">No Trained AIs Available</h3>
              <p className="mb-4" style={{color: 'var(--text-secondary)'}}>
                Train your first AI to start having specialized conversations
              </p>
              <Link to={createPageUrl("TrainAI")}>
                <Button style={{backgroundColor: 'var(--accent-gold)'}} className="text-white">
                  Train Your First AI
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="grid gap-4">
              {availableAIs.map(ai => (
                <Card key={ai.id} className="shadow-lg border-0 hover:shadow-xl transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold mb-2" style={{color: 'var(--primary-navy)'}}>
                          {ai.name}
                        </h3>
                        <div className="flex items-center gap-4 mb-3">
                          <Badge variant="outline">{ai.specialization.replace(/_/g, ' ')}</Badge>
                          <span className="text-sm" style={{color: 'var(--text-secondary)'}}>
                            {ai.source_books.length} training documents
                          </span>
                          <span className="text-sm" style={{color: 'var(--text-secondary)'}}>
                            {ai.conversation_count || 0} conversations
                          </span>
                        </div>
                        {ai.pattern_insights && (
                          <p className="text-sm" style={{color: 'var(--text-secondary)'}}>
                            {ai.pattern_insights}
                          </p>
                        )}
                      </div>
                      <Link to={createPageUrl(`AIChat?ai=${ai.id}`)}>
                        <Button style={{backgroundColor: 'var(--accent-gold)'}} className="text-white">
                          <Brain className="w-4 h-4 mr-2" />
                          Chat
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col p-4 md:p-6" style={{backgroundColor: 'var(--soft-gray)'}}>
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <Link to={createPageUrl("AIChat")}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 border">
            <AvatarFallback style={{backgroundColor: 'var(--light-gold)', color: 'var(--accent-gold)'}}>
              <Brain className="w-6 h-6" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-xl font-bold" style={{color: 'var(--primary-navy)'}}>
              {selectedAI.name}
            </h1>
            <p className="text-sm" style={{color: 'var(--text-secondary)'}}>
              Specialized in {selectedAI.specialization.replace(/_/g, ' ')}
            </p>
          </div>
        </div>

        {/* Learning controls */}
        <div className="ml-auto flex items-center gap-4 flex-wrap justify-end">
          <div className="flex items-center gap-2">
            <Switch checked={learningEnabled} onCheckedChange={setLearningEnabled} id="auto-learn" />
            <label htmlFor="auto-learn" className="text-sm" style={{color: 'var(--text-secondary)'}}>Auto-learn</label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={useLearningsInContext} onCheckedChange={setUseLearningsInContext} id="use-learnings" />
            <label htmlFor="use-learnings" className="text-sm" style={{color: 'var(--text-secondary)'}}>Use learnings</label>
          </div>
          <Badge variant="outline">Learnings: {learnCount}</Badge>
          {modelProfile && (
            <>
              <div className="flex items-center gap-2">
                <Switch checked={useProfile} onCheckedChange={setUseProfile} id="use-profile" />
                <label htmlFor="use-profile" className="text-sm" style={{color: 'var(--text-secondary)'}}>Use profile</label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={useSeeds} onCheckedChange={setUseSeeds} id="use-seeds" />
                <label htmlFor="use-seeds" className="text-sm" style={{color: 'var(--text-secondary)'}}>Use seeds</label>
              </div>
            </>
          )}
        </div>
      </div>

      <Card className="flex-1 flex flex-col shadow-lg border-0 overflow-hidden">
        <CardContent className="flex-1 p-4 overflow-y-auto space-y-6">
          <AnimatePresence>
            {messages.map((msg, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-start gap-4 ${msg.role === 'user' ? 'justify-end' : ''}`}
              >
                {msg.role === 'ai' && (
                  <Avatar className="w-10 h-10 border">
                    <AvatarFallback style={{backgroundColor: 'var(--light-gold)', color: 'var(--accent-gold)'}}>
                      <Brain />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className={`max-w-xl p-4 rounded-xl ${
                  msg.role === 'user'
                    ? 'bg-amber-500 text-white rounded-br-none'
                    : 'bg-white border rounded-bl-none'
                }`}>
                  <ReactMarkdown className="prose prose-sm max-w-none">{msg.content}</ReactMarkdown>
                </div>
                 {msg.role === 'user' && (
                  <Avatar className="w-10 h-10 border">
                    <AvatarFallback>
                      <User />
                    </AvatarFallback>
                  </Avatar>
                )}
              </motion.div>
            ))}
            {isLoading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-4">
                  <Avatar className="w-10 h-10 border">
                    <AvatarFallback style={{backgroundColor: 'var(--light-gold)', color: 'var(--accent-gold)'}}>
                      <Brain />
                    </AvatarFallback>
                  </Avatar>
                <div className="max-w-xl p-4 rounded-xl bg-white border rounded-bl-none flex items-center">
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" style={{ color: 'var(--text-secondary)' }} />
                  <span style={{color: 'var(--text-secondary)'}}>Analyzing patterns...</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </CardContent>
        <div className="border-t p-4 bg-white">
          <form onSubmit={handleSendMessage} className="flex gap-4 items-center">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about patterns, coefficients, or logical structures..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading || !input.trim()} style={{backgroundColor: 'var(--accent-gold)'}}>
              <Send className="w-5 h-5" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}