/**
 * Mirrors backend OrderStateMachine. Update both together.
 *
 * Backend-enforced graph for admin PATCH /admin/orders/{id}/status and
 * POST /admin/orders/{id}/cancel (a disallowed jump returns 400 INVALID_ORDER_TRANSITION):
 *   PENDING    -> CONFIRMED | CANCELLED
 *   CONFIRMED  -> PROCESSING | CANCELLED
 *   PROCESSING -> SHIPPED | CANCELLED
 *   SHIPPED    -> DELIVERED | RETURNED
 *   DELIVERED  -> RETURNED
 * CANCELLED and RETURNED are terminal (no outgoing transitions).
 *
 * Keys and values are backend status strings (e.g. "PENDING", "CONFIRMED").
 */
export const ADMIN_ORDER_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'RETURNED'],
  DELIVERED: ['RETURNED'],
  CANCELLED: [],
  RETURNED: [],
};

export const isTerminalOrderStatus = (backendStatus: string): boolean =>
  (ADMIN_ORDER_TRANSITIONS[backendStatus] ?? []).length === 0;
