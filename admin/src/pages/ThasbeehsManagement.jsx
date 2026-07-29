import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, Save, FileText, AlignLeft, Eye, Search, RotateCcw, Hash } from 'lucide-react';
import { adminApi } from '../api/adminApi';
import ConfirmationModal from '../components/ConfirmationModal';
import SuccessModal from '../components/SuccessModal';
import Pagination from '../components/Pagination';

const LIMIT = 20;

const EMPTY_DESC = { arabic: '', malayalam: '', english: '', urdu: '' };
const EMPTY = { title: '', title_malayalam: '', title_urdu: '', arabic_text: '', count: '', isCountless: false, malayalam: '', english: '', urdu: '', description: { ...EMPTY_DESC }, isQuranicFont: false, order: '' };

function Modal({ item, onClose, onSave }) {
  const [form, setForm] = useState(
    item
      ? { ...item, title_malayalam: item.title_malayalam || '', title_urdu: item.title_urdu || '', description: { ...EMPTY_DESC, ...(item.description || {}) }, isQuranicFont: item.isQuranicFont || false, isCountless: item.isCountless || false, order: item.order ?? '' }
      : EMPTY
  );
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const setDesc = (k) => (e) => setForm((p) => ({ ...p, description: { ...p.description, [k]: e.target.value } }));

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0">
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={onClose}
      />
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden transform transition-all w-full max-w-2xl relative z-10 animate-slide-in-right flex flex-col max-h-[90vh]">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-100 text-indigo-600 shadow-sm border border-indigo-200/50">
              {item ? <Pencil size={18} /> : <Plus size={18} />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 font-display">{item ? 'Edit Tasbeeh' : 'Add Tasbeeh'}</h2>
              <p className="text-xs text-slate-500 font-medium">{item ? 'Update tasbeeh content' : 'Add a new tasbeeh to the catalogue'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors rounded-full p-2 hover:bg-slate-200 focus:outline-none"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5">
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              <FileText size={14} /> Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium bg-slate-50 focus:bg-white transition-colors"
              value={form.title}
              onChange={set('title')}
              placeholder="e.g. Subhanallah"
            />
          </div>

          {/* Title translations (optional) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                <FileText size={14} /> Title (Malayalam)
              </label>
              <input
                type="text"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium bg-slate-50 focus:bg-white transition-colors"
                value={form.title_malayalam}
                onChange={set('title_malayalam')}
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                <FileText size={14} /> Title (Urdu)
              </label>
              <input
                type="text"
                dir="rtl"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-right font-arabic focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium bg-slate-50 focus:bg-white transition-colors"
                value={form.title_urdu}
                onChange={set('title_urdu')}
                placeholder="اختياري"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              <AlignLeft size={14} /> Arabic Text <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              dir="rtl"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xl leading-loose font-arabic focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-indigo-50/30 focus:bg-white transition-colors resize-none placeholder-slate-300"
              value={form.arabic_text}
              onChange={set('arabic_text')}
              placeholder="سُبْحَانَ اللّٰهِ"
            />
            <label className="flex items-center gap-3 mt-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.isQuranicFont}
                onChange={(e) => setForm((p) => ({ ...p, isQuranicFont: e.target.checked }))}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
              />
              <span className="text-sm font-bold text-slate-600">Use Quranic Font</span>
            </label>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              <FileText size={14} /> Count {!form.isCountless && <span className="text-red-500">*</span>}
            </label>
            <input
              type="number"
              min="1"
              disabled={form.isCountless}
              className={`w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium transition-colors ${form.isCountless ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-50 focus:bg-white'}`}
              value={form.isCountless ? '' : form.count}
              onChange={set('count')}
              placeholder={form.isCountless ? 'As much as you can' : 'e.g. 33'}
            />
            <label className="flex items-center gap-3 mt-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.isCountless}
                onChange={(e) => setForm((p) => ({ ...p, isCountless: e.target.checked, count: e.target.checked ? '' : p.count }))}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
              />
              <span className="text-sm font-bold text-slate-600">As much as you can (Countless)</span>
            </label>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-100">
            {[
              { key: 'malayalam', label: 'Malayalam' },
              { key: 'english', label: 'English' },
              { key: 'urdu', label: 'Urdu' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  {label}
                </label>
                <textarea
                  rows={3}
                  dir={key === 'urdu' ? 'rtl' : undefined}
                  className={`w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium bg-slate-50 focus:bg-white transition-colors resize-none${key === 'urdu' ? ' text-right font-arabic leading-relaxed' : ''}`}
                  value={form[key]}
                  onChange={set(key)}
                />
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <AlignLeft size={14} /> Description
            </p>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Arabic</label>
              <textarea
                rows={3}
                dir="rtl"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xl leading-loose font-arabic focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-indigo-50/30 focus:bg-white transition-colors resize-none placeholder-slate-300"
                value={form.description.arabic}
                onChange={setDesc('arabic')}
                placeholder="النص العربي..."
              />
            </div>
            <div className="space-y-4">
              {[
                { key: 'malayalam', label: 'Malayalam' },
                { key: 'english', label: 'English' },
                { key: 'urdu', label: 'Urdu' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">{label}</label>
                  <textarea
                    rows={3}
                    dir={key === 'urdu' ? 'rtl' : undefined}
                    className={`w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium bg-slate-50 focus:bg-white transition-colors resize-none${key === 'urdu' ? ' text-right font-arabic leading-relaxed' : ''}`}
                    value={form.description[key]}
                    onChange={setDesc(key)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Order */}
          <div className="pt-4 border-t border-slate-100">
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
        </div>

        <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
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
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white rounded-xl border border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-colors"
          >
            <Save size={16} />
            {item ? 'Save Changes' : 'Create Tasbeeh'}
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
              <RotateCcw size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 font-display">Tasbeeh Details</h2>
              <p className="text-xs text-slate-500 font-medium">Full content view</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors rounded-full p-2 hover:bg-slate-200 focus:outline-none">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          <div className="flex flex-wrap gap-6">
            <div className="flex-1 min-w-0">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Title</h3>
              <p className="text-lg font-bold text-slate-800">{item.title}</p>
            </div>
            {(item.isCountless || item.count != null) && (
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Count</h3>
                {item.isCountless ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-violet-50 text-violet-700 border border-violet-200">∞ As much as you can</span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">{item.count}</span>
                )}
              </div>
            )}
          </div>
          {item.arabic_text && (
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Arabic Text
                {item.isQuranicFont && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Quranic Font</span>}
              </h3>
              <div className="bg-indigo-50/30 p-4 rounded-xl border border-indigo-100/50">
                <p className={`text-right text-slate-800 text-2xl leading-[2.2] tracking-wide ${item.isQuranicFont ? 'font-quranic' : 'font-arabic'}`} dir="rtl">{item.arabic_text}</p>
              </div>
            </div>
          )}
          <div className="space-y-4 pt-2">
            {[{ key: 'malayalam', label: 'Malayalam' }, { key: 'english', label: 'English' }, { key: 'urdu', label: 'Urdu' }].map(({ key, label }) =>
              item[key] ? (
                <div key={key}>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</h3>
                  <p
                    dir={key === 'urdu' ? 'rtl' : undefined}
                    className={`text-slate-700 bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 text-sm leading-relaxed min-h-[80px] whitespace-pre-wrap${key === 'urdu' ? ' text-right font-arabic' : ''}`}
                  >
                    {item[key]}
                  </p>
                </div>
              ) : null
            )}
          </div>
          {item.description && (item.description.arabic || item.description.malayalam || item.description.english || item.description.urdu) && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Description</h3>
              {item.description.arabic && (
                <div className="bg-indigo-50/30 p-4 rounded-xl border border-indigo-100/50">
                  <p className="text-right text-slate-800 text-xl font-arabic leading-[2.2] tracking-wide" dir="rtl">{item.description.arabic}</p>
                </div>
              )}
              <div className="space-y-4">
                {[{ key: 'malayalam', label: 'Malayalam' }, { key: 'english', label: 'English' }, { key: 'urdu', label: 'Urdu' }].map(({ key, label }) =>
                  item.description[key] ? (
                    <div key={key}>
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</h4>
                      <p
                        dir={key === 'urdu' ? 'rtl' : undefined}
                        className={`text-slate-700 bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 text-sm leading-relaxed min-h-[80px] whitespace-pre-wrap${key === 'urdu' ? ' text-right font-arabic' : ''}`}
                      >
                        {item.description[key]}
                      </p>
                    </div>
                  ) : null
                )}
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

export default function ThasbeehsManagement() {
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
    queryKey: ['admin-thasbeehs', page, debouncedSearch],
    queryFn: () => adminApi.getThasbeehs({
      page,
      limit: LIMIT,
      ...(debouncedSearch && { search: debouncedSearch }),
    }).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (d) => adminApi.createTasbeeh(d),
    onSuccess: () => {
      qc.invalidateQueries(['admin-thasbeehs']);
      setSuccessState({ isOpen: true, title: 'Success!', message: 'Tasbeeh created successfully.' });
      setModal(null);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to create tasbeeh'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => adminApi.updateTasbeeh(id, data),
    onSuccess: () => {
      qc.invalidateQueries(['admin-thasbeehs']);
      setSuccessState({ isOpen: true, title: 'Success!', message: 'Tasbeeh updated successfully.' });
      setModal(null);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to update tasbeeh'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminApi.deleteTasbeeh(id),
    onSuccess: () => {
      qc.invalidateQueries(['admin-thasbeehs']);
      setSuccessState({ isOpen: true, title: 'Deleted!', message: 'Tasbeeh removed successfully.' });
      setItemToDelete(null);
    },
    onError: (e) => {
      toast.error(e.response?.data?.error || 'Failed to delete tasbeeh');
      setItemToDelete(null);
    },
  });

  const handleSave = (form) => {
    if (modal === 'create') createMutation.mutate(form);
    else updateMutation.mutate({ id: modal.id, data: form });
  };

  const thasbeehs = data?.thasbeehs || [];
  const total = data?.total ?? 0;
  const totalPages = data?.total_pages ?? 1;

  return (
    <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col min-h-0 gap-6">
      {/* Fixed header — never scrolls */}
      <div className="shrink-0 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 font-display flex items-center gap-3 tracking-tight">
            <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl shadow-sm border border-indigo-200/50">
              <RotateCcw size={24} />
            </div>
            Thasbeehs
          </h1>
          <p className="text-slate-500 text-sm mt-2 ml-1">
            {total > 0 ? `${total} thasbeehs in the catalogue` : 'Manage thasbeehs in the catalogue'}
          </p>
        </div>
        <button
          onClick={() => setModal('create')}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-indigo-600 transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus size={18} /> Add Tasbeeh
        </button>
      </div>

      {/* Search bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title or arabic text..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white font-medium"
          />
        </div>
      </div>
      </div>{/* end fixed header */}

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-24">
          <div className="h-10 w-10 border-4 border-slate-200 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
          <p className="font-bold text-slate-500">Loading thasbeehs...</p>
        </div>
      ) : !isLoading && thasbeehs.length === 0 && !debouncedSearch && page === 1 ? (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-24 text-center">
          <RotateCcw size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-xl font-bold text-slate-700 font-display mb-2">No Thasbeehs Yet</h3>
          <p className="text-slate-500 max-w-sm mx-auto">Add the first tasbeeh to the catalogue.</p>
          <button onClick={() => setModal('create')} className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-50 text-indigo-600 font-bold text-sm rounded-xl border border-indigo-200 hover:bg-indigo-100 transition-colors">
            <Plus size={16} /> Add First Tasbeeh
          </button>
        </div>
      ) : (
        <div className={`bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden transition-opacity ${isFetching && !isLoading ? 'opacity-70' : 'opacity-100'}`}>
          {thasbeehs.length === 0 ? (
            <p className="text-center text-slate-400 font-medium py-12">No thasbeehs match your search or filter.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/80 text-slate-500 text-[10px] uppercase font-bold tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-4 text-center w-16">Order</th>
                    <th className="px-6 py-4">Title</th>
                    <th className="px-6 py-4 text-right">Arabic Text</th>
                    <th className="px-6 py-4">Count</th>
                    <th className="px-6 py-4">Translations</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {thasbeehs.map((t) => (
                    <tr key={t.id} onClick={() => setViewItem(t)} className="hover:bg-slate-50/80 transition-colors group cursor-pointer">
                      <td className="px-4 py-4 text-center">
                        {t.order != null ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200">{t.order}</span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4"><span className="font-bold text-slate-800 text-base">{t.title}</span></td>
                      <td className="px-6 py-4 text-right">
                        {t.arabic_text ? <span className={`text-slate-700 text-lg leading-loose ${t.isQuranicFont ? 'font-quranic' : 'font-arabic'}`} dir="rtl">{t.arabic_text.length > 60 ? t.arabic_text.substring(0, 60) + '...' : t.arabic_text}</span> : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-6 py-4">
                        {t.isCountless ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-violet-50 text-violet-700 border border-violet-200">∞ Countless</span>
                        ) : t.count != null ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">{t.count}</span>
                        ) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {t.malayalam && <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold border bg-slate-100 text-slate-600 border-slate-200">ML</span>}
                          {t.english && <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold border bg-slate-100 text-slate-600 border-slate-200">EN</span>}
                          {t.urdu && <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold border bg-slate-100 text-slate-600 border-slate-200">UR</span>}
                          {!t.malayalam && !t.english && !t.urdu && <span className="text-slate-400">—</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => { e.stopPropagation(); setViewItem(t); }} className="p-2 rounded-xl text-slate-400 bg-white border border-slate-100 hover:bg-slate-100 hover:text-indigo-600 transition-colors shadow-sm" title="View"><Eye size={16} /></button>
                          <button onClick={(e) => { e.stopPropagation(); setModal(t); }} className="p-2 rounded-xl text-slate-400 bg-white border border-slate-100 hover:bg-slate-100 hover:text-indigo-600 transition-colors shadow-sm" title="Edit"><Pencil size={16} /></button>
                          <button onClick={(e) => { e.stopPropagation(); setItemToDelete(t); }} className="p-2 rounded-xl text-slate-400 bg-white border border-slate-100 hover:bg-red-50 hover:border-red-100 hover:text-red-600 transition-colors shadow-sm" title="Delete"><Trash2 size={16} /></button>
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
        title="Delete Tasbeeh"
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
