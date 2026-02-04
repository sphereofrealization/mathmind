import React, { useEffect, useState } from "react";
import { TrainedAI } from "@/entities/TrainedAI";
import { AIModelProfile } from "@/entities/AIModelProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Save, Palette, Brain, Settings, BookOpen } from "lucide-react";
import StyleGenerator from "@/components/modelstudio/StyleGenerator";
import SeedExampleEditor from "@/components/modelstudio/SeedExampleEditor";

export default function ModelStudio() {
  const [ais, setAis] = useState([]);
  const [selectedAI, setSelectedAI] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const ready = await TrainedAI.filter({ training_status: "completed" });
      setAis(ready);
      setLoading(false);
    };
    load();
  }, []);

  const loadProfile = async (ai) => {
    if (!ai) return;
    const existing = await AIModelProfile.filter({ ai_id: ai.id }, "-updated_date", 1);
    if (existing && existing[0]) {
      setProfile(existing[0]);
    } else {
      setProfile({
        ai_id: ai.id,
        name: `${ai.name} – Default Profile`,
        articulation: "analytical",
        personality_strength: 0.7,
        style_guide: ai.response_style || "",
        seed_examples: [],
        target_model_hint: "",
        temperature: 0.7,
        max_tokens: 800,
        use_chunks: true,
        use_learnings: true
      });
    }
  };

  const saveProfile = async () => {
    if (!profile?.ai_id || !profile?.name) {
      alert("Profile needs a name.");
      return;
    }
    setSaving(true);
    try {
      if (profile.id) {
        const { id, ...payload } = profile;
        await AIModelProfile.update(id, payload);
      } else {
        const created = await AIModelProfile.create(profile);
        setProfile(created);
      }
      alert("Profile saved.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: 'var(--soft-gray)' }}>
      <div className="max-w-5xl mx-auto space-y-6">
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Model Studio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Choose AI</Label>
                <Select onValueChange={(id) => {
                  const ai = ais.find(a => a.id === id);
                  setSelectedAI(ai);
                  loadProfile(ai);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder={loading ? "Loading..." : "Select AI"} />
                  </SelectTrigger>
                  <SelectContent>
                    {ais.map(ai => (
                      <SelectItem key={ai.id} value={ai.id}>{ai.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedAI && (
                <div className="space-y-2">
                  <Label>Status</Label>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-100 text-green-800">Ready</Badge>
                    <span className="text-sm text-gray-500">{selectedAI.source_books.length} documents</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {selectedAI && profile && (
          <>
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Profile Basics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Profile name</Label>
                    <Input
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      placeholder="e.g., Analytical Limbertwig"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Articulation</Label>
                    <Select
                      value={profile.articulation}
                      onValueChange={(v) => setProfile({ ...profile, articulation: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="concise">Concise</SelectItem>
                        <SelectItem value="analytical">Analytical</SelectItem>
                        <SelectItem value="teaching">Teaching</SelectItem>
                        <SelectItem value="creative">Creative</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Personality strength</Label>
                    <Input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={profile.personality_strength}
                      onChange={(e) => setProfile({ ...profile, personality_strength: parseFloat(e.target.value) })}
                    />
                    <div className="text-sm text-gray-500">{profile.personality_strength}</div>
                  </div>
                  <div className="space-y-2">
                    <Label>Target model (hint)</Label>
                    <Input
                      value={profile.target_model_hint || ""}
                      onChange={(e) => setProfile({ ...profile, target_model_hint: e.target.value })}
                      placeholder="e.g., gpt-4o, llama-3-70b"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Temperature (hint)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={profile.temperature}
                      onChange={(e) => setProfile({ ...profile, temperature: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Use knowledge chunks</Label>
                    <Switch checked={profile.use_chunks} onCheckedChange={(v) => setProfile({ ...profile, use_chunks: v })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Use learnings</Label>
                    <Switch checked={profile.use_learnings} onCheckedChange={(v) => setProfile({ ...profile, use_learnings: v })} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Style
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <StyleGenerator ai={selectedAI} value={profile.style_guide} onChange={(v) => setProfile({ ...profile, style_guide: v })} />
              </CardContent>
            </Card>

            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  Few-shot Seeds
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <SeedExampleEditor
                  examples={profile.seed_examples || []}
                  onChange={(ex) => setProfile({ ...profile, seed_examples: ex })}
                />
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={saveProfile} disabled={saving} className="text-white" style={{ backgroundColor: 'var(--accent-gold)' }}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}