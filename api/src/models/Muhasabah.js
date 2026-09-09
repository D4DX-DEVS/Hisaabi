const mongoose = require('mongoose');

/**
 * Weekly self-accountability (Muhasabah) record.
 *
 * Reflections are private to the user by default. `shared_with_groups` is an
 * explicit opt-in list; an empty array means the reflection is never exposed
 * to any group aggregate or feed.
 */
const muhasabahSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Monday of the reviewed week, stored as YYYY-MM-DD for cheap range queries.
    week_start: { type: String, required: true },
    week_end: { type: String, required: true },
    did_well: { type: String, default: '' },
    can_improve: { type: String, default: '' },
    needs_attention: { type: String, default: '' },
    next_week_goal: { type: String, default: '' },
    // Snapshot of the consistency summary at the time of writing, so a past
    // review keeps reading the same even if underlying logs are edited later.
    summary: { type: mongoose.Schema.Types.Mixed, default: {} },
    shared_with_groups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group' }],
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true, versionKey: false },
  }
);

muhasabahSchema.index({ user_id: 1, week_start: 1 }, { unique: true });

module.exports = mongoose.model('Muhasabah', muhasabahSchema);
