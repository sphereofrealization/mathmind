import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function ProblemTree({ agentIds }) {
  const [problems, setProblems] = useState([]);
  const [attemptsByProblem, setAttemptsByProblem] = useState({});

  useEffect(() => {
    const load = async () => {
      if (!agentIds || agentIds.length === 0) { setProblems([]); setAttemptsByProblem({}); return; }
      const list = await base44.entities.Problem.filter({ agent_id: agentIds[0] }, "-updated_date", 50);
      setProblems(list);
      const allAttemptLists = await Promise.all(list.map(p => base44.entities.ProblemAttempt.filter({ problem_id: p.id }, "-created_date", 20)));
      const map = {};
      list.forEach((p, i) => { map[p.id] = allAttemptLists[i] || []; });
      setAttemptsByProblem(map);
    };
    load();
  }, [JSON.stringify(agentIds)]);

  return (
    <Card className="border-0 shadow">
      <CardHeader>
        <CardTitle className="text-base">Problem → Attempt Tree</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {problems.length === 0 ? (
          <div className="text-sm text-gray-500">No problems yet.</div>
        ) : (
          <div className="space-y-3">
            {problems.map(p => (
              <div key={p.id} className="p-3 bg-white border rounded">
                <div className="text-sm font-semibold">{p.title || p.statement?.slice(0,80) || 'Problem'}</div>
                <div className="text-xs text-gray-600 mb-2">{p.difficulty} • {p.status}</div>
                <div className="pl-3 border-l space-y-2">
                  {(attemptsByProblem[p.id]||[]).map(a => (
                    <div key={a.id} className="text-xs">
                      <div className="font-medium">Attempt: {a.result} {typeof a.confidence==='number' ? `• conf ${a.confidence}` : ''}</div>
                      {a.approach && <div className="text-gray-600 whitespace-pre-wrap">{a.approach.slice(0,240)}</div>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}