const mongoose = require('mongoose');

const duaMemorizationSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    memorized_duas: { type: [mongoose.Schema.Types.Mixed], default: [] },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true, versionKey: false },
  }
);

module.exports = mongoose.model('DuaMemorization', duaMemorizationSchema);
