const Call = require('../Models/call');

async function getAllCalls(req, res) {
  try {
    const calls = await Call.find({}).sort({ cid: 1 }).lean();
    return res.json({ success: true, data: calls });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  getAllCalls,
};
