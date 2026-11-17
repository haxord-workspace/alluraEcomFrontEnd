import React, { useId, useRef } from 'react';
import { X } from 'lucide-react';
import { useModalA11y } from '../../hooks/useModalA11y';

interface ReviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Full-screen sheet on phones (forms); otherwise a bottom sheet */
  fullScreenOnMobile?: boolean;
  maxWidthClass?: string;
}

/**
 * Dialog shell for the reviews module, styled like the storefront's existing
 * modals (allura card, serif title, darkBrown backdrop). Centered from `sm` up;
 * bottom sheet or full-screen sheet on phones. Focus trap + Esc via useModalA11y.
 */
export const ReviewDialog: React.FC<ReviewDialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  fullScreenOnMobile = false,
  maxWidthClass = 'sm:max-w-lg',
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  useModalA11y(isOpen, panelRef, onClose);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-allura-darkBrown/60 backdrop-blur-sm animate-fade-in" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={`relative w-full ${maxWidthClass} bg-allura-card border border-allura-border shadow-luxury flex flex-col animate-slide-up focus:outline-none ${
          fullScreenOnMobile
            ? 'h-[100dvh] sm:h-auto sm:max-h-[90vh] rounded-none sm:rounded-2xl'
            : 'max-h-[90dvh] sm:max-h-[90vh] rounded-t-3xl sm:rounded-2xl'
        }`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="px-5 sm:px-6 py-4 border-b border-allura-border/60 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id={titleId} className="font-serif text-lg sm:text-xl text-allura-text font-normal">
              {title}
            </h2>
            {description && (
              <p id={descId} className="text-xs font-sans text-allura-muted mt-1">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 -mt-1 w-11 h-11 flex items-center justify-center rounded-full text-allura-muted hover:text-allura-text hover:bg-allura-bg/60 transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 sm:px-6 py-5 overflow-y-auto flex-1">{children}</div>

        {footer && <div className="px-5 sm:px-6 py-4 border-t border-allura-border/60 bg-allura-bg/40 sm:rounded-b-2xl">{footer}</div>}
      </div>
    </div>
  );
};
