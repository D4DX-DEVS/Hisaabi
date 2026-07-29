const mongoose = require('mongoose');

const periodTrackingSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    start_date: { type: String, required: true },
    end_date: { type: String, required: true },
    notes: { type: String, default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true, versionKey: false },
  }
);

module.exports = mongoose.model('PeriodTracking', periodTrackingSchema);
