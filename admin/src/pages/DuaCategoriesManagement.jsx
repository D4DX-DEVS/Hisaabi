import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, Tag, Save, AlignLeft, Search, ChevronDown, ChevronRight, FolderOpen, Folder, Hash } from 'lucide-react';
import { adminApi } from '../api/adminApi';
import ConfirmationModal from '../components/ConfirmationModal';
import SuccessModal from '../components/SuccessModal';

const EMPTY = { name: '', name_malayalam: '', name_urdu: '', description: '', parent: '', order: '' };

function Modal({ item, mainCategories, defaultParent, onClose, onSave }) {
  const isEdit = !!item;
  const initialParent = item?.parent?._id || item?.parent || defaultParent || '';
  const [form, setForm] = useState(
    item
      ? {
          name: item.name || '',
          name_malayalam: item.name_malayalam || '',
          name_urdu: item.name_urdu || '',
          description: item.description || '',
          parent: initialParent,
          order: item.order ?? '',
        }
      : { ...EMPTY, parent: defaultParent || '' }
  );
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const isSubCategory = !!form.parent;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-fade-in" onClick={onClose} />
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden transform transition-all w-full max-w-lg relative z-10 animate-slide-in-right flex flex-col max-h-[90vh]">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-100 text-indigo-600 shadow-sm border border-indigo-200/50">
              {isEdit ? <Pencil size={18} /> : <Plus size={18} />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 font-display">
                {isEdit ? 'Edit Category' : (form.parent ? 'Add Sub-category' : 'Add Category')}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {isEdit ? 'Update category details' : (form.parent ? 'Add a sub-category under a main category' : 'Add a new main dua category')}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors rounded-full p-2 hover:bg-slate-200 focus:outline-none">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5">
          {/* Category type toggle */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Category Type</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForm(p => ({ ...p, parent: '' }))}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-colors ${!form.parent ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
              >
                <Folder size={15} /> Main Category
              </button>
              <button
                type="button"
                onClick={() => setForm(p => ({ ...p, parent: mainCategories[0]?._id || mainCategories[0]?.id || '' }))}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-colors ${form.parent ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
              >
                <FolderOpen size={15} /> Sub-category
              </button>
            </div>
          </div>

          {/* Parent selector (only for sub-categories) */}
          {isSubCategory && (
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                <Tag size={14} /> Parent Category <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  className="w-full appearance-none border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium bg-slate-50 focus:bg-white transition-colors pr-10"
                  value={form.parent}
                  onChange={set('parent')}
                >
                  <option value="">Select parent category...</option>
                  {mainCategories.map((c) => (
                    <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
              {mainCategories.length === 0 && (
                <p className="text-xs text-amber-600 mt-1 font-medium">No main categories found. Create a main category first.</p>
              )}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              <Tag size={14} /> Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium bg-slate-50 focus:bg-white transition-colors"
              value={form.name}
              onChange={set('name')}
              placeholder={form.parent ? 'e.g. Morning, Evening...' : 'e.g. Daily Duas'}
            />
          </div>

          {/* Name translations (optional) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                <Tag size={14} /> Name (Malayalam)
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
                <Tag size={14} /> Name (Urdu)
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

          {/* Description */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              <AlignLeft size={14} /> Description
            </label>
            <textarea
              rows={3}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium bg-slate-50 focus:bg-white transition-colors resize-none"
              value={form.description}
              onChange={set('description')}
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
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white rounded-xl border border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm">
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-colors"
          >
            <Save size={16} />
            {isEdit ? 'Save Changes' : (form.parent ? 'Create Sub-category' : 'Create Category')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function DuaCategoriesManagement() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);
  const [defaultParent, setDefaultParent] = useState('');
  const [itemToDelete, setItemToDelete] = useState(null);
  const [successState, setSuccessState] = useState({ isOpen: false, title: '', message: '' });
  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ['admin-dua-categories'],
    queryFn: () => adminApi.getDuaCategories({ limit: 500 }).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (d) => adminApi.createDuaCategory({ ...d, parent: d.parent || null }),
    onSuccess: () => {
      qc.invalidateQueries(['admin-dua-categories']);
      setSuccessState({ isOpen: true, title: 'Success!', message: 'Category created successfully.' });
      setModal(null);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to create category'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => adminApi.updateDuaCategory(id, { ...data, parent: data.parent || null }),
    onSuccess: () => {
      qc.invalidateQueries(['admin-dua-categories']);
      setSuccessState({ isOpen: true, title: 'Success!', message: 'Category updated successfully.' });
      setModal(null);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to update category'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminApi.deleteDuaCategory(id),
    onSuccess: () => {
      qc.invalidateQueries(['admin-dua-categories']);
      setSuccessState({ isOpen: true, title: 'Deleted!', message: 'Category removed successfully.' });
      setItemToDelete(null);
    },
    onError: (e) => {
      toast.error(e.response?.data?.error || 'Failed to delete category');
      setItemToDelete(null);
    },
  });

  const handleSave = (form) => {
    if (modal === 'create') createMutation.mutate(form);
    else updateMutation.mutate({ id: modal.id, data: form });
  };

  const openAddSub = (mainCatId) => {
    setDefaultParent(mainCatId);
    setModal('create');
  };

  const openEdit = (item) => {
    setDefaultParent('');
    setModal(item);
  };

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const allCategories = data?.dua_categories || [];
  const mainCategories = allCategories.filter((c) => !c.parent);
  const getSubCategories = (mainId) =>
    allCategories.filter((c) => {
      const pid = c.parent?._id || c.parent?.id || c.parent;
      return pid === mainId;
    });

  const q = search.trim().toLowerCase();
  const filteredMain = q
    ? mainCategories.filter(
        (c) => c.name?.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q)
      )
    : mainCategories;

  return (
    <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col min-h-0 gap-6">
      {/* Fixed header — never scrolls */}
      <div className="shrink-0 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 font-display flex items-center gap-3 tracking-tight">
            <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl shadow-sm border border-indigo-200/50">
              <Tag size={24} />
            </div>
            Dua Categories
          </h1>
          <p className="text-slate-500 text-sm mt-2 ml-1">
            {mainCategories.length} main {mainCategories.length === 1 ? 'category' : 'categories'},{' '}
            {allCategories.length - mainCategories.length} sub-categories
          </p>
        </div>
        <button
          onClick={() => { setDefaultParent(''); setModal('create'); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-indigo-600 transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus size={18} /> Add Category
        </button>
      </div>

      {/* Search */}
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
      </div>{/* end fixed header */}

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-24">
          <div className="h-10 w-10 border-4 border-slate-200 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
          <p className="font-bold text-slate-500">Loading categories...</p>
        </div>
      ) : mainCategories.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-24 text-center">
          <Tag size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-xl font-bold text-slate-700 font-display mb-2">No Categories Yet</h3>
          <p className="text-slate-500 max-w-sm mx-auto">Add the first dua category to get started.</p>
          <button
            onClick={() => { setDefaultParent(''); setModal('create'); }}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-50 text-indigo-600 font-bold text-sm rounded-xl border border-indigo-200 hover:bg-indigo-100 transition-colors"
          >
            <Plus size={16} /> Add First Category
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          {filteredMain.length === 0 && (
            <p className="text-center text-slate-400 font-medium py-12">No categories match your search.</p>
          )}
          {filteredMain.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/80 text-slate-500 text-[10px] uppercase font-bold tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-4 text-center w-16">Order</th>
                    <th className="px-6 py-4">Category Name</th>
                    <th className="px-6 py-4">Sub-categories</th>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredMain.map((cat) => {
                    const subs = getSubCategories(cat._id || cat.id);
                    const isExpanded = expandedIds.has(cat._id || cat.id);
                    const catId = cat._id || cat.id;
                    return (
                      <>
                        {/* Main category row */}
                        <tr key={catId} className="hover:bg-slate-50/80 transition-colors group bg-white">
                          <td className="px-4 py-4 text-center">
                            {cat.order != null ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200">{cat.order}</span>
                            ) : (
                              <span className="text-slate-300 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {subs.length > 0 ? (
                                <button
                                  onClick={() => toggleExpand(catId)}
                                  className="text-slate-400 hover:text-indigo-600 transition-colors p-0.5 rounded"
                                >
                                  {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                                </button>
                              ) : (
                                <span className="w-5 h-5 inline-flex items-center justify-center text-slate-300">
                                  <Folder size={14} />
                                </span>
                              )}
                              <span className="font-bold text-slate-800 text-base">{cat.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {subs.length > 0 ? (
                              <button
                                onClick={() => toggleExpand(catId)}
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors"
                              >
                                {subs.length} sub-{subs.length === 1 ? 'category' : 'categories'}
                              </button>
                            ) : (
                              <span className="text-slate-400 text-xs">No sub-categories</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-slate-500 max-w-xs truncate">{cat.description || '—'}</td>
                          <td className="px-6 py-4">
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => openAddSub(catId)}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-colors shadow-sm"
                                title="Add sub-category"
                              >
                                <Plus size={12} /> Sub
                              </button>
                              <button
                                onClick={() => openEdit(cat)}
                                className="p-2 rounded-xl text-slate-400 bg-white border border-slate-100 hover:bg-slate-100 hover:text-indigo-600 transition-colors shadow-sm"
                                title="Edit"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                onClick={() => setItemToDelete(cat)}
                                className="p-2 rounded-xl text-slate-400 bg-white border border-slate-100 hover:bg-red-50 hover:border-red-100 hover:text-red-600 transition-colors shadow-sm"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Sub-category rows */}
                        {isExpanded && subs.map((sub) => (
                          <tr key={sub._id || sub.id} className="bg-indigo-50/30 hover:bg-indigo-50/60 transition-colors group border-t border-indigo-100/50">
                            <td className="px-6 py-3 pl-14">
                              <div className="flex items-center gap-2">
                                <span className="text-indigo-300">↳</span>
                                <span className="font-semibold text-slate-700">{sub.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-3">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-600 border border-indigo-200">
                                Sub-category
                              </span>
                            </td>
                            <td className="px-6 py-3 text-slate-500 max-w-xs truncate text-sm">{sub.description || '—'}</td>
                            <td className="px-6 py-3">
                              <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => openEdit(sub)}
                                  className="p-2 rounded-xl text-slate-400 bg-white border border-slate-100 hover:bg-slate-100 hover:text-indigo-600 transition-colors shadow-sm"
                                  title="Edit"
                                >
                                  <Pencil size={16} />
                                </button>
                                <button
                                  onClick={() => setItemToDelete(sub)}
                                  className="p-2 rounded-xl text-slate-400 bg-white border border-slate-100 hover:bg-red-50 hover:border-red-100 hover:text-red-600 transition-colors shadow-sm"
                                  title="Delete"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </>
                    );
                  })}
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
          mainCategories={mainCategories}
          defaultParent={modal === 'create' ? defaultParent : undefined}
          onClose={() => { setModal(null); setDefaultParent(''); }}
          onSave={handleSave}
        />
      )}

      <ConfirmationModal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={() => deleteMutation.mutate(itemToDelete.id)}
        title="Delete Category"
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
    </div>
  );
}
