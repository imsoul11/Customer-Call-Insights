const mongoose = require('mongoose');

const CallSchema = new mongoose.Schema(
  {
    cid: { type: String, required: true, unique: true, index: true },
    eid: { type: String, required: true, index: true },
    customer_phone: { type: String, default: '' },
    employee_phone: { type: String, default: '' },
    status: { type: String, default: '' },
    timestamp: { type: String, default: '' },
    duration: { type: String, default: '' },
    region: { type: String, default: '' },
    conversation_text: { type: String, default: '' },
    department: { type: String, default: '' },
    source_document_id: { type: String, default: '' },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Call', CallSchema);
