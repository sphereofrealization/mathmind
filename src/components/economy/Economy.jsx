import { base44 } from "@/api/base44Client";

export const SYSTEM_EMAIL = "system@fruitles";

export async function recordTransfer({ from, to, amount, reason, refs = {} }) {
  if (!from || !to) return null;
  const amt = Number(amount || 0);
  if (!amt || amt <= 0) return null;
  return base44.entities.FruitlesTransaction.create({
    from_email: String(from).toLowerCase(),
    to_email: String(to).toLowerCase(),
    amount: amt,
    reason,
    ...refs,
  });
}

export async function chargeCompute({ from, amount = 0.15, action = "tick", aiId = null }) {
  return recordTransfer({ from, to: SYSTEM_EMAIL, amount, reason: `compute_${action}`, refs: aiId ? { ai_id: aiId } : {} });
}

export async function rewardContentGeneration({ agentOwner, agentId = null, bookId = null }) {
  const amt = 0.5;
  const refs = bookId ? { book_id: bookId } : {};
  if (agentId) {
    return accrueAgent({ agentId, ownerEmail: agentOwner, amount: amt, reason: "content_generation_bonus", refs });
  }
  return recordTransfer({ from: SYSTEM_EMAIL, to: agentOwner, amount: amt, reason: "content_generation_bonus", refs });
}

export async function rewardIndexing({ agentOwner, agentId = null, bookOwner, chunksCount = 0, aiId = null, bookId = null }) {
  const n = Number(chunksCount || 0);
  if (n <= 0) return null;
  const perChunkAgent = 0.01;
  const perChunkLicense = 0.005;
  const agentAmt = +(n * perChunkAgent).toFixed(4);
  const licenseAmt = +(n * perChunkLicense).toFixed(4);
  const refs = {};
  if (aiId) refs.ai_id = aiId;
  if (bookId) refs.book_id = bookId;
  const ops = [];
  if (agentId && agentAmt > 0) {
    ops.push(accrueAgent({ agentId, ownerEmail: agentOwner, amount: agentAmt, reason: "indexing_reward", refs }));
  } else if (agentOwner && agentAmt > 0) {
    ops.push(recordTransfer({ from: SYSTEM_EMAIL, to: agentOwner, amount: agentAmt, reason: "indexing_reward", refs }));
  }
  if (bookOwner && licenseAmt > 0) ops.push(recordTransfer({ from: SYSTEM_EMAIL, to: bookOwner, amount: licenseAmt, reason: "data_licensing_fee", refs }));
  return Promise.all(ops);
}

export async function chargeChatUsage({ from, aiOwner, amount = 0.2, aiId = null }) {
  const refs = aiId ? { ai_id: aiId } : {};
  return recordTransfer({ from, to: aiOwner || SYSTEM_EMAIL, amount, reason: "chat_usage", refs });
}

// Reward holders of editions with a small yield per tick
export async function rewardCollectorYield({ owner, editionsCount = 1 }) {
  const count = Number(editionsCount || 0);
  if (!owner || count <= 0) return null;
  const amt = +(0.02 * count).toFixed(4); // small per-tick yield per edition
  return recordTransfer({ from: SYSTEM_EMAIL, to: owner, amount: amt, reason: "collector_yield" });
}

// Process a marketplace purchase: transfer funds, update records, and rebate buyer
export async function processMarketplacePurchase({ buyerEmail, listingId }) {
  const buyer = String(buyerEmail || "").toLowerCase();
  if (!buyer || !listingId) return null;
  const Listing = base44.entities.MarketplaceListing;
  const Asset = base44.entities.AIAsset;
  const Transfer = base44.entities.AITransfer;
  const arr = await Listing.filter({ id: listingId });
  const listing = arr && arr[0];
  if (!listing || listing.status !== "active") return null;
  const price = Number(listing.price || 0);
  if (!(price > 0)) return null;

  // Money flow: buyer -> seller
  await recordTransfer({
    from: buyer,
    to: String(listing.seller_email || "").toLowerCase(),
    amount: price,
    reason: "marketplace_purchase",
    refs: { listing_id: listing.id, asset_id: listing.asset_id, ai_id: listing.ai_id }
  });

  // Update listing and asset ownership
  await Listing.update(listing.id, { status: "sold", buyer_email: buyer });
  await Asset.update(listing.asset_id, { owner_email: buyer });
  await Transfer.create({ asset_id: listing.asset_id, ai_id: listing.ai_id, from_email: listing.seller_email, to_email: buyer, listing_id: listing.id, note: "Auto-purchase by agent" });

  // Small buyer rebate to incentivize collecting
  const rebate = Math.min(+(0.02 * price).toFixed(4), 0.2);
  if (rebate > 0) {
    await recordTransfer({ from: SYSTEM_EMAIL, to: buyer, amount: rebate, reason: "market_rebate", refs: { listing_id: listing.id } });
  }
  return true;
}