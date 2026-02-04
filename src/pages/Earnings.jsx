import React, { useEffect, useState } from "react";
import { FruitlesTransaction } from "@/entities/FruitlesTransaction";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins, TrendingUp, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

export default function EarningsPage() {
  const [me, setMe] = useState(null);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [balance, setBalance] = useState(0);
  const [summary, setSummary] = useState({ sales: 0, royalties: 0, fees: 0, other: 0 });

  useEffect(() => {
    const load = async () => {
      const user = await User.me();
      setMe(user);
      const inc = await FruitlesTransaction.filter({ to_email: user.email }, "-created_date", 500);
      const out = await FruitlesTransaction.filter({ from_email: user.email }, "-created_date", 500);
      setIncoming(inc);
      setOutgoing(out);
      const sum = (arr) => (arr || []).reduce((s, t) => s + (t.amount || 0), 0);
      setBalance(sum(inc) - sum(out));
      const sales = inc.filter(t => t.reason === "marketplace_purchase").reduce((s, t) => s + t.amount, 0);
      const royalties = inc.filter(t => t.reason === "royalty").reduce((s, t) => s + t.amount, 0);
      const fees = out.filter(t => t.reason === "platform_fee" || t.reason === "listing_fee").reduce((s, t) => s + t.amount, 0);
      const other = sum(inc.filter(t => !["marketplace_purchase", "royalty"].includes(t.reason || "")));
      setSummary({ sales, royalties, fees, other });
    };
    load();
  }, []);

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: 'var(--soft-gray)' }}>
      <div className="max-w-6xl mx-auto space-y-8">
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--primary-navy)' }}>Earnings & Wallet</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Track sales, royalties, fees, and your fruitles balance.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Balance</span>
                <Coins className="w-5 h-5" style={{ color: 'var(--accent-gold)' }} />
              </div>
              <div className="text-3xl font-bold mt-2" style={{ color: 'var(--primary-navy)' }}>{balance}</div>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Sales Revenue</span>
                <TrendingUp className="w-5 h-5" style={{ color: 'var(--accent-gold)' }} />
              </div>
              <div className="text-2xl font-bold mt-2" style={{ color: 'var(--primary-navy)' }}>{summary.sales}</div>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Royalties Earned</span>
                <ArrowUpRight className="w-5 h-5" style={{ color: 'var(--accent-gold)' }} />
              </div>
              <div className="text-2xl font-bold mt-2" style={{ color: 'var(--primary-navy)' }}>{summary.royalties}</div>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Fees Paid</span>
                <ArrowDownRight className="w-5 h-5" style={{ color: 'var(--accent-gold)' }} />
              </div>
              <div className="text-2xl font-bold mt-2" style={{ color: 'var(--primary-navy)' }}>{summary.fees}</div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[...incoming.map(t => ({ ...t, dir: 'in' })), ...outgoing.map(t => ({ ...t, dir: 'out' }))]
              .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
              .slice(0, 25)
              .map(t => (
              <div key={t.id} className="flex items-center justify-between border rounded-lg p-3 bg-white">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className={t.dir === 'in' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {t.dir === 'in' ? 'Incoming' : 'Outgoing'}
                  </Badge>
                  <div className="text-sm">
                    <div className="font-medium" style={{ color: 'var(--primary-navy)' }}>
                      {t.reason || 'transfer'} • {t.amount} fruitles
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {format(new Date(t.created_date), 'PPpp')}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-right" style={{ color: 'var(--text-secondary)' }}>
                  {t.dir === 'in' ? `From: ${t.from_email}` : `To: ${t.to_email}`}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}