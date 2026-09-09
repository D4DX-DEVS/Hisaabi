const mongoose = require('mongoose');

/**
 * One logged good deed / act of service for a given day.
 *
 * `deed_key` is a stable identifier: either one of the predefined keys below
 * or `custom:<slug>` for a user-defined activity. `category` groups deeds for
 * the tracker dashboard — `learning` is surfaced as its own section.
 */
const PREDEFINED_DEEDS = [
  'sadaqah',
  'helping_others',
  'visiting_relatives',
  'visiting_sick',
  'serving_parents',
  'community_service',
  'islamic_study',
];

const goodDeedLogSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true },
    deed_key: { type: String, required: true },
    label: { type: String, default: null },
    category: {
      type: String,
      enum: ['sadaqah', 'service', 'family', 'community', 'learning', 'other'],
      default: 'other',
    },
    count: { type: Number, default: 1, min: 1 },
    notes: { type: String, default: null },
    // Minutes spent — only meaningful for `learning` deeds; null elsewhere.
    duration_minutes: { type: Number, default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true, versionKey: false },
  }
);

goodDeedLogSchema.index({ user_id: 1, date: 1 });
goodDeedLogSchema.index({ user_id: 1, date: 1, deed_key: 1 }, { unique: true });

module.exports = mongoose.model('GoodDeedLog', goodDeedLogSchema);
module.exports.PREDEFINED_DEEDS = PREDEFINED_DEEDS;
