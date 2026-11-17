import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Loader2 } from 'lucide-react';
import { useConfirm } from '../../context/ConfirmContext';
import { useShop } from '../../context/ShopContext';
import {
  getAdminOrder,
  updateAdminOrderStatus,
  orderErrorMessage,
  toBackendStatus,
  STATUS_TO_UI,
} from '../../service/orders';
import { ADMIN_ORDER_TRANSITIONS, isTerminalOrderStatus } from '../../utils/adminOrderTransitions';
import { openExclusiveMenu, closeExclusiveMenu } from './orderStatusMenuCoordinator';
import type { Order } from '../../types';

interface TriggerState {
  isOpen: boolean;
  isBusy: boolean;
  triggerProps: {
    ref: React.Ref<HTMLButtonElement>;
    onClick: () => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
    'aria-haspopup': 'menu';
    'aria-expanded': boolean;
    disabled: boolean;
  };
}

interface OrderQuickStatusMenuProps {
  order: Order;
  /** Called after a successful status change so the list/KPIs can refetch. */
  onChanged: () => void;
  /**
   * Optional custom trigger (e.g. the order-status badge). Receives the state/handlers
   * needed to open the menu and must spread `triggerProps` onto a real, focusable
   * element (ideally a <button>). Defaults to the existing chevron button.
   */
  renderTrigger?: (state: TriggerState) => React.ReactNode;
}

// Targets handled with a small confirm dialog + direct PATCH, status only.
// SHIPPED needs courier/tracking fields and CANCELLED needs a mandatory reason —
// both already have a full form on the detail page, so we navigate there instead
// of duplicating a second, divergent form here.
const NAVIGATE_TARGETS = new Set(['SHIPPED', 'CANCELLED']);
const MENU_WIDTH = 208; // px, matches w-52
const MENU_MARGIN = 6;

