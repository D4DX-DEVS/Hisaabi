import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../api/adminApi';
import { Users, UsersRound, ScrollText, Activity, TrendingUp, UserCheck, Flame, LayoutDashboard } from 'lucide-react';

function StatCard({ label, value, Icon, color, sub }) {
  const colors = {
    blue:   'bg-blue-50 text-blue-600',
    green:  'bg-emerald-50 text-emerald-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
    teal:   'bg-teal-50 text-teal-600',
    rose:   'bg-rose-50 text-rose-600',
    amber:  'bg-amber-50 text-amber-600',
  };
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 flex items-center gap-4">
      <div className={`p-3 rounded-xl ${colors[color]}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-800">{value ?? '—'}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

const streakTypeLabel = {
  prayer:        'Prayer',
  quran_reading: 'Quran Reading',
  dhikr:         'Dhikr',
  combined:      'Combined',
};

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminApi.getStats().then((r) => r.data),
  });

  const stats = data || {};

  return (
    <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col min-h-0 gap-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 font-display flex items-center gap-3 tracking-tight">
          <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl shadow-sm border border-indigo-200/50">
            <LayoutDashboard size={24} />
          </div>
          Dashboard
        </h1>
        <p className="text-slate-500 text-sm mt-2 ml-1">Platform overview</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
          Failed to load stats: {error.message}
        </div>
      )}

      {/* Row 1 — core platform counts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Users"
          value={isLoading ? '…' : stats.total_users}
          Icon={Users}
          color="blue"
        />
        <StatCard
          label="Total Groups"
          value={isLoading ? '…' : stats.total_groups}
          Icon={UsersRound}
          color="green"
        />
        <StatCard
          label="Total Activity Logs"
          value={isLoading ? '…' : stats.total_activity_logs}
          Icon={ScrollText}
          color="purple"
        />
        <StatCard
          label="Today's Activity"
          value={isLoading ? '…' : stats.today_activity_count}
          Icon={Activity}
          color="orange"
        />
      </div>

      {/* Row 2 — user growth */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="New Users (7 days)"
          value={isLoading ? '…' : stats.new_users_last_7_days}
          Icon={TrendingUp}
          color="teal"
        />
        <StatCard
          label="New Users (this month)"
          value={isLoading ? '…' : stats.new_users_this_month}
          Icon={UserCheck}
          color="green"
        />
        <StatCard
          label="Male Users"
          value={isLoading ? '…' : stats.male_users}
          Icon={Users}
          color="blue"
          sub={stats.total_users
            ? `${Math.round((stats.male_users / stats.total_users) * 100)}% of total`
            : undefined}
        />
        <StatCard
          label="Female Users"
          value={isLoading ? '…' : stats.female_users}
          Icon={Users}
          color="rose"
          sub={stats.total_users
            ? `${Math.round((stats.female_users / stats.total_users) * 100)}% of total`
            : undefined}
        />
      </div>

      {/* Row 3 — two panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Activity Breakdown */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-base font-bold text-slate-800 tracking-tight mb-4">Activity Breakdown (30 days)</h2>
          {isLoading ? (
            <p className="text-slate-400 text-sm">Loading…</p>
          ) : stats.activity_breakdown && Object.keys(stats.activity_breakdown).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(stats.activity_breakdown)
                .sort(([, a], [, b]) => b - a)
                .map(([type, count]) => {
                  const max = Math.max(...Object.values(stats.activity_breakdown));
                  const pct = max ? Math.round((count / max) * 100) : 0;
                  return (
                    <div key={type}>
                      <div className="flex justify-between items-center text-sm mb-1">
                        <span className="capitalize text-slate-600">{type.replace(/_/g, ' ')}</span>
                        <span className="font-semibold text-slate-800">{count.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div
                          className="bg-emerald-500 h-1.5 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <p className="text-slate-400 text-sm">No data</p>
          )}
        </div>

        {/* Streak Averages */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-base font-bold text-slate-800 tracking-tight mb-4 flex items-center gap-2">
            <Flame size={16} className="text-orange-500" />
            Streak Averages (all users)
          </h2>
          {isLoading ? (
            <p className="text-slate-400 text-sm">Loading…</p>
          ) : stats.streak_averages && Object.keys(stats.streak_averages).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(stats.streak_averages).map(([type, s]) => (
                <div key={type} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-700 capitalize">
                      {streakTypeLabel[type] || type.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-slate-400">Avg longest: {s.avg_longest} days</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-emerald-600">{s.avg_current}</p>
                    <p className="text-xs text-slate-400">avg current</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-sm">No streak data yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
