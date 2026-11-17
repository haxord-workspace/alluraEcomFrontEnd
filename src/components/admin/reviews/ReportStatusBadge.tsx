import React from 'react';
import { REPORT_STATUS_LABELS } from '../../../types/reviews';
import type { ReportStatus } from '../../../types/reviews';

// The shared StatusBadge colours any label containing "review" like "pending", so
// "Reviewed" would look identical to "Pending". This variant keeps the same pill
// shape with distinct colours per report status.
const STYLES: Record<ReportStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-800 border-amber-200',
  REVIEWED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  DISMISSED: 'bg-stone-100 text-stone-700 border-stone-200',
};

export const ReportStatusBadge: React.FC<{ status: ReportStatus; className?: string }> = ({ status, className = '' }) => (
  <span
    className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-sans font-medium rounded-full border whitespace-nowrap ${STYLES[status]} ${className}`}
  >
    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75 shrink-0" />
    {REPORT_STATUS_LABELS[status]}
  </span>
);
