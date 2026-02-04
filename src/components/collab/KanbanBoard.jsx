import React, { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const COLUMNS = [
  { key: "ideas", label: "Ideas" },
  { key: "research", label: "Research" },
  { key: "build", label: "Build" },
  { key: "deploy", label: "Deploy" }
];

export default function KanbanBoard({ room, tasks, onCreate, onMove }) {
  const [newTask, setNewTask] = useState({ title: "", description: "", column: "ideas" });
  const grouped = useMemo(() => {
    const m = { ideas: [], research: [], build: [], deploy: [] };
    (tasks||[]).forEach(t => { m[t.column||"ideas"].push(t); });
    return m;
  }, [tasks]);

  const create = (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;
    onCreate({ ...newTask, room_id: room.id });
    setNewTask({ title: "", description: "", column: "ideas" });
  };

  return (
    <div className="grid md:grid-cols-4 gap-4">
      {COLUMNS.map(c => (
        <Card key={c.key} className="border-0 shadow">
          <CardHeader>
            <CardTitle className="text-base">{c.label}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {c.key === 'ideas' && (
              <form onSubmit={create} className="space-y-2">
                <Input placeholder="New idea title" value={newTask.title} onChange={e=>setNewTask(v=>({...v,title:e.target.value}))} />
                <Textarea placeholder="Details (optional)" value={newTask.description} onChange={e=>setNewTask(v=>({...v,description:e.target.value}))} />
                <div className="flex gap-2">
                  <Button type="submit" size="sm">Add</Button>
                </div>
              </form>
            )}
            {(grouped[c.key]||[]).map(t => (
              <div key={t.id} className="p-3 rounded border bg-white">
                <div className="font-medium text-sm">{t.title}</div>
                {t.description && <div className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{t.description}</div>}
                <div className="mt-2 flex gap-2">
                  {c.key !== 'ideas' && <Button size="sm" variant="outline" onClick={()=>onMove(t,'ideas')}>To Ideas</Button>}
                  {c.key !== 'research' && <Button size="sm" variant="outline" onClick={()=>onMove(t,'research')}>To Research</Button>}
                  {c.key !== 'build' && <Button size="sm" className="bg-indigo-600 text-white hover:bg-indigo-700" onClick={()=>onMove(t,'build')}>To Build</Button>}
                  {c.key !== 'deploy' && <Button size="sm" variant="outline" onClick={()=>onMove(t,'deploy')}>To Deploy</Button>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}