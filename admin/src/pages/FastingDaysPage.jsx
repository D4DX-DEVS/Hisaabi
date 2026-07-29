import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../api/adminApi';
import LeaderboardTable from '../components/LeaderboardTable';
import { Moon } from 'lucide-react';

const statusColors = {
  completed: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  broken: 'bg-red-50 text-red-600 border-red-100',
  in_progress: 'bg-amber-50 text-amber-600 border-amber-100',
};

export default function FastingDaysPage() {
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['model-fasting'],
    queryFn: () => adminApi.getFastingStats().then((r) => r.data),
  });

  const { data: recordsData, isLoading: recordsLoading } = useQuery({
    queryKey: ['admin-fasting-records'],
    queryFn: () => adminApi.getFastingRecords().then((r) => r.data),
  });

  const records = recordsData?.records || [];

  return (
    <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col min-h-0 gap-6">
      <LeaderboardTable
        title="Fasting Days"
        description="Users ranked by completed fasting days (all time)"
        isLoading={statsLoading}
        rows={statsData?.leaderboard || []}
        scoreLabel="Days Fasted"
        scoreKey="completed_days"
        icon={Moon}
      />

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex-1 min-h-0 flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-700">Fasting Records</h2>
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
                  <th className="text-left px-6 py-3.5 text-[10px] uppercase font-bold tracking-wider text-slate-400">Type</th>
                  <th className="text-left px-6 py-3.5 text-[10px] uppercase font-bold tracking-wider text-slate-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {records.map((rec) => (
                  <tr key={rec._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800">{rec.user_id?.name || '—'}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{rec.user_id?.email}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{rec.date}</td>
                    <td className="px-6 py-4 text-slate-600">{rec.fasting_type || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${statusColors[rec.status] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                        {rec.status}
                      </span>
                    </td>
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
