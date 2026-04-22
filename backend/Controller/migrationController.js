const Call = require('../Models/call');
const User = require('../Models/user');

function normalizeString(value) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

function looksLikePhoneValue(value = '') {
  const normalizedValue = normalizeString(value);

  if (!normalizedValue) {
    return false;
  }

  const digitsOnly = normalizedValue.replace(/\D/g, '');
  return digitsOnly.length >= 7 && /^[\d\s()+-]+$/.test(normalizedValue);
}

function toTitleCase(value = '') {
  return value
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function deriveNameFromEmail(email = '') {
  const localPart = normalizeString(email).split('@')[0] || '';
  const tokens = localPart.split(/[._-]+/).filter(Boolean);

  if (!tokens.length) {
    return '';
  }

  return toTitleCase(tokens.join(' '));
}

function normalizeUserRecord(userRecord = {}) {
  const eid = normalizeString(userRecord.eid);

  if (!eid) {
    return null;
  }

  const rawEmployeeName = normalizeString(userRecord.employee_name);
  const rawName = normalizeString(userRecord.name);
  const employeeName = !looksLikePhoneValue(rawEmployeeName) && rawEmployeeName
    ? rawEmployeeName
    : !looksLikePhoneValue(rawName) && rawName
      ? rawName
      : deriveNameFromEmail(userRecord.email);
  const employeePhone = normalizeString(
    userRecord.employee_phone ||
    userRecord.phone ||
    (looksLikePhoneValue(rawEmployeeName) ? rawEmployeeName : '') ||
    (looksLikePhoneValue(rawName) ? rawName : '')
  );

  return {
    eid,
    employee_name: employeeName,
    employee_phone: employeePhone,
    email: normalizeString(userRecord.email),
    role: normalizeString(userRecord.role || 'employee') || 'employee',
    password: normalizeString(userRecord.password),
    department: normalizeString(userRecord.department),
    phone: employeePhone,
    source_document_id: normalizeString(userRecord.id),
  };
}

function normalizeCallRecord(callRecord = {}) {
  const cid = normalizeString(callRecord.cid);
  const eid = normalizeString(callRecord.eid);

  if (!cid || !eid) {
    return null;
  }

  return {
    cid,
    eid,
    customer_phone: normalizeString(callRecord.customer_phone),
    employee_phone: normalizeString(callRecord.employee_phone),
    status: normalizeString(callRecord.status),
    timestamp: normalizeString(callRecord.timestamp),
    duration: normalizeString(callRecord.duration),
    region: normalizeString(callRecord.region),
    conversation_text: normalizeString(callRecord.conversation_text || callRecord.transcript),
    department: normalizeString(callRecord.department),
    source_document_id: normalizeString(callRecord.id),
  };
}

async function importFirebaseData(req, res) {
  const userPayload = Array.isArray(req.body?.users) ? req.body.users : [];
  const callPayload = Array.isArray(req.body?.calls) ? req.body.calls : [];

  try {
    const normalizedUsers = userPayload
      .map(normalizeUserRecord)
      .filter(Boolean);
    const normalizedCalls = callPayload
      .map(normalizeCallRecord)
      .filter(Boolean);

    const [userResult, callResult] = await Promise.all([
      normalizedUsers.length
        ? User.bulkWrite(
            normalizedUsers.map((record) => ({
              updateOne: {
                filter: { eid: record.eid },
                update: { $set: record },
                upsert: true,
              },
            })),
            { ordered: false }
          )
        : null,
      normalizedCalls.length
        ? Call.bulkWrite(
            normalizedCalls.map((record) => ({
              updateOne: {
                filter: { cid: record.cid },
                update: { $set: record },
                upsert: true,
              },
            })),
            { ordered: false }
          )
        : null,
    ]);

    return res.json({
      success: true,
      message: 'Firebase data imported into MongoDB successfully.',
      data: {
        users_received: userPayload.length,
        users_imported: normalizedUsers.length,
        users_upserted: (userResult?.upsertedCount || 0) + (userResult?.modifiedCount || 0),
        calls_received: callPayload.length,
        calls_imported: normalizedCalls.length,
        calls_upserted: (callResult?.upsertedCount || 0) + (callResult?.modifiedCount || 0),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

module.exports = {
  importFirebaseData,
};
