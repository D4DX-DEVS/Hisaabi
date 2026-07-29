const mongoose = require('mongoose');

const DuaCategorySchema = new mongoose.Schema(
  {
    name:        { type: String, required: true },
    name_malayalam: { type: String, default: null },
    name_urdu:      { type: String, default: null },
    description: { type: String, default: null },
    parent:      { type: mongoose.Schema.Types.ObjectId, ref: 'DuaCategory', default: null },
    order:       { type: Number, default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true, versionKey: false },
  }
);

module.exports = mongoose.model('DuaCategory', DuaCategorySchema);
