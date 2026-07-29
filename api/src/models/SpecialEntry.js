const mongoose = require('mongoose');

const SpecialEntrySchema = new mongoose.Schema(
  {
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SpecialCategory',
      required: true,
      index: true,
    },
    order: { type: Number, default: null },
    // Flexible data storage — only keys defined in the category's `fields` config are used
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true, versionKey: false },
  }
);

module.exports = mongoose.model('SpecialEntry', SpecialEntrySchema);
