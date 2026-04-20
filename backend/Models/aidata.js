const mongoose = require('mongoose');

const AIdataSchema = new mongoose.Schema({
    cid: { type: String, required: true, unique: true },
    eid: { type: String, required: true, index: true, unique: false },
    satisfaction_score: { type: Number, required: true },
    sentiment_analysis: { type: String, required: true },
    call_summary: { type: String, required: true },
    follow_up:{ type: String, required: true}

    
});

module.exports = mongoose.model('AIdata', AIdataSchema);