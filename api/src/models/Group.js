const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    group_id: { type: String, required: true, unique: true, maxlength: 6 },
    admin_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    co_admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: [] }],
    type: {
      type: String,
      enum: ['family', 'friends', 'study_circle', 'masjid', 'ramadan', 'community', 'custom'],
      default: 'custom',
    },
    description: { type: String, default: '' },
    // When each member joined, keyed by user id (ISO date). The group's owner
    // joined when it was created. Members who joined before this was recorded
    // have no entry, and the app shows no date for them.
    member_joined_at: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true, versionKey: false },
  }
);

// Cascade delete everything inside a group when the group is deleted
groupSchema.pre('deleteOne', { document: true, query: false }, async function (next) {
  await require('../services/groupCleanup').deleteGroupData(this._id);
  next();
});

groupSchema.index({ users: 1 });
groupSchema.index({ admin_id: 1 });

module.exports = mongoose.model('Group', groupSchema);
