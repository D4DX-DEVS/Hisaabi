const mongoose = require('mongoose');

const HadeesSchema = new mongoose.Schema(
  {
    arabic_text:  { type: String, required: true },
    isQuranicFont: { type: Boolean, default: false },
    english:      { type: String, default: null },
    malayalam:    { type: String, default: null },
    urdu:         { type: String, default: null },
    category:     { type: mongoose.Schema.Types.ObjectId, ref: 'HadeesCategory', required: true },
    reported_by:  { type: String, default: null },
    order:        { type: Number, default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true, versionKey: false },
  }
);

module.exports = mongoose.model('Hadees', HadeesSchema);
