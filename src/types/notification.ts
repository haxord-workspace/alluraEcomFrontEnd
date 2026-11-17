// -----------------------------------------------------------------------------
// Notifications
//
// The customer-facing shape (CustomerNotificationView) is identical to the
// `CustomerNotification` type already in src/types/index.ts (which already
// backs ShopContext's notifications/markNotificationAsRead/etc. and the
// existing /account/notifications page) — reuse that one instead of
// duplicating it here.
//
// The admin list/detail item shape below (`Notification`) is confirmed from a
// real backend response sample (GET /admin/notifications), not from Swagger —
// the live spec documents the query params but gives no response schema.
// Unions include `| (string & {})` so a new backend value (status, channel,
// businessEvent) is still accepted at the type level instead of crashing the
// UI; render code must still handle the "unknown value" case gracefully.
// -----------------------------------------------------------------------------

/** Confirmed enum values, from GET /admin/notifications's `status` query param, plus
 *  `DELIVERED` seen in sample data. Unknown future values fall back gracefully in the UI. */
export type NotificationStatus =
  | 'PENDING'
  | 'QUEUED'
  | 'SENT'
  | 'DELIVERED'
  | 'FAILED'
  | 'PARTIALLY_SENT'
  | (string & {});

/** Confirmed enum values, from GET /admin/notifications's `businessEvent` query param */
export type BusinessEvent =
  | 'ORDER_CREATED'
  | 'ORDER_STATUS_UPDATED'
  | 'ORDER_CANCELLED'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_REMINDER'
  | 'ABANDONED_CART_REMINDER'
  | 'WELCOME_CUSTOMER'
  | 'MARKETING_BROADCAST'
  | 'DIRECT_MESSAGE'
  | 'NEW_CUSTOMER_REGISTERED'
  | 'NEW_ORDER_RECEIVED'
  | 'LOW_STOCK_ALERT'
  | 'PAYMENT_FAILURE_ALERT'
  | 'INTEGRATION_FAILURE_ALERT'
  | (string & {});

/** Channels seen on list/detail items and in the analytics endpoint's `channelsSupported`. */
export type NotificationChannel = 'EMAIL' | 'WHATSAPP' | 'FCM' | 'PUSH' | (string & {});

/**
 * Confirmed: the `channels` enum accepted by the request bodies of
 * POST /admin/notifications/send and POST /admin/notifications/broadcast.
 * Narrower than the response-side `NotificationChannel` on purpose — the
 * backend only accepts these two for outbound sends today.
 */
export type NotificationSendChannel = 'EMAIL' | 'PUSH';

export interface NotificationRecipient {
  id: string;
  name: string;
  email: string;
}

/**
 * Payload shape varies by businessEvent. Known keys are typed as optional;
 * anything else the backend adds is still readable (not `any`) via the index
 * signature, and must be rendered defensively (optional chaining, no raw
 * "undefined"/"null" text).
 */
export interface NotificationPayload {
  // DIRECT_MESSAGE
  title?: string;
  message?: string;
  actionUrl?: string;
  actionLabel?: string;
  // Order / payment events
  orderNumber?: string;
  status?: string;
  totalAmount?: number;
  currency?: string;
  customerName?: string;
  [key: string]: unknown;
}

export interface Notification {
  id: string;
  businessEvent: BusinessEvent;
  dedupeKey?: string;
  recipientId: string;
  recipientType: string;
  recipient: NotificationRecipient;
  channels: NotificationChannel[];
  status: NotificationStatus;
  templateCode?: string;
  payload: NotificationPayload;
  relatedEntityType?: string;
  relatedEntityId?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
  displayTitle: string;
  displayMessage: string;
  /** Not present in the backend response today. Typed ahead of time so the detail
   *  view can show it the moment the backend adds it, without another UI change. */
  failureReason?: string;
}

export interface NotificationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface NotificationList {
  notifications: Notification[];
  meta: NotificationMeta;
}

/** Confirmed: GET /admin/dashboard/notifications response `data` */
export interface NotificationAnalytics {
  queueStatus: string;
  counts: {
    waiting: number;
    active: number;
    failed: number;
    completed: number;
  };
  channelsSupported: NotificationChannel[];
}

/** Confirmed: components.schemas.DeviceTokenInput */
export interface DeviceTokenInput {
  token: string;
  deviceId?: string;
  platform?: 'WEB' | 'ANDROID' | 'IOS';
}

/**
 * Confirmed: POST /admin/notifications/send request body. No "type" field
 * exists — the backend assigns the businessEvent internally. `channels`
 * defaults to EMAIL only if omitted.
 */
export interface SendNotificationInput {
  recipientId: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  channels?: NotificationSendChannel[];
}

/** Confirmed: components.schemas.BroadcastInput (POST /admin/notifications/broadcast) */
export interface BroadcastNotificationInput {
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  channels?: NotificationSendChannel[];
}
