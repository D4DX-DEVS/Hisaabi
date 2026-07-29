const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    uid: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    name: { type: String, required: true },
    dob: { type: String, default: null },
    gender: { type: String, enum: ['m', 'f', null], default: null },
    settings: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({
        fasting_preferences: {
          hijri_dates: [
            { month: 9, dates: [] },
            { month: 12, dates: [9] },
            { month: 1, dates: [9, 10] },
          ],
          weekly_days: [1, 4],
        },
        goals: {
          quran_pages: 2,
          quran_ayahs: 1,
          dhikr_count: 10,
          sunnah_prayers: 4,
        },
        prayer_preferences: { sunnah_prayers: [] },
        my_duas: [],
        other_settings: { timezone: 'Asia/Kolkata' },
      }),
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true, versionKey: false },
  }
);

// Cascade delete all related records when a user is deleted
userSchema.pre('deleteOne', { document: true, query: false }, async function (next) {
  const userId = this._id;
  const models = mongoose.modelNames();
  const relatedModels = [
    'ActivityLog', 'DhikrTracking', 'DuaMemorization', 'FastingDay',
    'PeriodTracking', 'PrayerTracking', 'QuranMemorization', 'QuranProgress',
    'QuranReading', 'Streak',
  ];
  await Promise.all(
    relatedModels
      .filter((m) => models.includes(m))
      .map((m) => mongoose.model(m).deleteMany({ user_id: userId }))
  );
  // Handle Group separately — delete groups where user is admin, remove from members
  if (models.includes('Group')) {
    const Group = mongoose.model('Group');
    const adminGroups = await Group.find({ admin_id: userId });
    if (adminGroups.length) {
      const groupIds = adminGroups.map((g) => g._id);
      if (models.includes('GroupActivity')) {
        await mongoose.model('GroupActivity').deleteMany({ group_id: { $in: groupIds } });
      }
      await Group.deleteMany({ admin_id: userId });
    }
    // Remove user from members and co-admins in groups they belong to
    await Group.updateMany(
      { $or: [{ users: userId }, { co_admins: userId }] },
      { $pull: { users: userId, co_admins: userId } }
    );
    // Remove user's status entries from group activities in member groups
    if (models.includes('GroupActivity')) {
      await mongoose.model('GroupActivity').updateMany(
        { 'user_status.user': userId },
        { $pull: { user_status: { user: userId } } }
      );
    }
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
