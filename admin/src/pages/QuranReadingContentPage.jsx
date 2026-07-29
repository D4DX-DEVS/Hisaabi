import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, LibraryBig, Save, FileText, Hash, AlignLeft, Layers, CheckCircle2, XCircle } from 'lucide-react';
import { adminApi } from '../api/adminApi';
import ConfirmationModal from '../components/ConfirmationModal';
import SuccessModal from '../components/SuccessModal';

const EMPTY = {
  title: '',
  description: '',
  surah_number: '',
  juz_number: '',
  page_from: '',
  page_to: '',
  order: 0,
  is_active: true,
};

function Modal({ item, onClose, onSave }) {
  const [form, setForm] = useState(
    item
      ? {
        ...item,
        surah_number: item.surah_number ?? '',
        juz_number: item.juz_number ?? '',
        page_from: item.page_from ?? '',
        page_to: item.page_to ?? '',
      }
      : EMPTY
  );

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSave = () => {
    const toNum = (v) => (v === '' || v === null || v === undefined ? null : parseInt(v, 10));
    onSave({
      title: form.title,
      description: form.description || null,
      surah_number: toNum(form.surah_number),
      juz_number: toNum(form.juz_number),
      page_from: toNum(form.page_from),
      page_to: toNum(form.page_to),
      order: toNum(form.order) ?? 0,
      is_active: form.is_active,
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden transform transition-all w-full max-w-2xl relative z-10 animate-slide-in-right flex flex-col max-h-[90vh]">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-100 text-blue-600 shadow-sm border border-blue-200/50">
              {item ? <Pencil size={18} /> : <Plus size={18} />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 font-display">{item ? 'Edit Reading Portion' : 'Add Reading Portion'}</h2>
              <p className="text-xs text-slate-500 font-medium">{item ? 'Update reading assignment' : 'Assign Quran pages for users to read'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors rounded-full p-2 hover:bg-slate-200 focus:outline-none"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          <div className="space-y-5">
            {/* Title Section */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                <FileText size={14} /> Title <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium bg-slate-50 focus:bg-white transition-colors"
                value={form.title}
                onChange={set('title')}
                placeholder="e.g. Day 1: Al-Fatihah"
              />
            </div>

            {/* Description */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                <AlignLeft size={14} /> Description
              </label>
              <textarea
                rows={2}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium bg-slate-50 focus:bg-white transition-colors resize-none"
                value={form.description}
                onChange={set('description')}
                placeholder="Optional short description..."
              />
            </div>

            {/* Grid for Numbers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-slate-100">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  <Hash size={14} /> Surah No. (1-114)
                </label>
                <input
                  type="number"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium bg-slate-50 focus:bg-white transition-colors"
                  value={form.surah_number}
                  onChange={set('surah_number')}
                  placeholder="e.g. 1"
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  <Hash size={14} /> Juz Number (1-30)
                </label>
                <input
                  type="number"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium bg-slate-50 focus:bg-white transition-colors"
                  value={form.juz_number}
                  onChange={set('juz_number')}
                  placeholder="e.g. 1"
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  <Layers size={14} /> Page From (1-604)
                </label>
                <input
                  type="number"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium bg-slate-50 focus:bg-white transition-colors"
                  value={form.page_from}
                  onChange={set('page_from')}
                  placeholder="e.g. 1"
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  <Layers size={14} /> Page To (1-604)
                </label>
                <input
                  type="number"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium bg-slate-50 focus:bg-white transition-colors"
                  value={form.page_to}
                  onChange={set('page_to')}
                  placeholder="e.g. 2"
                />
              </div>
            </div>

            {/* Order and Active state */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-slate-100">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  <Hash size={14} /> Display Order
                </label>
                <input
                  type="number"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium bg-slate-50 focus:bg-white transition-colors"
                  value={form.order}
                  onChange={set('order')}
                  placeholder="e.g. 1"
                />
              </div>

              <div className="flex items-center pt-6">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-12 h-6 rounded-full transition-colors relative ${form.is_active ? 'bg-blue-500' : 'bg-slate-300'}`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${form.is_active ? 'left-7' : 'left-1'}`} />
                  </div>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={form.is_active}
                    onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
                  />
                  <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">Active Status</span>
                </label>
              </div>
            </div>

          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white rounded-xl border border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-colors"
          >
            <Save size={16} />
            {item ? 'Save Changes' : 'Create Portion'}
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
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden transform transition-all w-full max-w-lg relative z-10 animate-slide-in-right flex flex-col max-h-[90vh]">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-100 text-blue-600 shadow-sm border border-blue-200/50">
              <LibraryBig size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 font-display">Reading Portion Details</h2>
              <p className="text-xs text-slate-500 font-medium">Detailed view of the content</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors rounded-full p-2 hover:bg-slate-200 focus:outline-none">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Title</h3>
            <p className="text-lg font-bold text-slate-800">{item.title}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Surah Number</h3>
              <p className="font-mono text-sm font-bold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 w-fit">{item.surah_number ?? '—'}</p>
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Juz Number</h3>
              <p className="font-mono text-sm font-bold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 w-fit">{item.juz_number ?? '—'}</p>
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Page From</h3>
              <p className="font-mono text-sm font-bold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 w-fit">{item.page_from ?? '—'}</p>
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Page To</h3>
              <p className="font-mono text-sm font-bold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 w-fit">{item.page_to ?? '—'}</p>
            </div>
          </div>
          {item.description && (
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Description</h3>
              <p className="text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm leading-relaxed">{item.description}</p>
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

export default function QuranReadingContentPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [successState, setSuccessState] = useState({ isOpen: false, title: '', message: '' });
  const [page, setPage] = useState(1);
  const limit = 15;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-quran-reading-content', page],
    queryFn: () => adminApi.getQuranReadingContents({ page, limit }).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (d) => adminApi.createQuranReadingContent(d),
    onSuccess: () => {
      qc.invalidateQueries(['admin-quran-reading-content']);
      setSuccessState({ isOpen: true, title: 'Success!', message: 'Portion created successfully.' });
      setModal(null);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to create portion'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => adminApi.updateQuranReadingContent(id, data),
    onSuccess: () => {
      qc.invalidateQueries(['admin-quran-reading-content']);
      setSuccessState({ isOpen: true, title: 'Success!', message: 'Portion updated successfully.' });
      setModal(null);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to update portion'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminApi.deleteQuranReadingContent(id),
    onSuccess: () => {
      qc.invalidateQueries(['admin-quran-reading-content']);
      setSuccessState({ isOpen: true, title: 'Success!', message: 'Portion removed successfully.' });
      setItemToDelete(null);
    },
    onError: (e) => {
      toast.error(e.response?.data?.error || 'Failed to remove portion');
      setItemToDelete(null);
    }
  });

  const handleSave = (form) => {
    if (modal === 'create') createMutation.mutate(form);
    else updateMutation.mutate({ id: modal.id, data: form });
  };

  const contents = data?.contents || [];

  return (
    <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col min-h-0 gap-6">
      <div className="shrink-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 font-display flex items-center gap-3 tracking-tight">
            <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl shadow-sm border border-blue-200/50">
              <LibraryBig size={24} />
            </div>
            Quran Reading Config
          </h1>
          <p className="text-slate-500 text-sm mt-2 ml-1">
            Manage the {contents.length} assigned portions users read to complete the Quran.
          </p>
        </div>

        <button
          onClick={() => setModal('create')}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-blue-600 transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus size={18} /> Add Portion
        </button>
      </div>
      </div>{/* end shrink-0 header */}

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-24">
          <div className="h-10 w-10 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin mb-4"></div>
          <p className="font-bold text-slate-500">Loading configurations...</p>
        </div>
      ) : contents.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-24 text-center">
          <LibraryBig size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-xl font-bold text-slate-700 font-display mb-2">No Portions Scheduled</h3>
          <p className="text-slate-500 max-w-sm mx-auto">Create the first assigned reading chunk to get your users started.</p>
          <button
            onClick={() => setModal('create')}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-50 text-blue-600 font-bold text-sm rounded-xl border border-blue-200 hover:bg-blue-100 transition-colors"
          >
            <Plus size={16} /> Assign First Portion
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/80 text-slate-500 text-[10px] uppercase font-bold tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Title & Details</th>
                  <th className="px-6 py-4">Surah</th>
                  <th className="px-6 py-4">Juz</th>
                  <th className="px-6 py-4">Pages</th>
                  <th className="px-6 py-4">Order</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {contents.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setViewItem(c)}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-slate-800 text-base">{c.title}</span>
                        {c.description && <span className="text-xs text-slate-500 truncate max-w-[200px]">{c.description}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-600">
                      {c.surah_number ? `No. ${c.surah_number}` : '—'}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-600">
                      {c.juz_number ? `${c.juz_number}` : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border bg-slate-100 text-slate-600 border-slate-200">
                        {c.page_from && c.page_to ? `${c.page_from} - ${c.page_to}` : c.page_from ?? c.page_to ?? '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-500 font-bold">{c.order}</td>
                    <td className="px-6 py-4">
                      {c.is_active ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border bg-emerald-50 text-emerald-600 border-emerald-200">
                          <CheckCircle2 size={12} /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border bg-slate-100 text-slate-500 border-slate-200">
                          <XCircle size={12} /> Hidden
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); setModal(c); }}
                          className="p-2 rounded-xl text-slate-400 bg-white border border-slate-100 hover:bg-slate-100 hover:text-blue-600 transition-colors shadow-sm"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setItemToDelete(c); }}
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
          {data?.total_pages > 1 && (
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
              <span className="text-sm text-slate-500 font-medium">
                Page {page} of {data.total_pages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 text-sm font-bold rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
                  disabled={page === data.total_pages || !data.total_pages}
                  className="px-4 py-2 text-sm font-bold rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      </div>{/* end scrollable content */}

      {/* Forms Modal */}
      {modal && (
        <Modal
          item={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmationModal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={() => deleteMutation.mutate(itemToDelete.id)}
        title="Remove Reading Portion"
        message={`Are you sure you want to completely remove "${itemToDelete?.title}"? Users will no longer see this portion in their schedule.`}
        confirmText="Yes, remove it"
        cancelText="Cancel"
        type="danger"
      />

      <SuccessModal
        isOpen={successState.isOpen}
        onClose={() => setSuccessState({ isOpen: false, title: '', message: '' })}
        title={successState.title}
        message={successState.message}
      />

      {/* View Modal */}
      <ViewModal
        item={viewItem}
        onClose={() => setViewItem(null)}
      />
    </div>
  );
}
