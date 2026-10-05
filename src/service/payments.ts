import api from './api';
import { firstNumber } from '../utils/number';

// -----------------------------------------------------------------------------
// Payment endpoints (customer, authenticated) — Razorpay standard checkout
// POST /payments/create  { orderId }                       -> Razorpay order to open the popup with
// POST /payments/verify  { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature }
// POST /payments/retry   { orderId }                       -> new Razorpay order after a failed/closed attempt
// (POST /payments/webhooks/razorpay is called by Razorpay's servers, never by the browser.)
// -----------------------------------------------------------------------------

export interface RazorpayOrder {
  /** Razorpay order id, e.g. "order_Nx..." */
  razorpayOrderId: string;
  /** Amount in the smallest unit (paise) as Razorpay expects */
  amount?: number;
  currency: string;
  /** Public key id (rzp_test_… / rzp_live_…) if the backend sends it */
  keyId?: string;
  paymentId?: string;
}

export interface VerifyPaymentPayload {
  orderId: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

const unwrap = (response: any) => response?.data?.data ?? response?.data;

export const paymentErrorMessage = (error: any, fallback: string): string =>
  error?.response?.data?.error?.details?.[0]?.message || error?.response?.data?.message || fallback;

const mapRazorpayOrder = (data: any): RazorpayOrder => {
  const rz = data?.razorpayOrder || data?.razorpay || data?.gatewayOrder || data?.order || data || {};
  const razorpayOrderId =
    data?.razorpayOrderId || data?.razorpay_order_id || data?.gatewayOrderId || rz?.razorpayOrderId || rz?.id || '';
  return {
    razorpayOrderId,
    amount: firstNumber(rz?.amount, data?.amount, data?.amountInPaise),
    currency: rz?.currency || data?.currency || 'INR',
    keyId: data?.keyId || data?.key || data?.razorpayKeyId || data?.key_id || rz?.keyId,
    paymentId: data?.paymentId || data?.payment?._id || data?._id,
  };
};

/** POST /payments/create */
export const createPayment = async (orderId: string): Promise<RazorpayOrder> => {
  const response = await api.post('/payments/create', { orderId });
  const data = unwrap(response);
  if (import.meta.env.DEV) console.debug('[payments] create response', data);
  return mapRazorpayOrder(data);
};

/** POST /payments/retry */
export const retryPayment = async (orderId: string): Promise<RazorpayOrder> => {
  const response = await api.post('/payments/retry', { orderId });
  const data = unwrap(response);
  if (import.meta.env.DEV) console.debug('[payments] retry response', data);
  return mapRazorpayOrder(data);
};

/** POST /payments/verify — the backend checks the Razorpay signature */
export const verifyPayment = async (payload: VerifyPaymentPayload): Promise<void> => {
  await api.post('/payments/verify', payload);
};
