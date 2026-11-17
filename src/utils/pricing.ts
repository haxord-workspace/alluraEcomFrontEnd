/**
 * Subtotal → payable total, shared by the Cart and Checkout order summaries so
 * both pages always agree on the same number for the same inputs.
 */
export const computeOrderTotal = (subtotal: number, discount: number, shipping: number): number =>
  Math.max(0, subtotal - discount) + shipping;
