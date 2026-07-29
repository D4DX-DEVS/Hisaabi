import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { adminApi } from '../api/adminApi';
import { Flame } from 'lucide-react';

const TYPES = ['combined', 'prayer', 'quran_reading', 'dhikr'];
const MEDAL = ['🥇', '🥈', '🥉'];

export default function StreaksPage() {
  const [streakType, setStreakType] = useState('combined');

  const { data, isLoading } = useQuery({
    queryKey: ['model-streaks', streakType],
    queryFn: () => adminApi.getStreakStats(streakType).then((r) => r.data),
  });

  const rows = data?.leaderboard || [];

  return (
    <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col min-h-0 gap-6">
      {/* Header */}
      <div className="shrink-0 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl shadow-sm border border-indigo-200/50">
            <Flame className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800 font-display tracking-tight">Streaks Overview</h1>
            <p className="text-slate-500 text-sm mt-0.5">Users ranked by current streak length</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setStreakType(t)}
              className={`px-3.5 py-1.5 text-sm rounded-xl border font-medium transition-colors ${
                streakType === t
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50 shadow-sm'
              }`}
            >
              {t.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex-1 min-h-0 flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <span className="text-sm font-bold text-slate-700 capitalize">
            User Rankings — {streakType.replace(/_/g, ' ')}
          </span>
          <span className="text-xs text-slate-400">{rows.length} users</span>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="h-10 w-10 border-4 border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center">
            <div className="p-3 bg-slate-100 rounded-2xl inline-block mb-3">
              <Flame className="h-7 w-7 text-slate-400" />
            </div>
            <p className="text-slate-500 font-medium">No streak data yet.</p>
          </div>
        ) : (
          <div className="overflow-y-auto scrollbar-hide flex-1 min-h-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/80">
              <tr>
                <th className="text-left px-6 py-3.5 text-[10px] uppercase font-bold tracking-wider text-slate-400 w-14">Rank</th>
                <th className="text-left px-6 py-3.5 text-[10px] uppercase font-bold tracking-wider text-slate-400">User</th>
                <th className="text-left px-6 py-3.5 text-[10px] uppercase font-bold tracking-wider text-slate-400">Email</th>
                <th className="text-right px-6 py-3.5 text-[10px] uppercase font-bold tracking-wider text-slate-400">Current Streak</th>
                <th className="text-right px-6 py-3.5 text-[10px] uppercase font-bold tracking-wider text-slate-400">Longest Streak</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map((row, i) => {
                const user = row.user || {};
                return (
                  <tr key={row._id || i} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 text-center">
                      {i < 3 ? (
                        <span className="text-base">{MEDAL[i]}</span>
                      ) : (
                        <span className="font-mono text-sm font-bold text-slate-400">{i + 1}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {user._id ? (
                        <Link to={`/users/${user._id}`} className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline">
                          {user.name || '—'}
                        </Link>
                      ) : (
                        <span className="text-slate-400 italic">Deleted user</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-500">{user.email || '—'}</td>
                    <td className="px-6 py-4 text-right font-bold text-slate-800">
                      {row.current_streak ?? 0} days
                    </td>
                    <td className="px-6 py-4 text-right text-slate-500">
                      {row.longest_streak ?? 0} days
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}
