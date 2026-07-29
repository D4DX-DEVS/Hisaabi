const mongoose = require('mongoose');

const LibraryEntrySchema = new mongoose.Schema(
  {
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LibraryCategory',
      required: true,
      index: true,
    },
    title: {
      malayalam: { type: String, default: '' },
      english:   { type: String, default: null },
      urdu:      { type: String, default: null },
    },
    content: { type: String, default: '' },
    source:  { type: String, default: '' },
    order:   { type: Number, default: null },
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

module.exports = mongoose.model('LibraryEntry', LibraryEntrySchema);
