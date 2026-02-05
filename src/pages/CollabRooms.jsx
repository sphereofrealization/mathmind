import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import GroupRoomCard from "../components/collab/GroupRoomCard";
import KanbanBoard from "../components/collab/KanbanBoard";
import ProblemTree from "../components/collab/ProblemTree";
import PingPanel from "../components/collab/PingPanel";
import { runBuildAutomation } from "../components/collab/BuildAutomation";
import { Badge } from "@/components/ui/badge";

export default function CollabRooms() {
  const [rooms, setRooms] = useState([]);
  const [selected, setSelected] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", domain_tags: "algebra, research" });
  const [ais, setAis] = useState([]);
  const [agents, setAgents] = useState([]);

  const sleep = (ms) => new Promise(res => setTimeout(res, ms));
  const withRetry = async (fn, maxRetries = 3, baseDelay = 600) => {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try { return await fn(); }
      catch (e) {
        const msg = String(e || '');
        const is429 = msg.includes('429') || msg.toLowerCase().includes('rate');
        if (!is429 || attempt === maxRetries) throw e;
        const delay = baseDelay * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  };

  const load = async () => {
    const rs = await withRetry(() => base44.entities.CollabRoom.list("-updated_date", 50));
    setRooms(rs);
    if (selected) {
      const ts = await withRetry(() => base44.entities.CollabTask.filter({ room_id: selected.id }, "-updated_date", 200));
      setTasks(ts);
      const aiList = selected.ai_ids?.length ? await withRetry(() => base44.entities.TrainedAI.filter({ id: selected.ai_ids[0] }, "-updated_date", 50)) : await withRetry(() => base44.entities.TrainedAI.list("-updated_date", 50));
      setAis(aiList);
      const agList = selected.agent_ids?.length ? await withRetry(() => base44.entities.SiteAgent.filter({ id: selected.agent_ids[0] }, "-updated_date", 50)) : await withRetry(() => base44.entities.SiteAgent.list("-updated_date", 50));
      setAgents(agList);
    }
  };

  useEffect(() => { load(); }, [selected?.id]);

  const createRoom = async () => {
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      const room = await base44.entities.CollabRoom.create({
        name: form.name.trim(),
        description: form.description.trim(),
        domain_tags: form.domain_tags.split(",").map(s=>s.trim()).filter(Boolean)
      });
      setForm({ name: "", description: "", domain_tags: "" });
      setRooms(prev => [room, ...prev]);
    } finally {
      setCreating(false);
    }
  };

  const countsForRoom = (room) => {
    const ts = tasks.filter(t => t.room_id === room.id);
    return {
      ideas: ts.filter(t=>t.column==='ideas').length,
      research: ts.filter(t=>t.column==='research').length,
      build: ts.filter(t=>t.column==='build').length,
      deploy: ts.filter(t=>t.column==='deploy').length,
    };
  };

  const createTask = async (data) => {
    const t = await withRetry(() => base44.entities.CollabTask.create(data));
    setTasks(prev => [t, ...prev]);
  };

  const moveTask = async (task, to) => {
    await base44.entities.CollabTask.update(task.id, { column: to });
    setTasks(prev => prev.map(x => x.id === task.id ? { ...x, column: to } : x));
    if (to === 'build' && selected) {
      // Fire-and-forget automation for build
      runBuildAutomation(selected, task);
    }
  };

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--soft-gray)' }}>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--primary-navy)' }}>Collab Rooms</h1>
          <Button variant="outline" onClick={load}>Refresh</Button>
        </div>

        {/* Create room */}
        <Card className="border-0 shadow">
          <CardHeader>
            <CardTitle className="text-lg">Create Room</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-3">
            <Input placeholder="Room name" value={form.name} onChange={e=>setForm(v=>({...v,name:e.target.value}))} />
            <Input placeholder="Domain tags (comma separated)" value={form.domain_tags} onChange={e=>setForm(v=>({...v,domain_tags:e.target.value}))} />
            <div className="md:col-span-3 flex gap-3 items-start">
              <Textarea placeholder="Description" value={form.description} onChange={e=>setForm(v=>({...v,description:e.target.value}))} />
              <Button onClick={createRoom} disabled={creating || !form.name.trim()}>{creating ? 'Creating…' : 'Create'}</Button>
            </div>
          </CardContent>
        </Card>

        {/* Rooms grid */}
        <div className="grid md:grid-cols-3 gap-4">
          {rooms.map(r => (
            <GroupRoomCard key={r.id} room={r} counts={countsForRoom(selected && selected.id===r.id ? { ...r, id: r.id } : r)} onSelect={setSelected} />
          ))}
        </div>

        {selected && (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-semibold" style={{ color: 'var(--primary-navy)' }}>{selected.name}</h2>
              {(selected.domain_tags||[]).map((t,i)=>(<Badge key={i} variant="outline">{t}</Badge>))}
            </div>

            <KanbanBoard room={selected} tasks={tasks.filter(t=>t.room_id===selected.id)} onCreate={createTask} onMove={moveTask} />

            <div className="grid md:grid-cols-2 gap-4">
              <ProblemTree agentIds={selected.agent_ids||[]} />
              <PingPanel room={selected} ais={ais} defaultDomain={selected.default_domain} />
            </div>

            {/* Budgets & approvals preview */}
            <Card className="border-0 shadow">
              <CardHeader>
                <CardTitle className="text-base">Budgets & Approvals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <BudgetPreview agentIds={selected.agent_ids||[]} />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

function BudgetPreview({ agentIds }) {
  const [rows, setRows] = useState([]);
  const [requests, setRequests] = useState([]);
  const [amount, setAmount] = useState(50);

  useEffect(() => {
    const load = async () => {
      if (!agentIds || agentIds.length === 0) { setRows([]); setRequests([]); return; }
      const budgets = await base44.entities.AgentBudget.filter({ agent_id: agentIds[0] }, "-updated_date", 10);
      setRows(budgets);
      const reqs = await base44.entities.BudgetApprovalRequest.filter({ agent_id: agentIds[0] }, "-updated_date", 20);
      setRequests(reqs);
    };
    load();
  }, [JSON.stringify(agentIds)]);

  const requestApproval = async () => {
    if (!agentIds || agentIds.length===0) return;
    const r = await base44.entities.BudgetApprovalRequest.create({
      agent_id: agentIds[0],
      amount: Number(amount)||0,
      action_type: 'generic_action',
      connector: 'generic',
      status: 'pending',
      requested_at: new Date().toISOString(),
      reason: 'Manual request from CollabRooms'
    });
    setRequests(prev => [r, ...prev]);
  };

  return (
    <div className="space-y-3">
      {rows.length === 0 ? (
        <div className="text-sm text-gray-500">No budget configured for these agents yet.</div>
      ) : (
        rows.map(b => (
          <div key={b.id} className="p-3 bg-white border rounded text-sm">
            <div className="font-medium">Agent {b.agent_id}</div>
            <div className="text-xs text-gray-600">Cap: {b.cap_amount} / {b.cap_period} • Auto-approve under: {b.auto_approve_threshold} • Spent: {b.spent_current_period || 0}</div>
          </div>
        ))
      )}
      <div className="flex items-center gap-2">
        <Input type="number" value={amount} onChange={e=>setAmount(e.target.value)} className="w-40" />
        <Button onClick={requestApproval}>Request Approval</Button>
      </div>
      <div className="space-y-2">
        {requests.map(r => (
          <div key={r.id} className="p-2 border rounded bg-white text-xs">{r.status.toUpperCase()} • ${r.amount} • {r.action_type}</div>
        ))}
      </div>
    </div>
  );
}