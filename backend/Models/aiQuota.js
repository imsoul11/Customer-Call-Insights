const mongoose = require('mongoose');

const AiQuotaSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    limit: { type: Number, required: true, default: 30 },
    used_count: { type: Number, required: true, default: 0 },
    reset_mode: { type: String, required: true, default: 'manual' },
  },
  {
    timestamps: { createdAt: false, updatedAt: 'updated_at' },
  }
);

module.exports = mongoose.model('AiQuota', AiQuotaSchema);
