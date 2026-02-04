import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

export default function SpectrumCreator({ onCreated }) {
  const [agents, setAgents] = useState([]);
  const [selected, setSelected] = useState([]);
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("Monetization spectrum focused on online revenue");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const load = async () => {
      const list = await base44.entities.SiteAgent.list("-updated_date", 100);
      setAgents(list);
    };
    load();
  }, []);

  const toggle = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id]);
  };

  const create = async () => {
    if (!name.trim() || selected.length === 0) return;
    setCreating(true);
    try {
      const room = await base44.entities.CollabRoom.create({
        name: name.trim(),
        description: objective.trim(),
        domain_tags: ["revenue","growth","spectrum"],
        agent_ids: selected,
        ai_ids: [],
        default_domain: "growth"
      });
      setName("");
      setObjective("Monetization spectrum focused on online revenue");
      setSelected([]);
      onCreated && onCreated(room);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Card className="border-0 shadow">
      <CardHeader>
        <CardTitle className="text-lg">Create Spectrum</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid md:grid-cols-2 gap-3">
          <Input placeholder="Spectrum name" value={name} onChange={e=>setName(e.target.value)} />
          <Textarea placeholder="Objective" value={objective} onChange={e=>setObjective(e.target.value)} />
        </div>
        <div className="grid md:grid-cols-3 gap-2 max-h-56 overflow-auto p-2 border rounded bg-white">
          {agents.map(a => (
            <label key={a.id} className="flex items-center gap-2 text-sm">
              <Checkbox checked={selected.includes(a.id)} onCheckedChange={()=>toggle(a.id)} />
              <span>{a.name}</span>
            </label>
          ))}
        </div>
        <div className="flex justify-end">
          <Button onClick={create} disabled={creating || !name.trim() || selected.length===0}>{creating ? 'Creating…' : 'Create Spectrum'}</Button>
        </div>
      </CardContent>
    </Card>
  );
}