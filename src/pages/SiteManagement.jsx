
import React, { useEffect, useState } from "react";
import { AdminSettings } from "@/entities/AdminSettings";
import { DepositAddress } from "@/entities/DepositAddress";
import { SiteToken } from "@/entities/SiteToken";
import { TokenOrder } from "@/entities/TokenOrder";
import { User } from "@/entities/User";
import { ChainConfig } from "@/entities/ChainConfig";
import { SolanaDeposit } from "@/entities/SolanaDeposit";
import { SolanaWithdrawal } from "@/entities/SolanaWithdrawal";
import { FruitlesTransaction } from "@/entities/FruitlesTransaction"; // Added FruitlesTransaction import
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Settings, Shield, Wallet, Coins, CheckCircle2, Copy, Plus, FileSearch } from "lucide-react";
import { motion } from "framer-motion";
import _ from "lodash";

export default function SiteManagementPage() {
  const [me, setMe] = useState(null);
  const [allowed, setAllowed] = useState(false);
  const [settings, setSettings] = useState(null);
  const [emailsText, setEmailsText] = useState("");
  const [xpub, setXpub] = useState("");

  const [addrLabel, setAddrLabel] = useState("");
  const [addrValue, setAddrValue] = useState("");
  const [addresses, setAddresses] = useState([]);

  const [tokens, setTokens] = useState([]);
  const [newToken, setNewToken] = useState({ name: "", description: "", price_sats: "", max_supply: "" });

  const [orders, setOrders] = useState([]);
  const [txids, setTxids] = useState({}); // {orderId: txid}
  const [seedPhrase, setSeedPhrase] = useState(""); // local-only, never saved
  const [bulkAddrText, setBulkAddrText] = useState(""); // one address per line

  // NEW: Solana bridge state
  const [chainCfg, setChainCfg] = useState(null);
  const [cfgForm, setCfgForm] = useState({ network: "devnet", mint_address: "", decimals: 6, custody_address: "", fee_bps: 0, min_withdraw: 1, max_withdraw: 0, withdraw_enabled: true, deposit_enabled: true, explorer_base_url: "" });
  const [solDeposits, setSolDeposits] = useState([]);
  const [solWithdrawals, setSolWithdrawals] = useState([]);
  const [wdTxids, setWdTxids] = useState({});

  const loadAll = async () => {
    let user = null;
    try { user = await User.me(); } catch {}
    setMe(user);
    const s = await AdminSettings.list("-created_date", 1);
    const cfg = s && s[0] ? s[0] : null;
    setSettings(cfg);
    setEmailsText((cfg?.allowed_admin_emails || []).join(", "));
    setXpub(cfg?.watch_only_xpub || "");
    const addrs = await DepositAddress.list("-created_date", 500);
    setAddresses(addrs);
    const tks = await SiteToken.list("-created_date", 100);
    setTokens(tks);
    const ods = await TokenOrder.list("-created_date", 200);
    setOrders(ods);

    // NEW: Load Solana chain config
    const cfgs = await ChainConfig.list("-created_date", 1);
    const solCfg = cfgs && cfgs[0] ? cfgs[0] : null;
    setChainCfg(solCfg);
    if (solCfg) {
      setCfgForm({
        network: solCfg.network || "devnet",
        mint_address: solCfg.mint_address || "",
        decimals: solCfg.decimals || 6,
        custody_address: solCfg.custody_address || "",
        fee_bps: solCfg.fee_bps || 0,
        min_withdraw: solCfg.min_withdraw || 1,
        max_withdraw: solCfg.max_withdraw || 0,
        withdraw_enabled: !!solCfg.withdraw_enabled,
        deposit_enabled: !!solCfg.deposit_enabled,
        explorer_base_url: solCfg.explorer_base_url || ""
      });
    }

    // NEW: Load Solana deposits and withdrawals
    const deps = await SolanaDeposit.list("-created_date", 200);
    const wds = await SolanaWithdrawal.list("-created_date", 200);
    setSolDeposits(deps || []);
    setSolWithdrawals(wds || []);

    // access control: role admin OR email in allowed_admin_emails
    const ok = !!(user && (user.role === "admin" || (cfg?.allowed_admin_emails || []).includes(user.email)));
    setAllowed(ok);
  };

  useEffect(() => { loadAll(); }, []);

  const saveSettings = async () => {
    const arr = emailsText.split(",").map(e => e.trim()).filter(Boolean);
    if (settings?.id) {
      const upd = await AdminSettings.update(settings.id, { allowed_admin_emails: arr, watch_only_xpub: xpub });
      setSettings(upd);
    } else {
      const created = await AdminSettings.create({ allowed_admin_emails: arr, watch_only_xpub: xpub });
      setSettings(created);
    }
    alert("Settings saved.");
    loadAll();
  };

  const addAddress = async () => {
    if (!addrValue) return alert("Enter an address.");
    await DepositAddress.create({ address: addrValue, label: addrLabel || "" });
    setAddrLabel(""); setAddrValue("");
    loadAll();
  };

  const toggleTokenActive = async (t) => {
    const upd = await SiteToken.update(t.id, { active: !t.active });
    setTokens(prev => prev.map(x => x.id === t.id ? upd : x));
  };

  const createToken = async () => {
    if (!newToken.name || !newToken.price_sats) return alert("Name and price are required.");
    const payload = {
      name: newToken.name,
      description: newToken.description || "",
      price_sats: parseInt(newToken.price_sats || "0", 10),
      active: true,
      max_supply: parseInt(newToken.max_supply || "0", 10) || 0,
      sold: 0
    };
    const created = await SiteToken.create(payload);
    setTokens([created, ...tokens]);
    setNewToken({ name: "", description: "", price_sats: "", max_supply: "" });
  };

  const markPaid = async (order) => {
    const tx = (txids[order.id] || "").trim();
    if (!tx) return alert("Enter a TXID first.");
    await TokenOrder.update(order.id, { status: "paid", txid: tx });
    // free: increment sold (best-effort)
    const tk = tokens.find(t => t.id === order.token_id);
    if (tk) {
      await SiteToken.update(tk.id, { sold: (tk.sold || 0) + 1 });
    }
    alert("Order marked paid.");
    setTxids(prev => ({ ...prev, [order.id]: "" }));
    loadAll();
  };

  const addBulkAddresses = async () => {
    const lines = (bulkAddrText || "")
      .split(/\r?\n/)
      .map(s => s.trim())
      .filter(Boolean);
    if (lines.length === 0) return alert("Paste one address per line first.");
    const max = Math.min(lines.length, 200);
    for (let i = 0; i < max; i++) {
      await DepositAddress.create({ address: lines[i], label: "" });
    }
    setBulkAddrText("");
    loadAll();
  };

  // NEW: Solana bridge functions
  const saveChainCfg = async () => {
    if (chainCfg?.id) {
      const upd = await ChainConfig.update(chainCfg.id, { chain: "solana", ...cfgForm });
      setChainCfg(upd);
    } else {
      const created = await ChainConfig.create({ chain: "solana", ...cfgForm });
      setChainCfg(created);
    }
    alert("On-chain configuration saved.");
    loadAll();
  };

  const creditDeposit = async (d) => {
    // IMPORTANT: This creates a transaction in Fruitles' internal ledger.
    // Ensure the `FruitlesTransaction` entity and associated backend logic exist.
    await FruitlesTransaction.create({
      from_email: "system@fruitles",
      to_email: d.user_email,
      amount: d.amount, // amount received in the deposit
      reason: "sol_deposit_credit"
    });
    await SolanaDeposit.update(d.id, { status: "credited" });
    alert(`Deposit from ${d.user_email} credited with ${d.amount} units.`);
    loadAll();
  };

  const rejectDeposit = async (d) => {
    await SolanaDeposit.update(d.id, { status: "rejected" });
    alert(`Deposit from ${d.user_email} rejected.`);
    loadAll();
  };

  const markWithdrawalSent = async (w) => {
    const tx = (wdTxids[w.id] || "").trim();
    if (!tx) { alert("Enter TXID first."); return; }
    await SolanaWithdrawal.update(w.id, { status: "sent", txid: tx });
    setWdTxids(prev => ({ ...prev, [w.id]: "" }));
    alert(`Withdrawal to ${w.to_address} marked as sent with TXID: ${tx}`);
    loadAll();
  };

  const cancelWithdrawal = async (w) => {
    // IMPORTANT: This refunds the user by creating a transaction in Fruitles' internal ledger.
    // Ensure the `FruitlesTransaction` entity and associated backend logic exist.
    await FruitlesTransaction.create({
      from_email: "system@fruitles",
      to_email: w.user_email,
      amount: Number(w.amount || 0) + Number(w.fee || 0), // refund amount + fee
      reason: "sol_withdraw_refund"
    });
    await SolanaWithdrawal.update(w.id, { status: "cancelled" });
    alert(`Withdrawal to ${w.to_address} cancelled and refunded to ${w.user_email}.`);
    loadAll();
  };

  if (!me) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center" style={{ backgroundColor: 'var(--soft-gray)' }}>
        <Card className="max-w-md w-full shadow-lg border-0">
          <CardHeader><CardTitle>Loading...</CardTitle></CardHeader>
          <CardContent>Please sign in.</CardContent>
        </Card>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center" style={{ backgroundColor: 'var(--soft-gray)' }}>
        <Card className="max-w-xl w-full shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" /> Access Restricted
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>This section is restricted to site administrators.</p>
            <p className="text-sm text-gray-500">Your account: {me.email}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: 'var(--soft-gray)' }}>
      <div className="max-w-6xl mx-auto space-y-8">
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold flex items-center gap-2" style={{ color: 'var(--primary-navy)' }}>
            <Settings className="w-6 h-6" /> Site Management
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Admin-only controls for payments and token sales.</p>
        </motion.div>

        <Alert className="border-amber-300 bg-amber-50">
          <AlertDescription>
            Never store or paste your Bitcoin seed phrase here. Use a watch-only approach. Provide an XPUB or upload pre-derived deposit addresses.
          </AlertDescription>
        </Alert>

        {/* NEW: Seed phrase (local-only) + bulk address import */}
        <Card className="shadow-lg border-0">
          <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" /> Wallet Seed & Addresses</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-amber-300 bg-amber-50">
              <AlertDescription>
                Never store your seed phrase here. This field is local-only and not saved. For production, use a watch-only XPUB and pre-derived deposit addresses.
              </AlertDescription>
            </Alert>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Seed phrase (12 words, local-only; not saved)</Label>
                <Textarea
                  rows={3}
                  value={seedPhrase}
                  onChange={(e) => setSeedPhrase(e.target.value)}
                  placeholder="alpha beta gamma ... (never stored)"
                />
                <div className="text-xs text-gray-500">
                  Address derivation from seed in-browser requires backend/crypto support. Use Bulk add to import derived addresses.
                </div>
              </div>
              <div className="space-y-2">
                <Label>Bulk add derived addresses (one per line)</Label>
                <Textarea
                  rows={6}
                  value={bulkAddrText}
                  onChange={(e) => setBulkAddrText(e.target.value)}
                  placeholder="bc1q...1
