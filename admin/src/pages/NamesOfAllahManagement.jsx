import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, Star, Save, FileText, AlignLeft, Eye, Search, Hash } from 'lucide-react';
import { adminApi } from '../api/adminApi';
import ConfirmationModal from '../components/ConfirmationModal';
import SuccessModal from '../components/SuccessModal';
import Pagination from '../components/Pagination';

const LIMIT = 20;

const EMPTY = { name: '', order: '', english_meaning: '', malayalam_meaning: '', urdu_meaning: '', description: '' };

function Modal({ item, onClose, onSave }) {
  const [form, setForm] = useState(item ? { ...EMPTY, ...item, order: item.order ?? '' } : EMPTY);
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-fade-in" onClick={onClose} />

      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden transform transition-all w-full max-w-2xl relative z-10 animate-slide-in-right flex flex-col max-h-[90vh]">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-100 text-indigo-600 shadow-sm border border-indigo-200/50">
              {item ? <Pencil size={18} /> : <Plus size={18} />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 font-display">{item ? 'Edit Name of Allah' : 'Add Name of Allah'}</h2>
              <p className="text-xs text-slate-500 font-medium">{item ? 'Update name details' : 'Add a new name to the catalogue'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors rounded-full p-2 hover:bg-slate-200 focus:outline-none">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5">
          {/* Name (Arabic) */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              <Star size={14} /> Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              dir="rtl"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xl leading-loose font-arabic focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-indigo-50/30 focus:bg-white transition-colors placeholder-slate-300"
              value={form.name}
              onChange={set('name')}
              placeholder="e.g. الرحمن"
            />
          </div>

          {/* Order */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              <Hash size={14} /> Order
            </label>
            <input
              type="number"
              min="1"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium bg-slate-50 focus:bg-white transition-colors"
              value={form.order}
              onChange={set('order')}
              placeholder="e.g. 1, 2, 3..."
            />
            <p className="text-xs text-slate-400 mt-1">Lower number = shown first in the list</p>
          </div>

          {/* Meanings */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                <FileText size={14} /> English Meaning
              </label>
              <input
                type="text"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium bg-slate-50 focus:bg-white transition-colors"
                value={form.english_meaning}
                onChange={set('english_meaning')}
                placeholder="e.g. The Most Gracious"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                <FileText size={14} /> Malayalam Meaning
              </label>
              <input
                type="text"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium bg-slate-50 focus:bg-white transition-colors"
                value={form.malayalam_meaning}
                onChange={set('malayalam_meaning')}
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                <FileText size={14} /> Urdu Meaning
              </label>
              <input
                type="text"
                dir="rtl"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium bg-slate-50 focus:bg-white transition-colors text-right font-arabic leading-relaxed"
                value={form.urdu_meaning}
                onChange={set('urdu_meaning')}
              />
            </div>
          </div>

          {/* Description */}
          <div className="pt-4 border-t border-slate-100">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              <AlignLeft size={14} /> Description
            </label>
            <textarea
              rows={4}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium bg-slate-50 focus:bg-white transition-colors resize-y"
              value={form.description}
              onChange={set('description')}
              placeholder="Details about this name..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white rounded-xl border border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm">
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-colors"
          >
            <Save size={16} />
            {item ? 'Save Changes' : 'Create Name'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function ViewModal({ item, onClose }) {
  if (!item) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-fade-in" onClick={onClose} />
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden transform transition-all w-full max-w-2xl relative z-10 animate-slide-in-right flex flex-col max-h-[90vh]">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-100 text-indigo-600 shadow-sm border border-indigo-200/50">
              <Star size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 font-display">Name of Allah Details</h2>
              <p className="text-xs text-slate-500 font-medium">Full content view</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors rounded-full p-2 hover:bg-slate-200 focus:outline-none">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          {item.order != null && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200">
              <Hash size={13} className="text-indigo-500" />
              <span className="text-xs font-bold text-indigo-700">Order: {item.order}</span>
            </div>
          )}
          {/* Name in Arabic */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Name</h3>
            <div className="bg-indigo-50/30 p-4 rounded-xl border border-indigo-100/50">
              <p className="text-right text-slate-800 text-3xl font-arabic leading-[2.2] tracking-wide" dir="rtl">{item.name}</p>
            </div>
          </div>

          {/* Meanings */}
          <div className="space-y-4 pt-2">
            {item.english_meaning && (
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">English Meaning</h3>
                <div className="text-slate-700 bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 text-sm leading-relaxed min-h-[40px] whitespace-pre-wrap">
                  {item.english_meaning}
                </div>
              </div>
            )}
            {item.malayalam_meaning && (
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Malayalam Meaning</h3>
                <div className="text-slate-700 bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 text-sm leading-relaxed min-h-[40px] whitespace-pre-wrap">
                  {item.malayalam_meaning}
                </div>
              </div>
            )}
            {item.urdu_meaning && (
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Urdu Meaning</h3>
                <div
                  dir="rtl"
                  className="text-slate-700 bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 text-sm leading-relaxed min-h-[40px] whitespace-pre-wrap text-right font-arabic"
                >
                  {item.urdu_meaning}
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          {item.description && (
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Description</h3>
              <div className="text-slate-700 bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 text-sm leading-relaxed min-h-[80px] whitespace-pre-wrap resize-y overflow-auto">
                {item.description}
              </div>
            </div>
          )}
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

export default function NamesOfAllahManagement() {
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
    queryKey: ['admin-names-of-allah', page, debouncedSearch],
    queryFn: () => adminApi.getNamesOfAllah({
      page,
      limit: LIMIT,
      ...(debouncedSearch && { search: debouncedSearch }),
    }).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (d) => adminApi.createNameOfAllah(d),
    onSuccess: () => {
      qc.invalidateQueries(['admin-names-of-allah']);
      setSuccessState({ isOpen: true, title: 'Success!', message: 'Name of Allah created successfully.' });
      setModal(null);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to create name'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => adminApi.updateNameOfAllah(id, data),
    onSuccess: () => {
      qc.invalidateQueries(['admin-names-of-allah']);
      setSuccessState({ isOpen: true, title: 'Success!', message: 'Name of Allah updated successfully.' });
      setModal(null);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to update name'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminApi.deleteNameOfAllah(id),
    onSuccess: () => {
      qc.invalidateQueries(['admin-names-of-allah']);
      setSuccessState({ isOpen: true, title: 'Deleted!', message: 'Name of Allah removed successfully.' });
      setItemToDelete(null);
    },
    onError: (e) => {
      toast.error(e.response?.data?.error || 'Failed to delete name');
      setItemToDelete(null);
    },
  });

  const handleSave = (form) => {
    if (modal === 'create') createMutation.mutate(form);
    else updateMutation.mutate({ id: modal.id, data: form });
  };

  const names = data?.names_of_allah || [];
  const total = data?.total ?? 0;
  const totalPages = data?.total_pages ?? 1;

  return (
    <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col min-h-0 gap-6">
      {/* Fixed header */}
      <div className="shrink-0 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 font-display flex items-center gap-3 tracking-tight">
            <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl shadow-sm border border-indigo-200/50">
              <Star size={24} />
            </div>
            Names of Allah
          </h1>
          <p className="text-slate-500 text-sm mt-2 ml-1">
            {total > 0 ? `${total} names in the catalogue` : 'Manage the 99 names of Allah'}
          </p>
        </div>
        <button
          onClick={() => setModal('create')}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-indigo-600 transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus size={18} /> Add Name
        </button>
      </div>

      {/* Search bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, meaning or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white font-medium"
          />
        </div>
      </div>
      </div>{/* end fixed header */}

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-24">
          <div className="h-10 w-10 border-4 border-slate-200 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
          <p className="font-bold text-slate-500">Loading names...</p>
        </div>
      ) : !isLoading && names.length === 0 && !debouncedSearch && page === 1 ? (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-24 text-center">
          <Star size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-xl font-bold text-slate-700 font-display mb-2">No Names Yet</h3>
          <p className="text-slate-500 max-w-sm mx-auto">Add the first name of Allah to the catalogue.</p>
          <button
            onClick={() => setModal('create')}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-50 text-indigo-600 font-bold text-sm rounded-xl border border-indigo-200 hover:bg-indigo-100 transition-colors"
          >
            <Plus size={16} /> Add First Name
          </button>
        </div>
      ) : (
        <div className={`bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden transition-opacity ${isFetching && !isLoading ? 'opacity-70' : 'opacity-100'}`}>
          {names.length === 0 ? (
            <p className="text-center text-slate-400 font-medium py-12">No names match your search.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/80 text-slate-500 text-[10px] uppercase font-bold tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-4 text-center w-12">#</th>
                    <th className="px-6 py-4 text-right">Name</th>
                    <th className="px-6 py-4">English Meaning</th>
                    <th className="px-6 py-4">Malayalam Meaning</th>
                    <th className="px-6 py-4 text-right">Urdu Meaning</th>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {names.map((n) => (
                    <tr key={n.id} onClick={() => setViewItem(n)} className="hover:bg-slate-50/80 transition-colors group cursor-pointer">
                      <td className="px-4 py-4 text-center">
                        {n.order != null ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200">{n.order}</span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-arabic text-slate-800 text-xl leading-loose font-bold" dir="rtl">{n.name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-slate-700 text-sm">{n.english_meaning || <span className="text-slate-400">&mdash;</span>}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-slate-700 text-sm">{n.malayalam_meaning || <span className="text-slate-400">&mdash;</span>}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {n.urdu_meaning ? (
                          <span className="font-arabic text-slate-700 text-sm leading-relaxed" dir="rtl">{n.urdu_meaning}</span>
                        ) : <span className="text-slate-400">&mdash;</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-500 text-sm max-w-xs truncate block">
                          {n.description ? (n.description.length > 50 ? n.description.substring(0, 50) + '...' : n.description) : <span className="text-slate-400">&mdash;</span>}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => { e.stopPropagation(); setViewItem(n); }} className="p-2 rounded-xl text-slate-400 bg-white border border-slate-100 hover:bg-slate-100 hover:text-indigo-600 transition-colors shadow-sm" title="View"><Eye size={16} /></button>
                          <button onClick={(e) => { e.stopPropagation(); setModal(n); }} className="p-2 rounded-xl text-slate-400 bg-white border border-slate-100 hover:bg-slate-100 hover:text-indigo-600 transition-colors shadow-sm" title="Edit"><Pencil size={16} /></button>
                          <button onClick={(e) => { e.stopPropagation(); setItemToDelete(n); }} className="p-2 rounded-xl text-slate-400 bg-white border border-slate-100 hover:bg-red-50 hover:border-red-100 hover:text-red-600 transition-colors shadow-sm" title="Delete"><Trash2 size={16} /></button>
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
      </div>{/* end scrollable content */}

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
        title="Delete Name of Allah"
        message={`Are you sure you want to delete "${itemToDelete?.name}"? This action cannot be undone.`}
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
