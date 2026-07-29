import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { adminApi } from '../api/adminApi';
import { ChevronLeft, ChevronRight, ExternalLink, ScrollText } from 'lucide-react';

const ACTIVITY_TYPES = [
  '', 'prayer', 'quran_reading', 'quran_memorization', 'dhikr',
  'fasting', 'dua_memorization', 'goal', 'streak',
];

const typeColors = {
  prayer:               'bg-blue-100 text-blue-700',
  quran_reading:        'bg-emerald-100 text-emerald-700',
  quran_memorization:   'bg-teal-100 text-teal-700',
  dhikr:                'bg-purple-100 text-purple-700',
  fasting:              'bg-orange-100 text-orange-700',
  dua_memorization:     'bg-pink-100 text-pink-700',
  goal:                 'bg-amber-100 text-amber-700',
  streak:               'bg-indigo-100 text-indigo-700',
};

export default function ActivityLogs() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [page, setPage]         = useState(1);
  const [activityType, setType] = useState('');
  const [dateFrom, setFrom]     = useState('');
  const [dateTo, setTo]         = useState('');
  const [userId, setUserId]     = useState('');

  // Pre-populate user_id from URL query param (e.g. from UserDetail page)
  useEffect(() => {
    const uid = searchParams.get('user_id');
    if (uid) setUserId(uid);
  }, []);

  const queryParams = {
    page,
    limit: 25,
    ...(activityType && { activity_type: activityType }),
    ...(dateFrom     && { start_date: dateFrom }),
    ...(dateTo       && { end_date: dateTo }),
    ...(userId       && { user_id: userId }),
  };

  const { data, isLoading } = useQuery({
    queryKey: ['admin-activity-logs', queryParams],
    queryFn: () => adminApi.getActivityLogs(queryParams).then((r) => r.data),
    keepPreviousData: true,
  });

  const logs = data?.logs || [];
  const pagination = {
    total_pages: data?.total_pages || 0,
    current_page: data?.page || 1,
    total_logs: data?.total || 0,
  };

  const hasFilters = activityType || dateFrom || dateTo || userId;
  const resetFilters = () => {
    setType(''); setFrom(''); setTo(''); setUserId(''); setPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col min-h-0 gap-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 font-display flex items-center gap-3 tracking-tight">
          <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl shadow-sm border border-indigo-200/50">
            <ScrollText size={24} />
          </div>
          Activity Logs
        </h1>
        <p className="text-slate-500 text-sm mt-2 ml-1">Browse and filter all user activity</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Activity Type</label>
          <select
            value={activityType}
            onChange={(e) => { setType(e.target.value); setPage(1); }}
            className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 focus:bg-white transition-colors"
          >
            <option value="">All types</option>
            {ACTIVITY_TYPES.filter(Boolean).map((t) => (
              <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">User ID</label>
          <input
            type="text"
            value={userId}
            onChange={(e) => { setUserId(e.target.value.trim()); setPage(1); }}
            placeholder="MongoDB user _id…"
            className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 focus:bg-white transition-colors w-52"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setFrom(e.target.value); setPage(1); }}
            className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 focus:bg-white transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setTo(e.target.value); setPage(1); }}
            className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 focus:bg-white transition-colors"
          />
        </div>
        {hasFilters && (
          <button
            onClick={resetFilters}
            className="px-4 py-2.5 text-sm font-bold rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-24">
          <div className="h-10 w-10 border-4 border-slate-200 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
          <p className="font-bold text-slate-500">Loading logs...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-24 text-center">
          <ScrollText size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-xl font-bold text-slate-700 font-display mb-2">No Logs Found</h3>
          <p className="text-slate-500 max-w-sm mx-auto">Try adjusting your filters.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/80 text-slate-500 text-[10px] uppercase font-bold tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <button
                        onClick={() => navigate(`/users/${log.user_id?._id || log.user_id}`)}
                        className="font-bold text-slate-800 hover:text-indigo-600 hover:underline flex items-center gap-1 transition-colors"
                        title="View user"
                      >
                        {log.user_id?.name || log.user_id?.email || String(log.user_id || '—').slice(0, 8) + '…'}
                        <ExternalLink size={11} className="opacity-40" />
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-lg capitalize ${typeColors[log.activity_type] || 'bg-slate-100 text-slate-600'}`}>
                        {log.activity_type?.replace(/_/g, ' ') || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{log.date || '—'}</td>
                    <td className="px-6 py-4 text-slate-500 max-w-xs truncate font-mono text-xs">
                      {log.details ? JSON.stringify(log.details) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.total_pages > 1 && (
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
              <span className="text-sm text-slate-500 font-medium">
                Page {pagination.current_page} of {pagination.total_pages} ({pagination.total_logs} logs)
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-4 py-2 text-sm font-bold rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  disabled={page >= pagination.total_pages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-4 py-2 text-sm font-bold rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
