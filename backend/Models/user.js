const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    eid: { type: String, required: true, unique: true, index: true },
    employee_name: { type: String, default: '' },
    employee_phone: { type: String, default: '' },
    email: { type: String, default: '' },
    role: { type: String, default: 'employee' },
    password: { type: String, default: '' },
    department: { type: String, default: '' },
    phone: { type: String, default: '' },
    source_document_id: { type: String, default: '' },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('User', UserSchema);
