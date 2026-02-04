import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";

export default function SeedExampleEditor({ examples, onChange }) {
  const add = () => onChange([...(examples || []), { user: "", ai: "" }]);
  const remove = (idx) => onChange((examples || []).filter((_, i) => i !== idx));
  const update = (idx, key, val) => {
    const next = [...(examples || [])];
    next[idx] = { ...next[idx], [key]: val };
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Few-shot seeds</Label>
        <Button size="sm" variant="outline" onClick={add}>
          <Plus className="w-4 h-4 mr-1" /> Add example
        </Button>
      </div>
      {(examples || []).length === 0 && (
        <p className="text-sm text-gray-500">No seeds yet. Add 1–3 short examples.</p>
      )}
      <div className="space-y-4">
        {(examples || []).map((ex, idx) => (
          <div key={idx} className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Example {idx + 1}</span>
              <Button size="icon" variant="ghost" onClick={() => remove(idx)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">User</Label>
              <Input value={ex.user} onChange={(e) => update(idx, "user", e.target.value)} placeholder="User message" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">AI</Label>
              <Textarea rows={3} value={ex.ai} onChange={(e) => update(idx, "ai", e.target.value)} placeholder="AI response" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}