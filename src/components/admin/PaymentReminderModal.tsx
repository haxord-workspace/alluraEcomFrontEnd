import React, { useEffect, useRef, useState } from 'react';
import { X, Bell, Loader2, Mail, Smartphone } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { sendNotification, notificationErrorMessage } from '../../service/notifications';
import type { Order } from '../../types';

interface PaymentReminderModalProps {
  order: Order | null;
  onClose: () => void;
  /** Called once the reminder is confirmed sent, so the row can switch to "Reminder sent". */
  onSent: (orderId: string, lastReminderAt: string) => void;
  /**
   * Called on any send failure. The modal stays open with the error shown inline,
   * but the row behind it is refreshed — covers "payment completed meanwhile"
   * (the row then switches back to Manage on its own) without special-casing
   * the exact HTTP status.
   */
  onError?: () => void;
}

export const PaymentReminderModal: React.FC<PaymentReminderModalProps> = ({ order, onClose, onSent, onError }) => {
  const { showToast } = useShop();
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!order) return;
    setError(null);
    setIsSending(false);
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [order, onClose]);

  if (!order) return null;

  const handleConfirm = async () => {
    if (isSending) return; // blocks double clicks — exactly one request per click
    setIsSending(true);
    setError(null);
    try {
      await sendNotification({
        recipientId: order.customer.id,
        title: `Payment pending for order ${order.orderNumber}`,
        message: `We noticed your payment for order ${order.orderNumber} (₹ ${order.total.toLocaleString('en-IN')}) is still pending. Please complete it to avoid delays.`,
        actionUrl: `/account/orders/${order.id}`,
        actionLabel: 'View Order',
        channels: ['EMAIL', 'PUSH'],
      });
      showToast(`Reminder sent to ${order.customer.name}`, 'success');
      onSent(order.id, new Date().toISOString());
    } catch (err) {
      setError(notificationErrorMessage(err, 'Could not send the reminder'));
      setIsSending(false);
      onError?.();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in"
      onClick={() => !isSending && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reminder-modal-title"
        onClick={e => e.stopPropagation()}
        className="bg-white border border-stone-200 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl text-xs font-sans"
      >
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <h3 id="reminder-modal-title" className="font-serif text-xl text-stone-900 flex items-center gap-2">
            <Bell size={18} className="text-allura-goldDark" />
            Send payment reminder?
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            aria-label="Close"
            className="text-stone-400 hover:text-stone-700 p-1 disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-2 text-stone-700">
          <div className="flex justify-between">
            <span className="text-stone-400">Order</span>
            <span className="font-semibold">{order.orderNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-400">Customer</span>
            <span className="font-semibold">{order.customer.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-400">Amount</span>
            <span className="font-semibold text-[#561C08]">₹ {order.total.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-400">Payment status</span>
            <span className="font-semibold">{order.paymentStatus}</span>
          </div>
        </div>

        <div className="flex items-center gap-4 p-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-600">
          <span className="text-[10px] font-bold uppercase text-stone-400">Sending via</span>
          <span className="flex items-center gap-1.5 font-semibold">
            <Mail size={13} /> Email
          </span>
          <span className="flex items-center gap-1.5 font-semibold">
            <Smartphone size={13} /> Push
          </span>
        </div>

        {error && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800">{error}</div>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            className="px-4 py-2 border border-stone-200 rounded-xl text-stone-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={handleConfirm}
            disabled={isSending}
            className="px-5 py-2 bg-[#561C08] hover:bg-[#561C08]/90 text-white rounded-xl font-bold uppercase tracking-wider disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
          >
            {isSending && <Loader2 size={13} className="animate-spin" />}
            <span>{isSending ? 'Sending…' : 'Send Reminder'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
