const mongoose = require('mongoose');

const streakSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    streak_type: { type: String, required: true },
    current_streak: { type: Number, required: true, default: 0 },
    longest_streak: { type: Number, required: true, default: 0 },
    last_activity_date: { type: Date, default: null },
    streak_broken_date: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true, versionKey: false },
  }
);

streakSchema.index({ user_id: 1, streak_type: 1 }, { unique: true });

module.exports = mongoose.model('Streak', streakSchema);
