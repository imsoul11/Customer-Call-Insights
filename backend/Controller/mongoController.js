const AIdata = require('../Models/aidata.js');

// Get all data
async function allData(req, res) {
    try {
        const data = await AIdata.find({}).lean();
        return res.json({ success: true, data });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

module.exports = {
    allData,
};
