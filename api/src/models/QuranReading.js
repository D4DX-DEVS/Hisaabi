const mongoose = require('mongoose');

const quranReadingSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true },
    pages_read: { type: [Number], default: [] },
    last_read_page: { type: Number, default: null, min: 1, max: 604 },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true, versionKey: false },
  }
);

quranReadingSchema.index({ user_id: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('QuranReading', quranReadingSchema);
