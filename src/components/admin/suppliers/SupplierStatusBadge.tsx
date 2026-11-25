import React from 'react';
import { SUPPLIER_STATUS_LABELS } from '../../../types/suppliers';
import type { SupplierStatus } from '../../../types/suppliers';

// Same pill as the shared StatusBadge, with an explicit map: StatusBadge matches on
// substrings, so "INACTIVE" would render green there.
const STYLES: Record<SupplierStatus, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  INACTIVE: 'bg-stone-100 text-stone-700 border-stone-200',
  BLOCKED: 'bg-rose-50 text-rose-800 border-rose-200',
};

interface SupplierStatusBadgeProps {
  status: SupplierStatus;
  size?: 'sm' | 'md';
  className?: string;
}

export const SupplierStatusBadge: React.FC<SupplierStatusBadgeProps> = ({ status, size = 'sm', className = '' }) => {
  const padding = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-sans font-medium rounded-full border whitespace-nowrap ${padding} ${
        STYLES[status] ?? STYLES.INACTIVE
      } ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75 shrink-0" aria-hidden="true" />
      {SUPPLIER_STATUS_LABELS[status] ?? status}
    </span>
  );
};

/** Grey "Deleted" pill for soft-deleted suppliers */
export const SupplierDeletedBadge: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span
    className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-sans font-medium rounded-full border bg-stone-100 text-stone-500 border-stone-300 ${className}`}
  >
    Deleted
  </span>
);

/** Small (i) icon whose definition shows as a native tooltip and is read by screen readers */
export const InfoTip: React.FC<{ text?: string; label?: string }> = ({ text, label = 'More info' }) => {
  if (!text) return null;
  return (
    <span
      tabIndex={0}
      title={text}
      aria-label={`${label}: ${text}`}
      className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full border border-stone-300 text-[9px] font-bold text-stone-400 cursor-help align-middle focus:outline-none focus-visible:ring-2 focus-visible:ring-[#561C08]/40"
    >
      i
    </span>
  );
};
