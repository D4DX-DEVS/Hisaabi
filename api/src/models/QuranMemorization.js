const mongoose = require('mongoose');

const quranMemorizationSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    next_ayah_to_memorize: { type: String, required: true, default: '1:1' },
    memorized_ayahs: { type: [mongoose.Schema.Types.Mixed], default: [] },
    memorization_goals: { type: [mongoose.Schema.Types.Mixed], default: [] },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true, versionKey: false },
  }
);

module.exports = mongoose.model('QuranMemorization', quranMemorizationSchema);
