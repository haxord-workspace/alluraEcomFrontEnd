// Loads Razorpay's standard checkout script and opens the payment popup.
// Docs: https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/

const SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

declare global {
  interface Window {
    Razorpay?: any;
  }
}

let scriptPromise: Promise<boolean> | null = null;

export const loadRazorpay = (): Promise<boolean> => {
  if (window.Razorpay) return Promise.resolve(true);
  if (!scriptPromise) {
    scriptPromise = new Promise(resolve => {
      const script = document.createElement('script');
      script.src = SCRIPT_URL;
      script.async = true;
      script.onload = () => resolve(!!window.Razorpay);
      script.onerror = () => {
        scriptPromise = null; // allow another attempt later
        resolve(false);
      };
      document.body.appendChild(script);
    });
  }
  return scriptPromise;
};

export interface RazorpaySuccess {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export type RazorpayResult =
  | { status: 'success'; response: RazorpaySuccess }
  | { status: 'dismissed' }
  | { status: 'failed'; message: string };

export interface RazorpayCheckoutOptions {
  key: string;
  orderId: string;
  amount?: number;
  currency?: string;
  description?: string;
  prefill?: { name?: string; email?: string; contact?: string };
}

/** Opens the Razorpay popup and resolves once the customer pays or closes it. */
export const openRazorpayCheckout = (opts: RazorpayCheckoutOptions): Promise<RazorpayResult> =>
  new Promise(resolve => {
    let settled = false;
    // Razorpay keeps the popup open after a failed attempt so the customer can try another
    // method; remember the reason so closing the popup afterwards reports it.
    let lastFailure = '';

    const finish = (result: RazorpayResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const rzp = new window.Razorpay({
      key: opts.key,
      order_id: opts.orderId,
      ...(opts.amount ? { amount: opts.amount } : {}),
      currency: opts.currency || 'INR',
      name: 'Allura Boutique',
      description: opts.description || 'Order payment',
      prefill: opts.prefill,
      theme: { color: '#561C08' },
      handler: (response: RazorpaySuccess) => finish({ status: 'success', response }),
      modal: {
        ondismiss: () => finish(lastFailure ? { status: 'failed', message: lastFailure } : { status: 'dismissed' }),
      },
    });

    rzp.on('payment.failed', (event: any) => {
      lastFailure = event?.error?.description || event?.error?.reason || 'Payment failed';
    });

    rzp.open();
  });
