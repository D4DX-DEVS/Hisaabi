const mongoose = require('mongoose');

const NameOfAllahSchema = new mongoose.Schema(
  {
    name:              { type: String, required: true },
    order:             { type: Number, default: null },
    english_meaning:   { type: String, default: null },
    malayalam_meaning: { type: String, default: null },
    urdu_meaning:      { type: String, default: null },
    description:       { type: String, default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true, versionKey: false },
  }
);

module.exports = mongoose.model('NameOfAllah', NameOfAllahSchema);
