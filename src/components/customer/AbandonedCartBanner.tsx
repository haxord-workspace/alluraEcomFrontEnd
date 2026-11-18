import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, X, ArrowRight } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { getMyAbandonedCartStatus } from '../../service/abandonedCarts';
import { hasCustomerSession } from '../../service/api';

const DISMISS_KEY = 'allura_abandoned_banner_dismissed';
const CHECKED_KEY = 'allura_abandoned_status';

const readSession = (key: string) => {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
};
const writeSession = (key: string, value: string) => {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* storage unavailable: the banner just won't remember */
  }
};

/**
 * "Your bag is waiting" reminder for customers whose cart the backend has marked as abandoned
 * (GET /abandoned-cart/status). Checked once per browser session; dismissible.
 */
export const AbandonedCartBanner: React.FC = () => {
  const { customer, cart, cartCount, formatPrice } = useShop();
  const [isAbandoned, setIsAbandoned] = useState(() => readSession(CHECKED_KEY) === 'yes');
  const [dismissed, setDismissed] = useState(() => readSession(DISMISS_KEY) === '1');

  useEffect(() => {
    if (!customer || !hasCustomerSession() || dismissed || readSession(CHECKED_KEY)) return;
    let cancelled = false;
    getMyAbandonedCartStatus()
      .then(status => {
        if (cancelled) return;
        writeSession(CHECKED_KEY, status.isAbandoned ? 'yes' : 'no');
        setIsAbandoned(status.isAbandoned);
      })
      .catch(() => {
        /* the banner is optional; ignore failures */
      });
    return () => {
      cancelled = true;
    };
  }, [customer, dismissed]);

  if (!customer || dismissed || !isAbandoned || cart.length === 0) return null;

  const first = cart[0];
  const value = cart.reduce((sum, i) => sum + (i.unitPrice ?? i.product.price) * i.quantity, 0);

  const dismiss = () => {
    writeSession(DISMISS_KEY, '1');
    setDismissed(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
      <div className="relative flex flex-col sm:flex-row sm:items-center gap-4 p-4 sm:p-5 rounded-2xl border border-allura-gold/40 bg-allura-card shadow-subtle">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {first?.product.images.primary ? (
            <img src={first.product.images.primary} alt="" className="w-12 h-14 object-cover object-top rounded-lg bg-allura-bgSecondary flex-shrink-0" />
          ) : (
            <div className="w-12 h-14 rounded-lg bg-allura-bgSecondary flex items-center justify-center text-allura-goldDark flex-shrink-0">
              <ShoppingBag size={18} />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-serif text-lg text-allura-text leading-tight">Your bag is waiting, {customer.name.split(' ')[0]}</p>
            <p className="text-xs font-sans text-allura-muted truncate">
              {first?.product.name}
              {cartCount > 1 ? ` and ${cartCount - 1} more` : ''} · {formatPrice(value)}
            </p>
          </div>
        </div>
        <Link
          to="/cart"
          onClick={dismiss}
          className="inline-flex items-center justify-center gap-2 bg-allura-goldDark hover:bg-allura-darkBrown text-allura-card text-xs font-sans font-bold tracking-[0.2em] uppercase py-3 px-5 rounded-sm transition-colors"
        >
          <span>Complete your order</span>
          <ArrowRight size={14} />
        </Link>
        <button
          onClick={dismiss}
          className="absolute top-2 right-2 p-1 text-allura-muted hover:text-allura-text"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};
