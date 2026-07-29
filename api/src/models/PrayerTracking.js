const mongoose = require('mongoose');

const prayerTrackingSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true },
    fardh_prayers: { type: mongoose.Schema.Types.Mixed, default: {} },
    sunnah_prayers: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true, versionKey: false },
  }
);

prayerTrackingSchema.index({ user_id: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('PrayerTracking', prayerTrackingSchema);
