const mongoose = require('mongoose');

const periodTrackingSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    start_date: { type: String, required: true },
    end_date: { type: String, required: true },
    // The exact moment the cycle began and ended.
    //
    // The date strings above stay for range queries and for anything that
    // only deals in days, but a cycle rarely starts or ends at midnight:
    // beginning one at 2pm should leave that morning's prayers markable, and
    // ending one at 9am should free the rest of that day. Only these two
    // fields can express that, so each prayer is judged against them.
    //
    // Null on records written before this field existed; callers fall back to
    // the start and end of the day in that case.
    start_at: { type: Date, default: null },
    end_at: { type: Date, default: null },
    // Which prayers are exempt on the two boundary days, keyed by date:
    //   { '2026-09-10': ['asr','maghrib','isha'] }
    //
    // Only the app knows the user's prayer times, so it works out which
    // prayers fall inside the window on the day the cycle starts and the day
    // it ends, and sends the answer here. Every day in between is exempt in
    // full and is not listed.
    //
    // Absent for a day means that whole day is exempt — the lenient
    // behaviour every record had before this existed.
    boundary_exemptions: { type: mongoose.Schema.Types.Mixed, default: {} },
    notes: { type: String, default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true, versionKey: false },
  }
);

module.exports = mongoose.model('PeriodTracking', periodTrackingSchema);
