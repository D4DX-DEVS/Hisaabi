const mongoose = require('mongoose');

/**
 * A reminder an admin sends to the group ("Don't forget tonight's Adhkar").
 * Per-member mute and frequency preferences live in
 * `User.settings.group_prefs[group_id]`, so a member can silence a group
 * without the admin knowing or the group losing the reminder.
 */
const groupReminderSchema = new mongoose.Schema(
  {
    group_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, default: '' },
    // 'once' fires at send_at; the recurring kinds fire at time_of_day.
    frequency: { type: String, enum: ['once', 'daily', 'weekly'], default: 'once' },
    time_of_day: { type: String, default: null },
    day_of_week: { type: Number, default: null, min: 1, max: 7 },
    send_at: { type: Date, default: Date.now },
    active: { type: Boolean, default: true },
    // When this reminder last actually pushed a notification — dedupes a
    // 'once' reminder to a single send, and a daily/weekly one to once per
    // occurrence rather than once per minute the scheduler happens to match.
    last_sent_at: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true, versionKey: false },
  }
);

groupReminderSchema.index({ group_id: 1, active: 1 });

module.exports = mongoose.model('GroupReminder', groupReminderSchema);
