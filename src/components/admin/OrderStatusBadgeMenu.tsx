import React from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';
import { OrderQuickStatusMenu } from './OrderQuickStatusMenu';
import { toBackendStatus } from '../../service/orders';
import { isTerminalOrderStatus } from '../../utils/adminOrderTransitions';
import type { Order } from '../../types';

interface OrderStatusBadgeMenuProps {
  order: Order;
  onChanged: () => void;
}

// Shared fixed size for every ORDER STATUS pill in the orders list (clickable or
// plain), so every row lines up regardless of label length. Fits "Processing"
// (the longest label) with comfortable padding. Used only on this page — the
// shared StatusBadge component defaults to its original, unconstrained size
// everywhere else, since `fixedSize` is optional.
export const ORDER_STATUS_PILL_SIZE = 'w-[116px] h-7';

/**
 * Makes the ORDER STATUS badge itself the quick-status trigger (instead of the
 * separate chevron next to MANAGE). Reuses OrderQuickStatusMenu's menu/options/
 * confirm/API logic via its `renderTrigger` prop — nothing here duplicates that.
 * Terminal statuses (Cancelled/Returned) render a plain, non-clickable badge.
 */
export const OrderStatusBadgeMenu: React.FC<OrderStatusBadgeMenuProps> = ({ order, onChanged }) => {
  const rawStatus = (order.rawStatus || toBackendStatus(order.orderStatus)).toUpperCase();

  if (isTerminalOrderStatus(rawStatus)) {
    return <StatusBadge status={order.orderStatus} size="sm" fixedSize={ORDER_STATUS_PILL_SIZE} />;
  }

  return (
    <OrderQuickStatusMenu
      order={order}
      onChanged={onChanged}
      renderTrigger={({ isOpen, isBusy, triggerProps }) => (
        <button
          {...triggerProps}
          type="button"
          aria-label={`Order status: ${order.orderStatus}. Change status`}
          title="Change status"
          className="inline-block rounded-full cursor-pointer hover:brightness-95 active:brightness-90 transition-[filter] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-stone-400 disabled:cursor-not-allowed"
        >
          <StatusBadge
            status={order.orderStatus}
            size="sm"
            fixedSize={ORDER_STATUS_PILL_SIZE}
            trailingSlot={
              isBusy ? (
                <Loader2 size={12} className="animate-spin shrink-0" />
              ) : (
                <ChevronDown size={14} className={`shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              )
            }
          />
        </button>
      )}
    />
  );
};
