const mongoose = require('mongoose');

const TasbeehSchema = new mongoose.Schema(
  {
    title:        { type: String, required: true },
    title_malayalam: { type: String, default: null },
    title_urdu:      { type: String, default: null },
    arabic_text:  { type: String, required: true },
    order:        { type: Number, default: null },
    isQuranicFont: { type: Boolean, default: false },
    count:        { type: Number, default: null },
    isCountless:  { type: Boolean, default: false },
    malayalam:    { type: String, default: null },
    english:      { type: String, default: null },
    urdu:         { type: String, default: null },
    description: {
      arabic:    { type: String, default: null },
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

module.exports = mongoose.model('Tasbeeh', TasbeehSchema);
