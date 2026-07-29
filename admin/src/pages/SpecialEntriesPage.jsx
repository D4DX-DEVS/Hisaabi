import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, Layers, Save, Search, ChevronLeft, Hash, AlignLeft, ArrowLeft, Eye } from 'lucide-react';
import { adminApi } from '../api/adminApi';
import ConfirmationModal from '../components/ConfirmationModal';
import SuccessModal from '../components/SuccessModal';
import AutoGrowTextarea from '../components/AutoGrowTextarea';
import Pagination from '../components/Pagination';

// ── Field metadata ────────────────────────────────────────────────────────────
const FIELD_META = {
  title_malayalam:       { label: 'Title (Malayalam)',       type: 'text' },
  title_english:         { label: 'Title (English)',          type: 'text' },
  title_urdu:            { label: 'Title (Urdu)',             type: 'text',   dir: 'rtl' },
  description_malayalam: { label: 'Description (Malayalam)',  type: 'textarea' },
  description_english:   { label: 'Description (English)',    type: 'textarea' },
  description_urdu:      { label: 'Description (Urdu)',       type: 'textarea', dir: 'rtl' },
  arabic_text:           { label: 'Arabic Text',              type: 'textarea', dir: 'rtl', arabic: true },
  arabic_source:         { label: 'Arabic Source',            type: 'textarea', dir: 'rtl', arabic: true },
  translation_malayalam: { label: 'Translation (Malayalam)',  type: 'textarea' },
  translation_english:   { label: 'Translation (English)',    type: 'textarea' },
  translation_urdu:      { label: 'Translation (Urdu)',       type: 'textarea', dir: 'rtl' },
  count:                 { label: 'Count',                    type: 'number' },
  reference_link:        { label: 'Reference / Link',         type: 'url' },
};

