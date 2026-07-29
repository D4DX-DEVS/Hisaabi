const mongoose = require('mongoose');

const dhikrTrackingSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true },
    dhikr_counts: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true, versionKey: false },
  }
);

dhikrTrackingSchema.index({ user_id: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DhikrTracking', dhikrTrackingSchema);
