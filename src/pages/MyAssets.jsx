import React, { useEffect, useState } from "react";
import { AIAsset } from "@/entities/AIAsset";
import { TrainedAI } from "@/entities/TrainedAI";
import { MarketplaceListing } from "@/entities/MarketplaceListing";
import { AITransfer } from "@/entities/AITransfer";
import { User } from "@/entities/User";
import { FruitlesTransaction } from "@/entities/FruitlesTransaction";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Coins, Send, Tag, X, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import AssetAvatar from "../components/assets/AssetAvatar";

export default function MyAssetsPage() {
  const [me, setMe] = useState(null);
  const [assets, setAssets] = useState([]);
  const [aisById, setAisById] = useState({});
  const [listPrice, setListPrice] = useState({});
  const [transferTo, setTransferTo] = useState({});
  const [activeListings, setActiveListings] = useState({});
  const [reconciling, setReconciling] = useState(false);

  useEffect(() => {
    const load = async () => {
      const user = await User.me();
      setMe(user);
      const myEmail = (user.email || "").toLowerCase();

      // Primary: exact filters (normalized + raw as fallback for past data)
      const a1 = await AIAsset.filter({ owner_email: myEmail }, "-updated_date", 100);
      const a2 = myEmail !== user.email ? await AIAsset.filter({ owner_email: user.email }, "-updated_date", 100) : [];

      // Fallback: scan recent assets and match owner_email case-insensitively
      const recent = await AIAsset.list("-updated_date", 500);
      const extra = (recent || []).filter(a => ((a.owner_email || "").trim().toLowerCase()) === myEmail);

      // Merge & dedupe
      const merged = [...a1, ...a2, ...extra].reduce((acc, x) => {
        if (!acc.find(y => y.id === x.id)) acc.push(x);
        return acc;
      }, []);
      setAssets(merged);

      // Load AIs and active listings for cards
      const aiMap = {};
      const listingMap = {};
      for (const a of merged) {
        const res = await TrainedAI.filter({ id: a.ai_id });
        if (res && res[0]) aiMap[a.ai_id] = res[0];
        const lst = await MarketplaceListing.filter({ asset_id: a.id, status: "active" }, "-created_date", 1);
        listingMap[a.id] = lst && lst[0] ? lst[0] : null;
      }
      setAisById(aiMap);
      setActiveListings(listingMap);
    };
    load();
  }, []);

  const handleList = async (asset) => {
    const price = parseFloat(listPrice[asset.id]);
    if (!price || price <= 0) return alert("Enter a valid price.");
    const myEmail = (me.email || "").toLowerCase();
    await MarketplaceListing.create({
      asset_id: asset.id,
      ai_id: asset.ai_id,
      seller_email: myEmail,
      price,
      currency: "fruitles",
      status: "active"
    });
    await FruitlesTransaction.create({
      from_email: myEmail,
      to_email: "system@fruitles",
      amount: 2,
      reason: "listing_fee",
      asset_id: asset.id,
      ai_id: asset.ai_id
    });
    const lst = await MarketplaceListing.filter({ asset_id: asset.id, status: "active" }, "-created_date", 1);
    setActiveListings(prev => ({ ...prev, [asset.id]: lst && lst[0] ? lst[0] : null }));
    setListPrice(prev => ({ ...prev, [asset.id]: "" }));
  };

  const handleUnlist = async (asset) => {
    const listing = activeListings[asset.id];
    if (!listing) return;
    await MarketplaceListing.update(listing.id, { status: "cancelled" });
    setActiveListings(prev => ({ ...prev, [asset.id]: null }));
  };

  const handleTransfer = async (asset) => {
    const myEmail = (me.email || "").toLowerCase();
    const to = (transferTo[asset.id] || "").trim().toLowerCase();
    if (!to) return alert("Enter recipient email.");
    if (to === myEmail) return alert("Recipient is current owner.");
    await AITransfer.create({
      asset_id: asset.id,
      ai_id: asset.ai_id,
      from_email: myEmail,
      to_email: to
    });
    await AIAsset.update(asset.id, { owner_email: to });
    const listing = activeListings[asset.id];
    if (listing && listing.status === "active") {
      await MarketplaceListing.update(listing.id, { status: "cancelled" });
    }
    setAssets(prev => prev.filter(a => a.id !== asset.id));
    setActiveListings(prev => ({ ...prev, [asset.id]: null }));
    alert("Transfer completed.");
  };

  // NEW: Reconcile ownership for transfers to my email (case-insensitive)
  const reconcileOwnership = async () => {
    if (!me || !me.email) return;
    setReconciling(true);
    const myEmail = (me.email || "").toLowerCase();

    // Pull recent transfers and find those sent to me (case-insensitive)
    const transfers = await AITransfer.list("-created_date", 500);
    const mine = (transfers || []).filter(t => ((t.to_email || "").trim().toLowerCase()) === myEmail);

    let fixed = 0;
    for (const t of mine) {
      const arr = await AIAsset.filter({ id: t.asset_id }, "-created_date", 1);
      const asset = arr && arr[0];
      if (!asset) continue;
      const ownerLc = ((asset.owner_email || "").trim().toLowerCase());
      if (ownerLc !== myEmail) {
        await AIAsset.update(asset.id, { owner_email: myEmail });
        fixed += 1;
      }
    }

    // Reload assets after reconciliation
    const a1 = await AIAsset.filter({ owner_email: myEmail }, "-updated_date", 100);
    const recent = await AIAsset.list("-updated_date", 500);
    const extra = (recent || []).filter(a => ((a.owner_email || "").trim().toLowerCase()) === myEmail);
    const merged = [...a1, ...extra].reduce((acc, x) => {
      if (!acc.find(y => y.id === x.id)) acc.push(x);
      return acc;
    }, []);
    setAssets(merged);

    // Also reload active listings and AI data for the newly loaded assets
    const aiMap = {};
    const listingMap = {};
    for (const a of merged) {
      const res = await TrainedAI.filter({ id: a.ai_id });
      if (res && res[0]) aiMap[a.ai_id] = res[0];
      const lst = await MarketplaceListing.filter({ asset_id: a.id, status: "active" }, "-created_date", 1);
      listingMap[a.id] = lst && lst[0] ? lst[0] : null;
    }
    setAisById(aiMap);
    setActiveListings(listingMap);


    setReconciling(false);
    alert(fixed > 0 ? `Reconciled ${fixed} asset(s) to your account.` : "No transfers to reconcile.");
  };

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: 'var(--soft-gray)' }}>
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--primary-navy)' }}>
            My AI Assets
          </h1>
          <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
            Transfer your tokenized AIs or list them on the marketplace.
          </p>
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={reconcileOwnership}
              disabled={reconciling}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${reconciling ? 'animate-spin' : ''}`} />
              {reconciling ? 'Reconciling...' : 'Reconcile Transfers'}
            </Button>
          </div>
        </motion.div>

        {assets.length === 0 ? (
          <Card className="shadow-lg p-8 text-center">
            <CardContent>
              <Coins className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--accent-gold)' }} />
              <p style={{ color: 'var(--text-secondary)' }}>No assets yet. Train an AI to mint its asset.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assets.map((asset) => {
              const ai = aisById[asset.ai_id];
              const listing = activeListings[asset.id];
              return (
                <Card key={asset.id} className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <AssetAvatar type="ai" iconUrl={asset.icon_url} entityType="AIAsset" entityId={asset.id} seed={asset.symbol || asset.id} size={40} />
                        <span>{asset.name}</span>
                      </div>
                      <Badge variant="outline">{asset.symbol}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <p>Owner: {asset.owner_email}</p>
                      <p>Transferable: {asset.transferable ? 'Yes' : 'No'}</p>
                    </div>

                    {ai && (
                      <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        <p>Specialization: {ai.specialization.replace(/_/g, ' ')}</p>
                        <p>Status: {ai.training_status.replace(/_/g, ' ')}</p>
                      </div>
                    )}
                    {typeof asset.royalty_bps === 'number' && (
                      <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        <p>Royalty: {(asset.royalty_bps / 100).toFixed(2)}%</p>
                      </div>
                    )}

                    {listing ? (
                      <div className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Listed for sale</span>
                          <Badge variant="outline">{listing.price} {listing.currency}</Badge>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleUnlist(asset)} className="gap-1">
                          <X className="w-4 h-4" /> Unlist
                        </Button>
                      </div>
                    ) : (
                      <div className="border rounded-lg p-3 space-y-2">
                        <Label className="text-sm">List for sale</Label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Price"
                            value={listPrice[asset.id] || ''}
                            onChange={(e) => setListPrice(prev => ({ ...prev, [asset.id]: e.target.value }))}
                          />
                          <Button onClick={() => handleList(asset)} className="gap-1 text-white" style={{ backgroundColor: 'var(--accent-gold)' }}>
                            <Tag className="w-4 h-4" /> List
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="border rounded-lg p-3 space-y-2">
                      <Label className="text-sm">Transfer to email</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="recipient@example.com"
                          value={transferTo[asset.id] || ''}
                          onChange={(e) => setTransferTo(prev => ({ ...prev, [asset.id]: e.target.value }))}
                        />
                        <Button onClick={() => handleTransfer(asset)} variant="outline" className="gap-1">
                          <Send className="w-4 h-4" /> Send
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}