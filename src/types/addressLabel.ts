// JSON preview shape for GET /orders/:orderId/address-label and
// GET /admin/orders/:orderId/address-label when called with ?format=json.

export interface AddressLabelParty {
  name: string;
  addressLines: string[];
  phone?: string;
  email?: string;
  gstin?: string;
}

export interface AddressLabelPayment {
  mode: 'PREPAID' | 'COD';
  amountToCollect: number | null;
  currency: string;
}

export interface AddressLabelPreview {
  orderNumber: string;
  orderDate: string;
  status: string;
  itemCount: number;
  payment: AddressLabelPayment;
  from: AddressLabelParty;
  to: AddressLabelParty;
}

export type AddressLabelSize = '4x6' | 'A4';

export interface BulkAddressLabelResult {
  /** Slips actually printed, read from the `X-Label-Count` response header (null if unreadable). */
  labelCount: number | null;
  /** Order ids skipped because they weren't found, from `X-Orders-Not-Found` (null if unreadable). */
  ordersNotFound: string[] | null;
}
