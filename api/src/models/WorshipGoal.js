const mongoose = require('mongoose');

/**
 * A user-defined worship goal.
 *
 * The legacy daily goals (dhikr_count / quran_pages / quran_ayahs /
 * sunnah_prayers) still live in `User.settings.goals`; this model adds the
 * weekly/monthly periods and free-form custom goals the FR asks for, without
 * breaking existing clients.
 *
 * `metric` decides how progress is computed server-side. `manual` goals are
 * advanced by the user tapping a counter, everything else is derived from
 * existing tracking data so nothing has to be entered twice.
 */
const METRICS = [
  'prayers_ontime',
  'prayers_jamaah',
  'prayers_qada',
  'quran_pages',
  'quran_ayahs',
  'quran_minutes',
  'dhikr_count',
  'sunnah_prayers',
  'fasting_days',
  'adhkar_sessions',
  'dua_completions',
  'good_deeds',
  'learning_minutes',
  'manual',
];

const worshipGoalSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    metric: { type: String, enum: METRICS, default: 'manual' },
    target: { type: Number, required: true, min: 1 },
    period: { type: String, enum: ['daily', 'weekly', 'monthly'], default: 'daily' },
    icon: { type: String, default: null },
    color: { type: String, default: null },
    active: { type: Boolean, default: true },
    // Manual goals keep their own tally, keyed by period start (YYYY-MM-DD).
    manual_progress: { type: mongoose.Schema.Types.Mixed, default: {} },
    // Goals are private unless the user opts a goal in to a specific group.
    shared_with_groups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group' }],
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true, versionKey: false },
  }
);

worshipGoalSchema.index({ user_id: 1, active: 1 });

module.exports = mongoose.model('WorshipGoal', worshipGoalSchema);
module.exports.METRICS = METRICS;
