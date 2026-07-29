import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../api/adminApi';
import { Trash2, Eye, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmationModal from '../components/ConfirmationModal';
import SuccessModal from '../components/SuccessModal';

export default function Groups() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [groupToDelete, setGroupToDelete] = useState(null);
  const [successState, setSuccessState] = useState({ isOpen: false, title: '', message: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-groups', page],
    queryFn: () => adminApi.getGroups({ page, limit: 20 }).then((r) => r.data),
    keepPreviousData: true,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminApi.deleteGroup(id),
    onSuccess: () => {
      qc.invalidateQueries(['admin-groups']);
      setSuccessState({ isOpen: true, title: 'Deleted!', message: 'Group removed successfully.' });
      setGroupToDelete(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Delete failed');
      setGroupToDelete(null);
    },
  });

  const groups = data?.groups || [];
  const pagination = {
    total_pages: data?.total_pages || 0,
    current_page: data?.page || 1,
    total_groups: data?.total || 0,
  };

  return (
    <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col min-h-0 gap-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 font-display flex items-center gap-3 tracking-tight">
          <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl shadow-sm border border-indigo-200/50">
            <Users size={24} />
          </div>
          Groups
        </h1>
        <p className="text-slate-500 text-sm mt-2 ml-1">Manage all groups on the platform</p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-24">
          <div className="h-10 w-10 border-4 border-slate-200 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
          <p className="font-bold text-slate-500">Loading groups...</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-24 text-center">
          <Users size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-xl font-bold text-slate-700 font-display mb-2">No Groups Found</h3>
          <p className="text-slate-500 max-w-sm mx-auto">No groups have been created yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/80 text-slate-500 text-[10px] uppercase font-bold tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Group Name</th>
                  <th className="px-6 py-4">Code</th>
                  <th className="px-6 py-4">Admin</th>
                  <th className="px-6 py-4">Members</th>
                  <th className="px-6 py-4">Created</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {groups.map((g) => (
                  <tr
                    key={g._id}
                    onClick={() => navigate(`/groups/${g._id}`)}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-800 text-base">{g.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono bg-slate-100 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-600">{g.group_id}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">
                      {g.admin_id?.name || g.admin_id?.email || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border bg-slate-100 text-slate-600 border-slate-200">
                        {g.users?.length ?? 0} members
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {g.created_at ? new Date(g.created_at).toLocaleDateString('en-GB') : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/groups/${g._id}`); }}
                          className="p-2 rounded-xl text-slate-400 bg-white border border-slate-100 hover:bg-slate-100 hover:text-indigo-600 transition-colors shadow-sm"
                          title="View"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setGroupToDelete(g); }}
                          className="p-2 rounded-xl text-slate-400 bg-white border border-slate-100 hover:bg-red-50 hover:border-red-100 hover:text-red-600 transition-colors shadow-sm"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
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
                Page {pagination.current_page} of {pagination.total_pages} ({pagination.total_groups} groups)
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
                  onClick={() => setPage((p) => Math.min(pagination.total_pages, p + 1))}
                  disabled={page >= pagination.total_pages}
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
        isOpen={!!groupToDelete}
        onClose={() => setGroupToDelete(null)}
        onConfirm={() => deleteMutation.mutate(groupToDelete._id)}
        title="Delete Group"
        message={`Are you sure you want to delete "${groupToDelete?.name}"? This will remove all group activities and cannot be undone.`}
        confirmText="Yes, delete group"
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
