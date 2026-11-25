import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useConfirm } from '../../context/ConfirmContext';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

let openModalCount = 0;
let previousBodyOverflow: string | null = null;

function lockBodyScroll() {
  if (openModalCount === 0) {
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  openModalCount += 1;
}

function unlockBodyScroll() {
  openModalCount = Math.max(0, openModalCount - 1);
  if (openModalCount === 0) {
    document.body.style.overflow = previousBodyOverflow ?? '';
    previousBodyOverflow = null;
  }
}

// Stack of currently-open Modal instance ids, topmost last. Esc only closes the top one.
const modalStack: string[] = [];

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  /** Rendered content is fully custom; this just sizes the panel. Ignored if panelClassName is set. */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnBackdrop?: boolean;
  closeOnEsc?: boolean;
  showCloseButton?: boolean;
  /** While true, X / Esc / backdrop are all ignored (saving, uploading, etc). */
  isBusy?: boolean;
  /** If true, closing via X / Esc / backdrop asks for confirmation first. */
  isDirty?: boolean;
  discardConfirmMessage?: string;
  /** Full override of the backdrop's classes. */
  backdropClassName?: string;
  /** Full override of the panel's classes (positioning, bg, radius, shadow, max-width). */
  panelClassName?: string;
  /** Extra classes for the close button, for contrast against custom header colors. */
  closeButtonClassName?: string;
  labelledBy?: string;
  initialFocusSelector?: string;
}

/**
 * Shared modal shell: portal, backdrop with strict click-through-only close,
 * Esc (top-of-stack only), focus trap, body scroll lock (ref-counted for
 * stacked modals), isBusy guard and isDirty discard-confirm.
 *
 * Visual styling of the header/body/footer is left entirely to children —
 * this component only owns the backdrop, outer panel sizing/position and the
 * close (X) button, so existing modal visuals are preserved on migration.
 */
export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  children,
  size = 'md',
  closeOnBackdrop = true,
  closeOnEsc = true,
  showCloseButton = true,
  isBusy = false,
  isDirty = false,
  discardConfirmMessage = 'You have unsaved changes. Discard them?',
  backdropClassName,
  panelClassName,
  closeButtonClassName,
  labelledBy,
  initialFocusSelector,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const instanceId = useId();
  const mouseDownOnBackdrop = useRef(false);
  const confirm = useConfirm();
  const [confirming, setConfirming] = useState(false);

  const requestClose = async () => {
    if (isBusy || confirming) return;
    if (isDirty) {
      setConfirming(true);
      const ok = await confirm({
        title: 'Discard changes?',
        message: discardConfirmMessage,
        confirmLabel: 'Discard',
        cancelLabel: 'Keep editing',
        isDestructive: true,
      });
      setConfirming(false);
      if (!ok) return;
    }
    onClose();
  };

  // The Esc listener is registered once per `open` toggle (see effect below), so it
  // must read isBusy/isDirty/onClose through a ref kept current every render —
  // otherwise it closes over whatever requestClose looked like the moment the
  // modal opened, and keeps using that stale isBusy/isDirty for its whole lifetime.
  const requestCloseRef = useRef(requestClose);
  requestCloseRef.current = requestClose;
  const closeOnEscRef = useRef(closeOnEsc);
  closeOnEscRef.current = closeOnEsc;

  useEffect(() => {
    if (!open) return;
    lockBodyScroll();
    modalStack.push(instanceId);

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusables = () =>
      Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) || []).filter(
        el => el.offsetParent !== null || el === document.activeElement
      );

    const initial =
      (initialFocusSelector && panelRef.current?.querySelector<HTMLElement>(initialFocusSelector)) ||
      panelRef.current?.querySelector<HTMLElement>('[data-autofocus]') ||
      focusables()[0];
    (initial || panelRef.current)?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      const container = panelRef.current;
      if (container && e.target instanceof Node && e.target !== document.body && !container.contains(e.target)) {
        return;
      }
      const isTopMost = modalStack[modalStack.length - 1] === instanceId;
      if (e.key === 'Escape') {
        if (!isTopMost || !closeOnEscRef.current) return;
        e.stopPropagation();
        void requestCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const list = focusables();
      if (list.length === 0) {
        e.preventDefault();
        return;
      }
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      unlockBodyScroll();
      const idx = modalStack.indexOf(instanceId);
      if (idx !== -1) modalStack.splice(idx, 1);
      previouslyFocused?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const sizeClass =
    size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-2xl' : size === 'xl' ? 'max-w-4xl' : size === 'full' ? 'max-w-full' : 'max-w-md';

  return createPortal(
    <div
      className={backdropClassName ?? 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-allura-darkBrown/60 backdrop-blur-sm animate-fade-in'}
      onMouseDown={e => {
        mouseDownOnBackdrop.current = e.target === e.currentTarget;
      }}
      onMouseUp={e => {
        const closedOnBackdrop = closeOnBackdrop && mouseDownOnBackdrop.current && e.target === e.currentTarget;
        mouseDownOnBackdrop.current = false;
        if (closedOnBackdrop) void requestClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={!labelledBy && typeof title === 'string' ? title : undefined}
        aria-busy={isBusy}
        tabIndex={-1}
        className={
          panelClassName ??
          `relative bg-allura-card border border-allura-border rounded-2xl w-full ${sizeClass} max-h-[90vh] flex flex-col shadow-luxury focus:outline-none`
        }
      >
        {showCloseButton && (
          <button
            type="button"
            onClick={() => void requestClose()}
            disabled={isBusy}
            aria-label="Close"
            className={
              closeButtonClassName ??
              'absolute top-3 right-3 z-20 w-10 h-10 flex items-center justify-center rounded-full text-allura-muted hover:text-allura-text hover:bg-allura-bg/60 transition-colors disabled:opacity-40'
            }
          >
            <X size={18} />
          </button>
        )}
        {children}
      </div>
    </div>,
    document.body
  );
};