bc1q...2
bc1q...3"
                />
                <div className="flex gap-2">
                  <Button onClick={addBulkAddresses}><Plus className="w-4 h-4 mr-1" /> Add addresses</Button>
                  <Button variant="outline" onClick={() => setBulkAddrText("")}>Clear</Button>
                </div>
                <div className="text-xs text-gray-500">
                  Tip: derive receive addresses from your seed in an external wallet (watch-only), then paste them here.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0">
          <CardHeader><CardTitle className="flex items-center gap-2"><Wallet className="w-5 h-5" /> Wallet Settings (watch-only)</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Allowed admin emails (comma separated)</Label>
              <Input value={emailsText} onChange={(e) => setEmailsText(e.target.value)} placeholder="owner@example.com, teammate@example.com" />
            </div>
            <div className="space-y-2">
              <Label>XPUB (watch-only)</Label>
              <Input value={xpub} onChange={(e) => setXpub(e.target.value)} placeholder="xpub... (optional)" />
            </div>
            <div className="md:col-span-2">
              <Button onClick={saveSettings} className="text-white" style={{ backgroundColor: 'var(--accent-gold)' }}>Save Settings</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0">
          <CardHeader><CardTitle className="flex items-center gap-2"><Wallet className="w-5 h-5" /> Deposit Address Pool</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-3">
              <div className="space-y-1"><Label>Address</Label><Input value={addrValue} onChange={(e) => setAddrValue(e.target.value)} placeholder="bc1..." /></div>
              <div className="space-y-1"><Label>Label/Path</Label><Input value={addrLabel} onChange={(e) => setAddrLabel(e.target.value)} placeholder="m/84'/0'/0'/0/23" /></div>
              <div className="space-y-1"><Label className="opacity-0">.</Label><Button onClick={addAddress}>Add</Button></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {addresses.map(a => (
                <div key={a.id} className="border rounded-lg p-3 bg-white">
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <div className="font-mono">{a.address}</div>
                      {a.label && <div className="text-xs text-gray-500">{a.label}</div>}
                    </div>
                    <Badge variant="outline" className={a.used ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                      {a.used ? "Assigned" : "Available"}
                    </Badge>
                  </div>
                  {a.assigned_order_id && <div className="text-xs text-gray-500 mt-1">Order: {a.assigned_order_id}</div>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* NEW: On-Chain (Solana) Config */}
        <Card className="shadow-lg border-0">
          <CardHeader><CardTitle className="flex items-center gap-2"><Wallet className="w-5 h-5" /> On-Chain (Solana) Configuration</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Network</Label>
              <select className="w-full border rounded-md p-2" value={cfgForm.network} onChange={(e) => setCfgForm({ ...cfgForm, network: e.target.value })}>
                <option value="devnet">devnet</option>
                <option value="mainnet">mainnet</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Mint address</Label>
              <Input value={cfgForm.mint_address} onChange={(e) => setCfgForm({ ...cfgForm, mint_address: e.target.value })} placeholder="SPL mint address" />
            </div>
            <div className="space-y-1">
              <Label>Decimals</Label>
              <Input type="number" value={cfgForm.decimals} onChange={(e) => setCfgForm({ ...cfgForm, decimals: parseInt(e.target.value || "6", 10) })} />
            </div>
            <div className="space-y-1">
              <Label>Custody address</Label>
              <Input value={cfgForm.custody_address} onChange={(e) => setCfgForm({ ...cfgForm, custody_address: e.target.value })} placeholder="SPL custody token account" />
            </div>
            <div className="space-y-1">
              <Label>Withdrawal fee (bps)</Label>
              <Input type="number" value={cfgForm.fee_bps} onChange={(e) => setCfgForm({ ...cfgForm, fee_bps: parseInt(e.target.value || "0", 10) })} />
            </div>
            <div className="space-y-1">
              <Label>Min withdraw</Label>
              <Input type="number" value={cfgForm.min_withdraw} onChange={(e) => setCfgForm({ ...cfgForm, min_withdraw: parseFloat(e.target.value || "0") })} />
            </div>
            <div className="space-y-1">
              <Label>Max withdraw (0 = no max)</Label>
              <Input type="number" value={cfgForm.max_withdraw} onChange={(e) => setCfgForm({ ...cfgForm, max_withdraw: parseFloat(e.target.value || "0") })} />
            </div>
            <div className="flex items-center gap-2">
              <Label className="mt-1">Enable deposits</Label>
              <input type="checkbox" checked={cfgForm.deposit_enabled} onChange={(e) => setCfgForm({ ...cfgForm, deposit_enabled: e.target.checked })} />
            </div>
            <div className="flex items-center gap-2">
              <Label className="mt-1">Enable withdrawals</Label>
              <input type="checkbox" checked={cfgForm.withdraw_enabled} onChange={(e) => setCfgForm({ ...cfgForm, withdraw_enabled: e.target.checked })} />
            </div>
            <div className="space-y-1 md:col-span-3">
              <Label>Explorer base URL (optional)</Label>
              <Input value={cfgForm.explorer_base_url} onChange={(e) => setCfgForm({ ...cfgForm, explorer_base_url: e.target.value })} placeholder="https://explorer.solana.com/tx/" />
            </div>
            <div className="md:col-span-3">
              <Button onClick={saveChainCfg} className="text-white" style={{ backgroundColor: 'var(--accent-gold)' }}>Save On-Chain Config</Button>
            </div>
          </CardContent>
        </Card>

        {/* NEW: On-Chain Operations */}
        <Card className="shadow-lg border-0">
          <CardHeader><CardTitle className="flex items-center gap-2"><Coins className="w-5 h-5" /> On-Chain Operations</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            {/* Deposits */}
            <div>
              <div className="font-semibold mb-2">Solana Deposits (latest)</div>
              {solDeposits.length === 0 ? <div className="text-sm text-gray-500">No Solana deposits yet.</div> : null}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {solDeposits.slice(0, 20).map(d => (
                  <div key={d.id} className="border rounded-lg p-3 bg-white">
                    <div className="text-sm">
                      <div className="font-medium">Amount: {d.amount} • User: {d.user_email}</div>
                      {d.txid && <div className="text-xs text-gray-500">TXID: <span className="font-mono">{d.txid}</span></div>}
                      <div className="text-xs text-gray-500">From: {d.from_address || "—"} → To: {d.to_address || "—"}</div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <Badge variant="outline" className={
                        d.status === "credited" ? "bg-green-100 text-green-800" :
                        d.status === "rejected" ? "bg-red-100 text-red-800" :
                        d.status === "confirmed" ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800"
                      }>{_.startCase(d.status)}</Badge>
                      <div className="flex gap-2">
                        {d.status === "confirmed" && ( // Only allow credit/reject for 'confirmed' deposits
                          <>
                            <Button size="sm" onClick={() => creditDeposit(d)}>Credit</Button>
                            <Button size="sm" variant="outline" onClick={() => rejectDeposit(d)}>Reject</Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Withdrawals */}
            <div>
              <div className="font-semibold mb-2">Solana Withdrawals (latest)</div>
              {solWithdrawals.length === 0 ? <div className="text-sm text-gray-500">No Solana withdrawals yet.</div> : null}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {solWithdrawals.slice(0, 20).map(w => (
                  <div key={w.id} className="border rounded-lg p-3 bg-white">
                    <div className="text-sm">
                      <div className="font-medium">Amount: {w.amount} (+ fee {w.fee || 0}) • User: {w.user_email}</div>
                      <div className="text-xs text-gray-500">To: {w.to_address}</div>
                      {w.txid && <div className="text-xs text-gray-500">TXID: <span className="font-mono">{w.txid}</span></div>}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <Badge variant="outline" className={
                        w.status === "sent" ? "bg-green-100 text-green-800" :
                        w.status === "failed" ? "bg-red-100 text-red-800" :
                        w.status === "cancelled" ? "bg-gray-100 text-gray-800" : "bg-amber-100 text-amber-800"
                      }>{_.startCase(w.status)}</Badge>
                      <div className="flex gap-2">
                        {w.status === "pending" && ( // Only allow actions for 'pending' withdrawals
                          <>
                            <Input placeholder="TXID" value={wdTxids[w.id] || ""} onChange={(e) => setWdTxids(prev => ({ ...prev, [w.id]: e.target.value }))} className="w-40" />
                            <Button size="sm" onClick={() => markWithdrawalSent(w)}>Mark sent</Button>
                            <Button size="sm" variant="outline" onClick={() => cancelWithdrawal(w)}>Cancel & refund</Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </CardContent>
        </Card>

        <Card className="shadow-lg border-0">
          <CardHeader><CardTitle className="flex items-center gap-2"><Coins className="w-5 h-5" /> Tokens for Sale</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-4 gap-3">
              <div className="space-y-1"><Label>Name</Label><Input value={newToken.name} onChange={(e) => setNewToken({ ...newToken, name: e.target.value })} /></div>
              <div className="space-y-1"><Label>Price (sats)</Label><Input type="number" value={newToken.price_sats} onChange={(e) => setNewToken({ ...newToken, price_sats: e.target.value })} /></div>
              <div className="space-y-1"><Label>Max supply (0=∞)</Label><Input type="number" value={newToken.max_supply} onChange={(e) => setNewToken({ ...newToken, max_supply: e.target.value })} /></div>
              <div className="space-y-1"><Label className="opacity-0">.</Label><Button onClick={createToken} className="w-full"><Plus className="w-4 h-4 mr-1" /> Add</Button></div>
              <div className="md:col-span-4 space-y-1"><Label>Description</Label><Textarea rows={3} value={newToken.description} onChange={(e) => setNewToken({ ...newToken, description: e.target.value })} /></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {tokens.map(t => (
                <div key={t.id} className="border rounded-lg p-3 bg-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{t.name}</div>
                      <div className="text-sm text-gray-600">{t.description}</div>
                      <div className="text-xs text-gray-500 mt-1">Price: {t.price_sats} sats • Sold: {t.sold || 0} • {t.max_supply ? `Max: ${t.max_supply}` : "Unlimited"}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={t.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>{t.active ? "Active" : "Inactive"}</Badge>
                      <Button size="sm" variant="outline" onClick={() => toggleTokenActive(t)}>{t.active ? "Disable" : "Enable"}</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0">
          <CardHeader><CardTitle className="flex items-center gap-2"><FileSearch className="w-5 h-5" /> Orders & Payments</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {orders.length === 0 ? <div className="text-sm text-gray-500">No orders yet.</div> : null}
            {orders.map(o => {
              const t = tokens.find(x => x.id === o.token_id);
              return (
                <div key={o.id} className="border rounded-lg p-3 bg-white">
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <div className="font-medium">{t ? t.name : "Token"} • {o.expected_amount_sats} sats</div>
                      <div className="text-xs text-gray-500">Buyer: {o.buyer_email || "—"} • Address: <span className="font-mono">{o.address || "—"}</span></div>
                      {o.txid && <div className="text-xs text-gray-500">TXID: <span className="font-mono">{o.txid}</span></div>}
                    </div>
                    <Badge variant="outline" className={
                      o.status === "paid" ? "bg-green-100 text-green-800" :
                      o.status === "under_review" ? "bg-amber-100 text-amber-800" :
                      o.status === "cancelled" ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-800"
                    }>{_.startCase(o.status)}</Badge>
                  </div>
                  {o.status !== "paid" && (
                    <div className="grid md:grid-cols-3 gap-2 mt-2">
                      <Input placeholder="TXID (after you verify on chain)" value={txids[o.id] || ""} onChange={(e) => setTxids(prev => ({ ...prev, [o.id]: e.target.value }))} />
                      <Button variant="outline" onClick={() => markPaid(o)} className="gap-1"><CheckCircle2 className="w-4 h-4 mr-1" /> Mark paid</Button>
                      <Button variant="outline" onClick={() => navigator.clipboard?.writeText(o.address || "")} className="gap-1"><Copy className="w-4 h-4 mr-1" /> Copy address</Button>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Alert className="border-blue-300 bg-blue-50">
          <AlertDescription>
            Blockchain monitor: To auto-detect paid invoices, enable backend functions and integrate a block explorer (e.g., Blockstream API) to poll addresses and update TokenOrder status. This UI is ready to consume those updates.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
