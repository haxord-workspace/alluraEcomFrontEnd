import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface AdminPaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export const AdminPagination: React.FC<AdminPaginationProps> = ({
  currentPage,
  totalItems,
  pageSize = 15,
  onPageChange,
  className = '',
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  if (totalItems <= pageSize) {
    if (totalItems === 0) return null;
    return (
      <div className={`flex items-center justify-between px-4 py-3 border-t border-stone-200 bg-stone-50/50 text-xs text-stone-500 font-sans ${className}`}>
        <span>Showing all {totalItems} {totalItems === 1 ? 'entry' : 'entries'}</span>
      </div>
    );
  }

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate compact page numbers list with ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3.5 border-t border-stone-200 bg-white text-xs font-sans ${className}`}>
      <div className="text-stone-500">
        Showing <span className="font-semibold text-stone-800">{startItem}</span> to{' '}
        <span className="font-semibold text-stone-800">{endItem}</span> of{' '}
        <span className="font-semibold text-stone-800">{totalItems}</span> entries
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          aria-label="Previous page"
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition-colors"
        >
          <ChevronLeft size={14} />
          <span className="hidden sm:inline">Prev</span>
        </button>

        <div className="flex items-center gap-1">
          {getPageNumbers().map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`ellipsis-${idx}`} className="px-2 text-stone-400 select-none">
                  …
                </span>
              );
            }
            const pageNum = p as number;
            const isCurrent = pageNum === currentPage;
            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => onPageChange(pageNum)}
                className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
                  isCurrent
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 shadow-xs'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          aria-label="Next page"
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition-colors"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};