// ── Entry Modal (Add / Edit) ──────────────────────────────────────────────────
function EntryModal({ item, category, onClose, onSave }) {
  const fields = category?.fields || [];

  const initData = () => {
    const d = {};
    fields.forEach((key) => {
      d[key] = item?.data?.[key] ?? '';
    });
    return d;
  };

  const [form, setForm] = useState({
    order: item?.order ?? '',
    data: initData(),
  });

  const setField = (key) => (e) => setForm((p) => ({ ...p, data: { ...p.data, [key]: e.target.value } }));
  const setOrder = (e) => setForm((p) => ({ ...p, order: e.target.value }));

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-fade-in" onClick={onClose} />
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-2xl relative z-10 animate-slide-in-right flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-100 text-indigo-600 shadow-sm border border-indigo-200/50">
              {item ? <Pencil size={18} /> : <Plus size={18} />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 font-display">
                {item ? 'Edit Entry' : 'Add Entry'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">{category?.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors rounded-full p-2 hover:bg-slate-200">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5">
          {fields.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">No fields configured for this category.</p>
          ) : (
            fields.map((key) => {
              const meta = FIELD_META[key] || { label: key, type: 'text' };
              return (
                <div key={key}>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    {meta.label}
                  </label>
                  {meta.type === 'textarea' ? (
                    <AutoGrowTextarea
                      rows={3}
                      dir={meta.dir}
                      className={`w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium bg-slate-50 focus:bg-white transition-colors resize-none${meta.arabic ? ' font-arabic text-lg leading-loose' : ''}`}
                      value={form.data[key] ?? ''}
                      onChange={setField(key)}
                      placeholder={`Enter ${meta.label.toLowerCase()}...`}
                    />
                  ) : meta.type === 'number' ? (
                    <input
                      type="number"
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium bg-slate-50 focus:bg-white transition-colors"
                      value={form.data[key] ?? ''}
                      onChange={setField(key)}
                      placeholder="0"
                    />
                  ) : meta.type === 'url' ? (
                    <input
                      type="url"
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium bg-slate-50 focus:bg-white transition-colors"
                      value={form.data[key] ?? ''}
                      onChange={setField(key)}
                      placeholder="https://"
                    />
                  ) : (
                    <input
                      type="text"
                      dir={meta.dir}
                      className={`w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium bg-slate-50 focus:bg-white transition-colors${meta.arabic ? ' font-arabic text-lg leading-loose' : ''}`}
                      value={form.data[key] ?? ''}
                      onChange={setField(key)}
                      placeholder={`Enter ${meta.label.toLowerCase()}...`}
                    />
                  )}
                </div>
              );
            })
          )}

          {/* Order field */}
          <div className="pt-4 border-t border-slate-100">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              <Hash size={12} /> Order
            </label>
            <input
              type="number"
              min="1"
              className="w-32 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium bg-slate-50 focus:bg-white transition-colors"
              value={form.order}
              onChange={setOrder}
              placeholder="1, 2..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm">
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-colors"
          >
            <Save size={16} />
            {item ? 'Save Changes' : 'Add Entry'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getPreviewText(entry) {
  const data = entry?.data || {};
  const priorityKeys = ['title_malayalam', 'title_english', 'title_urdu', 'arabic_text', 'description_malayalam', 'description_english'];
  for (const k of priorityKeys) {
    if (data[k]) return data[k];
  }
  const first = Object.values(data).find((v) => typeof v === 'string' && v.trim());
  return first || '—';
}

// ── Page ──────────────────────────────────────────────────────────────────────
const ITEMS_PER_PAGE = 20;

// ── Entry View Modal ─────────────────────────────────────────────────────────
function EntryViewModal({ item, category, onClose }) {
  if (!item) return null;
  const fields = category?.fields || [];
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-fade-in" onClick={onClose} />
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-2xl relative z-10 animate-slide-in-right flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-100 text-indigo-600 shadow-sm border border-indigo-200/50">
              <Layers size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 font-display">Entry Details</h2>
              <p className="text-xs text-slate-500 font-medium">{category?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {item.order != null && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold">
                <Hash size={11} /> {item.order}
              </span>
            )}
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors rounded-full p-2 hover:bg-slate-200">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5">
          {fields.length === 0 && (
            <p className="text-slate-400 text-sm text-center py-8">No fields configured for this category.</p>
          )}
          {fields.map((key) => {
            const meta = FIELD_META[key] || { label: key, type: 'text' };
            const value = item?.data?.[key];
            if (!value && value !== 0) return null;
            return (
              <div key={key}>
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{meta.label}</h3>
                <div
                  dir={meta.dir}
                  className={`text-slate-800 bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 text-sm leading-relaxed whitespace-pre-wrap${
                    meta.arabic ? ' font-arabic text-lg leading-loose text-right' : ''
                  }${meta.dir === 'rtl' && !meta.arabic ? ' text-right font-arabic' : ''}`}
                >
                  {value}
                </div>
              </div>
            );
          })}
          {fields.every((k) => !item?.data?.[k] && item?.data?.[k] !== 0) && (
            <p className="text-slate-400 text-sm text-center py-8">No data filled in for this entry.</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm">
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function SpecialEntriesPage() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [modal, setModal] = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [successState, setSuccessState] = useState({ isOpen: false, title: '', message: '' });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Fetch category metadata
  const { data: catData, isLoading: catLoading } = useQuery({
    queryKey: ['admin-special-categories'],
    queryFn: () => adminApi.getSpecialCategories().then((r) => r.data),
  });
  const category = (catData?.categories || []).find((c) => (c._id || c.id) === categoryId);

  // Fetch entries
  const { data: entriesData, isLoading: entriesLoading } = useQuery({
    queryKey: ['admin-special-entries', categoryId, page, search],
    queryFn: () => adminApi.getSpecialEntries(categoryId, { page, limit: ITEMS_PER_PAGE, search: search || undefined }).then((r) => r.data),
    enabled: !!categoryId,
    keepPreviousData: true,
  });

  const entries = entriesData?.entries || [];
  const totalPages = entriesData?.totalPages || 1;
  const totalEntries = entriesData?.total || 0;

  // Mutations
  const createMutation = useMutation({
    mutationFn: (form) => adminApi.createSpecialEntry(categoryId, {
      data: form.data,
      order: form.order !== '' ? Number(form.order) : null,
    }),
    onSuccess: () => {
      qc.invalidateQueries(['admin-special-entries', categoryId]);
      setSuccessState({ isOpen: true, title: 'Entry Added!', message: 'Special entry created successfully.' });
      setModal(null);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to create entry'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, form }) => adminApi.updateSpecialEntry(id, {
      data: form.data,
      order: form.order !== '' ? Number(form.order) : null,
    }),
    onSuccess: () => {
      qc.invalidateQueries(['admin-special-entries', categoryId]);
      setSuccessState({ isOpen: true, title: 'Updated!', message: 'Entry updated successfully.' });
      setModal(null);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to update entry'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminApi.deleteSpecialEntry(id),
    onSuccess: () => {
      qc.invalidateQueries(['admin-special-entries', categoryId]);
      setSuccessState({ isOpen: true, title: 'Deleted!', message: 'Entry deleted successfully.' });
      setItemToDelete(null);
    },
    onError: (e) => {
      toast.error(e.response?.data?.error || 'Failed to delete entry');
      setItemToDelete(null);
    },
  });

  const handleSave = (form) => {
    if (modal === 'create') {
      createMutation.mutate(form);
    } else {
      updateMutation.mutate({ id: modal._id || modal.id, form });
    }
  };

  const isLoading = catLoading || entriesLoading;

  return (
    <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col min-h-0 gap-6">
      <div className="shrink-0 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <button
              onClick={() => navigate('/special-models')}
              className="flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors mb-2"
            >
              <ArrowLeft size={16} /> Special Models
            </button>
            <h1 className="text-3xl font-bold text-slate-800 font-display flex items-center gap-3 tracking-tight">
              <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl shadow-sm border border-indigo-200/50">
                <Layers size={24} />
              </div>
              {catLoading ? 'Loading...' : (category?.name || 'Special Entries')}
            </h1>
            {category?.fields?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2 ml-1">
                {category.fields.map((f) => (
                  <span key={f} className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-200">
                    {(FIELD_META[f]?.label || f)}
                  </span>
                ))}
              </div>
            )}
            <p className="text-slate-500 text-sm mt-1 ml-1">{totalEntries} {totalEntries === 1 ? 'entry' : 'entries'}</p>
          </div>
          <button
            onClick={() => setModal('create')}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-indigo-600 transition-colors shadow-sm self-start sm:self-auto"
          >
            <Plus size={18} /> Add Entry
          </button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search entries..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white font-medium"
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-24">
            <div className="h-10 w-10 border-4 border-slate-200 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
            <p className="font-bold text-slate-500">Loading entries...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-24 text-center">
            <AlignLeft size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-bold text-slate-700 font-display mb-2">No Entries Yet</h3>
            <p className="text-slate-500 max-w-sm mx-auto">Add the first entry to this category.</p>
            <button
              onClick={() => setModal('create')}
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-50 text-indigo-600 font-bold text-sm rounded-xl border border-indigo-200 hover:bg-indigo-100 transition-colors"
            >
              <Plus size={16} /> Add First Entry
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/80 text-slate-500 text-[10px] uppercase font-bold tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-4 text-center w-16">Order</th>
                    <th className="px-6 py-4">Preview</th>
                    <th className="px-6 py-4">Fields Filled</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {entries.map((entry) => {
                    const entryId = entry._id || entry.id;
                    const preview = getPreviewText(entry);
                    const filledCount = Object.values(entry.data || {}).filter((v) => v !== '' && v != null).length;
                    return (
                      <tr key={entryId} className="hover:bg-slate-50/80 transition-colors group bg-white">
                        <td className="px-4 py-4 text-center">
                          {entry.order != null ? (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200">{entry.order}</span>
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 max-w-sm">
                          <p className="font-medium text-slate-700 truncate text-sm">{preview}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            {filledCount} / {(category?.fields || []).length}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setViewItem(entry)}
                              className="p-2 rounded-xl text-slate-400 bg-white border border-slate-100 hover:bg-indigo-50 hover:text-indigo-600 transition-colors shadow-sm"
                              title="View details"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => setModal(entry)}
                              className="p-2 rounded-xl text-slate-400 bg-white border border-slate-100 hover:bg-slate-100 hover:text-indigo-600 transition-colors shadow-sm"
                              title="Edit"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => setItemToDelete(entry)}
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
              <div className="px-6 py-4 border-t border-slate-100">
                <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            )}
          </div>
        )}
      </div>

      {modal && (
        <EntryModal
          item={modal === 'create' ? null : modal}
          category={category}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      {viewItem && (
        <EntryViewModal item={viewItem} category={category} onClose={() => setViewItem(null)} />
      )}

      <ConfirmationModal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={() => deleteMutation.mutate(itemToDelete._id || itemToDelete.id)}
        title="Delete Entry"
        message="This entry will be permanently removed."
        confirmLabel="Delete Entry"
        confirmVariant="danger"
      />

      <SuccessModal
        isOpen={successState.isOpen}
        title={successState.title}
        message={successState.message}
        onClose={() => setSuccessState((p) => ({ ...p, isOpen: false }))}
      />
    </div>
  );
}
