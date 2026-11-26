import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, AlertCircle, X, Loader2 } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import {
  cancelAdminOrder,
  orderErrorMessage,
  CANCEL_REASONS,
  CANCEL_REASON_LABELS,
} from '../../service/orders';
import { AdminErrorBanner } from './AdminErrorBanner';
import type { Order, CancelReason } from '../../types';

interface OrderCancelModalProps {
  isOpen: boolean;
  order: Order | null;
  onClose: () => void;
  onSuccess: (updated: Order) => void;
  onRefetchOrder?: () => Promise<void> | void;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

const NOTE_MAX_CHARS = 500;

export const OrderCancelModal: React.FC<OrderCancelModalProps> = ({
  isOpen,
  order,
  onClose,
  onSuccess,
  onRefetchOrder,
  triggerRef,
}) => {
  const { showToast } = useShop();

  const [reason, setReason] = useState<CancelReason | ''>('');
  const [note, setNote] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const submittingRef = useRef(false);

  // DOM side effects when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';

      // Autofocus select after render
      const timer = setTimeout(() => {
        selectRef.current?.focus();
      }, 50);
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = '';
      };
    } else {
      document.body.style.overflow = '';
      // Restore focus to trigger when closing
      if (triggerRef?.current) {
        triggerRef.current.focus();
      }
    }
  }, [isOpen, triggerRef]);

  const handleClose = React.useCallback(() => {
    // Block closing while in flight
    if (isSubmitting || submittingRef.current) return;
    setReason('');
    setNote('');
    setReasonError(null);
    setBackendError(null);
    setErrorCode(null);
    onClose();
  }, [isSubmitting, onClose]);

  // Focus trap & Escape key listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not allow Escape to close while in flight
      if (e.key === 'Escape') {
        if (!submittingRef.current) {
          e.preventDefault();
          handleClose();
        }
        return;
      }

      if (e.key === 'Tab') {
        const container = containerRef.current;
        if (!container) return;

        const focusables = Array.from(
          container.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), textarea:not([disabled]), select:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        ).filter(el => el.offsetParent !== null || el === document.activeElement);

        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen || !order) return null;

  const handleReasonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setReason(e.target.value as CancelReason | '');
    if (reasonError) setReasonError(null);
    if (backendError) setBackendError(null);
  };

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNote(e.target.value);
    if (backendError) setBackendError(null);
  };

  const handleOverlayClick = () => {
    handleClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Guard against duplicate submissions
    if (isSubmitting || submittingRef.current) return;

    // Reason is strictly required
    if (!reason) {
      setReasonError('Please select a reason');
      selectRef.current?.focus();
      return;
    }

    setReasonError(null);
    setBackendError(null);
    setErrorCode(null);
    setIsSubmitting(true);
    submittingRef.current = true;

    try {
      const trimmedNote = note.trim();
      const updated = await cancelAdminOrder(order.id, {
        reason,
        ...(trimmedNote ? { note: trimmedNote } : {}),
      });

      // Distinguish toast for paid online vs COD/unpaid
      const isPaidOnline =
        order.paymentMethod !== 'COD' &&
        ['Paid', 'Captured'].includes(order.paymentStatus);

      if (isPaidOnline) {
        showToast('Order cancelled. Refund will be processed shortly.', 'info');
      } else {
        showToast('Order cancelled.', 'info');
      }

      onClose();

      if (updated) {
        // Safe merge in case updated order response omits some populated fields
        const merged: Order = {
          ...order,
          ...updated,
          customer: updated.customer?.id ? updated.customer : order.customer,
          items: updated.items?.length ? updated.items : order.items,
          shippingAddress: updated.shippingAddress?.fullName ? updated.shippingAddress : order.shippingAddress,
          orderStatus: 'Cancelled',
          rawStatus: 'CANCELLED',
        };
        onSuccess(merged);
      }

      // Background refetch
      if (onRefetchOrder) {
        onRefetchOrder();
      }
    } catch (err: any) {
      const status = err?.response?.status;
      const code = err?.response?.data?.error?.code || err?.response?.data?.code;
      setErrorCode(code || null);

      if (status === 403) {
        setBackendError("You don't have permission to cancel orders.");
      } else if (status === 404 || code === 'ORDER_NOT_FOUND') {
        setBackendError('Order not found');
      } else if (code === 'INVALID_ORDER_TRANSITION') {
        const msg = orderErrorMessage(err, 'This order can no longer be cancelled.');
        setBackendError(msg);
        // Refetch order so page updates to real status and hides cancel button
        if (onRefetchOrder) {
          onRefetchOrder();
        }
      } else if (err?.message === 'Network Error' || err?.code === 'ECONNABORTED') {
        setBackendError('Network error or request timeout. Please check your connection and try again.');
      } else {
        const msg = orderErrorMessage(err, 'Failed to cancel order. Please check inputs and try again.');
        setBackendError(msg);
      }
    } finally {
      setIsSubmitting(false);
      submittingRef.current = false;
    }
  };

  const titleNumber = order.orderNumber.startsWith('#')
    ? order.orderNumber
    : `#${order.orderNumber}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-modal-title"
    >
      <div
        ref={containerRef}
        className="bg-white border border-stone-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-stone-100">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700 shrink-0">
              <AlertTriangle size={16} />
            </div>
            <h2
              id="cancel-modal-title"
              className="font-serif text-lg sm:text-xl text-stone-900 truncate font-medium"
            >
              Cancel order {titleNumber}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-2 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Close dialog"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body - scrollable on mobile */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs font-sans">
          {/* Warning box */}
          <div className="p-3.5 bg-amber-50/80 border border-amber-200 text-amber-900 rounded-xl flex items-start gap-3">
            <AlertCircle size={16} className="text-amber-700 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed font-sans">
              This will restock items and refund any online payment. This can't be undone.
            </p>
          </div>

          {/* Reason Select */}
          <div className="space-y-1.5">
            <label htmlFor="cancel-reason-select" className="block text-xs font-semibold text-stone-800">
              Cancellation Reason <span className="text-rose-600">*</span>
            </label>
            <select
              id="cancel-reason-select"
              ref={selectRef}
              value={reason}
              onChange={handleReasonChange}
              disabled={isSubmitting}
              aria-required="true"
              aria-invalid={!!reasonError}
              aria-describedby={reasonError ? 'cancel-reason-error' : undefined}
              className={`w-full p-3 bg-stone-50 border rounded-xl font-sans text-stone-900 text-base sm:text-xs transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#561C08]/20 disabled:opacity-60 disabled:cursor-not-allowed ${
                reasonError ? 'border-rose-400 focus:border-rose-500' : 'border-stone-200 focus:border-[#561C08]'
              }`}
            >
              <option value="">Select a reason</option>
              {CANCEL_REASONS.map(r => (
                <option key={r} value={r}>
                  {CANCEL_REASON_LABELS[r]}
                </option>
              ))}
            </select>
            {reasonError && (
              <p id="cancel-reason-error" role="alert" className="text-rose-600 text-xs mt-1 font-medium">
                {reasonError}
              </p>
            )}
          </div>

          {/* Note Textarea */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label htmlFor="cancel-note-textarea" className="block text-xs font-semibold text-stone-800">
                Internal Note <span className="text-stone-400 font-normal">(optional)</span>
              </label>
              <span
                className={`text-[11px] font-mono ${
                  note.length > NOTE_MAX_CHARS ? 'text-rose-600 font-bold' : 'text-stone-400'
                }`}
              >
                {note.length} / {NOTE_MAX_CHARS}
              </span>
            </div>
            <textarea
              id="cancel-note-textarea"
              rows={3}
              value={note}
              onChange={handleNoteChange}
              disabled={isSubmitting}
              placeholder="Add any internal context or customer conversation notes…"
              className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl resize-none font-sans text-stone-900 text-base sm:text-xs transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#561C08]/20 focus:border-[#561C08] disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          {/* Error Banner */}
          {backendError && (
            <div className="space-y-2">
              <AdminErrorBanner
                title="Cancellation Failed"
                error={backendError}
                onDismiss={() => setBackendError(null)}
              />
              {errorCode === 'ORDER_NOT_FOUND' && (
                <div className="text-right">
                  <Link
                    to="/admin/orders"
                    className="text-xs font-bold text-[#561C08] hover:underline"
                    onClick={onClose}
                  >
                    Return to orders list &rarr;
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-3 border-t border-stone-100">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="min-h-[44px] px-4 py-2 border border-stone-200 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-stone-50 font-medium transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              Keep order
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[44px] px-5 py-2 bg-rose-700 hover:bg-rose-800 active:bg-rose-900 text-white rounded-xl font-bold uppercase tracking-wider text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Cancelling…</span>
                </>
              ) : (
                <span>Cancel order</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
