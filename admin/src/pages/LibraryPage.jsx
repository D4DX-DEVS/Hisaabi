import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, LibraryBig, Save, ChevronRight, Search } from 'lucide-react';
import { adminApi } from '../api/adminApi';
import ConfirmationModal from '../components/ConfirmationModal';
import SuccessModal from '../components/SuccessModal';

const EMPTY_CATEGORY = { name: '', name_malayalam: '', name_urdu: '', description: '', icon: '' };

function CategoryModal({ item, onClose, onSave }) {
  const [form, setForm] = useState(
    item
      ? {
          name: item.name ?? '',
          name_malayalam: item.name_malayalam ?? '',
          name_urdu: item.name_urdu ?? '',
          description: item.description ?? '',
          icon: item.icon ?? '',
        }
      : EMPTY_CATEGORY
  );
  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-fade-in" onClick={onClose} />
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-lg relative z-10 animate-slide-in-right flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-100 text-indigo-600 shadow-sm border border-indigo-200/50">
              {item ? <Pencil size={18} /> : <Plus size={18} />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 font-display">
                {item ? 'Edit Category' : 'New Library Category'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {item ? 'Update category details' : 'Create a new dynamic importance category'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors rounded-full p-2 hover:bg-slate-200">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
              Category Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium bg-slate-50 focus:bg-white transition-colors"
              value={form.name}
              onChange={set('name')}
              placeholder="e.g. Dua Importance"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Category Name (Malayalam)</label>
              <input
                type="text"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium bg-slate-50 focus:bg-white transition-colors"
                value={form.name_malayalam}
                onChange={set('name_malayalam')}
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Category Name (Urdu)</label>
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
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Description</label>
            <textarea
              rows={3}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium bg-slate-50 focus:bg-white transition-colors resize-none"
              value={form.description}
              onChange={set('description')}
              placeholder="Short description of this category"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Icon name (lucide-react)</label>
            <input
              type="text"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium bg-slate-50 focus:bg-white transition-colors"
              value={form.icon}
              onChange={set('icon')}
              placeholder="e.g. BookHeart, Sparkles, BookOpen"
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
            {item ? 'Save Changes' : 'Create Category'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function LibraryPage() {
  const qc       = useNavigate ? useQueryClient() : useQueryClient();
  const navigate  = useNavigate();
  const [modal, setModal]              = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [successState, setSuccessState] = useState({ isOpen: false, title: '', message: '' });
  const [search, setSearch]            = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-library-categories'],
    queryFn: () => adminApi.getLibraryCategories().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (d) => adminApi.createLibraryCategory(d),
    onSuccess: () => {
      qc.invalidateQueries(['admin-library-categories']);
      setSuccessState({ isOpen: true, title: 'Created!', message: 'Library category created successfully.' });
      setModal(null);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to create category'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => adminApi.updateLibraryCategory(id, data),
    onSuccess: () => {
      qc.invalidateQueries(['admin-library-categories']);
      setSuccessState({ isOpen: true, title: 'Updated!', message: 'Library category updated successfully.' });
      setModal(null);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to update category'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminApi.deleteLibraryCategory(id),
    onSuccess: () => {
      qc.invalidateQueries(['admin-library-categories']);
      setSuccessState({ isOpen: true, title: 'Deleted!', message: 'Category and all its entries removed.' });
      setItemToDelete(null);
    },
    onError: (e) => {
      toast.error(e.response?.data?.error || 'Failed to delete category');
      setItemToDelete(null);
    },
  });

  const handleSave = (form) => {
    if (!form.name?.trim()) { toast.error('Category name is required'); return; }
    if (modal === 'create') createMutation.mutate(form);
    else updateMutation.mutate({ id: modal.id, data: form });
  };

  const allCategories = data?.categories || [];
  const categories = allCategories.filter((cat) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (cat.name || '').toLowerCase().includes(q) || (cat.description || '').toLowerCase().includes(q);
  });

  return (
    <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col min-h-0 gap-6">
      {/* Page header */}
      <div className="shrink-0 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 font-display flex items-center gap-3 tracking-tight">
              <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl shadow-sm border border-indigo-200/50">
                <LibraryBig size={24} />
              </div>
              Library
            </h1>
            <p className="text-slate-500 text-sm mt-2 ml-1">
              Manage {allCategories.length} importance {allCategories.length === 1 ? 'category' : 'categories'}.
            </p>
          </div>
          <button
            onClick={() => setModal('create')}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-indigo-600 transition-colors shadow-sm self-start sm:self-auto"
          >
            <Plus size={18} /> New Category
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

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-24">
            <div className="h-10 w-10 border-4 border-slate-200 border-t-indigo-500 rounded-full animate-spin mb-4" />
            <p className="font-bold text-slate-500">Loading...</p>
          </div>
        ) : allCategories.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-24 text-center">
            <LibraryBig size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-bold text-slate-700 font-display mb-2">No Categories Yet</h3>
            <p className="text-slate-500 max-w-sm mx-auto">Create the first library category to start adding entries.</p>
            <button
              onClick={() => setModal('create')}
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-50 text-indigo-600 font-bold text-sm rounded-xl border border-indigo-200 hover:bg-indigo-100 transition-colors"
            >
              <Plus size={16} /> New Category
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            {categories.length === 0 && (
              <p className="text-center text-slate-400 font-medium py-12">No categories match your search.</p>
            )}
            {categories.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50/80 text-slate-500 text-[10px] uppercase font-bold tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4">Description</th>
                      <th className="px-6 py-4">Icon</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {categories.map((cat) => (
                      <tr
                        key={cat.id}
                        onClick={() => navigate(`/content/library/${cat.id}`)}
                        className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      >
                        <td className="px-6 py-4 min-w-[180px]">
                          <div className="flex items-center gap-2">
                            <p className="text-slate-800 font-semibold text-sm">{cat.name}</p>
                            <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-400 transition-colors" />
                          </div>
                          {cat.slug && <p className="text-slate-400 text-xs mt-0.5 font-mono">{cat.slug}</p>}
                        </td>
                        <td className="px-6 py-4 max-w-xs">
                          <p className="text-slate-500 text-sm truncate">{cat.description || '—'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-slate-400 text-xs font-mono">{cat.icon || '—'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
      </div>

      {modal && (
        <CategoryModal
          item={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      <ConfirmationModal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={() => deleteMutation.mutate(itemToDelete.id)}
        title="Delete Library Category"
        message={`Are you sure you want to delete "${itemToDelete?.name}"? All entries in this category will also be permanently deleted.`}
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
