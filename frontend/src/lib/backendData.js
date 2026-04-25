import axios from "axios";
import { buildApiUrl } from "./api";

function normalizeString(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function normalizeUserRecord(record = {}) {
  const eid = normalizeString(record.eid || record.id);
  const name = normalizeString(record.name || record.employee_name);
  const phone = normalizeString(record.phone || record.employee_phone);

  return {
    ...record,
    id: eid || normalizeString(record._id),
    eid,
    name,
    employee_name: name,
    employee_phone: phone,
    phone,
    email: normalizeString(record.email),
    role: normalizeString(record.role || "employee") || "employee",
    department: normalizeString(record.department),
  };
}

function normalizeCallRecord(record = {}) {
  const cid = normalizeString(record.cid || record.id);
  const eid = normalizeString(record.eid);

  return {
    ...record,
    id: cid || normalizeString(record._id),
    cid,
    eid,
    customer_phone: normalizeString(record.customer_phone),
    employee_phone: normalizeString(record.employee_phone),
    status: normalizeString(record.status),
    timestamp: normalizeString(record.timestamp),
    duration: normalizeString(record.duration),
    region: normalizeString(record.region),
    conversation_text: normalizeString(record.conversation_text || record.transcript),
    department: normalizeString(record.department),
  };
}

async function fetchCollection(path, normalizer) {
  const response = await axios.get(buildApiUrl(path));

  if (!response.data?.success) {
    throw new Error(response.data?.message || `Failed to fetch ${path}`);
  }

  const records = Array.isArray(response.data.data) ? response.data.data : [];
  return records.map((record) => normalizer(record));
}

export async function fetchBackendUsers() {
  return fetchCollection("/api/users", normalizeUserRecord);
}

export async function fetchBackendCallRecords() {
  return fetchCollection("/api/calls", normalizeCallRecord);
}

export async function createBackendUser(userPayload) {
  const response = await axios.post(buildApiUrl("/api/users"), userPayload);

  if (!response.data?.success) {
    throw new Error(response.data?.message || "Failed to create user.");
  }

  return {
    user: normalizeUserRecord(response.data.data || {}),
    credentials: response.data.credentials || null,
  };
}

export async function updateBackendUserRole(eid, role) {
  const response = await axios.patch(buildApiUrl(`/api/users/${encodeURIComponent(eid)}/role`), {
    role,
  });

  if (!response.data?.success) {
    throw new Error(response.data?.message || "Failed to update user role.");
  }

  return normalizeUserRecord(response.data.data || {});
}

export async function deleteBackendUser(eid) {
  const response = await axios.delete(buildApiUrl(`/api/users/${encodeURIComponent(eid)}`));

  if (!response.data?.success) {
    throw new Error(response.data?.message || "Failed to delete user.");
  }

  return true;
}

export async function loginWithBackend(eid, password) {
  const response = await axios.post(buildApiUrl("/api/auth/login"), {
    eid,
    password,
  });

  if (!response.data?.success) {
    throw new Error(response.data?.message || "Login failed.");
  }

  return normalizeUserRecord(response.data.data || {});
}

export async function fetchBackendSession() {
  const response = await axios.get(buildApiUrl("/api/auth/session"));

  if (!response.data?.success) {
    throw new Error(response.data?.message || "Failed to restore session.");
  }

  return normalizeUserRecord(response.data.data || {});
}

export async function logoutBackendSession() {
  const response = await axios.post(buildApiUrl("/api/auth/logout"));

  if (!response.data?.success) {
    throw new Error(response.data?.message || "Logout failed.");
  }

  return true;
}
