const mongoose = require('mongoose');

/**
 * Daily dua completion. `selected_duas` holds the dua ids the user chose to
 * recite that day; `completed_duas` is the subset already done, so the tracker
 * can show completed vs pending without a second lookup.
 */
const duaTrackingSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true },
    selected_duas: { type: [String], default: [] },
    completed_duas: { type: [String], default: [] },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true, versionKey: false },
  }
);

duaTrackingSchema.index({ user_id: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DuaTracking', duaTrackingSchema);
