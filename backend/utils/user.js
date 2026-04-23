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

function sanitizeUserRecord(userRecord = {}) {
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
    eid: normalizeString(userRecord.eid),
    role: normalizeString(userRecord.role || 'employee') || 'employee',
    name: employeeName,
    employee_name: employeeName,
    phone: employeePhone,
    employee_phone: employeePhone,
    email: normalizeString(userRecord.email),
    department: normalizeString(userRecord.department),
  };
}

module.exports = {
  sanitizeUserRecord,
};
