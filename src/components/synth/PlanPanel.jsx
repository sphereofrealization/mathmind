import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function PlanPanel({ room, onTasksCreated }) {
  const [brief, setBrief] = useState("Goal: generate revenue online via low-cost experiments (affiliate content, lead magnets, micro-products). Constraints: respect budgets, small fast iterations.");
  const [loading, setLoading] = useState(false);

  const synthesize = async () => {
    if (!room) return;
    setLoading(true);
    try {
      const schema = {
        type: 'object',
        properties: {
          tasks: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' }, column: { type: 'string', enum: ['ideas','research','build','deploy'] } }, required: ['title','column'] } }
        }
      };
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are the Global Synthesizer for a collaboration spectrum named ${room.name}.\nRoom description: ${room.description}.\nAgents: ${(room.agent_ids||[]).length}.\nSynthesize a monetization plan as tasks. Use only columns ideas, research, build, deploy. Keep each task concise and actionable. Focus on online revenue (content funnels, landing pages, outreach, simple offers). Return JSON per schema. Brief: ${brief}`,
        response_json_schema: schema,
        add_context_from_internet: false
      });
      const items = Array.isArray(res?.tasks) ? res.tasks : [];
      for (const t of items) {
        await base44.entities.CollabTask.create({ room_id: room.id, title: t.title || 'Task', description: t.description || '', column: t.column || 'ideas' });
      }
      onTasksCreated && onTasksCreated();
    } finally { setLoading(false); }
  };

  return (
    <Card className="border-0 shadow">
      <CardHeader>
        <CardTitle className="text-base">Synthesize Monetization Plan</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea value={brief} onChange={e=>setBrief(e.target.value)} />
        <Button onClick={synthesize} disabled={loading || !room}>{loading ? 'Synthesizing…' : 'Generate Tasks'}</Button>
      </CardContent>
    </Card>
  );
}