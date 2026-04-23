const User = require('../Models/user');
const { sanitizeUserRecord } = require('../utils/user');
const { hashPassword } = require('../utils/password');

function normalizeString(value) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

function generateRandomPassword(length = 12) {
  const charset = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%';
  let password = '';

  for (let index = 0; index < length; index += 1) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }

  return password;
}

function generateUniqueEidCandidate() {
  return `EID${Math.floor(10000 + Math.random() * 90000)}`;
}

async function ensureUniqueEid(existingEid) {
  const normalizedEid = normalizeString(existingEid);

  if (normalizedEid) {
    const existingUser = await User.exists({ eid: normalizedEid });

    if (existingUser) {
      throw new Error('A user with that EID already exists.');
    }

    return normalizedEid;
  }

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const candidate = generateUniqueEidCandidate();
    const existingUser = await User.exists({ eid: candidate });

    if (!existingUser) {
      return candidate;
    }
  }

  return `EID${Date.now().toString().slice(-8)}`;
}

function normalizeRole(role) {
  const normalizedRole = normalizeString(role).toLowerCase();
  return ['employee', 'manager', 'admin'].includes(normalizedRole)
    ? normalizedRole
    : 'employee';
}

function buildUserPayload(body = {}) {
  return {
    employee_name: normalizeString(body.employee_name || body.name),
    employee_phone: normalizeString(body.employee_phone || body.phone),
    email: normalizeString(body.email).toLowerCase(),
    role: normalizeRole(body.role),
    department: normalizeString(body.department),
  };
}

async function getAllUsers(req, res) {
  try {
    const users = await User.find({}).sort({ eid: 1 }).lean();
    return res.json({ success: true, data: users.map((user) => sanitizeUserRecord(user)) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function createUser(req, res) {
  const userPayload = buildUserPayload(req.body);

  if (!userPayload.employee_name) {
    return res.status(400).json({
      success: false,
      message: 'employee_name is required.',
    });
  }

  if (!userPayload.email) {
    return res.status(400).json({
      success: false,
      message: 'email is required.',
    });
  }

  try {
    const eid = await ensureUniqueEid(req.body?.eid);
    const password = generateRandomPassword();

    const createdUser = await User.create({
      eid,
      ...userPayload,
      phone: userPayload.employee_phone,
      password: hashPassword(password),
    });

    return res.status(201).json({
      success: true,
      data: sanitizeUserRecord(createdUser.toObject()),
      credentials: {
        eid,
        password,
      },
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A user with that EID already exists.',
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

async function updateUserRole(req, res) {
  const targetEid = normalizeString(req.params?.eid);
  const nextRole = normalizeRole(req.body?.role);

  if (!targetEid) {
    return res.status(400).json({
      success: false,
      message: 'eid is required.',
    });
  }

  if (targetEid === req.authUser?.eid) {
    return res.status(400).json({
      success: false,
      message: 'You cannot change your own role.',
    });
  }

  try {
    const updatedUser = await User.findOneAndUpdate(
      { eid: targetEid },
      { $set: { role: nextRole } },
      { new: true }
    ).lean();

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    return res.json({
      success: true,
      data: sanitizeUserRecord(updatedUser),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

async function deleteUser(req, res) {
  const targetEid = normalizeString(req.params?.eid);

  if (!targetEid) {
    return res.status(400).json({
      success: false,
      message: 'eid is required.',
    });
  }

  if (targetEid === req.authUser?.eid) {
    return res.status(400).json({
      success: false,
      message: 'You cannot delete your own account.',
    });
  }

  try {
    const deletedUser = await User.findOneAndDelete({ eid: targetEid }).lean();

    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    return res.json({
      success: true,
      message: `User ${targetEid} deleted successfully.`,
      data: sanitizeUserRecord(deletedUser),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

module.exports = {
  getAllUsers,
  createUser,
  updateUserRole,
  deleteUser,
};
