const mongoose = require('mongoose');

/**
 * An admin-created, time-bound group challenge (30-Day Qur'an, 7-Day Morning
 * Adhkar, Monday Fasting...).
 *
 * `metric` mirrors WorshipGoal.METRICS so progress can be derived from the
 * member's existing tracking data; `manual` challenges are self-reported.
 * Participant rows carry only a progress number — never the underlying
 * per-day detail — so joining a challenge cannot leak a member's records.
 */
const participantSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    progress: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
    completed_at: { type: Date, default: null },
    joined_at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const groupChallengeSchema = new mongoose.Schema(
  {
    group_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    start_date: { type: String, required: true },
    end_date: { type: String, required: true },
    metric: { type: String, default: 'manual' },
    // Per-participant target for the whole challenge window.
    target: { type: Number, required: true, min: 1 },
    icon: { type: String, default: null },
    participants: { type: [participantSchema], default: [] },
    archived: { type: Boolean, default: false },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true, versionKey: false },
  }
);

groupChallengeSchema.index({ group_id: 1, archived: 1 });

module.exports = mongoose.model('GroupChallenge', groupChallengeSchema);
