import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, Layers, Save, ChevronRight, Search, Hash, AlignLeft, Tag, Settings2, Eye } from 'lucide-react';
import { adminApi } from '../api/adminApi';
import ConfirmationModal from '../components/ConfirmationModal';
import SuccessModal from '../components/SuccessModal';

const VALID_FIELD_KEYS = [
  { key: 'title_malayalam',       label: 'Title (Malayalam)',        group: 'title' },
  { key: 'title_english',         label: 'Title (English)',           group: 'title' },
  { key: 'title_urdu',            label: 'Title (Urdu)',              group: 'title' },
  { key: 'description_malayalam', label: 'Description (Malayalam)',   group: 'desc' },
  { key: 'description_english',   label: 'Description (English)',     group: 'desc' },
  { key: 'description_urdu',      label: 'Description (Urdu)',        group: 'desc' },
  { key: 'arabic_text',           label: 'Arabic Text',               group: 'arabic' },
  { key: 'arabic_source',         label: 'Arabic Source',             group: 'arabic' },
  { key: 'translation_malayalam', label: 'Translation (Malayalam)',   group: 'translation' },
  { key: 'translation_english',   label: 'Translation (English)',     group: 'translation' },
  { key: 'translation_urdu',      label: 'Translation (Urdu)',        group: 'translation' },
  { key: 'count',                 label: 'Count (Number)',            group: 'other' },
  { key: 'reference_link',        label: 'Reference / Link',         group: 'other' },
];

const EMPTY = { name: '', name_malayalam: '', name_urdu: '', description: '', icon: '', order: '', fields: [], parentId: '' };

