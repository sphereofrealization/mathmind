
import React, { useEffect, useState } from "react";
import { TrainedAI } from "@/entities/TrainedAI";
import { FineTuneJob } from "@/entities/FineTuneJob";
import { ModelArtifact } from "@/entities/ModelArtifact";
import { ConversationMessage } from "@/entities/ConversationMessage";
import { ConversationSession } from "@/entities/ConversationSession";
import { AIModelProfile } from "@/entities/AIModelProfile";
import { AIAsset } from "@/entities/AIAsset";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Cpu, FileDown, Upload, Rocket, Tag } from "lucide-react";

function jsonlFromPairs(pairs, systemPrompt = "") {
  const lines = pairs.map(p => {
    const messages = [];
    if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
    messages.push({ role: "user", content: p.user });
    messages.push({ role: "assistant", content: p.ai });
    return JSON.stringify({ messages });
  });
  return lines.join("\n");
}

export default function FineTuningBackendPage() {
  const [ais, setAis] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedAI, setSelectedAI] = useState(null);

  // dataset builder state
  const [pairCount, setPairCount] = useState(500);
  const [datasetInfo, setDatasetInfo] = useState({ pairs: 0, tokens: 0 });

  // job spec state
  const [job, setJob] = useState({
    provider: "",
    base_model: "llama-3-8b-instruct",
    custom_base_model_hint: "",
    method: "lora",
    hyperparams: {
      epochs: 3, batch_size: 8, grad_accum_steps: 2,
      learning_rate: 0.00002, weight_decay: 0.01, warmup_steps: 100,
      scheduler: "cosine", max_seq_len: 2048, seed: 42
    },
    output: { format: "peft_adapter", expected_artifacts: ["adapter.safetensors", "adapter_config.json"] },
    artifact_uri: ""
  });

  useEffect(() => {
    (async () => {
      const ready = await TrainedAI.filter({ training_status: "completed" });
      setAis(ready);
    })();
  }, []);

  useEffect(() => {
    const ai = ais.find(a => a.id === selectedId) || null;
    setSelectedAI(ai);
  }, [selectedId, ais]);

  const loadConversationPairs = async (aiId, limitPairs = 500) => {
    // Pull recent messages and stitch into user->ai pairs within sessions
    const msgs = await ConversationMessage.filter({ ai_id: aiId }, "-created_date", 4000);
    const sessions = await ConversationSession.filter({ ai_id: aiId }, "-created_date", 100);
    const sessionIds = new Set((sessions || []).map(s => s.id));
    const bySession = {};
    (msgs || []).forEach(m => {
      if (!m.session_id || !sessionIds.has(m.session_id)) return;
      bySession[m.session_id] = bySession[m.session_id] || [];
      bySession[m.session_id].push(m);
    });
    const pairs = [];
    Object.values(bySession).forEach(list => {
      list.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      for (let i = 0; i < list.length - 1; i++) {
        const a = list[i], b = list[i + 1];
        if (a.role === "user" && b.role === "ai") {
          pairs.push({ user: a.content, ai: b.content });
        }
      }
    });
    return pairs.slice(0, limitPairs);
  };

  const estimateTokens = (text) => Math.ceil((text || "").length / 4);

  const buildAndDownloadJSONL = async () => {
    if (!selectedAI) return;
    const profileArr = await AIModelProfile.filter({ ai_id: selectedAI.id }, "-updated_date", 1);
    const profile = profileArr && profileArr[0];
    let pairs = await loadConversationPairs(selectedAI.id, pairCount);
    if (pairs.length === 0 && profile?.seed_examples?.length) {
      pairs = profile.seed_examples.map(ex => ({ user: ex.user, ai: ex.ai })).slice(0, pairCount);
    }
    if (pairs.length === 0) {
      alert("No chat pairs or seed examples found. Have a quick chat or add seeds in Model Studio.");
      return;
    }
    const jsonl = jsonlFromPairs(pairs, profile?.style_guide || "");
    const tokens = estimateTokens(jsonl);
    setDatasetInfo({ pairs: pairs.length, tokens });

    const blob = new Blob([jsonl], { type: "application/jsonl;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(selectedAI.name || "ai").toLowerCase().replace(/[^a-z0-9]+/g, "_")}_sft.jsonl`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const saveJobDraft = async () => {
    if (!selectedAI) return;
    const payload = {
      ai_id: selectedAI.id,
      status: "draft",
      provider: job.provider || "",
      base_model: job.base_model,
      custom_base_model_hint: job.custom_base_model_hint || "",
      method: job.method,
      hyperparams: job.hyperparams,
      dataset: { jsonl_pairs: datasetInfo.pairs, token_estimate: datasetInfo.tokens, notes: "Exported via app" },
      output: job.output,
      artifact_uri: job.artifact_uri || ""
    };
    const created = await FineTuneJob.create(payload);
    setJob(prev => ({ ...prev, id: created.id }));
    alert("Fine-tune job draft saved.");
  };

  const updateJobStatus = async (status) => {
    if (!job.id) return alert("Save a draft first.");
    await FineTuneJob.update(job.id, { status });
    alert(`Job marked as ${status}.`);
  };

  const registerArtifact = async () => {
    if (!selectedAI) return;
    if (!job.id) return alert("Save job first.");
    if (!job.artifact_uri) return alert("Provide an artifact URI.");
    const artifact = await ModelArtifact.create({
      ai_id: selectedAI.id,
      job_id: job.id,
      name: `${selectedAI.name} ${job.method.toUpperCase()} ${job.output.format}`,
      type: job.output.format === "peft_adapter" ? "adapter" : "checkpoint",
      format: job.output.format === "peft_adapter" ? "safetensors" : job.output.format,
      uri: job.artifact_uri
    });
    alert("Artifact registered.");
    return artifact;
  };

  const tokenizeArtifact = async () => {
    const me = await User.me();
    if (!selectedAI) return;
    const artArr = await ModelArtifact.filter({ ai_id: selectedAI.id }, "-created_date", 1);
    const art = artArr && artArr[0];
    if (!art) return alert("Register an artifact first.");
    const symbol = (selectedAI.name || "AI").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || "AIMDL";
    const myEmail = (me.email || "").toLowerCase();
    await AIAsset.create({
      ai_id: selectedAI.id,
      name: `${selectedAI.name} Model Artifact`,
      symbol,
      owner_email: myEmail,
      transferable: true,
      royalty_bps: 500
    });
    alert("Model artifact tokenized as an AI asset. You can list it on the marketplace from My Assets.");
  };

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: 'var(--soft-gray)' }}>
      <div className="max-w-6xl mx-auto space-y-8">
        <Card className="shadow-lg border-0">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Cpu className="w-5 h-5" />
              Fine-tuning Backend Orchestration
            </CardTitle>
            <Badge variant="outline">Scaffold</Badge>
          </CardHeader>
          <CardContent className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            This page prepares datasets and job specs for an external fine-tuning backend that produces true model checkpoints/adapters.
            To execute training, enable backend functions or run your own training stack; then register artifacts here to tokenize/list them.
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle>Select AI</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Completed AIs</Label>
              <Select onValueChange={setSelectedId}>
                <SelectTrigger><SelectValue placeholder="Choose AI" /></SelectTrigger>
                <SelectContent>
                  {ais.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {selectedAI && (
              <div className="space-y-2">
                <Label>Status</Label>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-green-100 text-green-800">Ready</Badge>
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{selectedAI.source_books.length} documents</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {selectedAI && (
          <>
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileDown className="w-5 h-5" />
                  Build & Download SFT Dataset (JSONL)
                </CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-3 gap-4 items-end">
                <div className="space-y-2">
                  <Label>Max pairs</Label>
                  <Input type="number" value={pairCount} onChange={(e) => setPairCount(parseInt(e.target.value || "0", 10))} />
                </div>
                <div className="space-y-2">
                  <Label>Est. tokens</Label>
                  <Input readOnly value={datasetInfo.tokens || 0} />
                </div>
                <div className="space-y-2">
                  <Label className="opacity-0">.</Label>
                  <Button className="w-full text-white" style={{ backgroundColor: 'var(--accent-gold)' }} onClick={buildAndDownloadJSONL}>
                    Download JSONL
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Rocket className="w-5 h-5" />
                  Fine-tune Job Spec
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Provider (hint)</Label>
                    <Input placeholder="e.g., Together, OpenRouter, YourInfra" value={job.provider} onChange={(e) => setJob({ ...job, provider: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Base model</Label>
                    <Select value={job.base_model} onValueChange={(v) => setJob({ ...job, base_model: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="llama-3-8b-instruct">Llama 3 8B Instruct</SelectItem>
                        <SelectItem value="llama-3-70b-instruct">Llama 3 70B Instruct</SelectItem>
                        <SelectItem value="mistral-7b-instruct">Mistral 7B Instruct</SelectItem>
                        <SelectItem value="mixtral-8x7b-instruct">Mixtral 8x7B Instruct</SelectItem>
                        <SelectItem value="qwen2-7b-instruct">Qwen2 7B Instruct</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {job.base_model === "custom" && (
                    <div className="space-y-2">
                      <Label>Custom model hint</Label>
                      <Input placeholder="org/model:variant" value={job.custom_base_model_hint} onChange={(e) => setJob({ ...job, custom_base_model_hint: e.target.value })} />
                    </div>
                  )}
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Method</Label>
                    <Select value={job.method} onValueChange={(v) => setJob({ ...job, method: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lora">LoRA</SelectItem>
                        <SelectItem value="qlora">QLoRA</SelectItem>
                        <SelectItem value="full">Full fine-tune</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Output format</Label>
                    <Select value={job.output.format} onValueChange={(v) => setJob({ ...job, output: { ...job.output, format: v } })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="peft_adapter">PEFT Adapter (.safetensors)</SelectItem>
                        <SelectItem value="safetensors">Checkpoint (.safetensors)</SelectItem>
                        <SelectItem value="gguf">GGUF</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Artifact URI (after training)</Label>
                    <Input placeholder="e.g., s3://bucket/path/adapter.safetensors" value={job.artifact_uri} onChange={(e) => setJob({ ...job, artifact_uri: e.target.value })} />
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2"><Label>Epochs</Label><Input type="number" value={job.hyperparams.epochs} onChange={(e) => setJob({ ...job, hyperparams: { ...job.hyperparams, epochs: parseInt(e.target.value||"0",10) } })} /></div>
                  <div className="space-y-2"><Label>Batch size</Label><Input type="number" value={job.hyperparams.batch_size} onChange={(e) => setJob({ ...job, hyperparams: { ...job.hyperparams, batch_size: parseInt(e.target.value||"0",10) } })} /></div>
                  <div className="space-y-2"><Label>Grad accum</Label><Input type="number" value={job.hyperparams.grad_accum_steps} onChange={(e) => setJob({ ...job, hyperparams: { ...job.hyperparams, grad_accum_steps: parseInt(e.target.value||"0",10) } })} /></div>
                  <div className="space-y-2"><Label>Learning rate</Label><Input type="number" step="0.00001" value={job.hyperparams.learning_rate} onChange={(e) => setJob({ ...job, hyperparams: { ...job.hyperparams, learning_rate: parseFloat(e.target.value||"0") } })} /></div>
                  <div className="space-y-2"><Label>Weight decay</Label><Input type="number" step="0.001" value={job.hyperparams.weight_decay} onChange={(e) => setJob({ ...job, hyperparams: { ...job.hyperparams, weight_decay: parseFloat(e.target.value||"0") } })} /></div>
                  <div className="space-y-2"><Label>Warmup steps</Label><Input type="number" value={job.hyperparams.warmup_steps} onChange={(e) => setJob({ ...job, hyperparams: { ...job.hyperparams, warmup_steps: parseInt(e.target.value||"0",10) } })} /></div>
                  <div className="space-y-2">
                    <Label>Scheduler</Label>
                    <Select value={job.hyperparams.scheduler} onValueChange={(v) => setJob({ ...job, hyperparams: { ...job.hyperparams, scheduler: v } })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cosine">Cosine</SelectItem>
                        <SelectItem value="linear">Linear</SelectItem>
                        <SelectItem value="constant">Constant</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Max seq len</Label><Input type="number" value={job.hyperparams.max_seq_len} onChange={(e) => setJob({ ...job, hyperparams: { ...job.hyperparams, max_seq_len: parseInt(e.target.value||"0",10) } })} /></div>
                  <div className="space-y-2"><Label>Seed</Label><Input type="number" value={job.hyperparams.seed} onChange={(e) => setJob({ ...job, hyperparams: { ...job.hyperparams, seed: parseInt(e.target.value||"0",10) } })} /></div>
                </div>

                <div className="flex gap-2">
                  <Button className="text-white" style={{ backgroundColor: 'var(--accent-gold)' }} onClick={saveJobDraft}>Save draft</Button>
                  <Button variant="outline" onClick={() => updateJobStatus("queued")}>Mark queued</Button>
                  <Button variant="outline" onClick={() => updateJobStatus("running")}>Mark running</Button>
                  <Button variant="outline" onClick={() => updateJobStatus("completed")}>Mark completed</Button>
                  <Button variant="outline" onClick={() => updateJobStatus("failed")}>Mark failed</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Register Artifact & Tokenize
                </CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-3 gap-4 items-end">
                <div className="space-y-2 md:col-span-2">
                  <Label>Artifact URI</Label>
                  <Input placeholder="s3://... or https://..." value={job.artifact_uri} onChange={(e) => setJob({ ...job, artifact_uri: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="opacity-0">.</Label>
                  <Button className="w-full" variant="outline" onClick={registerArtifact}>Register</Button>
                </div>
                <div className="md:col-span-3">
                  <Button className="text-white" style={{ backgroundColor: 'var(--accent-gold)' }} onClick={tokenizeArtifact}>
                    <Tag className="w-4 h-4 mr-2" /> Tokenize as AI Asset
                  </Button>
                  <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
                    Note: On-chain minting requires an external blockchain integration. This tokenization creates an in-app asset you can list.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle>Backend execution notes</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2" style={{ color: 'var(--text-secondary)' }}>
                <p>To run fine-tuning for real checkpoints, enable backend functions (Dashboard → Settings) and wire a job runner to read FineTuneJob drafts and write ModelArtifact records upon completion.</p>
                <p>Alternatively, run a separate training service that consumes the exported JSONL and updates jobs/artifacts via the app APIs.</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
