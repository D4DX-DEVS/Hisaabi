const mongoose = require('mongoose');

const quranProgressSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    khatms_completed: { type: Number, required: true, default: 0 },
    last_reset_date: { type: Date, default: null },
    last_completed_date: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true, versionKey: false },
  }
);

module.exports = mongoose.model('QuranProgress', quranProgressSchema);
