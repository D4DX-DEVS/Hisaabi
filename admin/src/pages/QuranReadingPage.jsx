import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../api/adminApi';
import LeaderboardTable from '../components/LeaderboardTable';
import { BookOpen } from 'lucide-react';

export default function QuranReadingPage() {
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['model-quran-reading'],
    queryFn: () => adminApi.getQuranReadingStats().then((r) => r.data),
  });

  const { data: recordsData, isLoading: recordsLoading } = useQuery({
    queryKey: ['admin-quran-reading-records'],
    queryFn: () => adminApi.getQuranReadingRecords().then((r) => r.data),
  });

  const records = recordsData?.records || [];

  return (
    <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col min-h-0 gap-6">
      <LeaderboardTable
        title="Quran Reading"
        description="Users ranked by total pages read (all sessions)"
        isLoading={statsLoading}
        rows={statsData?.leaderboard || []}
        scoreLabel="Pages Read"
        scoreKey="total_pages"
        icon={BookOpen}
      />

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex-1 min-h-0 flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-700">Reading Records</h2>
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
                <th className="text-left px-6 py-3.5 text-[10px] uppercase font-bold tracking-wider text-slate-400">Pages Read</th>
                <th className="text-left px-6 py-3.5 text-[10px] uppercase font-bold tracking-wider text-slate-400">Last Page</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {records.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-800">{rec.user_id?.name || '—'}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{rec.user_id?.email || rec.user_id}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{rec.date}</td>
                  <td className="px-6 py-4 text-slate-600">{rec.pages_read?.length ?? 0} pages</td>
                  <td className="px-6 py-4 text-slate-600">{rec.last_read_page ?? '—'}</td>
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
