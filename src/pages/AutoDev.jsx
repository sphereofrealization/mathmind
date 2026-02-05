import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Terminal, FileText, Cpu } from "lucide-react";

export default function AutoDev() {
  const [agents, setAgents] = useState([]);
  const [runs, setRuns] = useState([]);
  const [selectedRun, setSelectedRun] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const a = await base44.entities.SiteAgent.list("-updated_date", 200);
      setAgents(a || []);
      const r = await base44.entities.AutoDevRun.list("-started_at", 50);
      setRuns(r || []);
      setLoading(false);
    };
    load();
  }, []);

  const agentById = useMemo(() => Object.fromEntries((agents || []).map(a => [a.id, a])), [agents]);

  const filteredRuns = useMemo(() => {
    const q = (filter || '').toLowerCase();
    if (!q) return runs;
    return runs.filter(r => {
      const name = agentById[r.agent_id]?.name || '';
      return name.toLowerCase().includes(q);
    });
  }, [runs, filter, agentById]);

  const selectRun = async (run) => {
    setSelectedRun(run);
    const props = await base44.entities.ProposedCodeChange.filter({ run_id: run.id }, '-created_date', 100);
    setProposals(props || []);
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">AutoDev</h1>
          <div className="flex items-center gap-3">
            <Input placeholder="Filter by agent name…" value={filter} onChange={(e) => setFilter(e.target.value)} className="w-64" />
            <Button onClick={async () => { const r = await base44.entities.AutoDevRun.list('-started_at', 50); setRuns(r || []); if (selectedRun) selectRun(selectedRun); }}>Refresh</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Cpu className="w-5 h-5" /> Runs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
              ) : filteredRuns.length === 0 ? (
                <div className="text-sm text-muted-foreground">No runs yet.</div>
              ) : (
                filteredRuns.map(r => (
                  <button key={r.id} onClick={() => selectRun(r)} className={`w-full text-left p-2 border rounded hover:bg-accent ${selectedRun?.id === r.id ? 'bg-accent' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{agentById[r.agent_id]?.name || r.agent_id}</div>
                      <Badge variant={r.status === 'completed' ? 'default' : r.status === 'error' ? 'destructive' : 'secondary'}>{r.status}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">{new Date(r.started_at).toLocaleString()}</div>
                    {Array.isArray(r.idea_summaries) && r.idea_summaries.length > 0 && (
                      <div className="text-xs mt-1 line-clamp-2">{r.idea_summaries.join(' • ')}</div>
                    )}
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Terminal className="w-5 h-5" /> Proposals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!selectedRun ? (
                <div className="text-sm text-muted-foreground">Select a run to view proposed code changes.</div>
              ) : proposals.length === 0 ? (
                <div className="text-sm text-muted-foreground">No proposals for this run.</div>
              ) : (
                proposals.map(p => (
                  <div key={p.id} className="p-3 border rounded">
                    <div className="flex items-center justify-between">
                      <div className="font-medium flex items-center gap-2"><FileText className="w-4 h-4" /> {p.file_path}</div>
                      <Badge variant="outline">{p.change_type}</Badge>
                    </div>
                    {p.rationale && (
                      <div className="text-xs text-muted-foreground mt-1">{p.rationale}</div>
                    )}
                    {p.find && (
                      <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto"><code>FIND:\n{p.find}</code></pre>
                    )}
                    {p.replace && (
                      <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto"><code>REPLACE WITH:\n{p.replace}</code></pre>
                    )}
                    {p.content && (
                      <details className="mt-2">
                        <summary className="text-xs cursor-pointer">New file content</summary>
                        <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto"><code>{p.content}</code></pre>
                      </details>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}