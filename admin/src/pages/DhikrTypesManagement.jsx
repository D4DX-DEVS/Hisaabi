import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, Sparkles, Save, FileText, AlignLeft, Eye, Search, Tag, ChevronDown, Hash } from 'lucide-react';
import { adminApi } from '../api/adminApi';
import ConfirmationModal from '../components/ConfirmationModal';
import SuccessModal from '../components/SuccessModal';
import Pagination from '../components/Pagination';

const LIMIT = 20;

const EMPTY = { name: '', name_malayalam: '', name_urdu: '', category: '', count: '', isCountless: false, arabic_text: '', malayalam: '', english: '', urdu: '', isQuranicFont: false, order: '' };

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
      ? { ...item, name_malayalam: item.name_malayalam || '', name_urdu: item.name_urdu || '', category: item.category?._id || item.category || '', count: item.count ?? '', isCountless: item.isCountless || false, isQuranicFont: item.isQuranicFont || false, order: item.order ?? '' }
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
    setForm((p) => ({ ...p, category: subs.length === 0 ? mainId : '' }));
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
            <div className="p-2 rounded-xl bg-indigo-100 text-indigo-600 shadow-sm border border-indigo-200/50">
              {item ? <Pencil size={18} /> : <Plus size={18} />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 font-display">{item ? 'Edit Dhikr Type' : 'Add Dhikr Type'}</h2>
              <p className="text-xs text-slate-500 font-medium">{item ? 'Update dhikr content' : 'Add a new dhikr type to the catalogue'}</p>
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
              <FileText size={14} /> Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium bg-slate-50 focus:bg-white transition-colors"
              value={form.name}
              onChange={set('name')}
              placeholder="e.g. subhanallah"
            />
          </div>

          {/* Name translations (optional) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                <FileText size={14} /> Name (Malayalam)
              </label>
              <input
                type="text"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium bg-slate-50 focus:bg-white transition-colors"
                value={form.name_malayalam}
                onChange={set('name_malayalam')}
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                <FileText size={14} /> Name (Urdu)
              </label>
              <input
                type="text"
                dir="rtl"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-right font-arabic focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium bg-slate-50 focus:bg-white transition-colors"
                value={form.name_urdu}
                onChange={set('name_urdu')}
                placeholder="اختياري"
              />
            </div>
          </div>

          {/* Category — two-level selection */}
          <div className="space-y-3">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <Tag size={14} /> Category
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
                  <option key={c._id || c.id} value={c._id || c.id}>{c.display_name}</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* Sub-category (only when main has sub-categories) */}
            {selectedMainCat && hasSubCategories && (
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">↳</div>
                <select
                  className="w-full appearance-none border border-indigo-200 rounded-xl px-4 py-3 pl-8 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium bg-indigo-50/40 focus:bg-white transition-colors pr-10"
                  value={form.category}
                  onChange={set('category')}
                >
                  <option value="">Select a sub-category...</option>
                  {subCategories.map((c) => (
                    <option key={c._id || c.id} value={c._id || c.id}>{c.display_name}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            )}

            {categories.length === 0 && (
              <p className="text-xs text-amber-600 font-medium">No categories found. Please add a dhikr category first.</p>
            )}
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              <FileText size={14} /> Count
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

          <div className="pt-4 border-t border-slate-100">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              <AlignLeft size={14} /> Arabic Text
            </label>
            <input
              type="text"
              dir="rtl"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xl font-arabic focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-indigo-50/30 focus:bg-white transition-colors placeholder-slate-300"
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
            {item ? 'Save Changes' : 'Create Type'}
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
              <h2 className="text-lg font-bold text-slate-800 font-display">Dhikr Type Details</h2>
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
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Name</h3>
              <p className="text-lg font-bold text-slate-800">{item.name}</p>
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

export default function DhikrTypesManagement() {
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
    queryKey: ['admin-dhikr-categories'],
    queryFn: () => adminApi.getDhikrCategories({ limit: 200 }).then((r) => r.data),
  });

  const categories = catData?.dhikr_categories || [];

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
    queryKey: ['admin-dhikr-types', page, filterCategory, debouncedSearch],
    queryFn: () => adminApi.getDhikrTypes({
      page,
      limit: LIMIT,
      ...(filterCategory && { category: filterCategory }),
      ...(debouncedSearch && { search: debouncedSearch }),
    }).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (d) => adminApi.createDhikrType(d),
    onSuccess: () => {
      qc.invalidateQueries(['admin-dhikr-types']);
      setSuccessState({ isOpen: true, title: 'Success!', message: 'Dhikr type created successfully.' });
      setModal(null);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to create dhikr type'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => adminApi.updateDhikrType(id, data),
    onSuccess: () => {
      qc.invalidateQueries(['admin-dhikr-types']);
      setSuccessState({ isOpen: true, title: 'Success!', message: 'Dhikr type updated successfully.' });
      setModal(null);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to update dhikr type'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminApi.deleteDhikrType(id),
    onSuccess: () => {
      qc.invalidateQueries(['admin-dhikr-types']);
      setSuccessState({ isOpen: true, title: 'Deleted!', message: 'Dhikr type removed successfully.' });
      setItemToDelete(null);
    },
    onError: (e) => {
      toast.error(e.response?.data?.error || 'Failed to delete dhikr type');
      setItemToDelete(null);
    },
  });

  const handleSave = (form) => {
    if (modal === 'create') createMutation.mutate(form);
    else updateMutation.mutate({ id: modal.id, data: form });
  };

  const handleMainChange = (val) => { setSelectedMain(val); setSelectedSub(''); setPage(1); };
  const handleSubChange = (val) => { setSelectedSub(val); setPage(1); };

  const types = data?.dhikr_types || [];
  const total = data?.total ?? 0;
  const totalPages = data?.total_pages ?? 1;
  const mainCategoriesForFilter = categories.filter((c) => !c.parent);

  return (
    <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col min-h-0 gap-6">
      {/* Fixed header — never scrolls */}
      <div className="shrink-0 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 font-display flex items-center gap-3 tracking-tight">
            <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl shadow-sm border border-indigo-200/50">
              <Sparkles size={24} />
            </div>
            Dhikr Types
          </h1>
          <p className="text-slate-500 text-sm mt-2 ml-1">
            {total > 0 ? `${total} dhikr types in the catalogue` : 'Manage dhikr types in the catalogue'}
          </p>
        </div>
        <button
          onClick={() => setModal('create')}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-indigo-600 transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus size={18} /> Add Dhikr Type
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search dhikr types..."
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
            {mainCategoriesForFilter.map((c) => (
              <option key={c._id || c.id} value={c._id || c.id}>{c.display_name}</option>
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
                <option key={c._id || c.id} value={c._id || c.id}>{c.display_name}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none" />
          </div>
        )}
      </div>
      </div>{/* end fixed header */}

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-24">
          <div className="h-10 w-10 border-4 border-slate-200 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
          <p className="font-bold text-slate-500">Loading dhikr types...</p>
        </div>
      ) : !isLoading && types.length === 0 && !debouncedSearch && !selectedMain && !selectedSub && page === 1 ? (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-24 text-center">
          <Sparkles size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-xl font-bold text-slate-700 font-display mb-2">No Dhikr Types Yet</h3>
          <p className="text-slate-500 max-w-sm mx-auto">Add the first dhikr type to the catalogue.</p>
          <button onClick={() => setModal('create')} className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-50 text-indigo-600 font-bold text-sm rounded-xl border border-indigo-200 hover:bg-indigo-100 transition-colors">
            <Plus size={16} /> Add First Type
          </button>
        </div>
      ) : (
        <div className={`bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden transition-opacity ${isFetching && !isLoading ? 'opacity-70' : 'opacity-100'}`}>
          {types.length === 0 ? (
            <p className="text-center text-slate-400 font-medium py-12">No dhikr types match your search or filter.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/80 text-slate-500 text-[10px] uppercase font-bold tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-4 text-center w-16">Order</th>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4 text-right">Arabic</th>
                    <th className="px-6 py-4">Count</th>
                    <th className="px-6 py-4">Translations</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {types.map((t) => (
                    <tr key={t.id} onClick={() => setViewItem(t)} className="hover:bg-slate-50/80 transition-colors group cursor-pointer">
                      <td className="px-4 py-4 text-center">
                        {t.order != null ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200">{t.order}</span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4"><span className="font-bold text-slate-800 text-base">{t.name}</span></td>
                      <td className="px-6 py-4">
                        {t.category ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200"><Tag size={10} />{t.category.display_name || t.category}</span>
                        ) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {t.arabic_text ? <span className={`text-slate-700 text-lg ${t.isQuranicFont ? 'font-quranic' : 'font-arabic'}`} dir="rtl">{t.arabic_text}</span> : <span className="text-slate-400">—</span>}
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
          categories={categories}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      <ConfirmationModal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={() => deleteMutation.mutate(itemToDelete.id)}
        title="Delete Dhikr Type"
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