export const OrderQuickStatusMenu: React.FC<OrderQuickStatusMenuProps> = ({ order, onChanged, renderTrigger }) => {
  const confirm = useConfirm();
  const { showToast } = useShop();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const rawStatus = (order.rawStatus || toBackendStatus(order.orderStatus)).toUpperCase();
  const targets = ADMIN_ORDER_TRANSITIONS[rawStatus] ?? [];

  const closeMenu = () => setIsOpen(false);
  const toggleOpen = () => setIsOpen(v => !v);
  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' && !isOpen) {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  // Position the portal-rendered menu against the trigger (fixed, so it's never
  // clipped by the table's scroll container), flipping upward if there isn't
  // enough room below, and clamped so it stays inside the viewport horizontally.
  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const estimatedHeight = Math.min(targets.length * 36 + 16, 260);
    const openUpward = rect.bottom + estimatedHeight > window.innerHeight && rect.top - estimatedHeight > MENU_MARGIN;
    let left = rect.left;
    if (left + MENU_WIDTH + MENU_MARGIN > window.innerWidth) left = rect.right - MENU_WIDTH;
    left = Math.max(MENU_MARGIN, Math.min(left, window.innerWidth - MENU_WIDTH - MENU_MARGIN));
    const top = openUpward ? rect.top - estimatedHeight - 4 : rect.bottom + 4;
    setMenuPos({ top, left });
  }, [isOpen, targets.length]);

  // Only one menu open at a time across the table.
  useEffect(() => {
    if (!isOpen) return;
    openExclusiveMenu(closeMenu);
    return () => closeExclusiveMenu(closeMenu);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Focus the first option once the portal has mounted.
  useEffect(() => {
    if (isOpen && menuPos) {
      menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    }
  }, [isOpen, menuPos]);

  useEffect(() => {
    if (!isOpen) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current && !menuRef.current.contains(target)) closeMenu();
    };
    const onClose = () => closeMenu();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeMenu();
        triggerRef.current?.focus();
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const items = menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');
        if (!items || items.length === 0) return;
        const current = Array.from(items).findIndex(el => el === document.activeElement);
        const next = e.key === 'ArrowDown' ? (current + 1) % items.length : (current - 1 + items.length) % items.length;
        items[next < 0 ? 0 : next]?.focus();
      }
    };
    document.addEventListener('mousedown', onDocClick);
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onClose, true);
    window.addEventListener('resize', onClose);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onClose, true);
      window.removeEventListener('resize', onClose);
    };
  }, [isOpen]);

  if (isTerminalOrderStatus(rawStatus) || targets.length === 0) return null;

  const isPaid = ['Paid', 'Captured'].includes(order.paymentStatus);
  const isCod = order.paymentMethod === 'COD';

  const applyStatus = async (target: string) => {
    setIsBusy(true);
    try {
      // Soft concurrency check: abort if someone else already moved this order.
      const latest = await getAdminOrder(order.id);
      const latestStatus = (latest.rawStatus || toBackendStatus(latest.orderStatus)).toUpperCase();
      if (latestStatus !== rawStatus) {
        showToast('This order was updated by someone else. Latest status loaded.', 'info');
        onChanged();
        return;
      }
      await updateAdminOrderStatus(order.id, { status: target });
      showToast(`Order ${order.orderNumber} is now ${STATUS_TO_UI[target] || target}`, 'success');
      onChanged();
    } catch (err) {
      showToast(orderErrorMessage(err, 'Could not update the order status'), 'error');
    } finally {
      setIsBusy(false);
    }
  };

  const handleSelect = async (target: string) => {
    setIsOpen(false);
    if (NAVIGATE_TARGETS.has(target)) {
      navigate(`/admin/orders/${order.id}`);
      return;
    }

    const toLabel = STATUS_TO_UI[target] || target;
    const fromLabel = STATUS_TO_UI[rawStatus] || rawStatus;
    const isUnpaidConfirm = target === 'CONFIRMED' && rawStatus === 'PENDING' && !isPaid && !isCod;

    const ok = await confirm({
      title: isUnpaidConfirm ? 'Payment not received' : 'Change order status',
      message: isUnpaidConfirm
        ? `${order.orderNumber} hasn't been paid yet (${order.paymentStatus}). Confirm anyway?`
        : `Change ${order.orderNumber} from ${fromLabel} to ${toLabel}?`,
      confirmLabel: target === 'RETURNED' ? 'Mark returned' : 'Confirm',
      isDestructive: target === 'RETURNED',
    });
    if (!ok) return;
    await applyStatus(target);
  };

  const itemLabel = (target: string) => {
    if (target === 'SHIPPED') return 'Add tracking and ship…';
    if (target === 'CANCELLED') return 'Cancel…';
    return `Mark as ${STATUS_TO_UI[target] || target}`;
  };

  const triggerState: TriggerState = {
    isOpen,
    isBusy,
    triggerProps: {
      ref: triggerRef,
      onClick: toggleOpen,
      onKeyDown: handleTriggerKeyDown,
      'aria-haspopup': 'menu',
      'aria-expanded': isOpen,
      disabled: isBusy,
    },
  };

  return (
    <>
      {renderTrigger ? (
        renderTrigger(triggerState)
      ) : (
        <button
          {...triggerState.triggerProps}
          type="button"
          aria-label="Quick status actions"
          title="Quick status"
          className="p-1.5 border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 rounded-lg disabled:opacity-50"
        >
          {isBusy ? <Loader2 size={12} className="animate-spin" /> : <ChevronDown size={12} />}
        </button>
      )}
      {isOpen && menuPos &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label="Quick status actions"
            style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, width: MENU_WIDTH }}
            className="z-50 bg-white border border-stone-200 rounded-xl shadow-lg py-1 text-xs font-sans"
          >
            {targets.map(target => (
              <button
                key={target}
                role="menuitem"
                type="button"
                onClick={() => handleSelect(target)}
                className="w-full text-left px-3 py-2 hover:bg-stone-50 text-stone-700 focus:outline-none focus:bg-stone-50"
              >
                {itemLabel(target)}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
};