function CategoryModal({ item, categories, onClose, onSave }) {
  const [categoryType, setCategoryType] = useState(
    item ? (item.parentId ? 'sub' : 'main') : null
  );
  const [form, setForm] = useState(
    item
      ? {
          name:        item.name ?? '',
          name_malayalam: item.name_malayalam ?? '',
          name_urdu:      item.name_urdu ?? '',
          description: item.description ?? '',
          icon:        item.icon ?? '',
          order:       item.order ?? '',
          fields:      item.fields ?? [],
          parentId:    item.parentId?._id || item.parentId || '',
        }
      : EMPTY
  );
  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const toggleField = (key) => {
    setForm((p) => ({
      ...p,
      fields: p.fields.includes(key) ? p.fields.filter((f) => f !== key) : [...p.fields, key],
    }));
  };

  const groups = [
    { id: 'title',       label: 'Title Fields' },
    { id: 'desc',        label: 'Description Fields' },
    { id: 'arabic',      label: 'Arabic Fields' },
    { id: 'translation', label: 'Translation Fields' },
    { id: 'other',       label: 'Other Fields' },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-fade-in" onClick={onClose} />
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-xl relative z-10 animate-slide-in-right flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-100 text-indigo-600 shadow-sm border border-indigo-200/50">
              {item ? <Pencil size={18} /> : <Plus size={18} />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 font-display">
                {item ? 'Edit Special Category' : 'New Special Category'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {item ? 'Update category details and field configuration' : 'Configure which fields entries in this category will have'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors rounded-full p-2 hover:bg-slate-200">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
          {/* Category Type Selector */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Category Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'main', label: 'Main Category', desc: 'A top-level category' },
                { value: 'sub',  label: 'Sub Category',  desc: 'Nested inside a main category' },
              ].map(({ value, label, desc }) => (
                <label
                  key={value}
                  className={`flex flex-col gap-1 px-4 py-3 rounded-xl border-2 cursor-pointer transition-colors select-none ${
                    categoryType === value
                      ? 'bg-indigo-50 border-indigo-400 text-indigo-800'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="categoryType"
                    value={value}
                    checked={categoryType === value}
                    onChange={() => { setCategoryType(value); if (value === 'main') setForm((p) => ({ ...p, parentId: '' })); }}
                    className="sr-only"
                  />
                  <span className="text-sm font-bold">{label}</span>
                  <span className="text-xs text-slate-400 font-medium">{desc}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Parent Category dropdown — sub-categories only */}
          {categoryType === 'sub' && (
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                <Layers size={14} /> Parent Category <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium bg-slate-50 focus:bg-white transition-colors"
                value={form.parentId}
                onChange={(e) => setForm((p) => ({ ...p, parentId: e.target.value }))}
              >
                <option value="">Select parent category...</option>
                {(categories || [])
                  .filter((c) => !c.parentId && (c._id || c.id) !== (item?._id || item?.id))
                  .map((c) => (
                    <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>
                  ))}
              </select>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              <Tag size={14} /> Category Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium bg-slate-50 focus:bg-white transition-colors"
              value={form.name}
              onChange={set('name')}
              placeholder="e.g. Ninety Nine Names"
            />
          </div>

          {/* Name translations (optional) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Category Name (Malayalam)</label>
              <input
                type="text"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium bg-slate-50 focus:bg-white transition-colors"
                value={form.name_malayalam}
                onChange={set('name_malayalam')}
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Category Name (Urdu)</label>
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

          {/* Description */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              <AlignLeft size={14} /> Description
            </label>
            <textarea
              rows={2}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium bg-slate-50 focus:bg-white transition-colors resize-none"
              value={form.description}
              onChange={set('description')}
              placeholder="Short description..."
            />
          </div>

          {/* Icon + Order */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Icon (lucide-react)</label>
              <input
                type="text"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium bg-slate-50 focus:bg-white transition-colors"
                value={form.icon}
                onChange={set('icon')}
                placeholder="e.g. Star, Layers"
              />
            </div>
            <div className="w-32">
              <label className="flex items-center gap-1 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                <Hash size={12} /> Order
              </label>
              <input
                type="number"
                min="1"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium bg-slate-50 focus:bg-white transition-colors"
                value={form.order}
                onChange={set('order')}
                placeholder="1, 2..."
              />
            </div>
          </div>

          {/* Fields Configuration */}
          <div className="pt-4 border-t border-slate-100">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              <Settings2 size={14} /> Field Configuration
            </label>
            <p className="text-xs text-slate-400 mb-4">Select which fields entries in this category will have. Only selected fields will appear in entry forms.</p>
            <div className="space-y-4">
              {groups.map((group) => (
                <div key={group.id}>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{group.label}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {VALID_FIELD_KEYS.filter((f) => f.group === group.id).map((field) => (
                      <label
                        key={field.key}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors select-none ${
                          form.fields.includes(field.key)
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={form.fields.includes(field.key)}
                          onChange={() => toggleField(field.key)}
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 accent-indigo-600 cursor-pointer"
                        />
                        <span className="text-xs font-bold leading-tight">{field.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {form.fields.length === 0 && (
              <p className="text-xs text-amber-600 mt-2 font-medium">Select at least one field for entries.</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm">
            Cancel
          </button>
          <button
            onClick={() => onSave({ ...form, parentId: categoryType === 'sub' ? (form.parentId || null) : null })}
            disabled={!categoryType || (categoryType === 'sub' && !form.parentId)}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl shadow-sm transition-colors ${
              !categoryType || (categoryType === 'sub' && !form.parentId)
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            <Save size={16} />
            {item ? 'Save Changes' : 'Create Category'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Category View Modal ───────────────────────────────────────────────────────
function CategoryViewModal({ item, onClose }) {
  if (!item) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-fade-in" onClick={onClose} />
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-lg relative z-10 animate-slide-in-right flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-100 text-indigo-600 shadow-sm border border-indigo-200/50">
              <Layers size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 font-display">Category Details</h2>
              {item.slug && <p className="text-xs text-slate-400 font-mono mt-0.5">{item.slug}</p>}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors rounded-full p-2 hover:bg-slate-200">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5">
          {/* Name + Order */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Name</h3>
              <p className="text-xl font-bold text-slate-800">{item.name}</p>
            </div>
            {item.order != null && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold shrink-0">
                <Hash size={12} /> Order: {item.order}
              </span>
            )}
          </div>

          {/* Description */}
          {item.description && (
            <div>
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Description</h3>
              <p className="text-slate-700 text-sm leading-relaxed bg-slate-50 px-4 py-3 rounded-xl border border-slate-100">{item.description}</p>
            </div>
          )}

          {/* Icon */}
          {item.icon && (
            <div>
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Icon</h3>
              <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-sm font-mono font-bold">{item.icon}</span>
            </div>
          )}

          {/* Fields */}
          <div>
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Configured Fields ({(item.fields || []).length})
            </h3>
            {(item.fields || []).length === 0 ? (
              <p className="text-slate-400 text-sm">No fields configured.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {item.fields.map((f) => {
                  const meta = VALID_FIELD_KEYS.find((k) => k.key === f);
                  return (
                    <span key={f} className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {meta?.label || f.replace(/_/g, ' ')}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
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

export default function SpecialModelsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [successState, setSuccessState] = useState({ isOpen: false, title: '', message: '' });
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-special-categories'],
    queryFn: () => adminApi.getSpecialCategories().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (d) => adminApi.createSpecialCategory({ ...d, order: d.order !== '' ? d.order : null }),
    onSuccess: () => {
      qc.invalidateQueries(['admin-special-categories']);
      setSuccessState({ isOpen: true, title: 'Success!', message: 'Special category created successfully.' });
      setModal(null);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to create category'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => adminApi.updateSpecialCategory(id, { ...data, order: data.order !== '' ? data.order : null }),
    onSuccess: () => {
      qc.invalidateQueries(['admin-special-categories']);
      setSuccessState({ isOpen: true, title: 'Success!', message: 'Special category updated successfully.' });
      setModal(null);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to update category'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminApi.deleteSpecialCategory(id),
    onSuccess: () => {
      qc.invalidateQueries(['admin-special-categories']);
      setSuccessState({ isOpen: true, title: 'Deleted!', message: 'Category and all its entries have been removed.' });
      setItemToDelete(null);
    },
    onError: (e) => {
      toast.error(e.response?.data?.error || 'Failed to delete category');
      setItemToDelete(null);
    },
  });

  const handleSave = (form) => {
    if (modal === 'create') createMutation.mutate(form);
    else updateMutation.mutate({ id: modal._id || modal.id, data: form });
  };

  const categories = data?.categories || [];
  const q = search.trim().toLowerCase();

  // Build hierarchical display: each main category followed by its sub-categories
  const mainCategories = categories.filter((c) => !c.parentId);
  const subsByParent = categories.reduce((acc, c) => {
    if (c.parentId) {
      const pid = c.parentId._id || c.parentId;
      acc[pid] = acc[pid] || [];
      acc[pid].push(c);
    }
    return acc;
  }, {});
  const orderedDisplay = [];
  mainCategories.forEach((main) => {
    orderedDisplay.push({ ...main, _isSubCategory: false });
    (subsByParent[main._id || main.id] || []).forEach((sub) =>
      orderedDisplay.push({ ...sub, _isSubCategory: true })
    );
  });
  const filtered = q
    ? orderedDisplay.filter((c) => c.name?.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q))
    : orderedDisplay;

  return (
    <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col min-h-0 gap-6">
      <div className="shrink-0 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 font-display flex items-center gap-3 tracking-tight">
              <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl shadow-sm border border-indigo-200/50">
                <Layers size={24} />
              </div>
              Special Models
            </h1>
            <p className="text-slate-500 text-sm mt-2 ml-1">
              {categories.length} {categories.length === 1 ? 'category' : 'categories'}
            </p>
          </div>
          <button
            onClick={() => setModal('create')}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-indigo-600 transition-colors shadow-sm self-start sm:self-auto"
          >
            <Plus size={18} /> Add Category
          </button>
        </div>

        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white font-medium"
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-24">
            <div className="h-10 w-10 border-4 border-slate-200 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
            <p className="font-bold text-slate-500">Loading categories...</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-24 text-center">
            <Layers size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-bold text-slate-700 font-display mb-2">No Special Categories Yet</h3>
            <p className="text-slate-500 max-w-sm mx-auto">Create your first special category and configure its fields.</p>
            <button
              onClick={() => setModal('create')}
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-50 text-indigo-600 font-bold text-sm rounded-xl border border-indigo-200 hover:bg-indigo-100 transition-colors"
            >
              <Plus size={16} /> Add First Category
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            {filtered.length === 0 && (
              <p className="text-center text-slate-400 font-medium py-12">No categories match your search.</p>
            )}
            {filtered.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50/80 text-slate-500 text-[10px] uppercase font-bold tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-4 text-center w-16">Order</th>
                      <th className="px-6 py-4">Category Name</th>
                      <th className="px-6 py-4">Fields</th>
                      <th className="px-6 py-4">Description</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filtered.map((cat) => {
                      const catId = cat._id || cat.id;
                      return (
                        <tr
                          key={catId}
                          onClick={() => navigate(`/special-models/${catId}/entries`)}
                          className={`hover:bg-slate-50/80 transition-colors group cursor-pointer ${cat._isSubCategory ? 'bg-violet-50/20' : 'bg-white'}`}
                        >
                          <td className="px-4 py-4 text-center">
                            {cat.order != null ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200">{cat.order}</span>
                            ) : (
                              <span className="text-slate-300 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className={`flex items-center gap-2 ${cat._isSubCategory ? 'pl-5' : ''}`}>
                              {cat._isSubCategory && <span className="text-slate-300 font-bold text-sm select-none">└─</span>}
                              <span className={`font-bold text-base ${cat._isSubCategory ? 'text-slate-600' : 'text-slate-800'}`}>{cat.name}</span>
                              {cat.slug && (
                                <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{cat.slug}</span>
                              )}
                              {cat._isSubCategory && (
                                <span className="text-[10px] font-bold bg-violet-50 text-violet-600 border border-violet-200 px-1.5 py-0.5 rounded">sub</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1">
                              {(cat.fields || []).slice(0, 4).map((f) => (
                                <span key={f} className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-200">
                                  {f.replace(/_/g, ' ')}
                                </span>
                              ))}
                              {(cat.fields || []).length > 4 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                  +{cat.fields.length - 4}
                                </span>
                              )}
                              {(cat.fields || []).length === 0 && (
                                <span className="text-slate-400 text-xs">No fields configured</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-500 max-w-xs truncate">{cat.description || '—'}</td>
                          <td className="px-6 py-4">
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => { e.stopPropagation(); setViewItem(cat); }}
                                className="p-2 rounded-xl text-slate-400 bg-white border border-slate-100 hover:bg-indigo-50 hover:text-indigo-600 transition-colors shadow-sm"
                                title="View details"
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setModal(cat); }}
                                className="p-2 rounded-xl text-slate-400 bg-white border border-slate-100 hover:bg-slate-100 hover:text-indigo-600 transition-colors shadow-sm"
                                title="Edit"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setItemToDelete(cat); }}
                                className="p-2 rounded-xl text-slate-400 bg-white border border-slate-100 hover:bg-red-50 hover:border-red-100 hover:text-red-600 transition-colors shadow-sm"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); navigate(`/special-models/${catId}/entries`); }}
                                className="p-2 rounded-xl text-slate-400 bg-white border border-slate-100 hover:bg-indigo-50 hover:text-indigo-600 transition-colors shadow-sm"
                                title="View entries"
                              >
                                <ChevronRight size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {modal && (
        <CategoryModal
          item={modal === 'create' ? null : modal}
          categories={categories}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      {viewItem && (
        <CategoryViewModal item={viewItem} onClose={() => setViewItem(null)} />
      )}

      <ConfirmationModal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={() => deleteMutation.mutate(itemToDelete._id || itemToDelete.id)}
        title="Delete Special Category"
        message={`This will permanently delete "${itemToDelete?.name}" and ALL entries within it. This cannot be undone.`}
        confirmLabel="Delete Category"
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
