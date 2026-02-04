
import React, { useEffect, useState } from "react";
import { ReferralCampaign } from "@/entities/ReferralCampaign";
import { ReferralEvent } from "@/entities/ReferralEvent";
import { FruitlesTransaction } from "@/entities/FruitlesTransaction";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gift, UserPlus } from "lucide-react";

export default function InvitePage() {
  const [campaign, setCampaign] = useState(null);
  const [me, setMe] = useState(null);
  const [status, setStatus] = useState("Checking...");

  useEffect(() => {
    const init = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("ref");
      if (!code) { setStatus("Missing referral code."); return; }
      const c = await ReferralCampaign.filter({ code }, "-created_date", 1);
      if (c && c[0]) setCampaign(c[0]);
      else setStatus("Referral code not found.");

      // Try to detect logged user and award signup if first time
      try {
        const user = await User.me();
        setMe(user);
        if (c && c[0]) {
          // check if already recorded
          const existing = await ReferralEvent.filter({ event_type: "signup", referred_email: user.email }, "-created_date", 1);
          if (!existing || !existing[0]) {
            await ReferralEvent.create({
              code,
              event_type: "signup",
              referrer_email: c[0].owner_email,
              referred_email: user.email,
              metadata: ""
            });
            // FIX: always award a fixed 100 fruitles on signup
            const reward = 100;
            await FruitlesTransaction.create({
              from_email: "system@fruitles",
              to_email: c[0].owner_email,
              amount: reward,
              reason: "ref_signup_bonus",
              ai_id: "",
              listing_id: "",
              asset_id: ""
            });
          }
          setStatus("Thanks for joining! You can start using the app.");
        }
      } catch {
        setStatus("You are not logged in.");
      }
    };
    init();
  }, []);

  const joinNow = async () => {
    const callbackUrl = window.location.href;
    await User.loginWithRedirect(callbackUrl);
  };

  return (
    <div className="min-h-screen p-6 flex items-center justify-center" style={{ backgroundColor: 'var(--soft-gray)' }}>
      <Card className="max-w-xl w-full shadow-lg border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Join MathAI via Invite
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {campaign ? (
            <>
              <p>You're joining with referral code: <b>{campaign.code}</b></p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Your referrer will receive 100 fruitles when you sign up, and additional rewards when you make purchases.
              </p>
              {!me ? (
                <Button className="text-white" style={{ backgroundColor: 'var(--accent-gold)' }} onClick={joinNow}>
                  <Gift className="w-4 h-4 mr-1" /> Join now
                </Button>
              ) : (
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{status}</p>
              )}
            </>
          ) : (
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{status}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
