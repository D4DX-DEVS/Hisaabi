const mongoose = require('mongoose');

const FastingTypeSchema = new mongoose.Schema(
  {
    name:         { type: String, required: true, unique: true },
    display_name: { type: String, required: true },
    description:  { type: String, default: null },
    parent:       { type: mongoose.Schema.Types.ObjectId, ref: 'FastingType', default: null },
    order:        { type: Number, default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true, versionKey: false },
  }
);

module.exports = mongoose.model('FastingType', FastingTypeSchema);
