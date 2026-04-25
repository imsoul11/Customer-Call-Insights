const AiQuota = require('../Models/aiQuota');

const QUOTA_KEY = 'site_ai_quota';
const DEFAULT_SITE_LIMIT = 100;

function getConfiguredLimit() {
  const parsedLimit = Number(process.env.AI_SITE_LIMIT);
  return Number.isFinite(parsedLimit) && parsedLimit > 0
    ? Math.floor(parsedLimit)
    : DEFAULT_SITE_LIMIT;
}

async function ensureQuotaDocument() {
  const limit = getConfiguredLimit();

  return AiQuota.findOneAndUpdate(
    { key: QUOTA_KEY },
    {
      $setOnInsert: {
        key: QUOTA_KEY,
        used_count: 0,
      },
      $set: {
        limit,
        reset_mode: 'manual',
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  ).lean();
}

function formatQuotaStatus(quotaDocument) {
  const limit = getConfiguredLimit();
  const used = Math.max(0, Math.min(Number(quotaDocument?.used_count || 0), limit));
  const remaining = Math.max(0, limit - used);

  return {
    key: QUOTA_KEY,
    limit,
    used,
    remaining,
    exhausted: remaining === 0,
    reset_mode: 'manual',
    updated_at: quotaDocument?.updated_at || new Date(),
  };
}

async function getQuotaStatus() {
  const quotaDocument = await AiQuota.findOne({ key: QUOTA_KEY }).lean();
  return formatQuotaStatus(quotaDocument);
}

async function reserveQuotaSlot() {
  await ensureQuotaDocument();

  const limit = getConfiguredLimit();
  const reservedDocument = await AiQuota.findOneAndUpdate(
    {
      key: QUOTA_KEY,
      used_count: { $lt: limit },
    },
    {
      $inc: { used_count: 1 },
      $set: {
        limit,
        reset_mode: 'manual',
        updated_at: new Date(),
      },
    },
    {
      new: true,
    }
  ).lean();

  return reservedDocument ? formatQuotaStatus(reservedDocument) : null;
}

async function refundQuotaSlot() {
  await ensureQuotaDocument();

  const refundedDocument = await AiQuota.findOneAndUpdate(
    {
      key: QUOTA_KEY,
      used_count: { $gt: 0 },
    },
    {
      $inc: { used_count: -1 },
      $set: {
        updated_at: new Date(),
      },
    },
    {
      new: true,
    }
  ).lean();

  return refundedDocument ? formatQuotaStatus(refundedDocument) : getQuotaStatus();
}

async function resetQuotaUsage() {
  const limit = getConfiguredLimit();

  const resetDocument = await AiQuota.findOneAndUpdate(
    { key: QUOTA_KEY },
    {
      $set: {
        limit,
        used_count: 0,
        reset_mode: 'manual',
        updated_at: new Date(),
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  ).lean();

  return formatQuotaStatus(resetDocument);
}

module.exports = {
  getQuotaStatus,
  reserveQuotaSlot,
  refundQuotaSlot,
  resetQuotaUsage,
};
