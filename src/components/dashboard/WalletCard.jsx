
import React, { useEffect, useState } from "react";
import { FruitlesTransaction } from "@/entities/FruitlesTransaction";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Coins } from "lucide-react";

export default function WalletCard() {
  const [me, setMe] = useState(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadWallet = async (user) => {
    if (!user) return;
    const myEmail = (user.email || "").toLowerCase();
    const incoming = await FruitlesTransaction.filter({ to_email: myEmail });
    const outgoing = await FruitlesTransaction.filter({ from_email: myEmail });
    const sum = (arr) => (arr || []).reduce((s, t) => s + (t.amount || 0), 0);
    setBalance(sum(incoming) - sum(outgoing));
    setLoading(false);
  };

  useEffect(() => {
    const init = async () => {
      try {
        const user = await User.me();
        setMe(user);
        await loadWallet(user);
      } catch (e) {
        setLoading(false);
      }
    };
    init();
  }, []);

  return (
    <Card className="shadow-lg border-0">
      <CardHeader className="border-b bg-white">
        <CardTitle className="flex items-center gap-2 text-xl font-bold" style={{color: 'var(--primary-navy)'}}>
          <Coins className="w-5 h-5" style={{color: 'var(--accent-gold)'}} />
          Wallet
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {me ? (
          <>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm" style={{color: 'var(--text-secondary)'}}>Balance</span>
              <span className="text-2xl font-bold" style={{color: 'var(--primary-navy)'}}>
                {loading ? "—" : balance}
              </span>
            </div>
            <div className="text-xs text-right" style={{color: 'var(--text-secondary)'}}>
              Need more? Use Buy Fruitles (top-right).
            </div>
          </>
        ) : (
          <p className="text-sm" style={{color: 'var(--text-secondary)'}}>Please log in to view your wallet.</p>
        )}
      </CardContent>
    </Card>
  );
}
