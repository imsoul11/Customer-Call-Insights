const crypto = require('crypto');

const SESSION_COOKIE_NAME = 'cci_session';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const JWT_TYPE = 'JWT';
const JWT_ALGORITHM = 'HS256';

function getSessionSecret() {
  return process.env.AUTH_SESSION_SECRET || process.env.AI_ADMIN_RESET_KEY || 'local-dev-session-secret';
}

function getSessionDurationMs() {
  const configuredDuration = Number(process.env.AUTH_SESSION_MAX_AGE_MS);

  return Number.isFinite(configuredDuration) && configuredDuration > 0
    ? Math.floor(configuredDuration)
    : SESSION_DURATION_MS;
}

function base64UrlEncode(value) {
  return Buffer.from(value).toString('base64url');
}

function base64UrlDecode(value) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function signValue(value) {
  return crypto
    .createHmac('sha256', getSessionSecret())
    .update(value)
    .digest('base64url');
}

function safeCompare(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function createSessionToken(user = {}) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + Math.floor(getSessionDurationMs() / 1000);
  const header = {
    alg: JWT_ALGORITHM,
    typ: JWT_TYPE,
  };
  const payload = {
    sub: String(user.eid || '').trim(),
    eid: String(user.eid || '').trim(),
    iat: issuedAt,
    exp: expiresAt,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signValue(`${encodedHeader}.${encodedPayload}`);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function verifySessionToken(token) {
  if (!token || typeof token !== 'string') {
    return null;
  }

  const [encodedHeader, encodedPayload, providedSignature] = token.split('.');

  if (!encodedHeader || !encodedPayload || !providedSignature) {
    return null;
  }

  const expectedSignature = signValue(`${encodedHeader}.${encodedPayload}`);

  if (!safeCompare(expectedSignature, providedSignature)) {
    return null;
  }

  try {
    const header = JSON.parse(base64UrlDecode(encodedHeader));
    const payload = JSON.parse(base64UrlDecode(encodedPayload));

    if (header?.typ !== JWT_TYPE || header?.alg !== JWT_ALGORITHM) {
      return null;
    }

    if (!payload?.eid || !payload?.sub || !payload?.exp || payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch (error) {
    return null;
  }
}

function parseCookies(cookieHeader = '') {
  return String(cookieHeader || '')
    .split(';')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .reduce((cookies, segment) => {
      const separatorIndex = segment.indexOf('=');

      if (separatorIndex === -1) {
        return cookies;
      }

      const key = segment.slice(0, separatorIndex).trim();
      const value = segment.slice(separatorIndex + 1).trim();

      if (!key) {
        return cookies;
      }

      cookies[key] = decodeURIComponent(value);
      return cookies;
    }, {});
}

function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: getSessionDurationMs(),
    path: '/',
  };
}

function clearSessionCookie(res) {
  return res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
}

module.exports = {
  SESSION_COOKIE_NAME,
  createSessionToken,
  verifySessionToken,
  parseCookies,
  getSessionCookieOptions,
  clearSessionCookie,
};
