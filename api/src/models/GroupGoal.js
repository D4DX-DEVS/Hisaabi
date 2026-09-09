const mongoose = require('mongoose');

/**
 * A collective goal the whole group works toward (e.g. "read 500 pages
 * together this month"). Only the aggregate total is ever exposed; individual
 * contributions stay private unless the member shares that metric.
 */
const groupGoalSchema = new mongoose.Schema(
  {
    group_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    metric: { type: String, default: 'manual' },
    target: { type: Number, required: true, min: 1 },
    period: { type: String, enum: ['weekly', 'monthly', 'custom'], default: 'monthly' },
    start_date: { type: String, required: true },
    end_date: { type: String, required: true },
    // Manual contributions, keyed by user id. Summed for the group total.
    contributions: { type: mongoose.Schema.Types.Mixed, default: {} },
    archived: { type: Boolean, default: false },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true, versionKey: false },
  }
);

groupGoalSchema.index({ group_id: 1, archived: 1 });

module.exports = mongoose.model('GroupGoal', groupGoalSchema);
