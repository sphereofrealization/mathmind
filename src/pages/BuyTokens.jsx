import React, { useEffect, useMemo, useState } from "react";
import { SiteToken } from "@/entities/SiteToken";
import { TokenOrder } from "@/entities/TokenOrder";
import { DepositAddress } from "@/entities/DepositAddress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Coins, Wallet } from "lucide-react";
import { motion } from "framer-motion";

export default function BuyTokensPage() {
  const [tokens, setTokens] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [email, setEmail] = useState("");
  const [order, setOrder] = useState(null);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    (async () => {
      const t = await SiteToken.filter({ active: true }, "-created_date", 100);
      setTokens(t);
      if (t[0]) setSelectedId(t[0].id);
    })();
  }, []);

  const selected = useMemo(() => tokens.find(t => t.id === selectedId), [tokens, selectedId]);

  const placeOrder = async () => {
    if (!selected) return;
    setAssigning(true);
    try {
      // Create order without address
      const created = await TokenOrder.create({
        token_id: selected.id,
        buyer_email: email || "",
        expected_amount_sats: selected.price_sats,
        status: "pending"
      });

      // Find an unused address
      const pool = await DepositAddress.filter({ used: false }, "-created_date", 1);
      if (!pool || !pool[0]) {
        alert("No available deposit addresses. Please try again later.");
        setOrder(created);
        setAssigning(false);
        return;
      }
      const addr = pool[0];

      // Assign address to order and mark address used
      await TokenOrder.update(created.id, { address: addr.address });
      await DepositAddress.update(addr.id, { used: true, assigned_order_id: created.id });

      const final = await TokenOrder.filter({ id: created.id });
      setOrder(final && final[0] ? final[0] : created);
    } finally {
      setAssigning(false);
    }
  };

  if (order && order.address) {
    return (
      <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: 'var(--soft-gray)' }}>
        <div className="max-w-xl mx-auto">
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5" /> Send Payment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-700">Send exactly <b>{order.expected_amount_sats}</b> sats to:</p>
              <div className="p-3 bg-gray-50 border rounded-lg font-mono break-all">{order.address}</div>
              <div className="text-xs text-gray-500">
                After you send, your order will be marked paid once the admin confirms the transaction. Keep your TXID handy.
              </div>
              <Button variant="outline" onClick={() => navigator.clipboard?.writeText(order.address)}>Copy address</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: 'var(--soft-gray)' }}>
      <div className="max-w-xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold flex items-center gap-2" style={{ color: 'var(--primary-navy)' }}>
            <Coins className="w-6 h-6" /> Buy Tokens
          </h1>
          <p className="text-gray-600">Choose a token and get a unique Bitcoin address to pay.</p>
        </motion.div>

        <Card className="shadow-lg border-0">
          <CardContent className="space-y-4 p-6">
            <div className="space-y-2">
              <Label>Token</Label>
              <select className="w-full border rounded-md p-2" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                {tokens.map(t => <option key={t.id} value={t.id}>{t.name} — {t.price_sats} sats</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Email (optional, for receipt)</Label>
              <Input placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <Button className="text-white" style={{ backgroundColor: 'var(--accent-gold)' }} onClick={placeOrder} disabled={!selected || assigning}>
              {assigning ? "Assigning address..." : "Get payment address"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}