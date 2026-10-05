import { useCallback, useState } from 'react';
import { createPayment, retryPayment, verifyPayment, paymentErrorMessage } from '../service/payments';
import type { RazorpayOrder } from '../service/payments';
import { loadRazorpay, openRazorpayCheckout } from '../utils/razorpay';

export type PaymentOutcome =
  | { ok: true; paymentId: string }
  | { ok: false; reason: 'dismissed' | 'failed' | 'error'; message: string };

interface PayOptions {
  /** Use POST /payments/retry (an earlier attempt failed or was closed) */
  retry?: boolean;
  description?: string;
  prefill?: { name?: string; email?: string; contact?: string };
}

const isClientError = (err: any) => {
  const s = err?.response?.status;
  return s === 400 || s === 404 || s === 409;
};

/**
 * Runs a Razorpay payment for an existing order:
 * create (or retry) -> open the Razorpay popup -> verify the signature on the backend.
 */
export const useOrderPayment = () => {
  const [isPaying, setIsPaying] = useState(false);

  const payForOrder = useCallback(async (orderId: string, options: PayOptions = {}): Promise<PaymentOutcome> => {
    setIsPaying(true);
    try {
      if (!(await loadRazorpay())) {
        return { ok: false, reason: 'error', message: 'Could not load the payment gateway. Please check your connection and try again.' };
      }

      // 1. Get a Razorpay order. If create/retry is refused (e.g. a payment already exists
      //    for this order, or nothing to retry yet), try the other one.
      let rz: RazorpayOrder;
      try {
        rz = options.retry ? await retryPayment(orderId) : await createPayment(orderId);
      } catch (err) {
        if (!isClientError(err)) throw err;
        rz = options.retry ? await createPayment(orderId) : await retryPayment(orderId);
      }

      const key = rz.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID;
      if (!key) {
        return { ok: false, reason: 'error', message: 'Online payment is not configured yet (missing Razorpay key). Please choose Cash on Delivery or contact us.' };
      }
      if (!rz.razorpayOrderId) {
        return { ok: false, reason: 'error', message: 'The payment could not be started. Please try again.' };
      }

      // 2. Customer pays in the Razorpay popup
      const result = await openRazorpayCheckout({
        key,
        orderId: rz.razorpayOrderId,
        amount: rz.amount,
        currency: rz.currency,
        description: options.description,
        prefill: options.prefill,
      });

      if (result.status === 'dismissed') {
        return { ok: false, reason: 'dismissed', message: 'Payment was cancelled. Your order is saved. You can pay any time from My Orders.' };
      }
      if (result.status === 'failed') {
        return { ok: false, reason: 'failed', message: `Payment failed: ${result.message}. You can try again.` };
      }

      // 3. Backend verifies the Razorpay signature and marks the order paid
      try {
        await verifyPayment({ orderId, ...result.response });
      } catch (err) {
        return {
          ok: false,
          reason: 'error',
          message: paymentErrorMessage(
            err,
            `We received your payment (${result.response.razorpay_payment_id}) but couldn't confirm it yet. Please don't pay again; contact us with this payment ID.`
          ),
        };
      }
      return { ok: true, paymentId: result.response.razorpay_payment_id };
    } catch (err) {
      return { ok: false, reason: 'error', message: paymentErrorMessage(err, 'Could not start the payment. Please try again.') };
    } finally {
      setIsPaying(false);
    }
  }, []);

  return { payForOrder, isPaying };
};
