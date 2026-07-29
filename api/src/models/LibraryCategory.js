const mongoose = require('mongoose');

const LibraryCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    name_malayalam: { type: String, default: null, trim: true },
    name_urdu:      { type: String, default: null, trim: true },
    slug: { type: String, unique: true, trim: true },
    description: { type: String, default: null },
    icon: { type: String, default: null },
    order: { type: Number, default: 0 },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true, versionKey: false },
  }
);

// Auto-generate slug from name before saving
LibraryCategorySchema.pre('save', function (next) {
  if (this.isModified('name') || !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }
  next();
});

module.exports = mongoose.model('LibraryCategory', LibraryCategorySchema);
