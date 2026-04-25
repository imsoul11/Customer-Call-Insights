const AIdata = require('../Models/aidata');
const Call = require('../Models/call');
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

function getDurationInSeconds(duration = '') {
  const normalizedDuration = String(duration || '');
  const minutesMatch = normalizedDuration.match(/(\d+)\s*m/i);
  const secondsMatch = normalizedDuration.match(/(\d+)\s*s/i);

  return (minutesMatch ? Number(minutesMatch[1]) * 60 : 0) +
    (secondsMatch ? Number(secondsMatch[1]) : 0);
}

function buildCallPayload(body = {}) {
  return {
    cid: getTrimmedField(body.cid),
    eid: getTrimmedField(body.eid),
    status: getTrimmedField(body.status),
    timestamp: getTrimmedField(body.timestamp),
    region: getTrimmedField(body.region),
    customer_phone: getTrimmedField(body.customer_phone),
    employee_phone: getTrimmedField(body.employee_phone),
    duration: getTrimmedField(body.duration),
    department: getTrimmedField(body.department),
    transcript: getTranscript(body),
  };
}

function validateCallPayload(callPayload) {
  const validationErrors = [];

  if (!callPayload.eid) {
    validationErrors.push('eid is required.');
  }

  if (!callPayload.customer_phone) {
    validationErrors.push('customer_phone is required.');
  }

  if (getDurationInSeconds(callPayload.duration) <= 0) {
    validationErrors.push('duration must be greater than 0 seconds.');
  }

  if (!callPayload.transcript) {
    validationErrors.push('transcript or conversation_text is required.');
  }

  return validationErrors;
}

function generateCallIdCandidate() {
  return `CID${Math.floor(10000 + Math.random() * 90000)}`;
}

async function ensureCallId(existingCid) {
  if (existingCid) {
    return existingCid;
  }

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const candidateCid = generateCallIdCandidate();
    const [existingCall, existingAnalysis] = await Promise.all([
      Call.exists({ cid: candidateCid }),
      AIdata.exists({ cid: candidateCid }),
    ]);

    if (!existingCall && !existingAnalysis) {
      return candidateCid;
    }
  }

  return `CID${Date.now().toString().slice(-8)}`;
}

function buildRawCallDocument(callPayload) {
  return {
    cid: callPayload.cid,
    eid: callPayload.eid,
    customer_phone: callPayload.customer_phone,
    employee_phone: callPayload.employee_phone,
    status: callPayload.status,
    timestamp: callPayload.timestamp,
    duration: callPayload.duration,
    region: callPayload.region,
    conversation_text: callPayload.transcript,
    department: callPayload.department,
  };
}

async function upsertRawCall(callPayload) {
  return Call.findOneAndUpdate(
    { cid: callPayload.cid },
    {
      $set: buildRawCallDocument(callPayload),
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  ).lean();
}

async function analyzeCall(req, res) {
  const callPayload = buildCallPayload(req.body);
  const authenticatedUser = req.authUser;
  const authenticatedEid = getTrimmedField(authenticatedUser?.eid);
  const authenticatedEmployeePhone = getTrimmedField(
    authenticatedUser?.employee_phone || authenticatedUser?.phone
  );

  if (callPayload.eid && authenticatedEid && callPayload.eid !== authenticatedEid) {
    return res.status(403).json({
      success: false,
      message: 'You cannot submit analysis for another employee.',
    });
  }

  if (
    callPayload.employee_phone &&
    authenticatedEmployeePhone &&
    callPayload.employee_phone !== authenticatedEmployeePhone
  ) {
    return res.status(403).json({
      success: false,
      message: 'Employee phone does not match the authenticated user.',
    });
  }

  if (authenticatedEid) {
    callPayload.eid = authenticatedEid;
  }

  if (authenticatedEmployeePhone) {
    callPayload.employee_phone = authenticatedEmployeePhone;
  }

  const validationErrors = validateCallPayload(callPayload);

  if (validationErrors.length > 0) {
    return res.status(400).json({
      success: false,
      message: validationErrors.join(' '),
    });
  }

  try {
    callPayload.cid = await ensureCallId(callPayload.cid);
    await upsertRawCall(callPayload);

    const existingAnalysis = await AIdata.findOne({ cid: callPayload.cid }).lean();

    if (existingAnalysis) {
      return res.json({
        success: true,
        cached: true,
        data: existingAnalysis,
        call: buildRawCallDocument(callPayload),
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
        call: buildRawCallDocument(callPayload),
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
      ).lean();

      return res.status(201).json({
        success: true,
        cached: false,
        data: savedAnalysis,
        call: buildRawCallDocument(callPayload),
        quota: await getQuotaStatus(),
      });
    } catch (saveError) {
      if (saveError?.code === 11000) {
        const existingDocument = await AIdata.findOne({ cid: callPayload.cid }).lean();

        if (existingDocument) {
          return res.json({
            success: true,
            cached: true,
            data: existingDocument,
            call: buildRawCallDocument(callPayload),
            quota: await getQuotaStatus(),
          });
        }
      }

      return res.status(500).json({
        success: false,
        message: 'AI analysis was generated, but saving it failed.',
        error: saveError.message,
        call: buildRawCallDocument(callPayload),
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
