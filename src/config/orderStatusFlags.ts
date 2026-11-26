// -----------------------------------------------------------------------------
// Feature flags for the manual order-status additions (frontend-only, additive).
// ON when the env var is undefined; OFF only when explicitly set to "false".
// -----------------------------------------------------------------------------

const isOff = (value: string | undefined) => value === 'false';

/** Gates the AdminOrderDetailPage additions: Shipped->Returned button, Cancel visibility, concurrency check. */
export const ENABLE_MANUAL_ORDER_STATUS = !isOff(import.meta.env.VITE_ENABLE_MANUAL_ORDER_STATUS);

/** Gates the quick-status row menu on AdminOrdersPage. */
export const ENABLE_ORDER_ROW_ACTIONS = !isOff(import.meta.env.VITE_ENABLE_ORDER_ROW_ACTIONS);

/** When ON (and ENABLE_ORDER_ROW_ACTIONS is also ON), the ORDER STATUS badge itself opens
 *  the quick-status menu and the chevron next to MANAGE is hidden. */
export const ENABLE_STATUS_BADGE_MENU = !isOff(import.meta.env.VITE_ENABLE_STATUS_BADGE_MENU);
