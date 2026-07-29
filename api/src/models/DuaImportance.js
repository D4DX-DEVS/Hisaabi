const mongoose = require('mongoose');

const DuaImportanceSchema = new mongoose.Schema(
  {
    title: {
      malayalam: { type: String, default: '' },
      english:   { type: String, default: null },
      urdu:      { type: String, default: null },
    },
    dua: { type: String, default: '' },
    source: { type: String, default: '' },
    description: {
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

module.exports = mongoose.model('DuaImportance', DuaImportanceSchema);
