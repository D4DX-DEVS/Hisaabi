const mongoose = require('mongoose');

/**
 * Admin-defined Quran reading portions.
 * Users see these portions and can mark them as complete.
 */
const QuranReadingContentSchema = new mongoose.Schema(
  {
    title:        { type: String, required: true },
    description:  { type: String, default: null },
    surah_number: { type: Number, default: null, min: 1, max: 114 },
    juz_number:   { type: Number, default: null, min: 1, max: 30 },
    page_from:    { type: Number, default: null, min: 1, max: 604 },
    page_to:      { type: Number, default: null, min: 1, max: 604 },
    order:        { type: Number, default: 0 },
    is_active:    { type: Boolean, default: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true, versionKey: false },
  }
);

module.exports = mongoose.model('QuranReadingContent', QuranReadingContentSchema);
