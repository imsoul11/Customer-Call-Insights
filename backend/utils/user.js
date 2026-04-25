function normalizeString(value) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

function sanitizeUserRecord(userRecord = {}) {
  const employeeName = normalizeString(userRecord.employee_name);
  const employeePhone = normalizeString(userRecord.employee_phone);

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
