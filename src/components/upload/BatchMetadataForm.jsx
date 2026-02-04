import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";

const CATEGORIES = [
  { value: "algebra", label: "Algebra" },
  { value: "calculus", label: "Calculus" },
  { value: "geometry", label: "Geometry" },
  { value: "topology", label: "Topology" },
  { value: "analysis", label: "Analysis" },
  { value: "number_theory", label: "Number Theory" },
  { value: "statistics", label: "Statistics" },
  { value: "probability", label: "Probability" },
  { value: "discrete_math", label: "Discrete Mathematics" },
  { value: "linear_algebra", label: "Linear Algebra" },
  { value: "differential_equations", label: "Differential Equations" },
  { value: "abstract_algebra", label: "Abstract Algebra" },
  { value: "mathematical_logic", label: "Mathematical Logic" },
  { value: "other", label: "Other" }
];

const DIFFICULTY_LEVELS = [
  { value: "undergraduate", label: "Undergraduate" },
  { value: "graduate", label: "Graduate" },
  { value: "research", label: "Research" },
  { value: "reference", label: "Reference" }
];

export default function BatchMetadataForm({ metadata, onChange, onSave, filesCount }) {
  const handle = (k, v) => onChange(prev => ({ ...prev, [k]: v }));

  return (
    <Card className="shadow-lg border-0">
      <CardHeader className="bg-white border-b">
        <CardTitle className="text-xl font-bold">Shared Metadata for {filesCount} Files</CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Author(s)</Label>
            <Input value={metadata.author} onChange={(e) => handle('author', e.target.value)} placeholder="Optional" />
          </div>
          <div className="space-y-2">
            <Label>Subject Category *</Label>
            <Select value={metadata.category} onValueChange={(v) => handle('category', v)}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Subcategory</Label>
            <Input value={metadata.subcategory} onChange={(e) => handle('subcategory', e.target.value)} placeholder="Optional" />
          </div>
          <div className="space-y-2">
            <Label>Difficulty</Label>
            <Select value={metadata.difficulty_level} onValueChange={(v) => handle('difficulty_level', v)}>
              <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
              <SelectContent>
                {DIFFICULTY_LEVELS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={onSave} className="text-white" style={{backgroundColor: 'var(--accent-gold)'}} disabled={!metadata.category}>
            <Save className="w-4 h-4 mr-2" />
            Save All
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}