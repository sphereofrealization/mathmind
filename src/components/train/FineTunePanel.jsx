
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Sliders, Cpu, Shield, Database, Wrench } from "lucide-react";

export default function FineTunePanel(props) {
  // Normalize props (support both old and new)
  const enabled = props.finetune ?? props.enabled ?? false;
  const options = props.finetuneOptions ?? props.options ?? {};
  const onToggle = props.setFinetune ?? props.onToggle ?? (() => {});
  const onOptionsChange = props.setFinetuneOptions ?? props.onOptionsChange ?? (() => {});

  const opt = options || {};

  const set = (key, value) => onOptionsChange({ ...opt, [key]: value });
  const setNested = (group, key, value) => onOptionsChange({ ...opt, [group]: { ...(opt[group] || {}), [key]: value } });

  return (
    <Card className="shadow-lg border-0">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Wrench className="w-5 h-5" />
          Model Fine-tuning (Advanced)
        </CardTitle>
        <div className="flex items-center gap-2">
          <Label className="text-sm">Enable</Label>
          <Switch checked={enabled} onCheckedChange={onToggle} />
        </div>
      </CardHeader>
      <CardContent className={`${enabled ? "" : "opacity-60 pointer-events-none"} space-y-6`}>
        {/* Base model + task */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Base model</Label>
            <Select value={opt.base_model || "llama-3-8b"} onValueChange={(v) => set("base_model", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="llama-3-8b">Llama 3 8B</SelectItem>
                <SelectItem value="llama-3-70b">Llama 3 70B</SelectItem>
                <SelectItem value="mistral-7b">Mistral 7B</SelectItem>
                <SelectItem value="mixtral-8x7b">Mixtral 8x7B</SelectItem>
                <SelectItem value="phi-3-medium">Phi-3 Medium</SelectItem>
                <SelectItem value="qwen2-7b">Qwen2 7B</SelectItem>
                <SelectItem value="custom_hint">Custom (hint)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {opt.base_model === "custom_hint" && (
            <div className="space-y-2">
              <Label>Custom model hint</Label>
              <Input value={opt.custom_base_model_hint || ""} onChange={(e) => set("custom_base_model_hint", e.target.value)} placeholder="e.g., org/model:variant" />
            </div>
          )}
          <div className="space-y-2">
            <Label>Task type</Label>
            <Select value={opt.task_type || "instruction_tuning"} onValueChange={(v) => set("task_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="instruction_tuning">Instruction Tuning</SelectItem>
                <SelectItem value="chat">Chat</SelectItem>
                <SelectItem value="qa">Q&A</SelectItem>
                <SelectItem value="math_reasoning">Math Reasoning</SelectItem>
                <SelectItem value="domain_style">Domain Style</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* PEFT */}
        <div className="border rounded-lg p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4" />
            <Label className="font-medium">Parameter-efficient tuning</Label>
          </div>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Use PEFT</Label>
              <Switch checked={opt.use_peft ?? true} onCheckedChange={(v) => set("use_peft", v)} />
            </div>
            <div className="space-y-2">
              <Label>Method</Label>
              <Select value={opt.peft_method || "lora"} onValueChange={(v) => set("peft_method", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lora">LoRA</SelectItem>
                  <SelectItem value="qlora">QLoRA</SelectItem>
                  <SelectItem value="prefix">Prefix</SelectItem>
                  <SelectItem value="adapters">Adapters</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>LoRA rank (r)</Label>
              <Input type="number" value={opt.lora_r ?? 16} onChange={(e) => set("lora_r", parseInt(e.target.value || "0", 10))} />
            </div>
            <div className="space-y-2">
              <Label>LoRA alpha</Label>
              <Input type="number" value={opt.lora_alpha ?? 32} onChange={(e) => set("lora_alpha", parseInt(e.target.value || "0", 10))} />
            </div>
            <div className="space-y-2">
              <Label>LoRA dropout</Label>
              <Input type="number" step="0.01" value={opt.lora_dropout ?? 0.05} onChange={(e) => set("lora_dropout", parseFloat(e.target.value || "0"))} />
            </div>
            <div className="space-y-2">
              <Label>LoRA bias</Label>
              <Select value={opt.lora_bias || "none"} onValueChange={(v) => set("lora_bias", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="lora_only">LoRA only</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>QLoRA 4-bit</Label>
              <Switch checked={opt.qlora_4bit ?? false} onCheckedChange={(v) => set("qlora_4bit", v)} />
            </div>
            <div className="space-y-2">
              <Label>Double quant</Label>
              <Switch checked={opt.qlora_double_quant ?? true} onCheckedChange={(v) => set("qlora_double_quant", v)} />
            </div>
          </div>
        </div>

        {/* Hyperparameters */}
        <div className="border rounded-lg p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4" />
            <Label className="font-medium">Training hyperparameters</Label>
          </div>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="space-y-2"><Label>Epochs</Label><Input type="number" value={opt.epochs ?? 3} onChange={(e) => set("epochs", parseInt(e.target.value || "0", 10))} /></div>
            <div className="space-y-2"><Label>Batch size</Label><Input type="number" value={opt.batch_size ?? 8} onChange={(e) => set("batch_size", parseInt(e.target.value || "0", 10))} /></div>
            <div className="space-y-2"><Label>Grad accum</Label><Input type="number" value={opt.grad_accum_steps ?? 2} onChange={(e) => set("grad_accum_steps", parseInt(e.target.value || "0", 10))} /></div>
            <div className="space-y-2"><Label>LR</Label><Input type="number" step="0.00001" value={opt.learning_rate ?? 0.00002} onChange={(e) => set("learning_rate", parseFloat(e.target.value || "0"))} /></div>
            <div className="space-y-2"><Label>Weight decay</Label><Input type="number" step="0.001" value={opt.weight_decay ?? 0.01} onChange={(e) => set("weight_decay", parseFloat(e.target.value || "0"))} /></div>
            <div className="space-y-2"><Label>Warmup steps</Label><Input type="number" value={opt.warmup_steps ?? 100} onChange={(e) => set("warmup_steps", parseInt(e.target.value || "0", 10))} /></div>
            <div className="space-y-2">
              <Label>Scheduler</Label>
              <Select value={opt.scheduler || "cosine"} onValueChange={(v) => set("scheduler", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cosine">Cosine</SelectItem>
                  <SelectItem value="linear">Linear</SelectItem>
                  <SelectItem value="constant">Constant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Max seq len</Label><Input type="number" value={opt.max_seq_len ?? 2048} onChange={(e) => set("max_seq_len", parseInt(e.target.value || "0", 10))} /></div>
            <div className="space-y-2"><Label>Eval steps</Label><Input type="number" value={opt.eval_steps ?? 200} onChange={(e) => set("eval_steps", parseInt(e.target.value || "0", 10))} /></div>
            <div className="space-y-2"><Label>Save steps</Label><Input type="number" value={opt.save_steps ?? 500} onChange={(e) => set("save_steps", parseInt(e.target.value || "0", 10))} /></div>
            <div className="space-y-2"><Label>Early stop patience</Label><Input type="number" value={opt.early_stopping_patience ?? 3} onChange={(e) => set("early_stopping_patience", parseInt(e.target.value || "0", 10))} /></div>
            <div className="space-y-2"><Label>Seed</Label><Input type="number" value={opt.seed ?? 42} onChange={(e) => set("seed", parseInt(e.target.value || "0", 10))} /></div>
          </div>
        </div>

        {/* Dataset */}
        <div className="border rounded-lg p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            <Label className="font-medium">Dataset assembly</Label>
          </div>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="space-y-2"><Label>Top-k chunks</Label><Input type="number" value={opt.dataset?.include_chunks_top_k ?? 8} onChange={(e) => setNested("dataset", "include_chunks_top_k", parseInt(e.target.value || "0", 10))} /></div>
            <div className="space-y-2"><Label>Use learnings</Label><Switch checked={opt.dataset?.include_learnings ?? true} onCheckedChange={(v) => setNested("dataset", "include_learnings", v)} /></div>
            <div className="space-y-2"><Label>Max learnings</Label><Input type="number" value={opt.dataset?.learnings_max ?? 50} onChange={(e) => setNested("dataset", "learnings_max", parseInt(e.target.value || "0", 10))} /></div>
            <div className="space-y-2">
              <Label>Strategy</Label>
              <Select value={opt.dataset?.strategy || "smart_sample"} onValueChange={(v) => setNested("dataset", "strategy", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="smart_sample">Smart sample</SelectItem>
                  <SelectItem value="high_math_density">High math density</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Dedupe</Label><Switch checked={opt.dataset?.dedupe ?? true} onCheckedChange={(v) => setNested("dataset", "dedupe", v)} /></div>
            <div className="space-y-2"><Label>Paraphrase aug</Label><Switch checked={opt.dataset?.augment_paraphrase ?? false} onCheckedChange={(v) => setNested("dataset", "augment_paraphrase", v)} /></div>
            <div className="space-y-2"><Label>Math canonicalization</Label><Switch checked={opt.dataset?.augment_math_canonical ?? true} onCheckedChange={(v) => setNested("dataset", "augment_math_canonical", v)} /></div>
          </div>
        </div>

        {/* Tokenizer & Safety & Output */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2"><Shield className="w-4 h-4" /><Label className="font-medium">Tokenizer</Label></div>
            <div className="flex items-center justify-between"><Label>Add EOS</Label><Switch checked={opt.tokenizer?.add_eos ?? true} onCheckedChange={(v) => setNested("tokenizer", "add_eos", v)} /></div>
            <div className="flex items-center justify-between"><Label>Pad to max</Label><Switch checked={opt.tokenizer?.pad_to_max ?? true} onCheckedChange={(v) => setNested("tokenizer", "pad_to_max", v)} /></div>
          </div>
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2"><Shield className="w-4 h-4" /><Label className="font-medium">Safety</Label></div>
            <div className="flex items-center justify-between"><Label>Remove PII</Label><Switch checked={opt.safety?.remove_pii ?? true} onCheckedChange={(v) => setNested("safety", "remove_pii", v)} /></div>
            <div className="flex items-center justify-between"><Label>Profanity filter</Label><Switch checked={opt.safety?.profanity_filter ?? true} onCheckedChange={(v) => setNested("safety", "profanity_filter", v)} /></div>
          </div>
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2"><Shield className="w-4 h-4" /><Label className="font-medium">Output</Label></div>
            <div className="flex items-center justify-between"><Label>Push to registry</Label><Switch checked={opt.output?.push_to_registry ?? false} onCheckedChange={(v) => setNested("output", "push_to_registry", v)} /></div>
            <div className="space-y-2"><Label>Registry name</Label><Input value={opt.output?.registry_name || ""} onChange={(e) => setNested("output", "registry_name", e.target.value)} placeholder="optional-name" /></div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea rows={3} value={opt.notes || ""} onChange={(e) => set("notes", e.target.value)} placeholder="Any special instructions or context for fine-tuning." />
        </div>

        <p className="text-xs text-gray-500">
          Note: This config is saved for future fine-tune jobs. The current platform run indexes your documents and uses RAG at inference.
        </p>
      </CardContent>
    </Card>
  );
}
