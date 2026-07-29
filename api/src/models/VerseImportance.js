const mongoose = require('mongoose');

const VerseImportanceSchema = new mongoose.Schema(
  {
    title: {
      malayalam: { type: String, default: '' },
      english:   { type: String, default: null },
      urdu:      { type: String, default: null },
    },
    verse: { type: String, default: '' },
    source: { type: String, default: '' },
    description: {
      malayalam: { type: String, default: null },
      english:   { type: String, default: null },
      urdu:      { type: String, default: null },
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true, versionKey: false },
  }
);

module.exports = mongoose.model('VerseImportance', VerseImportanceSchema);
