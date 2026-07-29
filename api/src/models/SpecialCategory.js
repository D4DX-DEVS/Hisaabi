const mongoose = require('mongoose');

// All supported field keys for Special Model entries
const VALID_FIELD_KEYS = [
  'title_malayalam',
  'title_english',
  'title_urdu',
  'description_malayalam',
  'description_english',
  'description_urdu',
  'arabic_text',
  'arabic_source',
  'translation_malayalam',
  'translation_english',
  'translation_urdu',
  'count',
  'reference_link',
];

const SpecialCategorySchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, unique: true, trim: true },
    name_malayalam: { type: String, default: null, trim: true },
    name_urdu:      { type: String, default: null, trim: true },
    slug:        { type: String, unique: true, trim: true },
    description: { type: String, default: null },
    icon:        { type: String, default: null },
    order:       { type: Number, default: null },
    parentId:    { type: mongoose.Schema.Types.ObjectId, ref: 'SpecialCategory', default: null },
    // Array of enabled field keys for entries in this category
    fields: {
      type: [String],
      enum: VALID_FIELD_KEYS,
      default: [],
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true, versionKey: false },
  }
);

// Auto-generate slug from name before saving
SpecialCategorySchema.pre('save', function (next) {
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

module.exports = mongoose.model('SpecialCategory', SpecialCategorySchema);
module.exports.VALID_FIELD_KEYS = VALID_FIELD_KEYS;
