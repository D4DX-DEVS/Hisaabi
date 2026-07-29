const mongoose = require('mongoose');

const LiveLinkSchema = new mongoose.Schema(
  {
    title:     { type: String, required: true, trim: true },
    location:  { type: String, default: null, trim: true },
    link:      { type: String, required: true, trim: true },
    is_active: { type: Boolean, default: true },
    order:     { type: Number, default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true, versionKey: false },
  }
);

module.exports = mongoose.model('LiveLink', LiveLinkSchema);
