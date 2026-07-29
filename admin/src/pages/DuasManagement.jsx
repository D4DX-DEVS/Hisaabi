import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, BookHeart, Save, FileText, AlignLeft, Eye, Search, Tag, ChevronDown, Layers, Hash } from 'lucide-react';
import { adminApi } from '../api/adminApi';
import ConfirmationModal from '../components/ConfirmationModal';
import SuccessModal from '../components/SuccessModal';
import Pagination from '../components/Pagination';

const LIMIT = 30;

const EMPTY_DESC = { arabic: '', malayalam: '', english: '', urdu: '' };
const EMPTY = { title: '', title_malayalam: '', title_urdu: '', arabic_text: '', category: '', count: '', isCountless: false, malayalam: '', english: '', urdu: '', description: { ...EMPTY_DESC }, additional_categories: [], isQuranicFont: false, order: '' };

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

  const getInitialAdditionalCats = () => {
    if (!item?.additional_categories) return [];
    return item.additional_categories.map((c) => c?._id || c?.id || c || '').filter(Boolean);
  };

  const [form, setForm] = useState(
    item
      ? { ...item, title_malayalam: item.title_malayalam || '', title_urdu: item.title_urdu || '', category: item.category?._id || item.category || '', description: { ...EMPTY_DESC, ...(item.description || {}) }, additional_categories: getInitialAdditionalCats(), isQuranicFont: item.isQuranicFont || false, isCountless: item.isCountless || false, order: item.order ?? '' }
      : EMPTY
  );
  const [selectedMainCat, setSelectedMainCat] = useState(getInitialMainCatId);
  const [isCommon, setIsCommon] = useState(() => !!(item?.additional_categories?.length));

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const setDesc = (k) => (e) => setForm((p) => ({ ...p, description: { ...p.description, [k]: e.target.value } }));

  const getSubCategories = (mainId) =>
    mainId
      ? categories.filter((c) => {
          const pid = c.parent?._id || c.parent?.id || c.parent;
          return pid && (pid === mainId || pid.toString() === mainId.toString());
        })
      : [];

  const subCategories = getSubCategories(selectedMainCat);
  const hasSubCategories = subCategories.length > 0;

  // Sub-categories excluding the currently selected primary one
  const otherSubCategories = subCategories.filter((c) => {
    const cId = c._id || c.id;
    return cId !== form.category;
  });

  const handleMainCatChange = (e) => {
    const mainId = e.target.value;
    setSelectedMainCat(mainId);
    const subs = getSubCategories(mainId);
    if (subs.length === 0) {
      setForm((p) => ({ ...p, category: mainId, additional_categories: [] }));
    } else {
      setForm((p) => ({ ...p, category: '', additional_categories: [] }));
    }
    setIsCommon(false);
  };

  const handlePrimarySubCatChange = (e) => {
    const newPrimary = e.target.value;
    setForm((p) => ({
      ...p,
      category: newPrimary,
      // Remove new primary from additional_categories if it was there
      additional_categories: p.additional_categories.filter((id) => id !== newPrimary),
    }));
  };

  const handleAdditionalCatToggle = (catId) => {
    setForm((p) => {
      const exists = p.additional_categories.includes(catId);
      return {
        ...p,
        additional_categories: exists
          ? p.additional_categories.filter((id) => id !== catId)
          : [...p.additional_categories, catId],
      };
    });
  };

  const handleIsCommonToggle = () => {
    setIsCommon((prev) => {
      if (prev) setForm((p) => ({ ...p, additional_categories: [] }));
      return !prev;
    });
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
              <h2 className="text-lg font-bold text-slate-800 font-display">{item ? 'Edit Dua' : 'Add Dua'}</h2>
              <p className="text-xs text-slate-500 font-medium">{item ? 'Update dua content' : 'Add a new dua to the catalogue'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors rounded-full p-2 hover:bg-slate-200 focus:outline-none">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5">
          {/* Title */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              <FileText size={14} /> Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium bg-slate-50 focus:bg-white transition-colors"
              value={form.title}
              onChange={set('title')}
              placeholder="e.g. Dua before eating"
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

            {/* Sub-category (only shown when main category has sub-categories) */}
            {selectedMainCat && hasSubCategories && (
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">↳</div>
                <select
                  className="w-full appearance-none border border-indigo-200 rounded-xl px-4 py-3 pl-8 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium bg-indigo-50/40 focus:bg-white transition-colors pr-10"
                  value={form.category}
                  onChange={handlePrimarySubCatChange}
                >
                  <option value="">Select a sub-category...</option>
                  {subCategories.map((c) => (
                    <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            )}

            {/* Common dua checkbox — only show when a primary sub-category is selected and other subs exist */}
            {selectedMainCat && hasSubCategories && form.category && otherSubCategories.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isCommon}
                    onChange={handleIsCommonToggle}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
                  />
                  <div className="flex items-center gap-2">
                    <Layers size={14} className="text-indigo-500" />
                    <span className="text-sm font-bold text-slate-700">This dua appears in multiple sub-categories</span>
                  </div>
                </label>

                {isCommon && (
                  <div className="pl-7 space-y-2">
                    <p className="text-xs text-slate-500 font-medium mb-2">Select the additional sub-categories for this dua:</p>
                    {otherSubCategories.map((c) => {
                      const cId = c._id || c.id;
                      const checked = form.additional_categories.includes(cId);
                      return (
                        <label key={cId} className="flex items-center gap-3 cursor-pointer select-none group">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleAdditionalCatToggle(cId)}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
                          />
                          <span className={`text-sm font-medium transition-colors ${checked ? 'text-indigo-700' : 'text-slate-600 group-hover:text-slate-800'}`}>
                            {c.name}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {categories.length === 0 && (
              <p className="text-xs text-amber-600 font-medium">No categories found. Please add a dua category first.</p>
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
              placeholder="البسملة..."
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

          {/* Count */}
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

          {/* Translations */}
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
                  className={`w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium bg-slate-50 focus:bg-white transition-colors resize-y${key === 'urdu' ? ' text-right font-arabic leading-relaxed' : ''}`}
                  value={form[key]}
                  onChange={set(key)}
                />
              </div>
            ))}
          </div>

          {/* Description */}
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <AlignLeft size={14} /> Description
            </p>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Arabic</label>
              <textarea
                rows={3}
                dir="rtl"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xl leading-loose font-arabic focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-indigo-50/30 focus:bg-white transition-colors resize-y placeholder-slate-300"
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
                    className={`w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium bg-slate-50 focus:bg-white transition-colors resize-y${key === 'urdu' ? ' text-right font-arabic leading-relaxed' : ''}`}
                    value={form.description[key]}
                    onChange={setDesc(key)}
                  />
                </div>
              ))}
            </div>
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
            {item ? 'Save Changes' : 'Create Dua'}
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
              <BookHeart size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 font-display">Dua Details</h2>
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
            {item.category && (
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  {item.additional_categories?.length ? 'Primary Category' : 'Category'}
                </h3>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  <Tag size={11} />
                  {item.category.name || item.category}
                  {item.category.parent && (
                    <span className="text-indigo-400 font-normal">({item.category.parent?.name || ''})</span>
                  )}
                </span>
                {item.additional_categories?.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Also in</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {item.additional_categories.map((ac) => {
                        const acId = ac?._id || ac?.id || ac;
                        const acName = ac?.name || acId;
                        return (
                          <span key={acId} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-violet-50 text-violet-700 border border-violet-200">
                            <Layers size={10} />
                            {acName}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
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
              <div className="bg-indigo-50/30 p-4 rounded-xl border border-indigo-100/50 resize-y overflow-auto min-h-[80px]">
                <p className={`text-right text-slate-800 text-2xl leading-[2.2] tracking-wide whitespace-pre-wrap ${item.isQuranicFont ? 'font-quranic' : 'font-arabic'}`} dir="rtl">{item.arabic_text}</p>
              </div>
            </div>
          )}
          <div className="space-y-4 pt-2">
            {[{ key: 'malayalam', label: 'Malayalam' }, { key: 'english', label: 'English' }, { key: 'urdu', label: 'Urdu' }].map(({ key, label }) =>
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
          {item.description && (item.description.arabic || item.description.malayalam || item.description.english || item.description.urdu) && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Description</h3>
              {item.description.arabic && (
                <div className="bg-indigo-50/30 p-4 rounded-xl border border-indigo-100/50 resize-y overflow-auto min-h-[80px]">
                  <p className="text-right text-slate-800 text-xl font-arabic leading-[2.2] tracking-wide whitespace-pre-wrap" dir="rtl">{item.description.arabic}</p>
                </div>
              )}
              <div className="space-y-4">
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

export default function DuasManagement() {
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
    queryKey: ['admin-dua-categories'],
    queryFn: () => adminApi.getDuaCategories({ limit: 500 }).then((r) => r.data),
  });

  const categories = catData?.dua_categories || [];
  const mainCategories = categories.filter((c) => !c.parent);
  const subCategoriesForMain = selectedMain
    ? categories.filter((c) => {
        const pid = c.parent?._id || c.parent?.id || c.parent;
        return pid === selectedMain;
      })
    : [];
  const hasSubsForMain = subCategoriesForMain.length > 0;

  // Actual category ID to send to API
  const filterCategory = selectedSub
    ? selectedSub
    : selectedMain && !hasSubsForMain
    ? selectedMain
    : '';

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-duas', page, filterCategory, debouncedSearch],
    queryFn: () => adminApi.getDuas({
      page,
      limit: LIMIT,
      ...(filterCategory && { category: filterCategory }),
      ...(debouncedSearch && { search: debouncedSearch }),
    }).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (d) => adminApi.createDua(d),
    onSuccess: () => {
      qc.invalidateQueries(['admin-duas']);
      setSuccessState({ isOpen: true, title: 'Success!', message: 'Dua created successfully.' });
      setModal(null);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to create dua'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => adminApi.updateDua(id, data),
    onSuccess: () => {
      qc.invalidateQueries(['admin-duas']);
      setSuccessState({ isOpen: true, title: 'Success!', message: 'Dua updated successfully.' });
      setModal(null);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to update dua'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminApi.deleteDua(id),
    onSuccess: () => {
      qc.invalidateQueries(['admin-duas']);
      setSuccessState({ isOpen: true, title: 'Deleted!', message: 'Dua removed successfully.' });
      setItemToDelete(null);
    },
    onError: (e) => {
      toast.error(e.response?.data?.error || 'Failed to delete dua');
      setItemToDelete(null);
    },
  });

  const handleSave = (form) => {
    if (modal === 'create') createMutation.mutate(form);
    else updateMutation.mutate({ id: modal.id, data: form });
  };

  const handleMainChange = (val) => { setSelectedMain(val); setSelectedSub(''); setPage(1); };
  const handleSubChange = (val) => { setSelectedSub(val); setPage(1); };

  const duas = data?.duas || [];
  const total = data?.total ?? 0;
  const totalPages = data?.total_pages ?? 1;

  return (
    <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col min-h-0 gap-4">
      {/* Fixed header — never scrolls */}
      <div className="shrink-0 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[2rem] font-bold text-slate-800 font-display flex items-center gap-2.5 tracking-tight">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg shadow-sm border border-indigo-200/50">
              <BookHeart size={20} />
            </div>
            Duas
          </h1>
          <p className="text-slate-500 text-[13px] mt-1.5 ml-1">
            {total > 0 ? `${total} duas in the catalogue` : 'Manage duas in the catalogue'}
          </p>
        </div>
        <button
          onClick={() => setModal('create')}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white font-bold text-[13px] rounded-lg hover:bg-indigo-600 transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus size={16} /> Add Dua
        </button>
      </div>

      {/* Search & Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title or arabic text..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white font-medium"
          />
        </div>
        <div className="relative min-w-[200px]">
          <Tag size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <select
            value={selectedMain}
            onChange={(e) => handleMainChange(e.target.value)}
            className="w-full appearance-none pl-8 pr-8 py-2 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white font-medium"
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
            <ChevronDown size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400" />
            <select
              value={selectedSub}
              onChange={(e) => handleSubChange(e.target.value)}
              className="w-full appearance-none pl-8 pr-8 py-2 border border-indigo-200 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-indigo-50 font-medium text-indigo-700"
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

      {/* Scrollable content — only this area scrolls */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-24">
          <div className="h-10 w-10 border-4 border-slate-200 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
          <p className="font-bold text-slate-500">Loading duas...</p>
        </div>
      ) : !isLoading && duas.length === 0 && !debouncedSearch && !selectedMain && !selectedSub && page === 1 ? (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-24 text-center">
          <BookHeart size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-xl font-bold text-slate-700 font-display mb-2">No Duas Yet</h3>
          <p className="text-slate-500 max-w-sm mx-auto">Add the first dua to the catalogue.</p>
          <button
            onClick={() => setModal('create')}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-50 text-indigo-600 font-bold text-sm rounded-xl border border-indigo-200 hover:bg-indigo-100 transition-colors"
          >
            <Plus size={16} /> Add First Dua
          </button>
        </div>
      ) : (
        <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden transition-opacity ${isFetching && !isLoading ? 'opacity-70' : 'opacity-100'}`}>
          {duas.length === 0 ? (
            <p className="text-center text-slate-400 font-medium py-12">No duas match your search or filter.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] text-left">
                <thead className="bg-slate-50/80 text-slate-500 text-[9px] uppercase font-bold tracking-[0.16em] border-b border-slate-100">
                  <tr>
                    <th className="px-3 py-3 text-center w-14">Order</th>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3 text-right">Arabic Text</th>
                    <th className="px-4 py-3">Count</th>
                    <th className="px-4 py-3">Translations</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {duas.map((dua) => (
                    <tr key={dua.id} onClick={() => setViewItem(dua)} className="hover:bg-slate-50/80 transition-colors group cursor-pointer">
                      <td className="px-3 py-3 text-center">
                        {dua.order != null ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-bold border border-indigo-200">{dua.order}</span>
                        ) : (
                          <span className="text-slate-300 text-[11px]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-800 text-[15px] leading-snug">{dua.title}</span>
                      </td>
                      <td className="px-4 py-3">
                        {dua.category ? (
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <Tag size={9} />
                              {dua.category.name || dua.category}
                            </span>
                            {dua.additional_categories?.length > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-violet-50 text-violet-600 border border-violet-200">
                                <Layers size={9} />
                                +{dua.additional_categories.length} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {dua.arabic_text ? (
                          <span className={`text-slate-700 text-base leading-relaxed ${dua.isQuranicFont ? 'font-quranic' : 'font-arabic'}`} dir="rtl">
                            {dua.arabic_text.length > 60 ? dua.arabic_text.substring(0, 60) + '...' : dua.arabic_text}
                          </span>
                        ) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {dua.isCountless ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-violet-50 text-violet-700 border border-violet-200">∞ Countless</span>
                        ) : dua.count != null ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">{dua.count}</span>
                        ) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {dua.malayalam && <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-bold border bg-slate-100 text-slate-600 border-slate-200">ML</span>}
                          {dua.english && <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-bold border bg-slate-100 text-slate-600 border-slate-200">EN</span>}
                          {dua.urdu && <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-bold border bg-slate-100 text-slate-600 border-slate-200">UR</span>}
                          {!dua.malayalam && !dua.english && !dua.urdu && <span className="text-slate-400">—</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => { e.stopPropagation(); setViewItem(dua); }} className="p-1.5 rounded-lg text-slate-400 bg-white border border-slate-100 hover:bg-slate-100 hover:text-indigo-600 transition-colors shadow-sm" title="View"><Eye size={14} /></button>
                          <button onClick={(e) => { e.stopPropagation(); setModal(dua); }} className="p-1.5 rounded-lg text-slate-400 bg-white border border-slate-100 hover:bg-slate-100 hover:text-indigo-600 transition-colors shadow-sm" title="Edit"><Pencil size={14} /></button>
                          <button onClick={(e) => { e.stopPropagation(); setItemToDelete(dua); }} className="p-1.5 rounded-lg text-slate-400 bg-white border border-slate-100 hover:bg-red-50 hover:border-red-100 hover:text-red-600 transition-colors shadow-sm" title="Delete"><Trash2 size={14} /></button>
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
        title="Delete Dua"
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
