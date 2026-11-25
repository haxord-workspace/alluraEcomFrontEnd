import React, { useId, useRef } from 'react';
import { X } from 'lucide-react';
import { useModalA11y } from '../../../hooks/useModalA11y';

interface LabelDialogShellProps {
  title: string;
  subtitle?: React.ReactNode;
  onClose: () => void;
  /** While true the dialog can't be closed (a request is running) */
  isBusy?: boolean;
  footer: React.ReactNode;
  children: React.ReactNode;
  size?: 'md' | 'lg';
}

/** Modal frame for the label printing dialogs, styled like the page's Generate Barcode modal */
export const LabelDialogShell: React.FC<LabelDialogShellProps> = ({
  title,
  subtitle,
  onClose,
  isBusy = false,
  footer,
  children,
  size = 'md',
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const requestClose = () => {
    if (!isBusy) onClose();
  };
  useModalA11y(true, ref, requestClose);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm"
      onMouseDown={e => {
        if (e.target === e.currentTarget) requestClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-busy={isBusy}
        tabIndex={-1}
        className={`bg-white border border-stone-200 rounded-2xl w-full ${size === 'lg' ? 'max-w-2xl' : 'max-w-md'} max-h-[92vh] flex flex-col shadow-2xl focus:outline-none`}
      >
        <div className="flex items-start justify-between gap-3 p-5 sm:p-6 pb-3 sm:pb-3 border-b border-stone-100">
          <div className="min-w-0">
            <h3 id={titleId} className="font-serif text-xl text-stone-900">{title}</h3>
            {subtitle && <div className="text-xs font-sans text-stone-500 mt-0.5">{subtitle}</div>}
          </div>
          <button
            type="button"
            onClick={requestClose}
            disabled={isBusy}
            aria-label="Close"
            className="p-1.5 text-stone-400 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors disabled:opacity-40"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs font-sans">{children}</div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 p-4 sm:px-6 border-t border-stone-100">{footer}</div>
      </div>
    </div>
  );
};

export const dialogCancelClass =
  'px-4 py-2 border border-stone-200 rounded-xl text-stone-500 hover:bg-stone-50 text-xs font-sans font-bold disabled:opacity-50';

export const dialogPrimaryClass =
  'px-4 py-2 bg-[#561C08] hover:bg-[#561C08]/90 text-white rounded-xl text-xs font-sans font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2';

export const fieldLabelClass = 'block text-[10px] uppercase font-bold text-stone-500 mb-1';

export const fieldInputClass =
  'w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-sans text-stone-900 focus:outline-none focus:border-stone-800 disabled:opacity-60';

export const fieldErrorClass = 'mt-1 text-[11px] font-semibold text-rose-600';
