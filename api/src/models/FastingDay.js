const mongoose = require('mongoose');

const fastingDaySchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true },
    fasting_type: { type: String, default: null },
    status: {
      type: String,
      required: true,
      enum: ['completed', 'broken', 'in_progress'],
      default: 'completed',
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true, versionKey: false },
  }
);

fastingDaySchema.index({ user_id: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('FastingDay', fastingDaySchema);
