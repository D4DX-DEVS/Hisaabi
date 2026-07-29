import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, BookOpen, Save, AlignLeft, Eye, Search, Tag, ChevronDown, User, Hash } from 'lucide-react';
import { adminApi } from '../api/adminApi';
import ConfirmationModal from '../components/ConfirmationModal';
import SuccessModal from '../components/SuccessModal';
import Pagination from '../components/Pagination';

const LIMIT = 20;

const EMPTY = { arabic_text: '', english: '', malayalam: '', urdu: '', category: '', reported_by: '', isQuranicFont: false, order: '' };

function Modal({ item, categories, onClose, onSave }) {
  const mainCategories = categories.filter((c) => !c.parent);

  const getInitialMainCatId = () => {
    if (!item?.category) return '';
    const catId = item.category?._id || item.category || '';
    const cat = categories.find((c) => (c._id || c.id) === catId);
    if (!cat) return '';
    if (cat.parent) return cat.parent?._id || cat.parent?.id || cat.parent || '';
    return catId;
  };

  const [form, setForm] = useState(
    item
      ? { ...item, category: item.category?._id || item.category || '', isQuranicFont: item.isQuranicFont || false, order: item.order ?? '' }
      : EMPTY
  );
  const [selectedMainCat, setSelectedMainCat] = useState(getInitialMainCatId);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const getSubCategories = (mainId) =>
    mainId
      ? categories.filter((c) => {
          const pid = c.parent?._id || c.parent?.id || c.parent;
          return pid && (pid === mainId || pid.toString() === mainId.toString());
        })
      : [];

  const subCategories = getSubCategories(selectedMainCat);
  const hasSubCategories = subCategories.length > 0;

  const handleMainCatChange = (e) => {
    const mainId = e.target.value;
    setSelectedMainCat(mainId);
    const subs = getSubCategories(mainId);
    if (subs.length === 0) {
      setForm((p) => ({ ...p, category: mainId }));
    } else {
      setForm((p) => ({ ...p, category: '' }));
    }
  };

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
              <h2 className="text-lg font-bold text-slate-800 font-display">{item ? 'Edit Hadees' : 'Add Hadees'}</h2>
              <p className="text-xs text-slate-500 font-medium">{item ? 'Update hadees content' : 'Add a new hadees to the catalogue'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors rounded-full p-2 hover:bg-slate-200 focus:outline-none">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5">
          {/* Category — two-level selection */}
          <div className="space-y-3">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <Tag size={14} /> Category <span className="text-red-500">*</span>
            </label>

            {/* Main category */}
            <div className="relative">
              <select
                className="w-full appearance-none border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium bg-slate-50 focus:bg-white transition-colors pr-10"
                value={selectedMainCat}
                onChange={handleMainCatChange}
              >
                <option value="">Select a category...</option>
                {mainCategories.map((c) => (
                  <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* Sub-category */}
            {selectedMainCat && hasSubCategories && (
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">&#8627;</div>
                <select
                  className="w-full appearance-none border border-indigo-200 rounded-xl px-4 py-3 pl-8 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium bg-indigo-50/40 focus:bg-white transition-colors pr-10"
                  value={form.category}
                  onChange={set('category')}
                >
                  <option value="">Select a sub-category...</option>
                  {subCategories.map((c) => (
                    <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            )}

            {categories.length === 0 && (
              <p className="text-xs text-amber-600 font-medium">No categories found. Please add a hadees category first.</p>
            )}
          </div>

          {/* Arabic Text */}
          <div className="pt-4 border-t border-slate-100">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              <AlignLeft size={14} /> Arabic Text <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              dir="rtl"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xl leading-loose font-arabic focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-indigo-50/30 focus:bg-white transition-colors resize-y placeholder-slate-300"
              value={form.arabic_text}
              onChange={set('arabic_text')}
              placeholder="النص العربي..."
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

          {/* Reported By */}
          <div className="pt-4 border-t border-slate-100">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              <User size={14} /> Reported By
            </label>
            <input
              type="text"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium bg-slate-50 focus:bg-white transition-colors"
              value={form.reported_by}
              onChange={set('reported_by')}
              placeholder="e.g. Bukhari, Muslim"
            />
          </div>

          {/* Translations */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            {[
              { key: 'english', label: 'English' },
              { key: 'malayalam', label: 'Malayalam' },
              { key: 'urdu', label: 'Urdu' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  {label}
                </label>
                <textarea
                  rows={3}
                  dir={key === 'urdu' ? 'rtl' : undefined}
                  className={`w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium bg-slate-50 focus:bg-white transition-colors resize-y${key === 'urdu' ? ' text-right font-arabic leading-relaxed' : ''}`}
                  value={form[key]}
                  onChange={set(key)}
                />
              </div>
            ))}
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
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-colors"
          >
            <Save size={16} />
            {item ? 'Save Changes' : 'Create Hadees'}
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
              <BookOpen size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 font-display">Hadees Details</h2>
              <p className="text-xs text-slate-500 font-medium">Full content view</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors rounded-full p-2 hover:bg-slate-200 focus:outline-none">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          <div className="flex flex-wrap gap-6">
            {item.category && (
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Category</h3>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  <Tag size={11} />
                  {item.category.name || item.category}
                  {item.category.parent && (
                    <span className="text-indigo-400 font-normal">({item.category.parent?.name || ''})</span>
                  )}
                </span>
              </div>
            )}
            {item.reported_by && (
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Reported By</h3>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <User size={11} />
                  {item.reported_by}
                </span>
              </div>
            )}
          </div>
          {item.arabic_text && (
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Arabic Text
                {item.isQuranicFont && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Quranic Font</span>}
              </h3>
              <div className="bg-indigo-50/30 p-4 rounded-xl border border-indigo-100/50 resize-y overflow-auto min-h-[80px]">
                <p className={`text-right text-slate-800 text-2xl leading-[2.2] tracking-wide whitespace-pre-wrap ${item.isQuranicFont ? 'font-quranic' : 'font-arabic'}`} dir="rtl">{item.arabic_text}</p>
              </div>
            </div>
          )}
          <div className="space-y-4 pt-2">
            {[{ key: 'english', label: 'English' }, { key: 'malayalam', label: 'Malayalam' }, { key: 'urdu', label: 'Urdu' }].map(({ key, label }) =>
              item[key] ? (
                <div key={key}>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</h3>
                  <div
                    dir={key === 'urdu' ? 'rtl' : undefined}
                    className={`text-slate-700 bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 text-sm leading-relaxed min-h-[80px] whitespace-pre-wrap resize-y overflow-auto${key === 'urdu' ? ' text-right font-arabic' : ''}`}
                  >
                    {item[key]}
                  </div>
                </div>
              ) : null
            )}
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

export default function HadeesManagement() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [successState, setSuccessState] = useState({ isOpen: false, title: '', message: '' });
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedMain, setSelectedMain] = useState('');
  const [selectedSub, setSelectedSub] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data: catData } = useQuery({
    queryKey: ['admin-hadees-categories'],
    queryFn: () => adminApi.getHadeesCategories({ limit: 500 }).then((r) => r.data),
  });

  const categories = catData?.hadees_categories || [];
  const mainCategories = categories.filter((c) => !c.parent);
  const subCategoriesForMain = selectedMain
    ? categories.filter((c) => {
        const pid = c.parent?._id || c.parent?.id || c.parent;
        return pid === selectedMain;
      })
    : [];
  const hasSubsForMain = subCategoriesForMain.length > 0;

  const filterCategory = selectedSub
    ? selectedSub
    : selectedMain && !hasSubsForMain
    ? selectedMain
    : '';

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-hadees', page, filterCategory, debouncedSearch],
    queryFn: () => adminApi.getHadeesList({
      page,
      limit: LIMIT,
      ...(filterCategory && { category: filterCategory }),
      ...(debouncedSearch && { search: debouncedSearch }),
    }).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (d) => adminApi.createHadees(d),
    onSuccess: () => {
      qc.invalidateQueries(['admin-hadees']);
      setSuccessState({ isOpen: true, title: 'Success!', message: 'Hadees created successfully.' });
      setModal(null);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to create hadees'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => adminApi.updateHadees(id, data),
    onSuccess: () => {
      qc.invalidateQueries(['admin-hadees']);
      setSuccessState({ isOpen: true, title: 'Success!', message: 'Hadees updated successfully.' });
      setModal(null);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to update hadees'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminApi.deleteHadees(id),
    onSuccess: () => {
      qc.invalidateQueries(['admin-hadees']);
      setSuccessState({ isOpen: true, title: 'Deleted!', message: 'Hadees removed successfully.' });
      setItemToDelete(null);
    },
    onError: (e) => {
      toast.error(e.response?.data?.error || 'Failed to delete hadees');
      setItemToDelete(null);
    },
  });

  const handleSave = (form) => {
    if (modal === 'create') createMutation.mutate(form);
    else updateMutation.mutate({ id: modal.id, data: form });
  };

  const handleMainChange = (val) => { setSelectedMain(val); setSelectedSub(''); setPage(1); };
  const handleSubChange = (val) => { setSelectedSub(val); setPage(1); };

  const hadees = data?.hadees || [];
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
              <BookOpen size={24} />
            </div>
            Hadees
          </h1>
          <p className="text-slate-500 text-sm mt-2 ml-1">
            {total > 0 ? `${total} hadees in the catalogue` : 'Manage hadees in the catalogue'}
          </p>
        </div>
        <button
          onClick={() => setModal('create')}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-indigo-600 transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus size={18} /> Add Hadees
        </button>
      </div>

      {/* Search & Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by arabic text, english or reporter..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white font-medium"
          />
        </div>
        <div className="relative min-w-[200px]">
          <Tag size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <select
            value={selectedMain}
            onChange={(e) => handleMainChange(e.target.value)}
            className="w-full appearance-none pl-9 pr-8 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white font-medium"
          >
            <option value="">All Categories</option>
            {mainCategories.map((c) => (
              <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
        {selectedMain && hasSubsForMain && (
          <div className="relative min-w-[200px]">
            <ChevronDown size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-400" />
            <select
              value={selectedSub}
              onChange={(e) => handleSubChange(e.target.value)}
              className="w-full appearance-none pl-9 pr-8 py-2.5 border border-indigo-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-indigo-50 font-medium text-indigo-700"
            >
              <option value="">All Sub-categories</option>
              {subCategoriesForMain.map((c) => (
                <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none" />
          </div>
        )}
      </div>
      </div>{/* end fixed header */}

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-24">
          <div className="h-10 w-10 border-4 border-slate-200 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
          <p className="font-bold text-slate-500">Loading hadees...</p>
        </div>
      ) : !isLoading && hadees.length === 0 && !debouncedSearch && !selectedMain && !selectedSub && page === 1 ? (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-24 text-center">
          <BookOpen size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-xl font-bold text-slate-700 font-display mb-2">No Hadees Yet</h3>
          <p className="text-slate-500 max-w-sm mx-auto">Add the first hadees to the catalogue.</p>
          <button
            onClick={() => setModal('create')}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-50 text-indigo-600 font-bold text-sm rounded-xl border border-indigo-200 hover:bg-indigo-100 transition-colors"
          >
            <Plus size={16} /> Add First Hadees
          </button>
        </div>
      ) : (
        <div className={`bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden transition-opacity ${isFetching && !isLoading ? 'opacity-70' : 'opacity-100'}`}>
          {hadees.length === 0 ? (
            <p className="text-center text-slate-400 font-medium py-12">No hadees match your search or filter.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/80 text-slate-500 text-[10px] uppercase font-bold tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-4 text-center w-16">Order</th>
                    <th className="px-6 py-4 text-right">Arabic Text</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Reported By</th>
                    <th className="px-6 py-4">Translations</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {hadees.map((h) => (
                    <tr key={h.id} onClick={() => setViewItem(h)} className="hover:bg-slate-50/80 transition-colors group cursor-pointer">
                      <td className="px-4 py-4 text-center">
                        {h.order != null ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200">{h.order}</span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {h.arabic_text ? (
                          <span className={`text-slate-700 text-lg leading-loose ${h.isQuranicFont ? 'font-quranic' : 'font-arabic'}`} dir="rtl">
                            {h.arabic_text.length > 60 ? h.arabic_text.substring(0, 60) + '...' : h.arabic_text}
                          </span>
                        ) : <span className="text-slate-400">&mdash;</span>}
                      </td>
                      <td className="px-6 py-4">
                        {h.category ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <Tag size={10} />
                            {h.category.name || h.category}
                          </span>
                        ) : (
                          <span className="text-slate-400">&mdash;</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {h.reported_by ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <User size={10} />
                            {h.reported_by}
                          </span>
                        ) : <span className="text-slate-400">&mdash;</span>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {h.english && <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold border bg-slate-100 text-slate-600 border-slate-200">EN</span>}
                          {h.malayalam && <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold border bg-slate-100 text-slate-600 border-slate-200">ML</span>}
                          {h.urdu && <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold border bg-slate-100 text-slate-600 border-slate-200">UR</span>}
                          {!h.english && !h.malayalam && !h.urdu && <span className="text-slate-400">&mdash;</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => { e.stopPropagation(); setViewItem(h); }} className="p-2 rounded-xl text-slate-400 bg-white border border-slate-100 hover:bg-slate-100 hover:text-indigo-600 transition-colors shadow-sm" title="View"><Eye size={16} /></button>
                          <button onClick={(e) => { e.stopPropagation(); setModal(h); }} className="p-2 rounded-xl text-slate-400 bg-white border border-slate-100 hover:bg-slate-100 hover:text-indigo-600 transition-colors shadow-sm" title="Edit"><Pencil size={16} /></button>
                          <button onClick={(e) => { e.stopPropagation(); setItemToDelete(h); }} className="p-2 rounded-xl text-slate-400 bg-white border border-slate-100 hover:bg-red-50 hover:border-red-100 hover:text-red-600 transition-colors shadow-sm" title="Delete"><Trash2 size={16} /></button>
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
          categories={categories}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      <ConfirmationModal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={() => deleteMutation.mutate(itemToDelete.id)}
        title="Delete Hadees"
        message={`Are you sure you want to delete this hadees? This action cannot be undone.`}
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
