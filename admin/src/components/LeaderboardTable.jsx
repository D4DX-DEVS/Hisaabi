import { Link } from 'react-router-dom';
import { Trophy } from 'lucide-react';

const MEDAL = ['🥇', '🥈', '🥉'];

export default function LeaderboardTable({ title, description, isLoading, rows = [], scoreLabel, scoreKey, icon: Icon = Trophy }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 font-display flex items-center gap-3 tracking-tight">
          <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl shadow-sm border border-indigo-200/50">
            <Icon size={24} />
          </div>
          {title}
        </h1>
        {description && <p className="text-slate-500 text-sm mt-2 ml-1">{description}</p>}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-24">
          <div className="h-10 w-10 border-4 border-slate-200 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
          <p className="font-bold text-slate-500">Loading rankings...</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-16 text-center">
          <Trophy size={40} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-700 font-display mb-1">No Data Yet</h3>
          <p className="text-slate-500 text-sm">Rankings will appear once users start tracking.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-600">User Rankings</span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border bg-slate-100 text-slate-600 border-slate-200">{rows.length} users</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/80 text-slate-500 text-[10px] uppercase font-bold tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 w-14">Rank</th>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4 text-right">{scoreLabel}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map((row, i) => {
                  const user = row.user || {};
                  const score = row[scoreKey] ?? 0;
                  return (
                    <tr key={row._id || i} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 text-center text-base">
                        {i < 3 ? MEDAL[i] : <span className="font-mono text-sm font-bold text-slate-400">{i + 1}</span>}
                      </td>
                      <td className="px-6 py-4">
                        {user._id ? (
                          <Link to={`/users/${user._id}`} className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline">
                            {user.name || '—'}
                          </Link>
                        ) : (
                          <span className="text-slate-400 italic text-sm">Deleted user</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-500">{user.email || '—'}</td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-bold text-slate-800">{score.toLocaleString()}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
