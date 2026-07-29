const mongoose = require('mongoose');

const RamadanDuaSchema = new mongoose.Schema(
  {
    day_number:   { type: Number, required: true, min: 1, max: 30 },
    order:        { type: Number, default: 0 },
    title:        { type: String, required: true },
    arabic_text:  { type: String, required: true },
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

RamadanDuaSchema.index({ day_number: 1, order: 1 });

module.exports = mongoose.model('RamadanDua', RamadanDuaSchema);
