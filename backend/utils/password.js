const crypto = require('crypto');

const PASSWORD_PREFIX = 'scrypt';
const SALT_BYTES = 16;
const KEY_LENGTH = 64;

function isPasswordHashed(value = '') {
  return typeof value === 'string' && value.startsWith(`${PASSWORD_PREFIX}$`);
}

function hashPassword(password = '') {
  const normalizedPassword = String(password || '');

  if (!normalizedPassword) {
    return '';
  }

  const salt = crypto.randomBytes(SALT_BYTES).toString('base64url');
  const derivedKey = crypto
    .scryptSync(normalizedPassword, salt, KEY_LENGTH)
    .toString('base64url');

  return `${PASSWORD_PREFIX}$${salt}$${derivedKey}`;
}

function verifyHashedPassword(storedHash, candidatePassword) {
  const [, salt, expectedKey] = String(storedHash || '').split('$');

  if (!salt || !expectedKey) {
    return false;
  }

  const derivedKey = crypto
    .scryptSync(String(candidatePassword || ''), salt, KEY_LENGTH)
    .toString('base64url');
  const expectedBuffer = Buffer.from(expectedKey);
  const derivedBuffer = Buffer.from(derivedKey);

  if (expectedBuffer.length !== derivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, derivedBuffer);
}

function verifyPassword(storedPassword = '', candidatePassword = '') {
  const normalizedStoredPassword = String(storedPassword || '');
  const normalizedCandidate = String(candidatePassword || '');

  if (!normalizedStoredPassword || !normalizedCandidate) {
    return false;
  }

  if (isPasswordHashed(normalizedStoredPassword)) {
    return verifyHashedPassword(normalizedStoredPassword, normalizedCandidate);
  }

  return normalizedStoredPassword === normalizedCandidate;
}

function normalizeImportedPassword(storedPassword = '') {
  const normalizedPassword = String(storedPassword || '').trim();

  if (!normalizedPassword) {
    return '';
  }

  return isPasswordHashed(normalizedPassword)
    ? normalizedPassword
    : hashPassword(normalizedPassword);
}

module.exports = {
  isPasswordHashed,
  hashPassword,
  verifyPassword,
  normalizeImportedPassword,
};
