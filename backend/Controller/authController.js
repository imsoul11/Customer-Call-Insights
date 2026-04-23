const User = require('../Models/user');
const { sanitizeUserRecord } = require('../utils/user');
const {
  createSessionToken,
  getSessionCookieOptions,
  clearSessionCookie,
} = require('../utils/session');
const { hashPassword, isPasswordHashed, verifyPassword } = require('../utils/password');

function getTrimmedValue(value) {
  return typeof value === 'string' ? value.trim() : '';
}

async function login(req, res) {
  const eid = getTrimmedValue(req.body?.eid);
  const password = getTrimmedValue(req.body?.password);

  if (!eid || !password) {
    return res.status(400).json({
      success: false,
      message: 'eid and password are required.',
    });
  }

  try {
    const user = await User.findOne({ eid }).lean();

    if (!user || !verifyPassword(user.password, password)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid EID or password.',
      });
    }

    if (user.password && !isPasswordHashed(user.password)) {
      await User.updateOne(
        { eid: user.eid },
        { $set: { password: hashPassword(password) } }
      );
    }

    const sanitizedUser = sanitizeUserRecord(user);
    const sessionToken = createSessionToken(sanitizedUser);

    res.cookie('cci_session', sessionToken, getSessionCookieOptions());

    return res.json({
      success: true,
      data: sanitizedUser,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

function getSession(req, res) {
  return res.json({
    success: true,
    data: req.authUser,
  });
}

function logout(req, res) {
  clearSessionCookie(res);

  return res.json({
    success: true,
    message: 'Logged out successfully.',
  });
}

module.exports = {
  login,
  getSession,
  logout,
};
