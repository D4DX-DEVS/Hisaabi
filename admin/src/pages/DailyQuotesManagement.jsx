import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, Save, AlignLeft, Eye, Search, Calendar, Quote, Link } from 'lucide-react';
import { adminApi } from '../api/adminApi';
import ConfirmationModal from '../components/ConfirmationModal';
import SuccessModal from '../components/SuccessModal';
import Pagination from '../components/Pagination';

const LIMIT = 20;

const EMPTY = { text: '', malayalam: '', english: '', urdu: '', display_date: '', reference: '' };

function Modal({ item, onClose, onSave }) {
  const [form, setForm] = useState(item ? { ...EMPTY, ...item } : EMPTY);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-fade-in" onClick={onClose} />

      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden transform transition-all w-full max-w-2xl relative z-10 animate-slide-in-right flex flex-col max-h-[90vh]">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-600 shadow-sm border border-amber-200/50">
              {item ? <Pencil size={18} /> : <Plus size={18} />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 font-display">{item ? 'Edit Daily Quote' : 'Add Daily Quote'}</h2>
              <p className="text-xs text-slate-500 font-medium">{item ? 'Update quote content' : 'Add a new daily quote'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors rounded-full p-2 hover:bg-slate-200 focus:outline-none">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5">
          {/* Display Date */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              <Calendar size={14} /> Display Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-medium bg-slate-50 focus:bg-white transition-colors"
              value={form.display_date}
              onChange={set('display_date')}
            />
          </div>

          {/* Quote Text */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              <AlignLeft size={14} /> Quote Text <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-medium bg-slate-50 focus:bg-white transition-colors resize-none"
              value={form.text}
              onChange={set('text')}
              placeholder="Enter the quote text..."
            />
          </div>

          {/* Translations */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <AlignLeft size={14} /> Translations
            </p>
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
                  className={`w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-medium bg-slate-50 focus:bg-white transition-colors resize-none${key === 'urdu' ? ' text-right font-arabic leading-relaxed' : ''}`}
                  value={form[key]}
                  onChange={set(key)}
                  placeholder={`${label} translation...`}
                />
              </div>
            ))}
          </div>

          {/* Reference (optional) */}
          <div className="pt-4 border-t border-slate-100">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              <Link size={14} /> Reference <span className="text-slate-400 font-normal normal-case tracking-normal">(optional)</span>
            </label>
            <input
              type="text"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-medium bg-slate-50 focus:bg-white transition-colors"
              value={form.reference}
              onChange={set('reference')}
              placeholder="e.g. Sahih al-Bukhari 1234, Quran 2:255"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white rounded-xl border border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm">
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl bg-amber-500 text-white hover:bg-amber-600 shadow-sm transition-colors"
          >
            <Save size={16} />
            {item ? 'Save Changes' : 'Create Quote'}
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
            <div className="p-2 rounded-xl bg-amber-100 text-amber-600 shadow-sm border border-amber-200/50">
              <Quote size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 font-display">Quote Details</h2>
              <p className="text-xs text-slate-500 font-medium">Full content view</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors rounded-full p-2 hover:bg-slate-200 focus:outline-none">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          {item.display_date && (
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Display Date</h3>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <Calendar size={11} />
                {item.display_date}
              </span>
            </div>
          )}
          {item.text && (
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Quote Text</h3>
              <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-100/60">
                <p className="text-slate-800 text-base leading-relaxed font-medium">{item.text}</p>
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
          {item.reference && (
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Reference</h3>
              <p className="text-slate-700 bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 text-sm font-medium">{item.reference}</p>
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

export default function DailyQuotesManagement() {
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
    queryKey: ['admin-daily-quotes', page, debouncedSearch],
    queryFn: () => adminApi.getDailyQuotes({
      page,
      limit: LIMIT,
      ...(debouncedSearch && { search: debouncedSearch }),
    }).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (d) => adminApi.createDailyQuote(d),
    onSuccess: () => {
      qc.invalidateQueries(['admin-daily-quotes']);
      setSuccessState({ isOpen: true, title: 'Success!', message: 'Daily quote created successfully.' });
      setModal(null);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to create daily quote'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => adminApi.updateDailyQuote(id, data),
    onSuccess: () => {
      qc.invalidateQueries(['admin-daily-quotes']);
      setSuccessState({ isOpen: true, title: 'Success!', message: 'Daily quote updated successfully.' });
      setModal(null);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to update daily quote'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminApi.deleteDailyQuote(id),
    onSuccess: () => {
      qc.invalidateQueries(['admin-daily-quotes']);
      setSuccessState({ isOpen: true, title: 'Deleted!', message: 'Daily quote removed successfully.' });
      setItemToDelete(null);
    },
    onError: (e) => {
      toast.error(e.response?.data?.error || 'Failed to delete daily quote');
      setItemToDelete(null);
    },
  });

  const handleSave = (form) => {
    if (modal === 'create') createMutation.mutate(form);
    else updateMutation.mutate({ id: modal.id, data: form });
  };

  const quotes = data?.daily_quotes || [];
  const total = data?.total ?? 0;
  const totalPages = data?.total_pages ?? 1;

  return (
    <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col min-h-0 gap-6">
      {/* Fixed header */}
      <div className="shrink-0 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 font-display flex items-center gap-3 tracking-tight">
              <div className="p-2.5 bg-amber-100 text-amber-600 rounded-xl shadow-sm border border-amber-200/50">
                <Quote size={24} />
              </div>
              Daily Quotes
            </h1>
            <p className="text-slate-500 text-sm mt-2 ml-1">
              {total > 0 ? `${total} quotes in the catalogue` : 'Manage daily quotes'}
            </p>
          </div>
          <button
            onClick={() => setModal('create')}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-amber-500 transition-colors shadow-sm self-start sm:self-auto"
          >
            <Plus size={18} /> Add Quote
          </button>
        </div>

        {/* Search bar */}
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by quote text or translation..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white font-medium"
            />
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-24">
            <div className="h-10 w-10 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin mb-4"></div>
            <p className="font-bold text-slate-500">Loading daily quotes...</p>
          </div>
        ) : !isLoading && quotes.length === 0 && !debouncedSearch && page === 1 ? (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-24 text-center">
            <Quote size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-bold text-slate-700 font-display mb-2">No Daily Quotes Yet</h3>
            <p className="text-slate-500 max-w-sm mx-auto">Add the first daily quote to the catalogue.</p>
            <button
              onClick={() => setModal('create')}
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-amber-50 text-amber-600 font-bold text-sm rounded-xl border border-amber-200 hover:bg-amber-100 transition-colors"
            >
              <Plus size={16} /> Add First Quote
            </button>
          </div>
        ) : (
          <div className={`bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden transition-opacity ${isFetching && !isLoading ? 'opacity-70' : 'opacity-100'}`}>
            {quotes.length === 0 ? (
              <p className="text-center text-slate-400 font-medium py-12">No quotes match your search.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50/80 text-slate-500 text-[10px] uppercase font-bold tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">Display Date</th>
                      <th className="px-6 py-4">Quote Text</th>
                      <th className="px-6 py-4">Translations</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {quotes.map((quote) => (
                      <tr
                        key={quote.id}
                        onClick={() => setViewItem(quote)}
                        className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      >
                        <td className="px-6 py-4 shrink-0">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
                            <Calendar size={11} />
                            {quote.display_date}
                          </span>
                        </td>
                        <td className="px-6 py-4 max-w-xs">
                          <p className="text-slate-800 font-medium text-sm leading-relaxed line-clamp-2">
                            {quote.text.length > 120 ? quote.text.substring(0, 120) + '…' : quote.text}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1.5">
                            {quote.malayalam && <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold border bg-slate-100 text-slate-600 border-slate-200">ML</span>}
                            {quote.english && <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold border bg-slate-100 text-slate-600 border-slate-200">EN</span>}
                            {quote.urdu && <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold border bg-slate-100 text-slate-600 border-slate-200">UR</span>}
                            {!quote.malayalam && !quote.english && !quote.urdu && <span className="text-slate-400">—</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => { e.stopPropagation(); setViewItem(quote); }}
                              className="p-2 rounded-xl text-slate-400 bg-white border border-slate-100 hover:bg-slate-100 hover:text-amber-600 transition-colors shadow-sm"
                              title="View"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setModal(quote); }}
                              className="p-2 rounded-xl text-slate-400 bg-white border border-slate-100 hover:bg-slate-100 hover:text-amber-600 transition-colors shadow-sm"
                              title="Edit"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setItemToDelete(quote); }}
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
            <Pagination page={page} totalPages={totalPages} total={total} limit={LIMIT} onPageChange={setPage} isFetching={isFetching} />
          </div>
        )}
      </div>

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
        title="Delete Daily Quote"
        message={`Are you sure you want to delete the quote for "${itemToDelete?.display_date}"? This action cannot be undone.`}
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
