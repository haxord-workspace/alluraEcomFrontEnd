import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, SearchX } from 'lucide-react';

export interface Crumb {
  label: string;
  to?: string;
}

/** "Suppliers › Name › Edit" trail, styled like the admin back links */
export const SupplierBreadcrumb: React.FC<{ items: Crumb[] }> = ({ items }) => (
  <nav aria-label="Breadcrumb" className="mb-2">
    <ol className="flex flex-wrap items-center gap-1 text-xs font-sans text-stone-500">
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <li key={`${item.label}-${idx}`} className="flex items-center gap-1 min-w-0">
            {item.to && !isLast ? (
              <Link to={item.to} className="hover:text-stone-900 truncate max-w-[200px]">
                {item.label}
              </Link>
            ) : (
              <span aria-current={isLast ? 'page' : undefined} className={`truncate max-w-[240px] ${isLast ? 'text-stone-800 font-semibold' : ''}`}>
                {item.label}
              </span>
            )}
            {!isLast && <ChevronRight size={12} className="text-stone-300 shrink-0" aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  </nav>
);

/** 404 SUPPLIER_NOT_FOUND */
export const SupplierNotFound: React.FC = () => (
  <div className="p-12 text-center space-y-4">
    <SearchX size={28} className="mx-auto text-stone-300" />
    <h2 className="font-serif text-2xl text-stone-900">Supplier not found</h2>
    <p className="text-xs font-sans text-stone-500">It may have been removed, or the link is wrong.</p>
    <Link to="/admin/suppliers" className="text-xs font-sans text-allura-goldDark underline">
      Back to suppliers
    </Link>
  </div>
);

export const PageSpinner: React.FC<{ label: string }> = ({ label }) => (
  <div className="p-12 text-center" role="status">
    <div className="w-6 h-6 border-2 border-stone-900 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
    <p className="text-xs font-sans text-stone-500">{label}</p>
  </div>
);
