
import React, { useState, useEffect } from 'react';
import { MathBook } from '@/entities/MathBook';
import { TrainedAI } from '@/entities/TrainedAI';
import { AIAsset } from "@/entities/AIAsset";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Brain, BookOpen, Settings, Zap, Target } from 'lucide-react';
import { motion } from 'framer-motion';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import FineTunePanel from "@/components/train/FineTunePanel"; // NEW: FineTunePanel import

export default function TrainAIPage() {
  const [books, setBooks] = useState([]);
  const [selectedBooks, setSelectedBooks] = useState([]);
  const [aiName, setAiName] = useState('');
  const [specialization, setSpecialization] = useState('general_mathematics');
  const [isTraining, setIsTraining] = useState(false);
  const [useMathPipeline, setUseMathPipeline] = useState(false);
  const [responseStyle, setResponseStyle] = useState('');
  const [deepLearning, setDeepLearning] = useState(false);
  const [deepMode, setDeepMode] = useState('deep');
  // NEW: neural architecture toggle and preset
  const [neuralArchitecture, setNeuralArchitecture] = useState(false);
  const [neuralPreset, setNeuralPreset] = useState('auto');
  // NEW: excruciating model fine-tuning options
  const [finetune, setFinetune] = useState(false);
  const [finetuneOptions, setFinetuneOptions] = useState({
    base_model: "llama-3-8b",
    task_type: "instruction_tuning",
    use_peft: true,
    peft_method: "lora",
    lora_r: 16,
    lora_alpha: 32,
    lora_dropout: 0.05,
    lora_bias: "none",
    qlora_4bit: false,
    qlora_double_quant: true,
    epochs: 3,
    batch_size: 8,
    grad_accum_steps: 2,
    learning_rate: 0.00002,
    weight_decay: 0.01,
    warmup_steps: 100,
    scheduler: "cosine",
    max_seq_len: 2048,
    eval_steps: 200,
    save_steps: 500,
    early_stopping_patience: 3,
    seed: 42,
    dataset: { include_chunks_top_k: 8, include_learnings: true, learnings_max: 50, strategy: "smart_sample", dedupe: true, augment_paraphrase: false, augment_math_canonical: true },
    tokenizer: { add_eos: true, pad_to_max: true },
    safety: { remove_pii: true, profanity_filter: true },
    output: { push_to_registry: false }
  });

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    const completedBooks = await MathBook.filter({ processing_status: 'completed' });
    setBooks(completedBooks);
  };

  const handleBookSelection = (bookId, checked) => {
    if (checked) {
      setSelectedBooks(prev => [...prev, bookId]);
    } else {
      setSelectedBooks(prev => prev.filter(id => id !== bookId));
    }
  };

  const startTraining = async () => {
    if (!aiName || selectedBooks.length === 0) return;

    setIsTraining(true);
    try {
      const ai = await TrainedAI.create({
        name: aiName,
        source_books: selectedBooks,
        specialization: specialization,
        training_status: 'queued',
        use_math_pipeline: useMathPipeline,
        math_pipeline_options: useMathPipeline ? {
          extract_symbols: true,
          extract_latex: true,
          weight_numbers: true,
          segment_equations: true
        } : {},
        ...(responseStyle ? { response_style: responseStyle } : {}),
        deep_learning: deepLearning,
        deep_options: deepLearning ? { mode: deepMode, llm_chunk_analysis: true, passes: deepMode === 'exhaustive' ? 3 : 2 } : {},
        // NEW: neural architecture payload
        neural_architecture: neuralArchitecture,
        neural_architecture_options: neuralArchitecture ? { preset: neuralPreset, extra_tags: [] } : {},
        // NEW: fine-tuning config (saved only; backend not invoked here)
        finetune,
        finetune_options: finetune ? finetuneOptions : {}
      });
      
      // AUTO-TOKENIZE: create AIAsset for this AI, owned by the creator
      const me = await User.me();
      const myEmail = (me.email || "").toLowerCase(); // Normalize email to lowercase
      const makeSymbol = (name) => {
        const letters = (name || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (letters.length >= 3) return letters.slice(0, 6);
        const base = (name || 'AI').toUpperCase().replace(/[^A-Z]/g, '');
        return (base + 'TOK').slice(0, 6) || 'AIOWN';
      };
      await AIAsset.create({
        ai_id: ai.id,
        name: ai.name,
        symbol: makeSymbol(ai.name),
        owner_email: myEmail,
        transferable: true,
        total_supply: 1,
        royalty_bps: 0
      });

      // Reset form
      setAiName('');
      setSelectedBooks([]);
      setSpecialization('general_mathematics');
      setUseMathPipeline(false);
      setResponseStyle('');
      setDeepLearning(false);
      setDeepMode('deep');
      // NEW: reset neural arch
      setNeuralArchitecture(false);
      setNeuralPreset('auto');
      // NEW: reset fine-tuning
      setFinetune(false);
      setFinetuneOptions({
        base_model: "llama-3-8b",
        task_type: "instruction_tuning",
        use_peft: true,
        peft_method: "lora",
        lora_r: 16,
        lora_alpha: 32,
        lora_dropout: 0.05,
        lora_bias: "none",
        qlora_4bit: false,
        qlora_double_quant: true,
        epochs: 3,
        batch_size: 8,
        grad_accum_steps: 2,
        learning_rate: 0.00002,
        weight_decay: 0.01,
        warmup_steps: 100,
        scheduler: "cosine",
        max_seq_len: 2048,
        eval_steps: 200,
        save_steps: 500,
        early_stopping_patience: 3,
        seed: 42,
        dataset: { include_chunks_top_k: 8, include_learnings: true, learnings_max: 50, strategy: "smart_sample", dedupe: true, augment_paraphrase: false, augment_math_canonical: true },
        tokenizer: { add_eos: true, pad_to_max: true },
        safety: { remove_pii: true, profanity_filter: true },
        output: { push_to_registry: false }
      });
      alert('AI training started and tokenized! You can manage it under My Assets or list it on the Marketplace.');
    } catch (error) {
      console.error('Failed to start training/tokenize:', error);
      alert('Failed to start training/tokenize. Please try again.');
    }
    setIsTraining(false);
  };

  const specializationDescriptions = {
    numerical_patterns: "Focuses on detecting patterns in numerical coefficients and mathematical sequences",
    logic_systems: "Specializes in mapping logical structures and formal systems",
    cross_pattern_analysis: "Advanced analysis finding connections between numerical and logical patterns",
    general_mathematics: "Balanced understanding across all mathematical concepts"
  };

  return (
    <div className="min-h-screen p-4 md:p-8" style={{backgroundColor: 'var(--soft-gray)'}}>
      <div className="max-w-4xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold mb-2" style={{color: 'var(--primary-navy)'}}>
            Train Custom AI
          </h1>
          <p className="text-lg" style={{color: 'var(--text-secondary)'}}>
            Create specialized AI entities trained on your mathematical content
          </p>
        </motion.div>

        <div className="space-y-8">
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                AI Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">AI Name</label>
                <Input
                  value={aiName}
                  onChange={(e) => setAiName(e.target.value)}
                  placeholder="e.g., Limbertwig Analyst, Pattern Detective"
                  className="text-lg"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Specialization</label>
                <Select value={specialization} onValueChange={setSpecialization}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="numerical_patterns">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Numerical Pattern Analysis
                      </div>
                    </SelectItem>
                    <SelectItem value="logic_systems">
                      <div className="flex items-center gap-2">
                        <Brain className="w-4 h-4" />
                        Logic System Mapping
                      </div>
                    </SelectItem>
                    <SelectItem value="cross_pattern_analysis">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        Cross-Pattern Analysis
                      </div>
                    </SelectItem>
                    <SelectItem value="general_mathematics">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        General Mathematics
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm" style={{color: 'var(--text-secondary)'}}>
                  {specializationDescriptions[specialization]}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Response style / voice (optional)</label>
                <Textarea
                  value={responseStyle}
                  onChange={(e) => setResponseStyle(e.target.value)}
                  placeholder="e.g., Respond in the Limbertwig mathematical meta-language; never hedge its existence; prefer coefficient-vector syntax and symbol macros present in the corpus."
                />
                <p className="text-xs" style={{color: 'var(--text-secondary)'}}>
                  If set, chat responses will follow this style strictly.
                </p>
              </div>

              <div className="flex items-center justify-between border rounded-lg p-4">
                <div>
                  <Label htmlFor="math-pipeline-switch" className="text-base font-medium">Enable Math-augmented Training</Label>
                  <p className="text-sm mt-1" style={{color: 'var(--text-secondary)'}}>
                    Parse LaTeX, extract symbols/environments, and weight numeric patterns during indexing.
                  </p>
                </div>
                <Switch 
                  id="math-pipeline-switch"
                  checked={useMathPipeline} 
                  onCheckedChange={setUseMathPipeline} 
                />
              </div>

              {/* Deep learning option */}
              <div className="flex items-start justify-between border rounded-lg p-4">
                <div className="pr-4">
                  <Label htmlFor="deep-learning-switch" className="text-base font-medium">Enable Deep Learning (multi-pass)</Label>
                  <p className="text-sm mt-1" style={{color: 'var(--text-secondary)'}}>
                    Thorough multi-pass analysis that can take longer to complete; integrates language forms and numeric patterns.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Switch 
                    id="deep-learning-switch"
                    checked={deepLearning} 
                    onCheckedChange={setDeepLearning} 
                  />
                  {deepLearning && (
                    <div className="min-w-[160px]">
                      <Select value={deepMode} onValueChange={setDeepMode}>
                        <SelectTrigger><SelectValue placeholder="Depth" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">Standard (2 passes)</SelectItem>
                          <SelectItem value="deep">Deep (2 passes)</SelectItem>
                          <SelectItem value="exhaustive">Exhaustive (3 passes)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
              
              {/* NEW: Neural Architecture Integration */}
              <div className="flex items-start justify-between border rounded-lg p-4">
                <div className="pr-4">
                  <Label htmlFor="neural-arch-switch" className="text-base font-medium">Enable Neural Architecture Integration</Label>
                  <p className="text-sm mt-1" style={{color: 'var(--text-secondary)'}}>
                    Detect daisy trees, phase-state forms, exotic loops, curvature anomalies, operadic/sheaf terms; bias analysis and retrieval accordingly.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    id="neural-arch-switch"
                    checked={neuralArchitecture}
                    onCheckedChange={setNeuralArchitecture}
                  />
                  {neuralArchitecture && (
                    <div className="min-w-[200px]">
                      <Select value={neuralPreset} onValueChange={setNeuralPreset}>
                        <SelectTrigger><SelectValue placeholder="Preset" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">Auto-detect</SelectItem>
                          <SelectItem value="daisy_phase_exotic_curvature">Daisy/Phase/Exotic/Curvature</SelectItem>
                          <SelectItem value="energy_numbers_operadic">Energy Numbers / Operadic</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* NEW: Fine-tuning Panel */}
          <FineTunePanel
            finetune={finetune}
            setFinetune={setFinetune}
            finetuneOptions={finetuneOptions}
            setFinetuneOptions={setFinetuneOptions}
          />

          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Select Training Data ({selectedBooks.length} selected)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {books.length === 0 ? (
                <p style={{color: 'var(--text-secondary)'}}>
                  No completed books available. Upload and process some content first.
                </p>
              ) : (
                <div className="space-y-4">
                  {books.map(book => (
                    <div key={book.id} className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50">
                      <Checkbox
                        checked={selectedBooks.includes(book.id)}
                        onCheckedChange={(checked) => handleBookSelection(book.id, checked)}
                      />
                      <div className="flex-1">
                        <h4 className="font-semibold" style={{color: 'var(--primary-navy)'}}>{book.title}</h4>
                        <div className="flex items-center gap-4 text-sm" style={{color: 'var(--text-secondary)'}}>
                          <span>{book.author}</span>
                          <Badge variant="outline">{book.category}</Badge>
                          <span>{book.word_count?.toLocaleString()} words</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              onClick={startTraining}
              disabled={!aiName || selectedBooks.length === 0 || isTraining}
              className="text-white font-medium px-8 py-3 text-lg"
              style={{backgroundColor: 'var(--accent-gold)'}}
            >
              <Brain className="w-5 h-5 mr-2" />
              {isTraining ? 'Starting Training...' : 'Start AI Training'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
