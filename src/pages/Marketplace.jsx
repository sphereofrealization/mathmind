import React, { useEffect, useState } from "react";
import { MarketplaceListing } from "@/entities/MarketplaceListing";
import { AIAsset } from "@/entities/AIAsset";
import { TrainedAI } from "@/entities/TrainedAI";
import { AITransfer } from "@/entities/AITransfer";
import { BookListing } from "@/entities/BookListing";
import { BookAsset } from "@/entities/BookAsset";
import { BookTransfer } from "@/entities/BookTransfer";
import { MathBook } from "@/entities/MathBook";
import { AgentListing } from "@/entities/AgentListing";
import { AgentAsset } from "@/entities/AgentAsset";
import { AgentTransfer } from "@/entities/AgentTransfer";
import { SiteAgent } from "@/entities/SiteAgent";
import { User } from "@/entities/User";
import { FruitlesTransaction } from "@/entities/FruitlesTransaction";
import { ReferralCampaign } from "@/entities/ReferralCampaign";
import { ReferralEvent } from "@/entities/ReferralEvent";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Store, ShoppingCart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AssetAvatar from "../components/assets/AssetAvatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function MarketplacePage() {
  const [me, setMe] = useState(null);
  const [activeListings, setActiveListings] = useState([]);
  const [meta, setMeta] = useState({}); // {listingId: {asset, ai}}
  const [bookListings, setBookListings] = useState([]);
  const [bookMeta, setBookMeta] = useState({}); // {listingId: {asset, book}}
  const [agentListings, setAgentListings] = useState([]);
  const [agentMeta, setAgentMeta] = useState({}); // {listingId: {asset, agent}}
  const [activeTab, setActiveTab] = useState("ai");
  const [balance, setBalance] = useState(0);

  // State for local-only fruitles seeding tools
  const [seedAmount, setSeedAmount] = useState(1000);
  const [targetEmail, setTargetEmail] = useState("");

  // Replace dev detection to avoid referencing 'process'
  const isDev = (typeof window !== "undefined") && (
    ["localhost", "127.0.0.1"].includes(window.location.hostname) ||
    window.location.hostname.endsWith(".local")
  );

  useEffect(() => {
    const load = async () => {
      const user = await User.me();
      setMe(user);
      // Set initial target email for dev tools if user is loaded
      if (user && user.email) {
        setTargetEmail((user.email || "").toLowerCase()); // Normalize to lowercase
      }

      const listings = await MarketplaceListing.filter({ status: "active" }, "-created_date", 200);
      setActiveListings(listings);

      const m = {};
      for (const l of listings) {
        const asset = await AIAsset.filter({ id: l.asset_id });
        const ai = await TrainedAI.filter({ id: l.ai_id });
        m[l.id] = { asset: asset && asset[0], ai: ai && ai[0] };
      }
      setMeta(m);

      // Books
      const bl = await BookListing.filter({ status: "active" }, "-created_date", 200);
      setBookListings(bl);
      const bm = {};
      for (const l of bl) {
        const asset = await BookAsset.filter({ id: l.asset_id });
        const book = await MathBook.filter({ id: l.book_id });
        bm[l.id] = { asset: asset && asset[0], book: book && book[0] };
      }
      setBookMeta(bm);

      // Agents
      const al = await AgentListing.filter({ status: "active" }, "-created_date", 200);
      setAgentListings(al);
      const am = {};
      for (const l of al) {
        const asset = await AgentAsset.filter({ id: l.asset_id });
        const agent = await SiteAgent.filter({ id: l.agent_id });
        am[l.id] = { asset: asset && asset[0], agent: agent && agent[0] };
      }
      setAgentMeta(am);

      // wallet
      const myEmail = (user.email || "").toLowerCase();
      const incoming = await FruitlesTransaction.filter({ to_email: myEmail });
      const outgoing = await FruitlesTransaction.filter({ from_email: myEmail });
      const sum = (arr) => (arr || []).reduce((s, t) => s + (t.amount || 0), 0);
      setBalance(sum(incoming) - sum(outgoing));
    };
    load();
  }, []);

  const refreshListing = async () => {
    const listings = await MarketplaceListing.filter({ status: "active" }, "-created_date", 200);
    setActiveListings(listings);
    const m = {};
    for (const l of listings) {
      const asset = await AIAsset.filter({ id: l.asset_id });
      const ai = await TrainedAI.filter({ id: l.ai_id });
      m[l.id] = { asset: asset && asset[0], ai: ai && ai[0] };
    }
    setMeta(m);
  };

  const refreshWallet = async () => {
    if (!me || !me.email) return; // Ensure user is loaded
    const myEmail = (me.email || "").toLowerCase();
    const incoming = await FruitlesTransaction.filter({ to_email: myEmail });
    const outgoing = await FruitlesTransaction.filter({ from_email: myEmail });
    const sum = (arr) => (arr || []).reduce((s, t) => s + (t.amount || 0), 0);
    setBalance(sum(incoming) - sum(outgoing));
  };

  const handleBuy = async (listing) => {
    const pack = meta[listing.id];
    if (!pack?.asset) return;

    const myEmail = (me.email || "").toLowerCase(); // Normalize current user's email

    if ((pack.asset.owner_email || "").toLowerCase() === myEmail) return alert("You already own this asset.");

    // Ensure sufficient fruitles
    const price = listing.price;
    if (balance < price) {
      alert("Insufficient fruitles. Please buy more fruitles and try again.");
      return;
    }

    // Compute royalty + platform fee + seller net
    const royaltyBps = typeof pack.asset.royalty_bps === 'number' ? pack.asset.royalty_bps : 0;
    const PLATFORM_FEE_BPS = 250; // 2.5%
    const royaltyAmt = +(price * (royaltyBps / 10000)).toFixed(2);
    const feeAmt = +(price * (PLATFORM_FEE_BPS / 10000)).toFixed(2);
    const sellerNet = +(price - royaltyAmt - feeAmt).toFixed(2);

    // Fetch creator (built-in created_by on TrainedAI)
    const creatorEmail = (pack.ai?.created_by || "").toLowerCase(); // Normalize creator's email

    // Ledger entries: all amounts move from buyer
    if (royaltyAmt > 0 && creatorEmail) {
      await FruitlesTransaction.create({
        from_email: myEmail,
        to_email: creatorEmail,
        amount: royaltyAmt,
        reason: "royalty",
        listing_id: listing.id,
        asset_id: pack.asset.id,
        ai_id: pack.asset.ai_id
      });
    }
    if (feeAmt > 0) {
      await FruitlesTransaction.create({
        from_email: myEmail,
        to_email: "system@fruitles",
        amount: feeAmt,
        reason: "platform_fee",
        listing_id: listing.id,
        asset_id: pack.asset.id,
        ai_id: pack.asset.ai_id
      });
    }
    if (sellerNet > 0) {
      await FruitlesTransaction.create({
        from_email: myEmail,
        to_email: (pack.asset.owner_email || "").toLowerCase(), // Normalize seller's email
        amount: sellerNet,
        reason: "marketplace_purchase",
        listing_id: listing.id,
        asset_id: pack.asset.id,
        ai_id: pack.asset.ai_id
      });
    }

    // Referral reward (purchase)
    const refEv = await ReferralEvent.filter({ event_type: "signup", referred_email: myEmail }, "-created_date", 1); // Normalize referred_email for lookup
    if (refEv && refEv[0]) {
      const campaign = await ReferralCampaign.filter({ code: refEv[0].code }, "-created_date", 1);
      const reward = Number(campaign && campaign[0] ? (campaign[0].reward_on_purchase || 0) : 0);
      if (reward > 0) {
        await FruitlesTransaction.create({
          from_email: "system@fruitles",
          to_email: (refEv[0].referrer_email || "").toLowerCase(), // Normalize referrer's email
          amount: reward,
          reason: "ref_purchase_bonus",
          listing_id: listing.id,
          asset_id: pack.asset.id,
          ai_id: pack.asset.ai_id
        });
        await ReferralEvent.create({
          code: refEv[0].code,
          event_type: "purchase",
          referrer_email: (refEv[0].referrer_email || "").toLowerCase(), // Normalize referrer's email
          referred_email: myEmail, // Use normalized email
          metadata: `listing:${listing.id}`
        });
      }
    }

    // Mark sold, transfer ownership, record transfer
    await MarketplaceListing.update(listing.id, { status: "sold", buyer_email: myEmail }); // Normalize buyer's email
    await AITransfer.create({
      asset_id: pack.asset.id,
      ai_id: pack.asset.ai_id,
      from_email: (pack.asset.owner_email || "").toLowerCase(), // Normalize from email
      to_email: myEmail, // Normalize to email
      listing_id: listing.id
    });
    await AIAsset.update(pack.asset.id, { owner_email: myEmail }); // Normalize new owner's email

    alert("Purchase successful! Asset transferred to you.");
    await refreshListing();
    await refreshWallet();
  };

  const handleCancel = async (listing) => {
    const pack = meta[listing.id];
    if (!pack?.asset) return;
    const myEmail = (me.email || "").toLowerCase(); // Normalize current user's email
    if ((pack.asset.owner_email || "").toLowerCase() !== myEmail) return alert("Only the owner can cancel the listing.");
    await MarketplaceListing.update(listing.id, { status: "cancelled" });
    await refreshListing();
  };

  const handleBuyBook = async (listing) => {
    const pack = bookMeta[listing.id];
    if (!pack?.asset) return;
    const myEmail = (me.email || "").toLowerCase();
    if ((pack.asset.owner_email || "").toLowerCase() === myEmail) return alert("You already own this book.");
    const price = listing.price;
    if (balance < price) return alert("Insufficient fruitles.");
    const royaltyBps = typeof pack.asset.royalty_bps === 'number' ? pack.asset.royalty_bps : 0;
    const PLATFORM_FEE_BPS = 250;
    const royaltyAmt = +(price * (royaltyBps / 10000)).toFixed(2);
    const feeAmt = +(price * (PLATFORM_FEE_BPS / 10000)).toFixed(2);
    const sellerNet = +(price - royaltyAmt - feeAmt).toFixed(2);
    const creatorEmail = (pack.book?.created_by || "").toLowerCase();
    if (royaltyAmt > 0 && creatorEmail) {
      await FruitlesTransaction.create({ from_email: myEmail, to_email: creatorEmail, amount: royaltyAmt, reason: "royalty", listing_id: listing.id, asset_id: pack.asset.id });
    }
    if (feeAmt > 0) {
      await FruitlesTransaction.create({ from_email: myEmail, to_email: "system@fruitles", amount: feeAmt, reason: "platform_fee", listing_id: listing.id, asset_id: pack.asset.id });
    }
    if (sellerNet > 0) {
      await FruitlesTransaction.create({ from_email: myEmail, to_email: (pack.asset.owner_email || "").toLowerCase(), amount: sellerNet, reason: "marketplace_purchase", listing_id: listing.id, asset_id: pack.asset.id });
    }
    await BookListing.update(listing.id, { status: "sold", buyer_email: myEmail });
    await BookTransfer.create({ asset_id: pack.asset.id, book_id: listing.book_id, from_email: (pack.asset.owner_email || "").toLowerCase(), to_email: myEmail, listing_id: listing.id });
    await BookAsset.update(pack.asset.id, { owner_email: myEmail });
    alert("Purchase successful! Book transferred to you.");
  };

  const handleCancelBook = async (listing) => {
    const pack = bookMeta[listing.id];
    if (!pack?.asset) return;
    const myEmail = (me.email || "").toLowerCase();
    if ((pack.asset.owner_email || "").toLowerCase() !== myEmail) return alert("Only the owner can cancel the listing.");
    await BookListing.update(listing.id, { status: "cancelled" });
  };

  const handleBuyAgent = async (listing) => {
    const pack = agentMeta[listing.id];
    if (!pack?.asset) return;
    const myEmail = (me.email || "").toLowerCase();
    if ((pack.asset.owner_email || "").toLowerCase() === myEmail) return alert("You already own this agent.");
    const price = listing.price;
    if (balance < price) return alert("Insufficient fruitles.");
    const royaltyBps = typeof pack.asset.royalty_bps === 'number' ? pack.asset.royalty_bps : 0;
    const PLATFORM_FEE_BPS = 250;
    const royaltyAmt = +(price * (royaltyBps / 10000)).toFixed(2);
    const feeAmt = +(price * (PLATFORM_FEE_BPS / 10000)).toFixed(2);
    const sellerNet = +(price - royaltyAmt - feeAmt).toFixed(2);
    const creatorEmail = (pack.agent?.created_by || "").toLowerCase();
    if (royaltyAmt > 0 && creatorEmail) {
      await FruitlesTransaction.create({ from_email: myEmail, to_email: creatorEmail, amount: royaltyAmt, reason: "royalty", listing_id: listing.id, asset_id: pack.asset.id });
    }
    if (feeAmt > 0) {
      await FruitlesTransaction.create({ from_email: myEmail, to_email: "system@fruitles", amount: feeAmt, reason: "platform_fee", listing_id: listing.id, asset_id: pack.asset.id });
    }
    if (sellerNet > 0) {
      await FruitlesTransaction.create({ from_email: myEmail, to_email: (pack.asset.owner_email || "").toLowerCase(), amount: sellerNet, reason: "marketplace_purchase", listing_id: listing.id, asset_id: pack.asset.id });
    }
    await AgentListing.update(listing.id, { status: "sold", buyer_email: myEmail });
    await AgentTransfer.create({ asset_id: pack.asset.id, agent_id: listing.agent_id, from_email: (pack.asset.owner_email || "").toLowerCase(), to_email: myEmail, listing_id: listing.id });
    await AgentAsset.update(pack.asset.id, { owner_email: myEmail });
    alert("Purchase successful! Agent transferred to you.");
  };

  const handleCancelAgent = async (listing) => {
    const pack = agentMeta[listing.id];
    if (!pack?.asset) return;
    const myEmail = (me.email || "").toLowerCase();
    if ((pack.asset.owner_email || "").toLowerCase() !== myEmail) return alert("Only the owner can cancel the listing.");
    await AgentListing.update(listing.id, { status: "cancelled" });
  };

  // Local-only developer tool for seeding fruitles
  const handleSeedFruitles = async (toEmail, amount) => {
    if (!toEmail || amount <= 0) {
      alert("Please provide a valid email and a positive amount.");
      return;
    }
    try {
      const normalizedToEmail = (toEmail || "").toLowerCase(); // Normalize target email
      await FruitlesTransaction.create({
        from_email: "system@fruitles",
        to_email: normalizedToEmail,
        amount: amount,
        reason: "dev_seed"
      });
      alert(`Successfully seeded ${amount} fruitles to ${normalizedToEmail}.`);
      if (normalizedToEmail === (me.email || "").toLowerCase()) { // Compare with normalized email
        await refreshWallet();
      }
    } catch (error) {
      console.error("Error seeding fruitles:", error);
      alert("Failed to seed fruitles.");
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: 'var(--soft-gray)' }}>
      <div className="max-w-7xl mx-auto">
        {/* Wallet header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-4 flex items-center justify-between flex-wrap gap-2">
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Balance: <b style={{ color: 'var(--primary-navy)' }}>{balance}</b> fruitles
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="text-white" style={{ backgroundColor: 'var(--accent-gold)' }} onClick={() => alert("Buy Fruitles functionality coming soon!")}>
              Buy Fruitles
            </Button>
          </div>
        </motion.div>

        {/* REPLACED: process.env.NODE_ENV check with safe isDev */}
        {isDev && me && me.email && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 rounded-lg border" style={{ borderColor: 'var(--accent-gold)', backgroundColor: 'var(--soft-gray-darker)' }}>
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--primary-navy)' }}>Developer Tools (Local Only)</h3>
            <div className="flex flex-col gap-2">
              <Input
                type="number"
                placeholder="Amount to seed"
                value={seedAmount}
                onChange={(e) => setSeedAmount(Number(e.target.value))}
                className="w-full"
                style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--background-color)', color: 'var(--text-primary)' }}
              />
              <div className="flex gap-2">
                <Button size="sm" className="flex-grow text-white" style={{ backgroundColor: 'var(--primary-navy)' }} onClick={() => handleSeedFruitles(me.email, seedAmount)}>
                  Seed My Account ({me.email})
                </Button>
              </div>
              <Input
                type="email"
                placeholder="Target email for seeding"
                value={targetEmail}
                onChange={(e) => setTargetEmail(e.target.value)}
                className="w-full"
                style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--background-color)', color: 'var(--text-primary)' }}
              />
              <Button size="sm" className="text-white" style={{ backgroundColor: 'var(--primary-navy)' }} onClick={() => handleSeedFruitles(targetEmail, seedAmount)}>
                Seed Target Account
              </Button>
            </div>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--primary-navy)' }}>
            AI Marketplace
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Buy and sell tokenized trained AIs. Transfers occur instantly within the app.
          </p>
        </motion.div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="ai">AI</TabsTrigger>
            <TabsTrigger value="books">Books</TabsTrigger>
            <TabsTrigger value="agents">Agents</TabsTrigger>
          </TabsList>

          <TabsContent value="ai">
            {activeListings.length === 0 ? (
              <Card className="shadow-lg p-8 text-center">
                <CardContent>
                  <Store className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--accent-gold)' }} />
                  <p style={{ color: 'var(--text-secondary)' }}>No AI listings. List one from My Assets.</p>
                </CardContent>
              </Card>
            ) : (
              <AnimatePresence>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activeListings.map((l, i) => {
                    const pack = meta[l.id] || {};
                    const asset = pack.asset;
                    const ai = pack.ai;
                    return (
                      <motion.div key={l.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                        <Card className="shadow-lg">
                          <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <AssetAvatar type="ai" iconUrl={asset?.icon_url} entityType="AIAsset" entityId={asset?.id} seed={asset?.symbol || asset?.id} size={40} />
                                <span>{asset?.name || 'AI Asset'}</span>
                              </div>
                              <Badge variant="outline">{asset?.symbol}</Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                              <p>Seller: {l.seller_email}</p>
                              <p>Price: <b>{l.price}</b> fruitles</p>
                            </div>
                            {ai && (
                              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                <p>Specialization: {ai.specialization.replace(/_/g, ' ')}</p>
                                <p>Status: {ai.training_status.replace(/_/g, ' ')}</p>
                              </div>
                            )}
                            <div className="flex gap-2">
                              {(asset?.owner_email || "").toLowerCase() === (me?.email || "").toLowerCase() ? (
                                <Button variant="outline" onClick={() => handleCancel(l)}>Cancel</Button>
                              ) : (
                                <Button className="text-white gap-2" style={{ backgroundColor: 'var(--accent-gold)' }} onClick={() => handleBuy(l)}>
                                  <ShoppingCart className="w-4 h-4" /> Buy
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </AnimatePresence>
            )}
          </TabsContent>

          <TabsContent value="books">
            {bookListings.length === 0 ? (
              <Card className="shadow-lg p-8 text-center">
                <CardContent>
                  <Store className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--accent-gold)' }} />
                  <p style={{ color: 'var(--text-secondary)' }}>No Book listings. Tokenize and list books from My Assets.</p>
                </CardContent>
              </Card>
            ) : (
              <AnimatePresence>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {bookListings.map((l, i) => {
                    const pack = bookMeta[l.id] || {};
                    const asset = pack.asset;
                    const book = pack.book;
                    return (
                      <motion.div key={l.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                        <Card className="shadow-lg">
                          <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <AssetAvatar type="book" iconUrl={asset?.icon_url} entityType="BookAsset" entityId={asset?.id} seed={asset?.symbol || asset?.id} size={40} />
                                <span>{asset?.name || book?.title || 'Book'}</span>
                              </div>
                              <Badge variant="outline">{asset?.symbol}</Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                              <p>Seller: {l.seller_email}</p>
                              <p>Price: <b>{l.price}</b> fruitles</p>
                            </div>
                            {book && (
                              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                <p>Title: {book.title}</p>
                              </div>
                            )}
                            <div className="flex gap-2">
                              {(asset?.owner_email || "").toLowerCase() === (me?.email || "").toLowerCase() ? (
                                <Button variant="outline" onClick={() => handleCancelBook(l)}>Cancel</Button>
                              ) : (
                                <Button className="text-white gap-2" style={{ backgroundColor: 'var(--accent-gold)' }} onClick={() => handleBuyBook(l)}>
                                  <ShoppingCart className="w-4 h-4" /> Buy
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </AnimatePresence>
            )}
          </TabsContent>

          <TabsContent value="agents">
            {agentListings.length === 0 ? (
              <Card className="shadow-lg p-8 text-center">
                <CardContent>
                  <Store className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--accent-gold)' }} />
                  <p style={{ color: 'var(--text-secondary)' }}>No Agent listings yet.</p>
                </CardContent>
              </Card>
            ) : (
              <AnimatePresence>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {agentListings.map((l, i) => {
                    const pack = agentMeta[l.id] || {};
                    const asset = pack.asset;
                    const agent = pack.agent;
                    return (
                      <motion.div key={l.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                        <Card className="shadow-lg">
                          <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <AssetAvatar type="agent" iconUrl={asset?.icon_url} entityType="AgentAsset" entityId={asset?.id} seed={asset?.symbol || asset?.id} size={40} />
                                <span>{asset?.name || agent?.name || 'Agent'}</span>
                              </div>
                              <Badge variant="outline">{asset?.symbol}</Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                              <p>Seller: {l.seller_email}</p>
                              <p>Price: <b>{l.price}</b> fruitles</p>
                            </div>
                            {agent && (
                              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                <p>Objective: {agent.objective}</p>
                              </div>
                            )}
                            <div className="flex gap-2">
                              {(asset?.owner_email || "").toLowerCase() === (me?.email || "").toLowerCase() ? (
                                <Button variant="outline" onClick={() => handleCancelAgent(l)}>Cancel</Button>
                              ) : (
                                <Button className="text-white gap-2" style={{ backgroundColor: 'var(--accent-gold)' }} onClick={() => handleBuyAgent(l)}>
                                  <ShoppingCart className="w-4 h-4" /> Buy
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </AnimatePresence>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}