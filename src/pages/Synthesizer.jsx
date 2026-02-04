import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import SpectrumCreator from "../components/synth/SpectrumCreator";
import MoneyPanel from "../components/synth/MoneyPanel";
import PlanPanel from "../components/synth/PlanPanel";
import KanbanBoard from "../components/collab/KanbanBoard";
import PingPanel from "../components/collab/PingPanel";
import ProblemTree from "../components/collab/ProblemTree";
import { runBuildAutomation } from "../components/collab/BuildAutomation";
import { Badge } from "@/components/ui/badge";

export default function Synthesizer() {
  const [rooms, setRooms] = useState([]);
  const [selected, setSelected] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [ais, setAis] = useState([]);

  const loadRooms = async () => {
    const rs = await base44.entities.CollabRoom.list("-updated_date", 50);
    setRooms(rs);
  };

  const loadDetails = async (room) => {
    if (!room) return;
    const ts = await base44.entities.CollabTask.filter({ room_id: room.id }, "-updated_date", 200);
    setTasks(ts);
    const aiList = room.ai_ids?.length ? await base44.entities.TrainedAI.filter({ id: room.ai_ids[0] }, "-updated_date", 50) : await base44.entities.TrainedAI.list("-updated_date", 50);
    setAis(aiList);
  };

  useEffect(() => { loadRooms(); }, []);
  useEffect(() => { if (selected) loadDetails(selected); }, [selected?.id]);

  const onCreated = (room) => {
    setRooms(prev => [room, ...prev]);
    setSelected(room);
  };

  const refreshTasks = () => loadDetails(selected);

  const moveTask = async (task, to) => {
    await base44.entities.CollabTask.update(task.id, { column: to });
    setTasks(prev => prev.map(x => x.id === task.id ? { ...x, column: to } : x));
    if (to === 'build' && selected) {
      runBuildAutomation(selected, task);
    }
  };

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--soft-gray)' }}>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--primary-navy)' }}>Synthesizer</h1>
          <Button variant="outline" onClick={loadRooms}>Refresh</Button>
        </div>

        <SpectrumCreator onCreated={onCreated} />

        <Card className="border-0 shadow">
          <CardHeader>
            <CardTitle className="text-lg">Spectra</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-3">
            {rooms.map(r => (
              <button key={r.id} className={`p-3 border rounded text-left ${selected?.id===r.id? 'bg-white':'bg-white/80'}`} onClick={()=>setSelected(r)}>
                <div className="font-semibold">{r.name}</div>
                <div className="text-xs text-gray-600">{(r.domain_tags||[]).join(', ')}</div>
              </button>
            ))}
          </CardContent>
        </Card>

        {selected && (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-semibold" style={{ color: 'var(--primary-navy)' }}>{selected.name}</h2>
              {(selected.domain_tags||[]).map((t,i)=>(<Badge key={i} variant="outline">{t}</Badge>))}
            </div>

            <PlanPanel room={selected} onTasksCreated={refreshTasks} />
            <MoneyPanel room={selected} />

            <KanbanBoard room={selected} tasks={tasks} onCreate={async (data)=>{ const t = await base44.entities.CollabTask.create(data); setTasks(prev=>[t,...prev]); }} onMove={moveTask} />

            <div className="grid md:grid-cols-2 gap-4">
              <PingPanel room={selected} ais={ais} defaultDomain={selected.default_domain} />
              <ProblemTree agentIds={selected.agent_ids||[]} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}