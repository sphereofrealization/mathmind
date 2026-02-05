import React, { useEffect, useMemo, useState } from "react";
import { SiteAgent } from "@/entities/SiteAgent";
import { AgentWallet } from "@/entities/AgentWallet";
import { SiteAgentLog } from "@/entities/SiteAgentLog";
import { MathBook } from "@/entities/MathBook";
import { BookAsset } from "@/entities/BookAsset";
import { BookListing } from "@/entities/BookListing";
import { TrainedAI } from "@/entities/TrainedAI";
import { AIAsset } from "@/entities/AIAsset";
import { MarketplaceListing } from "@/entities/MarketplaceListing";
import { User } from "@/entities/User";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import AssetAvatar from "../components/assets/AssetAvatar";
import { Play, Square, RefreshCw, BookOpen, Cpu, Tag, List, Terminal, Coins } from "lucide-react";

export default function AgentProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const agentId = urlParams.get("id");

  const [agent, setAgent] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [logs, setLogs] = useState([]);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  // Local caches for assets and listings
  const [bookAssets, setBookAssets] = useState([]);
  const [aiAssets, setAIAssets] = useState([]);
  const [bookListings, setBookListings] = useState({}); // by asset_id
  const [aiListings, setAIListings] = useState({}); // by asset_id

  // Form state for listing
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [selectedAssetType, setSelectedAssetType] = useState("book"); // 'book' | 'ai'
  const [listPrice, setListPrice] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!agentId) return;
      setLoading(true);
      const user = await User.me();
      setMe(user);

      // Load agent
      const arr = await SiteAgent.filter({ id: agentId }, "-created_date", 1);
      const a = arr && arr[0];
      setAgent(a || null);

      // Ensure wallet exists
      let w = null;
      const ws = await AgentWallet.filter({ agent_id: agentId }, "-created_date", 1);
      if (ws && ws[0]) {
        w = ws[0];
      } else if (a) {
        w = await AgentWallet.create({ agent_id: agentId, owner_email: user.email });
      }
      setWallet(w);

      // Load recent logs
      const l = await SiteAgentLog.filter({ agent_id: agentId }, "-created_date", 100);
      setLogs(l || []);

      // Load assets roughly associated with this agent by name hint (best-effort)
      const allBooks = await BookAsset.list("-updated_date", 400);
      const ba = (allBooks || []).filter(x => (x.name || "").toLowerCase().includes((a?.name || "").toLowerCase()));
      setBookAssets(ba);
      const blMap = {};
      for (const b of ba) {
        const lst = await BookListing.filter({ asset_id: b.id, status: "active" }, "-created_date", 1);
        blMap[b.id] = lst && lst[0] ? lst[0] : null;
      }
      setBookListings(blMap);

      const allAI = await AIAsset.list("-updated_date", 400);
      const aa = (allAI || []).filter(x => (x.name || "").toLowerCase().includes((a?.name || "").toLowerCase()));
      setAIAssets(aa);
      const aiMap = {};
      for (const b of aa) {
        const lst = await MarketplaceListing.filter({ asset_id: b.id, status: "active" }, "-created_date", 1);
        aiMap[b.id] = lst && lst[0] ? lst[0] : null;
      }
      setAIListings(aiMap);

      setLoading(false);
    };
    load();
  }, [agentId]);

  const refreshLogs = async () => {
    const l = await SiteAgentLog.filter({ agent_id: agentId }, "-created_date", 100);
    setLogs(l || []);
  };

  const toggleLoop = async () => {
    if (!agent) return;
    const updated = await SiteAgent.update(agent.id, { loop_enabled: !agent.loop_enabled });
    setAgent(updated);
  };

  const runTick = async () => {
    if (!agent) return;
    await SiteAgent.update(agent.id, { status: "running", last_run_at: new Date().toISOString() });
    await SiteAgentLog.create({ agent_id: agent.id, type: "tick", message: `Manual tick`, summary: `Manual tick triggered`, success: true });
    await SiteAgent.update(agent.id, { status: "idle" });
    await refreshLogs();
  };

  const generateBookAndMint = async () => {
    if (!agent || !me) return;
    // Create a simple book and a tokenized asset for it
    const title = `Chronicles of ${agent.name} – Tome ${Math.floor(Math.random() * 999)}`;
    const book = await MathBook.create({ title });

    // Icon prompt seeded by book id
    let icon_url = null;
    try {
      const seed = Array.from(String(book.id || 'BOOK')).reduce((h, c) => (((h << 5) - h) + c.charCodeAt(0)) | 0, 0) >>> 0;
      const palettes = ['crimson','emerald','sapphire','amethyst','ivory','cobalt','vermilion','onyx'];
      const metals = ['gold','brass','copper','iron','silver','steel','bronze','obsidian'];
      const runes = ['arcane runes','geometric sigils','celestial glyphs','eldritch marks','alchemical symbols'];
      const bindings = ['clasp','chain','belt','strap','latch','lock'];
      const palette = palettes[seed % palettes.length];
      const metal = metals[(seed >> 3) % metals.length];
      const rune = runes[(seed >> 6) % runes.length];
      const binding = bindings[(seed >> 9) % bindings.length];
      const prompt = `16/32-bit pixel art tome of lore, ${palette} leather cover, ${metal} corners and ${binding}, ${rune}, crisp pixels, transparent background, centered, no text. Variant ${(seed % 97) + 1}.`;
      const img = await base44.integrations.Core.GenerateImage({ prompt });
      icon_url = img?.url || null;
    } catch {}

    const symbol = (agent.name || 'BOOK').replace(/[^A-Z0-9]/gi, '').slice(0, 4).toUpperCase() + Math.floor(Math.random() * 90 + 10);
    const asset = await BookAsset.create({
      book_id: book.id,
      name: title,
      symbol,
      owner_email: me.email,
      transferable: true,
      icon_url,
    });

    // Update local state
    setBookAssets(prev => [asset, ...prev]);
    setSelectedAssetId(asset.id);
    setSelectedAssetType('book');
  };

  const quickTrainAIAndMint = async () => {
    if (!agent || !me) return;
    // Create a minimal AI profile and mint an asset for it
    const aiName = `${agent.name} Learner ${Math.floor(Math.random() * 999)}`;
    const ai = await TrainedAI.create({ name: aiName });
    const symbol = (agent.name || 'AI').replace(/[^A-Z0-9]/gi, '').slice(0, 3).toUpperCase() + 'A' + Math.floor(Math.random() * 90 + 10);

    // Basic artifact-style icon
    let icon_url = null;
    try {
      const seed = Array.from(String(ai.id || 'AI')).reduce((h, c) => (((h << 5) - h) + c.charCodeAt(0)) | 0, 0) >>> 0;
      const prompt = `16/32-bit pixel art mechanical artifact core, glowing facets, transparent background, centered, no text. Variant ${(seed % 97) + 1}.`;
      const img = await base44.integrations.Core.GenerateImage({ prompt });
      icon_url = img?.url || null;
    } catch {}

    const asset = await AIAsset.create({
      ai_id: ai.id,
      name: aiName,
      symbol,
      owner_email: me.email,
      transferable: true,
      icon_url,
    });

    // Update local
    setAIAssets(prev => [asset, ...prev]);
    setSelectedAssetId(asset.id);
    setSelectedAssetType('ai');
  };

  const listSelectedAsset = async () => {
    const price = parseFloat(listPrice);
    if (!selectedAssetId || !price || price <= 0) return alert('Select an asset and enter a valid price.');
    if (!me) return;

    if (selectedAssetType === 'book') {
      await BookListing.create({ asset_id: selectedAssetId, book_id: (bookAssets.find(b => b.id === selectedAssetId) || {}).book_id, seller_email: me.email, price, currency: 'fruitles', status: 'active' });
      const lst = await BookListing.filter({ asset_id: selectedAssetId, status: 'active' }, '-created_date', 1);
      setBookListings(prev => ({ ...prev, [selectedAssetId]: lst && lst[0] ? lst[0] : null }));
    } else {
      await MarketplaceListing.create({ asset_id: selectedAssetId, ai_id: (aiAssets.find(b => b.id === selectedAssetId) || {}).ai_id, seller_email: me.email, price, currency: 'fruitles', status: 'active' });
      const lst = await MarketplaceListing.filter({ asset_id: selectedAssetId, status: 'active' }, '-created_date', 1);
      setAIListings(prev => ({ ...prev, [selectedAssetId]: lst && lst[0] ? lst[0] : null }));
    }
    setListPrice("");
  };

  const title = agent ? `Agent Profile Character Name: ${agent.name}` : "Agent Profile";

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: 'var(--soft-gray)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--primary-navy)' }}>{title}</h1>
          {agent && (
            <div className="flex gap-2">
              <Button onClick={toggleLoop} className="gap-2">
                {agent.loop_enabled ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {agent.loop_enabled ? 'Stop Loop' : 'Start Loop'}
              </Button>
              <Button variant="outline" onClick={runTick} className="gap-2">
                <RefreshCw className="w-4 h-4" /> Run Tick
              </Button>
            </div>
          )}
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="mb-4 flex flex-wrap">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="wallet">Wallet</TabsTrigger>
            <TabsTrigger value="books">Books</TabsTrigger>
            <TabsTrigger value="ais">AIs</TabsTrigger>
            <TabsTrigger value="listings">Listings</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Overview</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <div><div className="font-medium text-card-foreground">Name</div><div>{agent?.name || '-'}</div></div>
                <div><div className="font-medium text-card-foreground">Objective</div><div>{agent?.objective || '-'}</div></div>
                <div><div className="font-medium text-card-foreground">Status</div><div>{agent?.status || '-'}</div></div>
                <div><div className="font-medium text-card-foreground">Loop</div><div>{agent?.loop_enabled ? 'Enabled' : 'Disabled'}</div></div>
                <div><div className="font-medium text-card-foreground">Last Run</div><div>{agent?.last_run_at ? new Date(agent.last_run_at).toLocaleString() : '-'}</div></div>
                <div><div className="font-medium text-card-foreground">Ticks</div><div>{agent?.ticks_count ?? 0}</div></div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="wallet">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Coins className="w-5 h-5" /> Wallet</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <div><div className="font-medium text-card-foreground">Balance</div><div>{wallet?.balance ?? 0} fruitles</div></div>
                <div><div className="font-medium text-card-foreground">Total Earned</div><div>{wallet?.total_earned ?? 0}</div></div>
                <div><div className="font-medium text-card-foreground">Total Harvested</div><div>{wallet?.total_harvested ?? 0}</div></div>
                <div><div className="font-medium text-card-foreground">Last Harvest</div><div>{wallet?.last_harvest_at ? new Date(wallet.last_harvest_at).toLocaleString() : '-'}</div></div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="books">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5" /> Books</CardTitle>
              </CardHeader>
              <CardContent>
                {bookAssets.length === 0 ? (
                  <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>No associated books yet.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {bookAssets.map(b => (
                      <Card key={b.id} className="border">
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <AssetAvatar type="book" iconUrl={b.icon_url} entityType="BookAsset" entityId={b.id} seed={b.symbol || b.id} size={36} />
                            <div>
                              <div className="font-medium">{b.name}</div>
                              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{b.symbol} • Owner: {b.owner_email}</div>
                            </div>
                          </div>
                          {bookListings[b.id] ? (
                            <Badge variant="outline">Listed {bookListings[b.id].price} {bookListings[b.id].currency}</Badge>
                          ) : null}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ais">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Cpu className="w-5 h-5" /> AIs</CardTitle>
              </CardHeader>
              <CardContent>
                {aiAssets.length === 0 ? (
                  <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>No associated AIs yet.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {aiAssets.map(b => (
                      <Card key={b.id} className="border">
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <AssetAvatar type="ai" iconUrl={b.icon_url} entityType="AIAsset" entityId={b.id} seed={b.symbol || b.id} size={36} />
                            <div>
                              <div className="font-medium">{b.name}</div>
                              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{b.symbol} • Owner: {b.owner_email}</div>
                            </div>
                          </div>
                          {aiListings[b.id] ? (
                            <Badge variant="outline">Listed {aiListings[b.id].price} {aiListings[b.id].currency}</Badge>
                          ) : null}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="listings">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Tag className="w-5 h-5" /> Listings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="font-medium mb-2">Book Listings</div>
                  {Object.values(bookListings).filter(Boolean).length === 0 ? (
                    <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>No active book listings.</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {Object.entries(bookListings).map(([id, lst]) => lst ? (
                        <Card key={id}><CardContent className="p-3 text-sm flex items-center justify-between"><div>Asset {id.slice(-6)}</div><Badge variant="outline">{lst.price} {lst.currency}</Badge></CardContent></Card>
                      ) : null)}
                    </div>
                  )}
                </div>
                <Separator />
                <div>
                  <div className="font-medium mb-2">AI Listings</div>
                  {Object.values(aiListings).filter(Boolean).length === 0 ? (
                    <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>No active AI listings.</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {Object.entries(aiListings).map(([id, lst]) => lst ? (
                        <Card key={id}><CardContent className="p-3 text-sm flex items-center justify-between"><div>Asset {id.slice(-6)}</div><Badge variant="outline">{lst.price} {lst.currency}</Badge></CardContent></Card>
                      ) : null)}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Terminal className="w-5 h-5" /> Logs</CardTitle>
              </CardHeader>
              <CardContent>
                {logs.length === 0 ? (
                  <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>No logs yet.</div>
                ) : (
                  <div className="space-y-2">
                    {logs.map(l => (
                      <div key={l.id} className="text-sm p-2 border rounded">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{l.type}</div>
                          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{new Date(l.created_date).toLocaleString()}</div>
                        </div>
                        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{l.summary || l.message}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inventory">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Inventory</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {bookAssets.map(b => (
                    <Card key={b.id} className="border">
                      <CardContent className="p-4 flex items-center gap-3">
                        <AssetAvatar type="book" iconUrl={b.icon_url} entityType="BookAsset" entityId={b.id} seed={b.symbol || b.id} size={32} />
                        <div className="text-sm">
                          <div className="font-medium">{b.name}</div>
                          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{b.symbol}</div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {aiAssets.map(b => (
                    <Card key={b.id} className="border">
                      <CardContent className="p-4 flex items-center gap-3">
                        <AssetAvatar type="ai" iconUrl={b.icon_url} entityType="AIAsset" entityId={b.id} seed={b.symbol || b.id} size={32} />
                        <div className="text-sm">
                          <div className="font-medium">{b.name}</div>
                          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{b.symbol}</div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="actions">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-wrap gap-2">
                  <Button onClick={generateBookAndMint} className="gap-2"><BookOpen className="w-4 h-4" /> Generate Book</Button>
                  <Button onClick={quickTrainAIAndMint} variant="secondary" className="gap-2"><Cpu className="w-4 h-4" /> Train AI</Button>
                </div>
                <div className="border rounded p-3">
                  <div className="font-medium mb-2">List asset for sale</div>
                  <div className="flex flex-col md:flex-row gap-2">
                    <select className="border rounded px-2 py-2" value={selectedAssetType} onChange={e => setSelectedAssetType(e.target.value)}>
                      <option value="book">Book</option>
                      <option value="ai">AI</option>
                    </select>
                    <select className="border rounded px-2 py-2 flex-1" value={selectedAssetId} onChange={e => setSelectedAssetId(e.target.value)}>
                      <option value="">Select asset…</option>
                      {(selectedAssetType === 'book' ? bookAssets : aiAssets).map(a => (
                        <option key={a.id} value={a.id}>{a.name} ({a.symbol})</option>
                      ))}
                    </select>
                    <Input type="number" min="0" step="0.01" placeholder="Price (fruitles)" value={listPrice} onChange={e => setListPrice(e.target.value)} />
                    <Button onClick={listSelectedAsset} className="gap-2"><Tag className="w-4 h-4" /> List</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}