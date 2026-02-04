import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { InvokeLLM } from "@/integrations/Core";
import { AIChunk } from "@/entities/AIChunk";
import { Wand2, Sparkles } from "lucide-react";

export default function StyleGenerator({ ai, value, onChange }) {
  const [generating, setGenerating] = useState(false);

  const generateFromCorpus = async () => {
    if (!ai) return;
    setGenerating(true);
    try {
      const chunks = await AIChunk.filter({ ai_id: ai.id }, "-updated_date", 200);
      const sample = (chunks || [])
        .sort((a, b) => (b.numbers?.length || 0) - (a.numbers?.length || 0))
        .slice(0, 24)
        .map((c, i) => `# C${c.chunk_index}\n${(c.content || "").slice(0, 1200)}`)
        .join("\n\n---\n\n");

      const prompt = `You are distilling a writing/answering style guide for a mathematics AI based solely on the corpus excerpts below.
Output short, actionable rules and tone indicators, not essays. Be specific about:
- voice and diction,
- mathematical notation preferences,
- explanation structure (derivations, steps),
- when to use LaTeX-like symbols and coefficient vectors,
- how to balance rigor vs. clarity,
- persona hints (if any) inferred from the corpus.

Corpus:
${sample}

Return 8-14 bullet points, each <= 140 characters.`;
      const guide = await InvokeLLM({ prompt });
      onChange(guide);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Style guide</Label>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={generateFromCorpus} disabled={generating}>
            <Wand2 className={`w-4 h-4 mr-2 ${generating ? 'animate-pulse' : ''}`} />
            {generating ? "Generating..." : "Generate from corpus"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => onChange((value || "").trim())} disabled>
            <Sparkles className="w-4 h-4 mr-2" />
            Improve (soon)
          </Button>
        </div>
      </div>
      <Textarea
        rows={10}
        placeholder="Concise rules that encode tone, math notation choices, and structure..."
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}