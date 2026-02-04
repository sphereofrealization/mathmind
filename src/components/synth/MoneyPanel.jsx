import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function MoneyPanel({ room }) {
  const [budgets, setBudgets] = useState({}); // agent_id -> budget
  const [loading, setLoading] = useState(false);
  const [reqAmount, setReqAmount] = useState(25);
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    const load = async () => {
      if (!room?.agent_ids?.length) { setBudgets({}); setRequests([]); return; }
      const list = await Promise.all(room.agent_ids.map(id => base44.entities.AgentBudget.filter({ agent_id: id }, "-updated_date", 1)));
      const map = {};
      room.agent_ids.forEach((id, i) => { map[id] = (list[i] && list[i][0]) || { agent_id: id, cap_period: 'monthly', cap_amount: 100, auto_approve_threshold: 10, spent_current_period: 0 }; });
      setBudgets(map);
      const reqs = await base44.entities.BudgetApprovalRequest.filter({ agent_id: room.agent_ids[0] }, "-updated_date", 20);
      setRequests(reqs);
    };
    load();
  }, [room?.id]);

  const save = async (id) => {
    const b = budgets[id];
    if (b.id) {
      const upd = await base44.entities.AgentBudget.update(b.id, { cap_period: b.cap_period, cap_amount: Number(b.cap_amount)||0, auto_approve_threshold: Number(b.auto_approve_threshold)||0 });
      setBudgets(prev => ({ ...prev, [id]: upd }));
    } else {
      const created = await base44.entities.AgentBudget.create({ agent_id: id, cap_period: b.cap_period, cap_amount: Number(b.cap_amount)||0, auto_approve_threshold: Number(b.auto_approve_threshold)||0, period_start_date: new Date().toISOString() });
      setBudgets(prev => ({ ...prev, [id]: created }));
    }
  };

  const request = async () => {
    if (!room?.agent_ids?.length) return;
    const r = await base44.entities.BudgetApprovalRequest.create({
      agent_id: room.agent_ids[0],
      amount: Number(reqAmount)||0,
      action_type: 'revenue_experiment',
      connector: 'generic',
      status: 'pending',
      requested_at: new Date().toISOString(),
      reason: `Spectrum ${room.name} experiment`
    });
    setRequests(prev => [r, ...prev]);
  };

  return (
    <Card className="border-0 shadow">
      <CardHeader>
        <CardTitle className="text-base">Capital & Approvals</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!room?.agent_ids?.length ? (
          <div className="text-sm text-gray-500">No agents in this spectrum.</div>
        ) : (
          <div className="space-y-2">
            {room.agent_ids.map(id => (
              <div key={id} className="p-3 bg-white border rounded text-sm">
                <div className="font-medium">Agent {id}</div>
                <div className="grid md:grid-cols-4 gap-2 mt-2">
                  <select className="border rounded px-2 py-1" value={budgets[id]?.cap_period||'monthly'} onChange={e=>setBudgets(prev=>({...prev,[id]:{...prev[id],cap_period:e.target.value}}))}>
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                    <option value="daily">Daily</option>
                  </select>
                  <Input type="number" value={budgets[id]?.cap_amount||0} onChange={e=>setBudgets(prev=>({...prev,[id]:{...prev[id],cap_amount:e.target.value}}))} placeholder="Cap amount" />
                  <Input type="number" value={budgets[id]?.auto_approve_threshold||0} onChange={e=>setBudgets(prev=>({...prev,[id]:{...prev[id],auto_approve_threshold:e.target.value}}))} placeholder="Auto-approve under" />
                  <Button onClick={()=>save(id)}>Save</Button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <Input type="number" value={reqAmount} onChange={e=>setReqAmount(e.target.value)} className="w-40" />
          <Button onClick={request}>Request Approval</Button>
        </div>
        <div className="space-y-2">
          {requests.map(r => (
            <div key={r.id} className="p-2 border rounded bg-white text-xs">{r.status.toUpperCase()} • ${r.amount} • {r.action_type}</div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}