const mongoose = require('mongoose');

const groupActivitySchema = new mongoose.Schema(
  {
    group_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    activity_type: {
      type: String,
      required: true,
      enum: ['daily', 'weekly', 'monthly', 'recurring'],
    },
    activity_name: { type: String, required: true },
    description: { type: String, default: null },
    date: { type: Date, required: true },
    user_status: { type: [mongoose.Schema.Types.Mixed], default: [] },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true, versionKey: false },
  }
);

module.exports = mongoose.model('GroupActivity', groupActivitySchema);
