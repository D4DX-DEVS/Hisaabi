const mongoose = require('mongoose');

/**
 * Daily adhkar completion: the morning and evening sets plus any personal
 * dhikr sessions the user defines. Raw tasbeeh counts stay in DhikrTracking —
 * this only records that a named set was completed, which is what the tracker
 * dashboard and streaks need.
 */
const adhkarTrackingSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true },
    morning: { type: Boolean, default: false },
    evening: { type: Boolean, default: false },
    // [{ key, label, target, count }] — user-defined personal dhikr.
    personal: { type: [mongoose.Schema.Types.Mixed], default: [] },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true, versionKey: false },
  }
);

adhkarTrackingSchema.index({ user_id: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('AdhkarTracking', adhkarTrackingSchema);
