const mongoose = require('mongoose');

/**
 * Admin-defined Quran memorization portions.
 * Users see these portions, study them, and mark them as memorized.
 */
const QuranMemorizationContentSchema = new mongoose.Schema(
  {
    title:        { type: String, required: true },
    title_malayalam: { type: String, default: null },
    title_urdu:      { type: String, default: null },
    description:  { type: String, default: null },
    surah_number: { type: Number, required: true, min: 1, max: 114 },
    surah_name:   { type: String, default: null },
    ayah_from:    { type: Number, required: true, min: 1 },
    ayah_to:      { type: Number, required: true, min: 1 },
    arabic_text:  { type: String, default: null },
    isQuranicFont: { type: Boolean, default: false },
    order:        { type: Number, default: 0 },
    is_active:    { type: Boolean, default: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true, versionKey: false },
  }
);

module.exports = mongoose.model('QuranMemorizationContent', QuranMemorizationContentSchema);
