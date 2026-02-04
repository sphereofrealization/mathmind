
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ParserOptions({ options, onChange }) {
  const set = (k, v) => onChange({ ...options, [k]: v });

  return (
    <Card className="shadow-lg border-0">
      <CardHeader>
        <CardTitle>Parsing & Chunking Options</CardTitle>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-4">
        {/* Output format */}
        <div className="space-y-2">
          <Label>Output format</Label>
          <Select value={options.output_format || "chat_messages"} onValueChange={(v) => set("output_format", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Choose format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="chat_messages">Chat messages JSONL (messages[])</SelectItem>
              <SelectItem value="raw_text">Raw text JSONL (text[, raw, plain_text])</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Use “Chat messages” for most fine-tuning providers.</p>
        </div>

        {/* Chunk strategy */}
        <div className="space-y-2">
          <Label>Chunk strategy</Label>
          <Select value={options.chunk_strategy} onValueChange={(v) => set("chunk_strategy", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Choose strategy" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fixed">Fixed windows (chars)</SelectItem>
              <SelectItem value="headings">Heading-aware (LaTeX \section, \subsection)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Heading-aware works best for .tex files and keeps contiguous sections together.</p>
        </div>

        {/* No chunking */}
        <div className="flex items-center justify-between border rounded-lg p-3">
          <div>
            <Label className="font-medium">No chunking (single record)</Label>
            <p className="text-xs text-muted-foreground">Emit the entire document as one JSONL line.</p>
          </div>
          <Switch checked={options.no_chunk} onCheckedChange={(v) => set("no_chunk", v)} />
        </div>

        {/* Chunk size */}
        <div className="space-y-2">
          <Label>Chunk size (chars)</Label>
          <Input
            type="number"
            value={options.chunk_size}
            onChange={(e) => set("chunk_size", parseInt(e.target.value || "0", 10))}
            disabled={options.no_chunk}
          />
        </div>

        {/* Overlap */}
        <div className="space-y-2">
          <Label>Chunk overlap (chars)</Label>
          <Input
            type="number"
            value={options.overlap}
            onChange={(e) => set("overlap", parseInt(e.target.value || "0", 10))}
            disabled={options.no_chunk}
          />
        </div>

        {/* LaTeX stripping */}
        <div className="flex items-center justify-between border rounded-lg p-3">
          <div>
            <Label className="font-medium">Strip LaTeX commands</Label>
            <p className="text-xs text-muted-foreground">Disable to preserve full LaTeX (recommended to avoid loss).</p>
          </div>
          <Switch checked={options.strip_latex} onCheckedChange={(v) => set("strip_latex", v)} />
        </div>

        {/* Remove comments */}
        <div className="flex items-center justify-between border rounded-lg p-3">
          <div>
            <Label className="font-medium">Remove comments (%)</Label>
            <p className="text-xs text-muted-foreground">Strip LaTeX comments while preserving content.</p>
          </div>
          <Switch checked={options.remove_comments} onCheckedChange={(v) => set("remove_comments", v)} />
        </div>

        {/* Keep math regions */}
        <div className="flex items-center justify-between border rounded-lg p-3">
          <div>
            <Label className="font-medium">Keep math regions</Label>
            <p className="text-xs text-muted-foreground">Preserve $...$, \\[...\\], and equation environments if stripping.</p>
          </div>
          <Switch checked={options.keep_math} onCheckedChange={(v) => set("keep_math", v)} />
        </div>

        {/* Dual fields */}
        <div className="flex items-center justify-between border rounded-lg p-3">
          <div>
            <Label className="font-medium">Emit raw + plain fields</Label>
            <p className="text-xs text-muted-foreground">Output both raw and plain text fields in each JSONL line.</p>
          </div>
          <Switch checked={options.emit_dual_fields} onCheckedChange={(v) => set("emit_dual_fields", v)} />
        </div>

        {/* Use raw as text */}
        <div className="flex items-center justify-between border rounded-lg p-3">
          <div>
            <Label className="font-medium">Use raw LaTeX as text</Label>
            <p className="text-xs text-muted-foreground">Set the text field to raw LaTeX (best fidelity for training).</p>
          </div>
          <Switch checked={options.use_raw_as_text} onCheckedChange={(v) => set("use_raw_as_text", v)} />
        </div>

        {/* NEW: Fine-tune safety for chat-messages */}
        {options.output_format === "chat_messages" && (
          <>
            <div className="flex items-center justify-between border rounded-lg p-3">
              <div>
                <Label className="font-medium">Auto-split for fine-tuning</Label>
                <p className="text-xs text-muted-foreground">Keep each training example under a safe token budget.</p>
              </div>
              <Switch checked={options.ft_auto_split} onCheckedChange={(v) => set("ft_auto_split", v)} />
            </div>

            <div className="space-y-2">
              <Label>Target tokens per example</Label>
              <Input
                type="number"
                value={options.ft_target_tokens ?? 2000}
                onChange={(e) => set("ft_target_tokens", parseInt(e.target.value || "0", 10))}
                disabled={!options.ft_auto_split}
              />
              <p className="text-xs text-muted-foreground">
                Providers often reject very large examples; 1500–3000 tokens is a safe range.
              </p>
            </div>
          </>
        )}

        {/* Include meta */}
        <div className={`flex items-center justify-between border rounded-lg p-3 ${options.output_format === "chat_messages" ? "opacity-60" : ""}`}>
          <div>
            <Label className="font-medium">Include metadata</Label>
            <p className="text-xs text-muted-foreground">
              {options.output_format === "chat_messages"
                ? "Disabled for chat-messages JSONL (providers expect only messages)."
                : "Attach file, chunk index, ranges, section path, math density."}
            </p>
          </div>
          <Switch
            checked={options.include_meta}
            onCheckedChange={(v) => set("include_meta", v)}
            disabled={options.output_format === "chat_messages"}
          />
        </div>
      </CardContent>
    </Card>
  );
}
