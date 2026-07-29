const mongoose = require('mongoose');

const DailyQuoteSchema = new mongoose.Schema(
  {
    text:         { type: String, required: true },
    malayalam:    { type: String, default: null },
    english:      { type: String, default: null },
    urdu:         { type: String, default: null },
    display_date: { type: String, required: true, unique: true }, // YYYY-MM-DD
    reference:    { type: String, default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true, versionKey: false },
  }
);

module.exports = mongoose.model('DailyQuote', DailyQuoteSchema);
