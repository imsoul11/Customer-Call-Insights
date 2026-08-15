const mongoose = require('mongoose');

const FollowUpTaskSchema = new mongoose.Schema(
  {
    // Call context retained with the task for efficient permission-scoped queries.
    cid: { type: String, required: true, unique: true, trim: true },
    call_eid: { type: String, required: true, index: true, trim: true },

    // Ownership and accountability.
    assignee_eid: { type: String, required: true, index: true, trim: true },
    created_by_eid: { type: String, required: true, trim: true },

    // Work details.
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, default: '', trim: true, maxlength: 2000 },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
      required: true,
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved'],
      default: 'open',
      required: true,
      index: true,
    },
    due_at: { type: Date, required: true, index: true },

    // Resolution is populated only when a task is completed.
    resolved_at: { type: Date, default: null },
    resolution_note: { type: String, default: '', trim: true, maxlength: 2000 },

    // Used by update routes later to prevent conflicting writes.
    version: { type: Number, required: true, default: 1, min: 1 },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false,
  }
);

FollowUpTaskSchema.index({ assignee_eid: 1, status: 1, due_at: 1 });
FollowUpTaskSchema.index({ call_eid: 1, status: 1, due_at: 1 });

module.exports = mongoose.model('FollowUpTask', FollowUpTaskSchema);
