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

export async function rewardContentGeneration({ agentOwner, bookId }) {
  return recordTransfer({ from: SYSTEM_EMAIL, to: agentOwner, amount: 0.5, reason: "content_generation_bonus", refs: bookId ? { asset_id: null, ai_id: null } : {} });
}

export async function rewardIndexing({ agentOwner, bookOwner, chunksCount = 0, aiId = null, bookId = null }) {
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
  if (agentOwner && agentAmt > 0) ops.push(recordTransfer({ from: SYSTEM_EMAIL, to: agentOwner, amount: agentAmt, reason: "indexing_reward", refs }));
  if (bookOwner && licenseAmt > 0) ops.push(recordTransfer({ from: SYSTEM_EMAIL, to: bookOwner, amount: licenseAmt, reason: "data_licensing_fee", refs }));
  return Promise.all(ops);
}

export async function chargeChatUsage({ from, aiOwner, amount = 0.2, aiId = null }) {
  const refs = aiId ? { ai_id: aiId } : {};
  return recordTransfer({ from, to: aiOwner || SYSTEM_EMAIL, amount, reason: "chat_usage", refs });
}