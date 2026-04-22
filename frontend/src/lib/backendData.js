import axios from "axios";
import { buildApiUrl } from "./api";

const MONTH_INDEX = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

function normalizeString(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function looksLikePhoneValue(value = "") {
  const normalizedValue = normalizeString(value);

  if (!normalizedValue) {
    return false;
  }

  const digitsOnly = normalizedValue.replace(/\D/g, "");
  return digitsOnly.length >= 7 && /^[\d\s()+-]+$/.test(normalizedValue);
}

function toTitleCase(value = "") {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function deriveNameFromEmail(email = "") {
  const localPart = normalizeString(email).split("@")[0] || "";
  const tokens = localPart.split(/[._-]+/).filter(Boolean);

  if (!tokens.length) {
    return "";
  }

  return toTitleCase(tokens.join(" "));
}

function toIsoString(date) {
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function normalizeTimestampValue(timestamp) {
  if (!timestamp) {
    return "";
  }

  if (timestamp instanceof Date) {
    return toIsoString(timestamp);
  }

  if (typeof timestamp === "number") {
    return toIsoString(new Date(timestamp));
  }

  const rawTimestamp = normalizeString(timestamp);

  if (!rawTimestamp) {
    return "";
  }

  if (/^\d+$/.test(rawTimestamp)) {
    const numericTimestamp = Number(rawTimestamp);

    if (rawTimestamp.length === 13) {
      return toIsoString(new Date(numericTimestamp));
    }

    if (rawTimestamp.length === 10) {
      return toIsoString(new Date(numericTimestamp * 1000));
    }
  }

  const legacyMatch = rawTimestamp.match(
    /^(\d{1,2}):(\d{2})\s*(AM|PM)\s*,?\s*(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/i
  );

  if (legacyMatch) {
    const [, hourText, minuteText, meridiem, dayText, monthText, yearText] = legacyMatch;
    const monthIndex = MONTH_INDEX[monthText.toLowerCase()];

    if (monthIndex !== undefined) {
      const hour = Number(hourText);
      const minute = Number(minuteText);
      const normalizedHour = meridiem.toUpperCase() === "PM"
        ? (hour % 12) + 12
        : hour % 12;

      return toIsoString(
        new Date(
          Number(yearText),
          monthIndex,
          Number(dayText),
          normalizedHour,
          minute
        )
      );
    }
  }

  const parsedTimestamp = new Date(rawTimestamp);

  if (!Number.isNaN(parsedTimestamp.getTime())) {
    return parsedTimestamp.toISOString();
  }

  return rawTimestamp;
}

function normalizeUserRecord(record = {}) {
  const eid = normalizeString(record.eid || record.id);
  const rawEmployeeName = normalizeString(record.employee_name);
  const rawName = normalizeString(record.name);
  const derivedName = !looksLikePhoneValue(rawEmployeeName) && rawEmployeeName
    ? rawEmployeeName
    : !looksLikePhoneValue(rawName) && rawName
      ? rawName
      : deriveNameFromEmail(record.email);
  const recoveredPhone = normalizeString(
    record.employee_phone ||
    record.phone ||
    (looksLikePhoneValue(rawEmployeeName) ? rawEmployeeName : "") ||
    (looksLikePhoneValue(rawName) ? rawName : "")
  );

  return {
    ...record,
    id: eid || normalizeString(record._id),
    eid,
    name: derivedName,
    employee_name: derivedName,
    employee_phone: recoveredPhone,
    phone: recoveredPhone,
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
    timestamp: normalizeTimestampValue(record.timestamp),
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
