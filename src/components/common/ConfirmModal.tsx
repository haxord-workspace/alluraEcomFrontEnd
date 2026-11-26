import React, { useEffect, useRef } from 'react';
import { AlertCircle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false,
}) => {
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Focus the confirm button (Enter confirms) and close on Escape
  useEffect(() => {
    if (!isOpen) return;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-allura-darkBrown/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-message"
        className="bg-allura-card border border-allura-border rounded-2xl w-full max-w-md p-6 shadow-luxury space-y-5 animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isDestructive ? 'bg-rose-100 text-rose-700' : 'bg-allura-bgSecondary text-allura-goldDark'
              }`}
            >
              <AlertCircle size={20} />
            </div>
            <h3 id="confirm-modal-title" className="font-serif text-xl text-allura-text font-normal">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-allura-muted hover:text-allura-text p-1 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <p id="confirm-modal-message" className="text-xs font-sans text-allura-muted leading-relaxed">{message}</p>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-sans font-semibold text-allura-muted hover:text-allura-text transition-colors border border-allura-border rounded-lg"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-5 py-2 text-xs font-sans font-bold tracking-wider uppercase rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              isDestructive
                ? 'bg-rose-700 hover:bg-rose-800 text-white focus:ring-rose-300'
                : 'bg-allura-darkBrown hover:bg-allura-softBrown text-white focus:ring-allura-gold'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
