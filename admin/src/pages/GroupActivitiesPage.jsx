import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../api/adminApi';
import { Activity, Trash2, Users, Calendar, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmationModal from '../components/ConfirmationModal';
import SuccessModal from '../components/SuccessModal';

const activityTypeColors = {
  daily: 'bg-blue-50 text-blue-600 border-blue-100',
  weekly: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  monthly: 'bg-purple-50 text-purple-600 border-purple-100',
  recurring: 'bg-orange-50 text-orange-600 border-orange-100',
};

const ACTIVITY_TYPES = ['daily', 'weekly', 'monthly', 'recurring'];

export default function GroupActivitiesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [activityToDelete, setActivityToDelete] = useState(null);
  const [successState, setSuccessState] = useState({ isOpen: false, title: '', message: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-group-activities', page, typeFilter],
    queryFn: () => {
      const params = { page, limit: 30 };
      if (typeFilter) params.activity_type = typeFilter;
      return adminApi.getGroupActivities(params).then((r) => r.data);
    },
    keepPreviousData: true,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminApi.deleteGroupActivity(id),
    onSuccess: () => {
      qc.invalidateQueries(['admin-group-activities']);
      setSuccessState({ isOpen: true, title: 'Deleted!', message: 'Group activity removed successfully.' });
      setActivityToDelete(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Delete failed');
      setActivityToDelete(null);
    },
  });

  const activities = data?.activities || [];
  const totalPages = data?.total_pages || 0;
  const total = data?.total || 0;

  return (
    <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col min-h-0 gap-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 font-display flex items-center gap-3 tracking-tight">
          <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl shadow-sm border border-emerald-200/50">
            <Activity size={24} />
          </div>
          Group Activities
        </h1>
        <p className="text-slate-500 text-sm mt-2 ml-1">View and manage all group activities across the platform</p>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Filter size={16} />
          <span className="font-medium">Type:</span>
        </div>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-200"
        >
          <option value="">All Types</option>
          {ACTIVITY_TYPES.map((t) => (
            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
          ))}
        </select>
        <span className="text-xs text-slate-400 font-medium ml-auto">{total} total activities</span>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-24">
          <div className="h-10 w-10 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
          <p className="font-bold text-slate-500">Loading activities...</p>
        </div>
      ) : activities.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-24 text-center">
          <Activity size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-xl font-bold text-slate-700 font-display mb-2">No Group Activities Found</h3>
          <p className="text-slate-500 max-w-sm mx-auto">No group activities have been created yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/80 text-slate-500 text-[10px] uppercase font-bold tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Activity Name</th>
                  <th className="px-6 py-4">Group</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {activities.map((a) => {
                  const responded = a.user_status?.filter((s) => s.status).length || 0;
                  const totalMembers = a.user_status?.length || 0;
                  const groupName = a.group_id?.name || 'Unknown';
                  const groupCode = a.group_id?.group_id || '';

                  return (
                    <tr key={a._id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-800">{a.activity_name}</span>
                        {a.description && (
                          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{a.description}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => {
                            const gid = typeof a.group_id === 'object' ? a.group_id._id : a.group_id;
                            navigate(`/groups/${gid}`);
                          }}
                          className="flex items-center gap-2 text-slate-600 hover:text-emerald-600 transition-colors"
                        >
                          <Users size={14} />
                          <span className="font-medium">{groupName}</span>
                          {groupCode && (
                            <span className="font-mono bg-slate-100 rounded px-1.5 py-0.5 text-[10px] font-bold text-slate-500">{groupCode}</span>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${activityTypeColors[a.activity_type] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                          {a.activity_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={14} className="text-slate-400" />
                          {a.date ? new Date(a.date).toLocaleDateString('en-GB') : '—'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border bg-emerald-50 text-emerald-600 border-emerald-100">
                          {responded}/{totalMembers} responded
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); setActivityToDelete(a); }}
                            className="p-2 rounded-xl text-slate-400 bg-white border border-slate-100 hover:bg-red-50 hover:border-red-100 hover:text-red-600 transition-colors shadow-sm"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
              <span className="text-sm text-slate-500 font-medium">
                Page {data?.page} of {totalPages} ({total} activities)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-4 py-2 text-sm font-bold rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-4 py-2 text-sm font-bold rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmationModal
        isOpen={!!activityToDelete}
        onClose={() => setActivityToDelete(null)}
        onConfirm={() => deleteMutation.mutate(activityToDelete._id)}
        title="Delete Group Activity"
        message={`Are you sure you want to delete "${activityToDelete?.activity_name}"? This cannot be undone.`}
        confirmText="Yes, delete it"
        cancelText="Cancel"
        type="danger"
      />

      <SuccessModal
        isOpen={successState.isOpen}
        onClose={() => setSuccessState({ isOpen: false, title: '', message: '' })}
        title={successState.title}
        message={successState.message}
      />
    </div>
  );
}
