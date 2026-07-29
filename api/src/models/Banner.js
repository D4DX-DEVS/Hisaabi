const mongoose = require('mongoose');

const BannerSchema = new mongoose.Schema(
  {
    // type determines display mode
    type:      { type: String, enum: ['image', 'slider', 'video'], required: true },
    images:    [{ type: String }],      // filenames for image / slider
    video:     { type: String, default: null }, // filename for video
    link_url:  { type: String, default: null, trim: true },
    from_date: { type: String, required: true }, // YYYY-MM-DD
    to_date:   { type: String, required: true }, // YYYY-MM-DD
    is_active: { type: Boolean, default: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true, versionKey: false },
  }
);

module.exports = mongoose.model('Banner', BannerSchema);
