const AIdata = require('../Models/aidata');
const { analyzeCallWithGemini } = require('../services/geminiService');
const {
  getQuotaStatus,
  reserveQuotaSlot,
  refundQuotaSlot,
  resetQuotaUsage,
} = require('../services/aiQuotaService');

function getMaxTranscriptCharacters() {
  const configuredLimit = Number(process.env.AI_MAX_TRANSCRIPT_CHARS);
  return Number.isFinite(configuredLimit) && configuredLimit > 0
    ? Math.floor(configuredLimit)
    : 12000;
}

function getTranscript(body = {}) {
  const transcript =
    body.transcript ||
    body.conversation_text ||
    body.call_text ||
    body.callText;

  if (typeof transcript !== 'string') {
    return '';
  }

  return transcript.trim().slice(0, getMaxTranscriptCharacters());
}

function getTrimmedField(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function buildCallPayload(body = {}) {
  return {
    cid: getTrimmedField(body.cid),
    eid: getTrimmedField(body.eid),
    status: getTrimmedField(body.status),
    timestamp: body.timestamp,
    region: getTrimmedField(body.region),
    customer_phone: getTrimmedField(body.customer_phone),
    employee_phone: getTrimmedField(body.employee_phone),
    transcript: getTranscript(body),
  };
}

function validateCallPayload(callPayload) {
  const validationErrors = [];

  if (!callPayload.cid) {
    validationErrors.push('cid is required.');
  }

  if (!callPayload.eid) {
    validationErrors.push('eid is required.');
  }

  if (!callPayload.transcript) {
    validationErrors.push('transcript or conversation_text is required.');
  }

  return validationErrors;
}

async function analyzeCall(req, res) {
  const callPayload = buildCallPayload(req.body);
  const validationErrors = validateCallPayload(callPayload);

  if (validationErrors.length > 0) {
    return res.status(400).json({
      success: false,
      message: validationErrors.join(' '),
    });
  }

  try {
    const existingAnalysis = await AIdata.findOne({ cid: callPayload.cid });

    if (existingAnalysis) {
      return res.json({
        success: true,
        cached: true,
        data: existingAnalysis,
        quota: await getQuotaStatus(),
      });
    }

    const reservedQuota = await reserveQuotaSlot();

    if (!reservedQuota) {
      return res.status(429).json({
        success: false,
        message: 'AI analysis is temporarily unavailable; usage limit reached.',
        quota: await getQuotaStatus(),
      });
    }

    let generatedAnalysis;

    try {
      generatedAnalysis = await analyzeCallWithGemini(callPayload);
    } catch (providerError) {
      return res.status(502).json({
        success: false,
        message: 'Failed to generate AI analysis.',
        error: providerError.message,
        quota: await refundQuotaSlot(),
      });
    }

    try {
      const savedAnalysis = await AIdata.findOneAndUpdate(
        { cid: callPayload.cid },
        {
          $set: {
            cid: callPayload.cid,
            eid: callPayload.eid,
            ...generatedAnalysis,
          },
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        }
      );

      return res.status(201).json({
        success: true,
        cached: false,
        data: savedAnalysis,
        quota: await getQuotaStatus(),
      });
    } catch (saveError) {
      if (saveError?.code === 11000) {
        const existingDocument = await AIdata.findOne({ cid: callPayload.cid });

        if (existingDocument) {
          return res.json({
            success: true,
            cached: true,
            data: existingDocument,
            quota: await getQuotaStatus(),
          });
        }
      }

      return res.status(500).json({
        success: false,
        message: 'AI analysis was generated, but saving it failed.',
        error: saveError.message,
        quota: await getQuotaStatus(),
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

async function quotaStatus(req, res) {
  try {
    return res.json({
      success: true,
      data: await getQuotaStatus(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

async function resetQuota(req, res) {
  const adminResetKey = process.env.AI_ADMIN_RESET_KEY;

  if (!adminResetKey) {
    return res.status(503).json({
      success: false,
      message: 'AI quota reset is not configured on the backend.',
    });
  }

  if (req.headers['x-admin-reset-key'] !== adminResetKey) {
    return res.status(403).json({
      success: false,
      message: 'Invalid admin reset key.',
    });
  }

  try {
    return res.json({
      success: true,
      message: 'AI quota reset successfully.',
      data: await resetQuotaUsage(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

module.exports = {
  analyzeCall,
  quotaStatus,
  resetQuota,
};
