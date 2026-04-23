const User = require('../Models/user');
const { sanitizeUserRecord } = require('../utils/user');
const {
  SESSION_COOKIE_NAME,
  parseCookies,
  verifySessionToken,
} = require('../utils/session');

function getRequestToken(req) {
  const authorizationHeader = req.headers.authorization;

  if (typeof authorizationHeader === 'string' && authorizationHeader.startsWith('Bearer ')) {
    return authorizationHeader.slice('Bearer '.length).trim();
  }

  const cookies = parseCookies(req.headers.cookie);
  return cookies[SESSION_COOKIE_NAME];
}

async function requireAuth(req, res, next) {
  try {
    const sessionToken = getRequestToken(req);
    const sessionPayload = verifySessionToken(sessionToken);

    if (!sessionPayload?.eid) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const user = await User.findOne({ eid: sessionPayload.eid }).lean();

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    req.authUser = sanitizeUserRecord(user);
    return next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

function requireRole(...allowedRoles) {
  const normalizedRoles = allowedRoles
    .map((role) => String(role || '').trim().toLowerCase())
    .filter(Boolean);

  return (req, res, next) => {
    const currentRole = String(req.authUser?.role || '').trim().toLowerCase();

    if (!currentRole) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!normalizedRoles.includes(currentRole)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this resource.',
      });
    }

    return next();
  };
}

module.exports = {
  requireAuth,
  requireRole,
};
