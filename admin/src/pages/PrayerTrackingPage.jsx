import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../api/adminApi';
import LeaderboardTable from '../components/LeaderboardTable';
import { Bell } from 'lucide-react';

const FARDH_PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

function prayerSummary(obj) {
  if (!obj) return '—';
  return FARDH_PRAYERS.filter((p) => obj[p] === true)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(', ') || '—';
}

export default function PrayerTrackingPage() {
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['model-prayer-tracking'],
    queryFn: () => adminApi.getPrayerTrackingStats().then((r) => r.data),
  });

  const { data: recordsData, isLoading: recordsLoading } = useQuery({
    queryKey: ['admin-prayer-tracking-records'],
    queryFn: () => adminApi.getPrayerTrackingRecords().then((r) => r.data),
  });

  const records = recordsData?.records || [];

  return (
    <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col min-h-0 gap-6">
      <LeaderboardTable
        title="Prayer Tracking"
        description="Users ranked by total fardh prayers completed (all time)"
        isLoading={statsLoading}
        rows={statsData?.leaderboard || []}
        scoreLabel="Prayers Completed"
        scoreKey="total_prayers"
        icon={Bell}
      />

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex-1 min-h-0 flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-700">Prayer Records</h2>
          <span className="text-xs text-slate-400">{recordsData?.total ?? 0} records</span>
        </div>

        {recordsLoading ? (
          <div className="flex justify-center py-16">
            <div className="h-10 w-10 border-4 border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        ) : records.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">No records yet.</div>
        ) : (
          <div className="overflow-y-auto scrollbar-hide flex-1 min-h-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/80">
              <tr>
                <th className="text-left px-6 py-3.5 text-[10px] uppercase font-bold tracking-wider text-slate-400">User</th>
                <th className="text-left px-6 py-3.5 text-[10px] uppercase font-bold tracking-wider text-slate-400">Date</th>
                <th className="text-left px-6 py-3.5 text-[10px] uppercase font-bold tracking-wider text-slate-400">Fardh Completed</th>
                <th className="text-left px-6 py-3.5 text-[10px] uppercase font-bold tracking-wider text-slate-400">Sunnah Completed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {records.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-800">{rec.user_id?.name || '—'}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{rec.user_id?.email}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{rec.date}</td>
                  <td className="px-6 py-4 text-slate-600">{prayerSummary(rec.fardh_prayers)}</td>
                  <td className="px-6 py-4 text-slate-600">{prayerSummary(rec.sunnah_prayers)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}

