const mongoose = require('mongoose');

const DuaSchema = new mongoose.Schema(
  {
    title:        { type: String, required: true },
    title_malayalam: { type: String, default: null },
    title_urdu:      { type: String, default: null },
    arabic_text:  { type: String, required: true },
    isQuranicFont: { type: Boolean, default: false },
    category:     { type: mongoose.Schema.Types.ObjectId, ref: 'DuaCategory', required: true },
    additional_categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'DuaCategory' }],
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
    order: { type: Number, default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true, versionKey: false },
  }
);

module.exports = mongoose.model('Dua', DuaSchema);
