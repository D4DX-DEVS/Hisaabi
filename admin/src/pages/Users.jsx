import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../api/adminApi';
import { Search, Trash2, Eye, Users as UsersIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmationModal from '../components/ConfirmationModal';
import SuccessModal from '../components/SuccessModal';

export default function Users() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [page, setPage]     = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery]   = useState('');
  const [userToDelete, setUserToDelete] = useState(null);
  const [successState, setSuccessState] = useState({ isOpen: false, title: '', message: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, query],
    queryFn: () => adminApi.getUsers({ page, limit: 20, search: query || undefined }).then((r) => r.data),
    keepPreviousData: true,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminApi.deleteUser(id),
    onSuccess: () => {
      qc.invalidateQueries(['admin-users']);
      setSuccessState({ isOpen: true, title: 'Deleted!', message: 'User removed successfully.' });
      setUserToDelete(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Delete failed');
      setUserToDelete(null);
    },
  });

  const handleSearch = (e) => {
    e.preventDefault();
    setQuery(search);
    setPage(1);
  };

  const users = data?.users || [];
  const pagination = {
    total_pages: data?.total_pages || 0,
    current_page: data?.page || 1,
    total_users: data?.total || 0,
  };

  return (
    <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col min-h-0 gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 font-display flex items-center gap-3 tracking-tight">
            <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl shadow-sm border border-indigo-200/50">
              <UsersIcon size={24} />
            </div>
            Users
          </h1>
          <p className="text-slate-500 text-sm mt-2 ml-1">Manage registered users</p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2 self-start sm:self-auto">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium bg-slate-50 focus:bg-white transition-colors w-64"
            />
          </div>
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-indigo-600 transition-colors shadow-sm"
          >
            Search
          </button>
        </form>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-24">
          <div className="h-10 w-10 border-4 border-slate-200 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
          <p className="font-bold text-slate-500">Loading users...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-24 text-center">
          <UsersIcon size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-xl font-bold text-slate-700 font-display mb-2">No Users Found</h3>
          <p className="text-slate-500 max-w-sm mx-auto">{query ? 'Try a different search term.' : 'No users have registered yet.'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/80 text-slate-500 text-[10px] uppercase font-bold tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Gender</th>
                  <th className="px-6 py-4">Joined</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users.map((u) => (
                  <tr
                    key={u._id}
                    onClick={() => navigate(`/users/${u._id}`)}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-800 text-base">{u.name || '—'}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{u.email || '—'}</td>
                    <td className="px-6 py-4">
                      {u.gender === 'm' || u.gender === 'f' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border bg-slate-100 text-slate-600 border-slate-200 capitalize">
                          {u.gender === 'm' ? 'Male' : 'Female'}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('en-GB') : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/users/${u._id}`); }}
                          className="p-2 rounded-xl text-slate-400 bg-white border border-slate-100 hover:bg-slate-100 hover:text-indigo-600 transition-colors shadow-sm"
                          title="View"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setUserToDelete(u); }}
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
                Page {pagination.current_page} of {pagination.total_pages} ({pagination.total_users} users)
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
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={() => deleteMutation.mutate(userToDelete._id)}
        title="Delete User"
        message={`Are you sure you want to delete "${userToDelete?.name || userToDelete?.email}"? This action cannot be undone.`}
        confirmText="Yes, delete"
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
