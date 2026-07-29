const mongoose = require('mongoose');

const DhikrTypeSchema = new mongoose.Schema(
  {
    name:         { type: String, required: true },
    name_malayalam: { type: String, default: null },
    name_urdu:      { type: String, default: null },
    category:     { type: mongoose.Schema.Types.ObjectId, ref: 'DhikrCategory', default: null },
    order:        { type: Number, default: null },
    count:        { type: Number, default: null },
    isCountless:  { type: Boolean, default: false },
    arabic_text:  { type: String, default: null },
    isQuranicFont: { type: Boolean, default: false },
    malayalam:    { type: String, default: null },
    english:      { type: String, default: null },
    urdu:         { type: String, default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true, versionKey: false },
  }
);

module.exports = mongoose.model('DhikrType', DhikrTypeSchema);
