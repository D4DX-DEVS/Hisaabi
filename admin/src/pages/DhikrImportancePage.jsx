import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, Sparkles, Save, AlignLeft, Eye, Search } from 'lucide-react';
import { adminApi } from '../api/adminApi';
import ConfirmationModal from '../components/ConfirmationModal';
import SuccessModal from '../components/SuccessModal';
import AutoGrowTextarea from '../components/AutoGrowTextarea';

const EMPTY_TRILINGUAL = { malayalam: '', english: '', urdu: '' };
const EMPTY = { title: { ...EMPTY_TRILINGUAL }, description: { ...EMPTY_TRILINGUAL }, source: '' };

const LANG_FIELDS = [
  { key: 'malayalam', label: 'Malayalam', required: true },
  { key: 'english',   label: 'English',   required: false },
  { key: 'urdu',      label: 'Urdu',      required: false },
];

function normTitle(raw) {
  if (!raw || typeof raw !== 'object') {
    return { malayalam: typeof raw === 'string' ? raw : '', english: '', urdu: '' };
  }
  return { malayalam: raw.malayalam ?? '', english: raw.english ?? '', urdu: raw.urdu ?? '' };
}

function Modal({ item, onClose, onSave }) {
  const [form, setForm] = useState(
    item
      ? {
          ...item,
          title: normTitle(item.title),
          description: { ...EMPTY_TRILINGUAL, ...(item.description || {}) },
          source: item.source ?? '',
        }
      : EMPTY
  );
  const setTitle  = (k) => (e) => setForm((p) => ({ ...p, title: { ...p.title, [k]: e.target.value } }));
  const setDesc   = (k) => (e) => setForm((p) => ({ ...p, description: { ...p.description, [k]: e.target.value } }));
  const setSource = (e) => setForm((p) => ({ ...p, source: e.target.value }));

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
              <h2 className="text-lg font-bold text-slate-800 font-display">{item ? 'Edit Dhikr Importance' : 'Add Dhikr Importance'}</h2>
              <p className="text-xs text-slate-500 font-medium">{item ? 'Update dhikr importance content' : 'Add a new dhikr importance entry'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors rounded-full p-2 hover:bg-slate-200 focus:outline-none">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5">
          {/* Title — trilingual */}
          <div className="space-y-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <AlignLeft size={14} /> Title
            </p>
            <div className="space-y-3">
              {LANG_FIELDS.map(({ key, label }) => (
                <div key={key}>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">{label}</label>
                  <input
                    type="text"
                    dir={key === 'urdu' ? 'rtl' : undefined}
                    className={`w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium bg-slate-50 focus:bg-white transition-colors${key === 'urdu' ? ' text-right font-arabic' : ''}`}
                    value={form.title[key] ?? ''}
                    onChange={setTitle(key)}
                    placeholder={`Title in ${label}`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Description — trilingual */}
          <div className="space-y-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <AlignLeft size={14} /> Description
            </p>
            <div className="space-y-4">
              {LANG_FIELDS.map(({ key, label, required }) => (
                <div key={key}>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                    {label}
                    {required && <span className="text-red-500 ml-0.5">*</span>}
                  </label>
                  <AutoGrowTextarea
                    minRows={3}
                    dir={key === 'urdu' ? 'rtl' : undefined}
                    className={`w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium bg-slate-50 focus:bg-white transition-colors${key === 'urdu' ? ' text-right font-arabic leading-relaxed' : ''}`}
                    value={form.description[key] ?? ''}
                    onChange={setDesc(key)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Source — Arabic */}
          <div className="space-y-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <AlignLeft size={14} /> Source
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Arabic</label>
                <AutoGrowTextarea
                  minRows={3}
                  dir="rtl"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium bg-slate-50 focus:bg-white transition-colors text-right font-arabic leading-relaxed"
                  value={form.source ?? ''}
                  onChange={setSource}
                  placeholder="المصدر"
                />
              </div>
            </div>
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
            {item ? 'Save Changes' : 'Create Entry'}
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
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 font-display">Dhikr Importance Details</h2>
              <p className="text-xs text-slate-500 font-medium">Full content view</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors rounded-full p-2 hover:bg-slate-200 focus:outline-none">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
          {/* Trilingual Title */}
          {(item.title?.malayalam || item.title?.english || item.title?.urdu) ? (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Title</h3>
              {[{ key: 'malayalam', label: 'Malayalam' }, { key: 'english', label: 'English' }, { key: 'urdu', label: 'Urdu' }].map(({ key, label }) =>
                item.title?.[key]?.trim() ? (
                  <div key={key}>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</h4>
                    <div
                      dir={key === 'urdu' ? 'rtl' : undefined}
                      className={`text-slate-800 font-semibold bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 text-sm${key === 'urdu' ? ' text-right font-arabic' : ''}`}
                    >
                      {item.title[key]}
                    </div>
                  </div>
                ) : null
              )}
            </div>
          ) : null}
          {item.description && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Description</h3>
              {[{ key: 'malayalam', label: 'Malayalam' }, { key: 'english', label: 'English' }, { key: 'urdu', label: 'Urdu' }].map(({ key, label }) =>
                item.description[key] ? (
                  <div key={key}>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</h4>
                    <div
                      dir={key === 'urdu' ? 'rtl' : undefined}
                      className={`text-slate-700 bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 text-sm leading-relaxed min-h-[80px] whitespace-pre-wrap resize-y overflow-auto${key === 'urdu' ? ' text-right font-arabic' : ''}`}
                    >
                      {item.description[key]}
                    </div>
                  </div>
                ) : null
              )}
            </div>
          )}
          {item.source?.trim() && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Source</h3>
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Arabic</h4>
                <div dir="rtl" className="text-slate-700 bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 text-sm leading-relaxed min-h-[80px] whitespace-pre-wrap resize-y overflow-auto text-right font-arabic">
                  {item.source}
                </div>
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

export default function DhikrImportancePage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [successState, setSuccessState] = useState({ isOpen: false, title: '', message: '' });
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-dhikr-importances'],
    queryFn: () => adminApi.getDhikrImportances({ limit: 500 }).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (d) => adminApi.createDhikrImportance(d),
    onSuccess: () => {
      qc.invalidateQueries(['admin-dhikr-importances']);
      setSuccessState({ isOpen: true, title: 'Success!', message: 'Dhikr importance created successfully.' });
      setModal(null);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to create entry'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => adminApi.updateDhikrImportance(id, data),
    onSuccess: () => {
      qc.invalidateQueries(['admin-dhikr-importances']);
      setSuccessState({ isOpen: true, title: 'Success!', message: 'Dhikr importance updated successfully.' });
      setModal(null);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to update entry'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminApi.deleteDhikrImportance(id),
    onSuccess: () => {
      qc.invalidateQueries(['admin-dhikr-importances']);
      setSuccessState({ isOpen: true, title: 'Deleted!', message: 'Entry removed successfully.' });
      setItemToDelete(null);
    },
    onError: (e) => {
      toast.error(e.response?.data?.error || 'Failed to delete entry');
      setItemToDelete(null);
    },
  });

  const handleSave = (form) => {
    if (!form.description?.malayalam?.trim()) {
      toast.error('Malayalam description is required');
      return;
    }
    if (modal === 'create') createMutation.mutate(form);
    else updateMutation.mutate({ id: modal.id, data: form });
  };

  const allItems = data?.dhikr_importances || [];
  const items = allItems.filter((item) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const t = item.title || {};
    return (
      (t.malayalam || '').toLowerCase().includes(q) ||
      (t.english   || '').toLowerCase().includes(q) ||
      (t.urdu      || '').toLowerCase().includes(q) ||
      item.description?.malayalam?.toLowerCase().includes(q) ||
      item.description?.english?.toLowerCase().includes(q) ||
      item.description?.urdu?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col min-h-0 gap-6">
      <div className="shrink-0 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 font-display flex items-center gap-3 tracking-tight">
            <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl shadow-sm border border-indigo-200/50">
              <Sparkles size={24} />
            </div>
            Dhikr Importance
          </h1>
          <p className="text-slate-500 text-sm mt-2 ml-1">Manage the {allItems.length} dhikr importance entries.</p>
        </div>
        <button
          onClick={() => setModal('create')}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-indigo-600 transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus size={18} /> Add Entry
        </button>
      </div>

      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by title or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white font-medium"
        />
      </div>
      </div>{/* end shrink-0 header */}

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-24">
          <div className="h-10 w-10 border-4 border-slate-200 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
          <p className="font-bold text-slate-500">Loading...</p>
        </div>
      ) : allItems.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-24 text-center">
          <Sparkles size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-xl font-bold text-slate-700 font-display mb-2">No Entries Yet</h3>
          <p className="text-slate-500 max-w-sm mx-auto">Add the first dhikr importance entry.</p>
          <button
            onClick={() => setModal('create')}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-50 text-indigo-600 font-bold text-sm rounded-xl border border-indigo-200 hover:bg-indigo-100 transition-colors"
          >
            <Plus size={16} /> Add First Entry
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          {items.length === 0 && (
            <p className="text-center text-slate-400 font-medium py-12">No entries match your search.</p>
          )}
          {items.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/80 text-slate-500 text-[10px] uppercase font-bold tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">Title</th>
                    <th className="px-6 py-4">Malayalam</th>
                    <th className="px-6 py-4">Descriptions</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {items.map((item) => (
                    <tr key={item.id} onClick={() => setViewItem(item)} className="hover:bg-slate-50/80 transition-colors group cursor-pointer">
                      <td className="px-6 py-4 max-w-[200px]">
                        <p className="text-slate-800 font-medium text-sm truncate">{item.title?.malayalam?.trim() || item.title?.english?.trim() || '—'}</p>
                        {item.title?.english?.trim() && item.title?.malayalam?.trim() && (
                          <p className="text-slate-400 text-xs truncate mt-0.5">{item.title.english}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <p className="text-slate-700 text-sm leading-relaxed truncate">
                          {item.description?.malayalam?.length > 80 ? item.description.malayalam.substring(0, 80) + '...' : item.description?.malayalam}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {item.description?.malayalam && <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold border bg-slate-100 text-slate-600 border-slate-200">ML</span>}
                          {item.description?.english && <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold border bg-slate-100 text-slate-600 border-slate-200">EN</span>}
                          {item.description?.urdu && <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold border bg-slate-100 text-slate-600 border-slate-200">UR</span>}
                          {!item.description?.malayalam && !item.description?.english && !item.description?.urdu && <span className="text-slate-400">—</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); setViewItem(item); }}
                            className="p-2 rounded-xl text-slate-400 bg-white border border-slate-100 hover:bg-slate-100 hover:text-indigo-600 transition-colors shadow-sm"
                            title="View"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setModal(item); }}
                            className="p-2 rounded-xl text-slate-400 bg-white border border-slate-100 hover:bg-slate-100 hover:text-indigo-600 transition-colors shadow-sm"
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
        title="Delete Dhikr Importance"
        message="Are you sure you want to delete this entry? This action cannot be undone."
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
