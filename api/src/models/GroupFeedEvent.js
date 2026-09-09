const mongoose = require('mongoose');

/**
 * A single positive, non-sensitive event in a group's activity feed.
 *
 * Events are written only for milestones the member has opted to share. The
 * feed never stores what was missed, what was skipped, or any per-item detail
 * — `event_type` plus a small `data` bag is enough to render an encouraging
 * one-liner on the client, in the reader's own language.
 */
const EVENT_TYPES = [
  'goal_completed',
  'challenge_joined',
  'challenge_completed',
  'streak_milestone',
  'group_goal_reached',
  'muhasabah_completed',
  'member_joined',
];

const REACTIONS = [
  'mashaallah',
  'may_allah_accept',
  'keep_going',
  'well_done',
  'jazakallahu_khairan',
];

const reactionSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reaction: { type: String, enum: REACTIONS, required: true },
    created_at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const groupFeedEventSchema = new mongoose.Schema(
  {
    group_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    event_type: { type: String, enum: EVENT_TYPES, required: true },
    // Small render bag, e.g. { title: '30-Day Qur\'an', count: 7 }. Never
    // holds prayer/dua/reflection detail.
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    reactions: { type: [reactionSchema], default: [] },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true, versionKey: false },
  }
);

groupFeedEventSchema.index({ group_id: 1, created_at: -1 });

module.exports = mongoose.model('GroupFeedEvent', groupFeedEventSchema);
module.exports.EVENT_TYPES = EVENT_TYPES;
module.exports.REACTIONS = REACTIONS;
