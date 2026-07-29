import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, Save, Eye, Search, Link2, MapPin, ExternalLink, Radio, ToggleLeft, ToggleRight, Copy, Hash } from 'lucide-react';
import { adminApi } from '../api/adminApi';
import ConfirmationModal from '../components/ConfirmationModal';
import SuccessModal from '../components/SuccessModal';
import Pagination from '../components/Pagination';

const LIMIT = 20;

const EMPTY = { title: '', location: '', link: '', is_active: true, order: '' };

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const PUBLIC_URL = `${BASE_URL}/api/live-links`;

function Modal({ item, onClose, onSave }) {
  const [form, setForm] = useState(item ? { ...EMPTY, ...item, order: item.order ?? '' } : EMPTY);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const toggle = (k) => () => setForm((p) => ({ ...p, [k]: !p[k] }));

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-fade-in" onClick={onClose} />

      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden transform transition-all w-full max-w-lg relative z-10 animate-slide-in-right flex flex-col max-h-[90vh]">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-600 shadow-sm border border-emerald-200/50">
              {item ? <Pencil size={18} /> : <Plus size={18} />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 font-display">{item ? 'Edit Live Link' : 'Add Live Link'}</h2>
              <p className="text-xs text-slate-500 font-medium">{item ? 'Update live link details' : 'Add a new live stream link'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors rounded-full p-2 hover:bg-slate-200 focus:outline-none">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5">
          {/* Title */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              <Radio size={14} /> Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium bg-slate-50 focus:bg-white transition-colors"
              value={form.title}
              onChange={set('title')}
              placeholder="e.g. Friday Jumua Live Stream"
            />
          </div>

          {/* Location */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              <MapPin size={14} /> Location <span className="text-slate-400 font-normal normal-case tracking-normal">(optional)</span>
            </label>
            <input
              type="text"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium bg-slate-50 focus:bg-white transition-colors"
              value={form.location}
              onChange={set('location')}
              placeholder="e.g. Masjid Al-Noor, Dubai"
            />
          </div>

          {/* Link */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              <Link2 size={14} /> Stream URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium bg-slate-50 focus:bg-white transition-colors"
              value={form.link}
              onChange={set('link')}
              placeholder="https://youtube.com/live/..."
            />
          </div>

          {/* Active Status */}
          <div className="pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={toggle('is_active')}
              className={`flex items-center justify-between w-full px-4 py-3 rounded-xl border transition-colors ${form.is_active ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
            >
              <span className="flex items-center gap-2 text-sm font-bold">
                {form.is_active ? <ToggleRight size={18} className="text-emerald-500" /> : <ToggleLeft size={18} />}
                {form.is_active ? 'Active — visible to users' : 'Inactive — hidden from users'}
              </span>
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
          <div className="mr-auto flex items-center gap-2">
            <label className="flex items-center gap-1 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <Hash size={12} /> Order
            </label>
            <input
              type="number"
              min="1"
              className="w-24 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium bg-slate-50 focus:bg-white transition-colors"
              value={form.order}
              onChange={(e) => setForm((p) => ({ ...p, order: e.target.value }))}
              placeholder="1, 2..."
            />
          </div>
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white rounded-xl border border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm">
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-colors"
          >
            <Save size={16} />
            {item ? 'Save Changes' : 'Create Link'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function ViewModal({ item, onClose }) {
  if (!item) return null;

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text).then(() => toast.success('Copied to clipboard!'));
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-fade-in" onClick={onClose} />
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden transform transition-all w-full max-w-lg relative z-10 animate-slide-in-right flex flex-col max-h-[90vh]">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-600 shadow-sm border border-emerald-200/50">
              <Radio size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 font-display">Live Link Details</h2>
              <p className="text-xs text-slate-500 font-medium">Full view</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors rounded-full p-2 hover:bg-slate-200 focus:outline-none">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Title</h3>
            <p className="text-slate-800 font-semibold text-base">{item.title}</p>
          </div>

          {item.location && (
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Location</h3>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium bg-slate-50 text-slate-700 border border-slate-200">
                <MapPin size={13} className="text-slate-400" />
                {item.location}
              </span>
            </div>
          )}

          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Stream URL</h3>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
              <Link2 size={14} className="text-slate-400 shrink-0" />
              <p className="text-sm text-slate-700 font-medium truncate flex-1">{item.link}</p>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => handleCopy(item.link)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                  title="Copy link"
                >
                  <Copy size={14} />
                </button>
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-emerald-100 hover:text-emerald-600 transition-colors"
                  title="Open link"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Status</h3>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${item.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${item.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              {item.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white rounded-xl border border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm">
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function LiveLinksManagement() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [successState, setSuccessState] = useState({ isOpen: false, title: '', message: '' });
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-live-links', page, debouncedSearch],
    queryFn: () => adminApi.getLiveLinks({
      page,
      limit: LIMIT,
      ...(debouncedSearch && { search: debouncedSearch }),
    }).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (d) => adminApi.createLiveLink(d),
    onSuccess: () => {
      qc.invalidateQueries(['admin-live-links']);
      setSuccessState({ isOpen: true, title: 'Success!', message: 'Live link created successfully.' });
      setModal(null);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to create live link'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => adminApi.updateLiveLink(id, data),
    onSuccess: () => {
      qc.invalidateQueries(['admin-live-links']);
      setSuccessState({ isOpen: true, title: 'Success!', message: 'Live link updated successfully.' });
      setModal(null);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to update live link'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminApi.deleteLiveLink(id),
    onSuccess: () => {
      qc.invalidateQueries(['admin-live-links']);
      setSuccessState({ isOpen: true, title: 'Deleted!', message: 'Live link removed successfully.' });
      setItemToDelete(null);
    },
    onError: (e) => {
      toast.error(e.response?.data?.error || 'Failed to delete live link');
      setItemToDelete(null);
    },
  });

  const handleSave = (form) => {
    if (modal === 'create') createMutation.mutate(form);
    else updateMutation.mutate({ id: modal.id, data: form });
  };

  const handleCopyPublicUrl = () => {
    navigator.clipboard.writeText(PUBLIC_URL).then(() => toast.success('Public URL copied!'));
  };

  const links = data?.live_links || [];
  const total = data?.total ?? 0;
  const totalPages = data?.total_pages ?? 1;

  return (
    <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col min-h-0 gap-6">
      {/* Fixed header */}
      <div className="shrink-0 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 font-display flex items-center gap-3 tracking-tight">
              <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl shadow-sm border border-emerald-200/50">
                <Radio size={24} />
              </div>
              Live Links
            </h1>
            <p className="text-slate-500 text-sm mt-2 ml-1">
              {total > 0 ? `${total} live stream link${total !== 1 ? 's' : ''} in the catalogue` : 'Manage live stream links'}
            </p>
          </div>
          <button
            onClick={() => setModal('create')}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-emerald-600 transition-colors shadow-sm self-start sm:self-auto"
          >
            <Plus size={18} /> Add Live Link
          </button>
        </div>

        {/* Public URL banner */}
        {/* <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-2xl">
          <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-600 shrink-0">
            <ExternalLink size={15} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-emerald-700 mb-0.5">Public API Endpoint</p>
            <p className="text-xs text-emerald-600 font-mono truncate">{PUBLIC_URL}</p>
          </div>
          <button
            onClick={handleCopyPublicUrl}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-white border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors shrink-0"
          >
            <Copy size={13} /> Copy
          </button>
        </div> */}

        {/* Search bar */}
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white font-medium"
          />
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-24">
            <div className="h-10 w-10 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
            <p className="font-bold text-slate-500">Loading live links...</p>
          </div>
        ) : !isLoading && links.length === 0 && !debouncedSearch && page === 1 ? (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-24 text-center">
            <Radio size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-bold text-slate-700 font-display mb-2">No Live Links Yet</h3>
            <p className="text-slate-500 max-w-sm mx-auto">Add the first live stream link to let users tune in.</p>
            <button
              onClick={() => setModal('create')}
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-50 text-emerald-600 font-bold text-sm rounded-xl border border-emerald-200 hover:bg-emerald-100 transition-colors"
            >
              <Plus size={16} /> Add First Link
            </button>
          </div>
        ) : (
          <div className={`bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden transition-opacity ${isFetching && !isLoading ? 'opacity-70' : 'opacity-100'}`}>
            {links.length === 0 ? (
              <p className="text-center text-slate-400 font-medium py-12">No live links match your search.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50/80 text-slate-500 text-[10px] uppercase font-bold tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-4 text-center w-16">Order</th>
                      <th className="px-6 py-4">Title</th>
                      <th className="px-6 py-4">Location</th>
                      <th className="px-6 py-4">Link</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {links.map((item) => (
                      <tr
                        key={item.id}
                        onClick={() => setViewItem(item)}
                        className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      >
                        <td className="px-4 py-4 text-center">
                          {item.order != null ? (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200">{item.order}</span>
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                              <Radio size={14} />
                            </div>
                            <span className="font-semibold text-slate-800 line-clamp-1">{item.title}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {item.location ? (
                            <span className="inline-flex items-center gap-1.5 text-slate-600 text-xs font-medium">
                              <MapPin size={12} className="text-slate-400" />
                              {item.location}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 max-w-xs">
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-medium hover:text-emerald-800 hover:underline transition-colors truncate max-w-[200px]"
                          >
                            <Link2 size={12} />
                            <span className="truncate">{item.link}</span>
                            <ExternalLink size={11} className="shrink-0" />
                          </a>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${item.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${item.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                            {item.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => { e.stopPropagation(); setViewItem(item); }}
                              className="p-2 rounded-xl text-slate-400 bg-white border border-slate-100 hover:bg-slate-100 hover:text-emerald-600 transition-colors shadow-sm"
                              title="View"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setModal(item); }}
                              className="p-2 rounded-xl text-slate-400 bg-white border border-slate-100 hover:bg-slate-100 hover:text-emerald-600 transition-colors shadow-sm"
                              title="Edit"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setItemToDelete(item); }}
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
            )}
            <Pagination page={page} totalPages={totalPages} total={total} limit={LIMIT} onPageChange={setPage} isFetching={isFetching} />
          </div>
        )}
      </div>

      {modal && (
        <Modal
          item={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      <ConfirmationModal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={() => deleteMutation.mutate(itemToDelete.id)}
        title="Delete Live Link"
        message={`Are you sure you want to delete "${itemToDelete?.title}"? This action cannot be undone.`}
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

      <ViewModal item={viewItem} onClose={() => setViewItem(null)} />
    </div>
  );
}
