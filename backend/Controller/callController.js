const Call = require('../Models/call');
const AIdata = require('../Models/aidata');

async function getAllCalls(req, res) {
  try {
    const calls = await Call.find({}).sort({ cid: 1 }).lean();
    return res.json({ success: true, data: calls });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function getCallDetail(req, res) {
  const cid = String(req.params?.cid || '').trim();

  if (!cid) {
    return res.status(400).json({ success: false, message: 'Call ID is required.' });
  }

  try {
    const call = await Call.findOne({ cid }).lean();

    if (!call) {
      return res.status(404).json({ success: false, message: 'Call not found.' });
    }

    if (req.authUser?.role === 'employee' && call.eid !== req.authUser.eid) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this call.',
      });
    }

    const analysis = await AIdata.findOne({ cid }).lean();

    return res.json({
      success: true,
      data: {
        call,
        analysis,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  getAllCalls,
  getCallDetail,
};
