import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, totalPages, total, limit, onPageChange, isFetching = false }) {
  if (!total && total !== 0) return null;

  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  const getPageNumbers = () => {
    const pages = [];
    const delta = 2;
    const start = Math.max(1, page - delta);
    const end = Math.min(totalPages, page + delta);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  const pageNums = getPageNumbers();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-white rounded-b-3xl">
      <p className="text-sm text-slate-500 font-medium">
        {total === 0 ? (
          'No items found'
        ) : (
          <>
            Showing{' '}
            <span className="font-bold text-slate-700">{from}–{to}</span>{' '}
            of{' '}
            <span className="font-bold text-slate-700">{total}</span>{' '}
            {isFetching && <span className="text-indigo-400 font-normal">(loading...)</span>}
          </>
        )}
      </p>

      {totalPages > 1 && (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1 || isFetching}
            className="flex items-center gap-1 px-3 py-2 text-sm font-bold rounded-xl border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            <ChevronLeft size={14} /> Prev
          </button>

          {pageNums[0] > 1 && (
            <>
              <button onClick={() => onPageChange(1)} className="w-9 h-9 text-sm font-bold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">1</button>
              {pageNums[0] > 2 && <span className="text-slate-400 text-sm px-0.5">…</span>}
            </>
          )}

          {pageNums.map((p) => (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              disabled={isFetching}
              className={`w-9 h-9 text-sm font-bold rounded-xl border transition-colors shadow-sm ${
                p === page
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50'
              }`}
            >
              {p}
            </button>
          ))}

          {pageNums[pageNums.length - 1] < totalPages && (
            <>
              {pageNums[pageNums.length - 1] < totalPages - 1 && <span className="text-slate-400 text-sm px-0.5">…</span>}
              <button onClick={() => onPageChange(totalPages)} className="w-9 h-9 text-sm font-bold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">{totalPages}</button>
            </>
          )}

          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages || isFetching}
            className="flex items-center gap-1 px-3 py-2 text-sm font-bold rounded-xl border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
