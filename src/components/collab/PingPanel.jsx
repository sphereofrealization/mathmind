import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function PingPanel({ room, ais, defaultDomain }) {
  const [prompt, setPrompt] = useState("");
  const [domain, setDomain] = useState(defaultDomain || (room?.domain_tags?.[0] || "general"));
  const [loading, setLoading] = useState(false);
  const [responses, setResponses] = useState([]); // [{ai, text, rating}]

  const aiOptions = useMemo(() => ais || [], [ais]);

  const runPing = async () => {
    if (!prompt.trim() || !room) return;
    setLoading(true);
    try {
      const schema = { type: 'object', properties: { answer: { type: 'string' } } };
      const outs = [];
      for (const ai of aiOptions) {
        const res = await base44.integrations.Core.InvokeLLM({
          prompt: `You are collaborating as AI ${ai.name}. Domain=${domain}. Respond concisely and helpfully to: ${prompt}`,
          response_json_schema: schema,
          add_context_from_internet: false
        });
        outs.push({ ai, text: res?.answer || "", rating: 0 });
      }
      setResponses(outs);
    } finally {
      setLoading(false);
    }
  };

  const saveRatings = async () => {
    for (const r of responses) {
      const existing = await base44.entities.AIEloScore.filter({ ai_id: r.ai.id, domain }, "-updated_date", 1);
      const current = existing && existing[0] ? existing[0] : null;
      const rating = current?.rating ?? 1500;
      const K = current?.k_factor ?? 32;
      // simple delta: rating += K * ( (r.rating-3)/2 )
      const S = (r.rating - 3) / 2; // -1..+1 from 1..5 stars
      const newRating = Math.max(600, Math.min(2800, rating + K * S));
      if (current) {
        await base44.entities.AIEloScore.update(current.id, {
          rating: newRating,
          games: (current.games || 0) + 1,
          last_delta: newRating - rating,
          last_update: new Date().toISOString()
        });
      } else {
        await base44.entities.AIEloScore.create({
          ai_id: r.ai.id,
          domain,
          rating: newRating,
          k_factor: 32,
          games: 1,
          last_delta: newRating - rating,
          last_update: new Date().toISOString()
        });
      }
    }
    // small reset
    setResponses(rs => rs.map(x => ({ ...x, rating: 0 })));
  };

  return (
    <Card className="border-0 shadow">
      <CardHeader>
        <CardTitle className="text-base">Ping AIs and Rate Responses</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid md:grid-cols-4 gap-3 items-end">
          <div className="md:col-span-3">
            <Textarea placeholder="Ask collaborators…" value={prompt} onChange={e=>setPrompt(e.target.value)} />
          </div>
          <div>
            <Select value={domain} onValueChange={setDomain}>
              <SelectTrigger>
                <SelectValue placeholder="Domain" />
              </SelectTrigger>
              <SelectContent>
                {(room?.domain_tags||["general"]).map((d,i)=>(<SelectItem value={d} key={i}>{d}</SelectItem>))}
              </SelectContent>
            </Select>
            <Button className="mt-2 w-full" onClick={runPing} disabled={loading}>{loading ? 'Pinging…' : 'Ping'}</Button>
          </div>
        </div>

        {responses.length > 0 && (
          <div className="space-y-3">
            {responses.map((r, i) => (
              <div key={i} className="p-3 bg-white border rounded">
                <div className="text-sm font-medium">{r.ai.name}</div>
                <div className="text-xs text-gray-700 whitespace-pre-wrap mt-1">{r.text || '—'}</div>
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <span>Rate:</span>
                  {[1,2,3,4,5].map(star => (
                    <button key={star} className={`px-2 py-1 border rounded ${r.rating>=star? 'bg-yellow-100':'bg-white'}`} onClick={()=>setResponses(prev=>prev.map((x,j)=> j===i?{...x,rating:star}:x))}>{star}</button>
                  ))}
                </div>
              </div>
            ))}
            <Button onClick={saveRatings}>Save Ratings</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}