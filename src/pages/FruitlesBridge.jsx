
import React, { useEffect, useState, useCallback } from "react";
import { ChainConfig } from "@/entities/ChainConfig";
import { SolanaDeposit } from "@/entities/SolanaDeposit";
import { SolanaWithdrawal } from "@/entities/SolanaWithdrawal";
import { FruitlesTransaction } from "@/entities/FruitlesTransaction";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Coins, ArrowDownToLine, Send, Wallet } from "lucide-react";

export default function FruitlesBridge() {
  const [me, setMe] = useState(null);
  const [cfg, setCfg] = useState(null);
  const [balance, setBalance] = useState(0);
  const [wd, setWd] = useState({ amount: "", to: "" });
  const [dep, setDep] = useState({ amount: "", txid: "", from: "" });
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");

  const sum = (arr) => (arr || []).reduce((s, t) => s + (t.amount || 0), 0);

  // Wrap load with useCallback to satisfy hook deps
  const load = useCallback(async () => {
    setLoading(true);
    let user = null;
    try { user = await User.me(); } catch {}
    setMe(user);
    const c = await ChainConfig.list("-created_date", 1);
    setCfg(c && c[0] ? c[0] : null);
    if (user) {
      const myEmail = (user.email || "").toLowerCase();
      const inc = await FruitlesTransaction.filter({ to_email: myEmail }, "-created_date", 500);
      const out = await FruitlesTransaction.filter({ from_email: myEmail }, "-created_date", 500);
      setBalance(sum(inc) - sum(out));
    }
    setLoading(false);
  }, []);
  
  useEffect(() => { load(); }, [load]);

  const feeFor = (amt) => {
    const bps = Number(cfg?.fee_bps || 0);
    return Math.max(0, Math.round((Number(amt || 0)) * bps) / 10000);
  };

  const handleWithdraw = async () => {
    if (!me) { alert("Please sign in."); return; }
    if (!cfg?.withdraw_enabled) { alert("Withdrawals are currently disabled."); return; }
    const amount = Number(wd.amount);
    if (!amount || amount <= 0) { alert("Enter a valid amount."); return; }
    if (cfg?.min_withdraw && amount < Number(cfg.min_withdraw)) { alert(`Minimum withdrawal is ${cfg.min_withdraw}.`); return; }
    if (cfg?.max_withdraw && Number(cfg.max_withdraw) > 0 && amount > Number(cfg.max_withdraw)) { alert(`Maximum withdrawal is ${cfg.max_withdraw}.`); return; }
    const to = (wd.to || "").trim();
    if (!to) { alert("Enter a destination address."); return; }
    const fee = feeFor(amount);
    const totalDebit = amount + fee;
    if (totalDebit > balance) { alert(`Insufficient balance. Need ${totalDebit} including fees.`); return; }

    // Debit now and register withdrawal request
    await FruitlesTransaction.create({
      from_email: (me.email || "").toLowerCase(),
      to_email: "system@fruitles",
      amount: totalDebit,
      reason: "sol_withdraw_request"
    });
    await SolanaWithdrawal.create({
      user_email: (me.email || "").toLowerCase(),
      amount,
      fee,
      to_address: to,
      status: "pending",
      notes: note || ""
    });
    alert("Withdrawal requested. You'll see the TXID here once processed.");
    setWd({ amount: "", to: "" });
    setNote("");
    await load();
  };

  const handleDepositSubmitted = async () => {
    if (!me) { alert("Please sign in."); return; }
    if (!cfg?.deposit_enabled) { alert("Deposits are currently disabled."); return; }
    const amount = Number(dep.amount);
    if (!amount || amount <= 0) { alert("Enter a valid amount."); return; }
    await SolanaDeposit.create({
      user_email: (me.email || "").toLowerCase(),
      amount,
      token_decimals: Number(cfg?.decimals || 6),
      from_address: dep.from || "",
      to_address: cfg?.custody_address || "",
      txid: dep.txid || "",
      status: "submitted",
      notes: note || ""
    });
    alert("Deposit submitted. Admin will confirm and credit your account.");
    setDep({ amount: "", txid: "", from: "" });
    setNote("");
  };

  const [myDeps, setMyDeps] = useState([]);
  const [myWds, setMyWds] = useState([]);
  useEffect(() => {
    const loadMine = async () => {
      if (!me) return;
      const myEmail = (me.email || "").toLowerCase();
      const d = await SolanaDeposit.filter({ user_email: myEmail }, "-created_date", 50);
      const w = await SolanaWithdrawal.filter({ user_email: myEmail }, "-created_date", 50);
      setMyDeps(d || []);
      setMyWds(w || []);
    };
    loadMine();
  }, [me]);

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: 'var(--soft-gray)' }}>
      <div className="max-w-4xl mx-auto space-y-8">
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              Fruitles On-Chain Bridge
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            {cfg ? (
              <>
                <div><b>Network:</b> {cfg.network} • <b>Mint:</b> <span className="font-mono">{cfg.mint_address || "—"}</span></div>
                <div><b>Custody address:</b> <span className="font-mono">{cfg.custody_address || "—"}</span></div>
                <div><b>Fee:</b> {Number(cfg.fee_bps || 0) / 100}% • <b>Decimals:</b> {cfg.decimals}</div>
              </>
            ) : (
              <div className="text-gray-600">No chain config set yet. Ask admin to configure mint address.</div>
            )}
            {me && (
              <div className="text-sm mt-2">
                <b>Your balance:</b> <span className="font-semibold">{balance}</span> fruitles
              </div>
            )}
          </CardContent>
        </Card>

        {/* Withdraw */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Withdraw to Solana
              {!cfg?.withdraw_enabled && <Badge variant="outline" className="ml-2">Disabled</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid md:grid-cols-3 gap-3">
              <div className="space-y-1 md:col-span-1">
                <Label>Amount</Label>
                <Input type="number" value={wd.amount} onChange={(e) => setWd((p) => ({ ...p, amount: e.target.value }))} placeholder="e.g., 25" />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label>Destination address (SPL)</Label>
                <Input value={wd.to} onChange={(e) => setWd((p) => ({ ...p, to: e.target.value }))} placeholder="Your Solana address or associated token account" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Note to admin (optional)</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Any extra instruction" />
            </div>
            <div className="text-xs text-gray-600">
              Fee preview: {feeFor(Number(wd.amount || 0))} fruitles • You will be debited amount + fee.
            </div>
            <Button className="text-white" style={{ backgroundColor: 'var(--accent-gold)' }} onClick={handleWithdraw} disabled={!cfg?.withdraw_enabled}>
              Request withdrawal
            </Button>
          </CardContent>
        </Card>

        {/* Deposit */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowDownToLine className="w-5 h-5" />
              Deposit from Solana
              {!cfg?.deposit_enabled && <Badge variant="outline" className="ml-2">Disabled</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-gray-700">
              Send SPL tokens to custody address: <span className="font-mono">{cfg?.custody_address || "—"}</span>
            </div>
            <div className="grid md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Amount sent</Label>
                <Input type="number" value={dep.amount} onChange={(e) => setDep((p) => ({ ...p, amount: e.target.value }))} placeholder="e.g., 25" />
              </div>
              <div className="space-y-1">
                <Label>From address (optional)</Label>
                <Input value={dep.from} onChange={(e) => setDep((p) => ({ ...p, from: e.target.value }))} placeholder="Your SPL account" />
              </div>
              <div className="space-y-1">
                <Label>TXID (optional)</Label>
                <Input value={dep.txid} onChange={(e) => setDep((p) => ({ ...p, txid: e.target.value }))} placeholder="Solana transaction signature" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Note to admin (optional)</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Any extra context" />
            </div>
            <Button variant="outline" onClick={handleDepositSubmitted} disabled={!cfg?.deposit_enabled}>
              I have sent the tokens
            </Button>
          </CardContent>
        </Card>

        {/* History */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="w-5 h-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-gray-600">Withdrawals</div>
            {myWds.length === 0 ? <div className="text-xs text-gray-500">No withdrawals yet.</div> :
              myWds.map(w => (
                <div key={w.id} className="border rounded-lg p-3 bg-white flex items-center justify-between">
                  <div className="text-sm">
                    <div className="font-medium">Amount: {w.amount} • Fee: {w.fee || 0}</div>
                    <div className="text-xs text-gray-500">To: {w.to_address}</div>
                    {w.txid && <div className="text-xs text-gray-500">TXID: <span className="font-mono">{w.txid}</span></div>}
                  </div>
                  <Badge variant="outline" className={
                    w.status === "sent" ? "bg-green-100 text-green-800" :
                    w.status === "failed" ? "bg-red-100 text-red-800" :
                    w.status === "cancelled" ? "bg-gray-100 text-gray-800" : "bg-amber-100 text-amber-800"
                  }>{w.status}</Badge>
                </div>
              ))
            }
            <div className="text-sm text-gray-600 mt-4">Deposits</div>
            {myDeps.length === 0 ? <div className="text-xs text-gray-500">No deposits yet.</div> :
              myDeps.map(d => (
                <div key={d.id} className="border rounded-lg p-3 bg-white flex items-center justify-between">
                  <div className="text-sm">
                    <div className="font-medium">Amount: {d.amount}</div>
                    {d.txid && <div className="text-xs text-gray-500">TXID: <span className="font-mono">{d.txid}</span></div>}
                    {d.from_address && <div className="text-xs text-gray-500">From: {d.from_address}</div>}
                  </div>
                  <Badge variant="outline" className={
                    d.status === "credited" ? "bg-green-100 text-green-800" :
                    d.status === "rejected" ? "bg-red-100 text-red-800" :
                    d.status === "confirmed" ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800"
                  }>{d.status}</Badge>
                </div>
              ))
            }
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
