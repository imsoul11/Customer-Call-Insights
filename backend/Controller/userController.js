const User = require('../Models/user');

async function getAllUsers(req, res) {
  try {
    const users = await User.find({}).sort({ eid: 1 });
    return res.json({ success: true, data: users });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  getAllUsers,
};
