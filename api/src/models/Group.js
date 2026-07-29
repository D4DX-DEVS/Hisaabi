const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    group_id: { type: String, required: true, unique: true, maxlength: 6 },
    admin_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    co_admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: [] }],
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true, versionKey: false },
  }
);

// Cascade delete group activities when group is deleted
groupSchema.pre('deleteOne', { document: true, query: false }, async function (next) {
  if (mongoose.modelNames().includes('GroupActivity')) {
    await mongoose.model('GroupActivity').deleteMany({ group_id: this._id });
  }
  next();
});

module.exports = mongoose.model('Group', groupSchema);
