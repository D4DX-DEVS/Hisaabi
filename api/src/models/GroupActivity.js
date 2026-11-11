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
    last_reminded_at: { type: Date, default: null },
    // Position in the admin's priority order (0 = first); null until placed.
    sort_order: { type: Number, default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true, versionKey: false },
  }
);

module.exports = mongoose.model('GroupActivity', groupActivitySchema);
