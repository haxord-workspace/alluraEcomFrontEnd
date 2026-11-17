import api from './api';
import adminApi from './adminApi';
import { getBackendErrorMessage } from '../utils/apiResponse';
import type { CustomerNotification } from '../types';
import type {
  Notification,
  NotificationStatus,
  BusinessEvent,
  NotificationRecipient,
  NotificationPayload,
  NotificationMeta,
  NotificationList,
  DeviceTokenInput,
  SendNotificationInput,
  BroadcastNotificationInput,
} from '../types/notification';

// -----------------------------------------------------------------------------
// Notification endpoints (Swagger confirmed, see src/types/notification.ts)
// Customer: GET /notifications, GET /notifications/unread-count,
//           PATCH /notifications/{id}/read, PATCH /notifications/read-all,
//           POST /notifications/device-tokens, DELETE /notifications/device-tokens
// Admin:    GET /admin/notifications, GET /admin/notifications/{id},
//           POST /admin/notifications/{id}/retry, POST /admin/notifications/send,
//           POST /admin/notifications/broadcast
// -----------------------------------------------------------------------------

const unwrap = (response: any) => response?.data?.data ?? response?.data;

export const notificationErrorMessage = (error: any, fallback: string): string =>
  getBackendErrorMessage(error, fallback);

// ── Customer ─────────────────────────────────────────────────────────────────

const mapNotification = (raw: any): CustomerNotification => ({
  id: raw?.id || raw?._id || '',
  title: raw?.title || '',
  message: raw?.message || '',
  category: raw?.category || 'Account',
  timestamp: raw?.timestamp || raw?.createdAt || '',
  isRead: !!raw?.isRead,
  actionUrl: raw?.actionUrl ?? undefined,
  actionLabel: raw?.actionLabel ?? undefined,
});

export interface NotificationListParams {
  page?: number;
  limit?: number;
}

/** GET /notifications */
export const getMyNotifications = async (params: NotificationListParams = {}): Promise<CustomerNotification[]> => {
  const response = await api.get('/notifications', { params });
  const data = unwrap(response);
  const list = Array.isArray(data) ? data : data?.notifications || data?.items || [];
  return (Array.isArray(list) ? list : []).map(mapNotification);
};

/** GET /notifications/unread-count */
export const getUnreadCount = async (): Promise<number> => {
  const response = await api.get('/notifications/unread-count');
  const data = unwrap(response);
  return Number(data?.count ?? 0);
};

/** PATCH /notifications/{id}/read */
export const markNotificationRead = async (id: string): Promise<void> => {
  await api.patch(`/notifications/${id}/read`);
};

/** PATCH /notifications/read-all */
export const markAllNotificationsRead = async (): Promise<void> => {
  await api.patch('/notifications/read-all');
};

/** POST /notifications/device-tokens */
export const registerDeviceToken = async (input: DeviceTokenInput): Promise<void> => {
  await api.post('/notifications/device-tokens', input);
};

/** DELETE /notifications/device-tokens */
export const removeDeviceToken = async (token: string): Promise<void> => {
  await api.delete('/notifications/device-tokens', { data: { token } });
};

// ── Admin ─────────────────────────────────────────────────────────────────────
// Swagger documents the query params for GET /admin/notifications but gives no
// response schema; mapAdminNotification below is built from a real sample
// response (see types/notification.ts header) rather than Swagger, and stays
// tolerant of alternate field-name variants the same way orders.ts does.

const mapRecipient = (raw: any): NotificationRecipient => ({
  id: raw?.id || raw?._id || '',
  name: raw?.name || '',
  email: raw?.email || '',
});

const mapPayload = (raw: any): NotificationPayload => ({ ...(raw || {}) });

export const mapAdminNotification = (raw: any): Notification => ({
  id: raw?.id || raw?._id || '',
  businessEvent: raw?.businessEvent || raw?.type || raw?.event || '',
  dedupeKey: raw?.dedupeKey,
  recipientId: raw?.recipientId || raw?.customerId || raw?.userId || '',
  recipientType: raw?.recipientType || 'USER',
  recipient: mapRecipient(raw?.recipient),
  channels: Array.isArray(raw?.channels) ? raw.channels.map((c: any) => String(c).toUpperCase()) : [],
  status: String(raw?.status || 'PENDING').toUpperCase(),
  templateCode: raw?.templateCode,
  payload: mapPayload(raw?.payload),
  relatedEntityType: raw?.relatedEntityType,
  relatedEntityId: raw?.relatedEntityId,
  isRead: !!raw?.isRead,
  readAt: raw?.readAt,
  createdAt: raw?.createdAt || raw?.timestamp || '',
  updatedAt: raw?.updatedAt || raw?.createdAt || '',
  displayTitle: raw?.displayTitle || raw?.payload?.title || '',
  displayMessage: raw?.displayMessage || raw?.payload?.message || '',
  failureReason: raw?.failureReason || raw?.errorMessage,
});

export interface AdminNotificationListParams {
  page?: number;
  limit?: number;
  status?: NotificationStatus;
  businessEvent?: BusinessEvent;
  recipientId?: string;
  from?: string;
  to?: string;
}

const cleanParams = (params?: Record<string, any>) =>
  Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== ''));

const mapMeta = (response: any, notificationsLength: number, fallbackLimit: number, fallbackPage: number): NotificationMeta => {
  const meta = response?.data?.meta || response?.data?.data?.meta || {};
  return {
    total: typeof meta.total === 'number' ? meta.total : notificationsLength,
    page: meta.page ?? fallbackPage,
    limit: meta.limit ?? fallbackLimit,
    totalPages: meta.totalPages ?? Math.max(1, Math.ceil((meta.total ?? notificationsLength) / (meta.limit ?? fallbackLimit))),
  };
};

/** GET /admin/notifications */
export const getAdminNotifications = async (params: AdminNotificationListParams = {}): Promise<NotificationList> => {
  const limit = params.limit ?? 20;
  const page = params.page ?? 1;
  const response = await adminApi.get('/admin/notifications', { params: cleanParams({ ...params, limit, page }) });
  const data = unwrap(response);
  const list = Array.isArray(data) ? data : data?.notifications || data?.items || data?.docs || [];
  const notifications = Array.isArray(list) ? list.map(mapAdminNotification) : [];
  return { notifications, meta: mapMeta(response, notifications.length, limit, page) };
};

/** GET /admin/notifications/{id} */
export const getAdminNotification = async (id: string): Promise<Notification> => {
  const response = await adminApi.get(`/admin/notifications/${id}`);
  return mapAdminNotification(unwrap(response));
};

/**
 * POST /admin/notifications/{id}/retry — retries only the failed channels for
 * that notification. The single shared function: both the Notifications Hub's
 * "Retry failed" button and the admin orders "Remind" flow call this same one.
 */
export const retryNotification = async (id: string): Promise<Notification | null> => {
  const response = await adminApi.post(`/admin/notifications/${id}/retry`);
  const data = unwrap(response);
  return data && (data._id || data.id) ? mapAdminNotification(data) : null;
};

/**
 * POST /admin/notifications/send — sends a message to one specific recipient.
 * Runs inline (no queue hop) and is repeatable by design: sending a second
 * message later is never deduped against an earlier one, so callers (e.g. the
 * payment reminder flow) must apply their own cooldown if they want one.
 *
 * The request body has no "type"/businessEvent field — the backend assigns
 * that internally. There's also no dedicated order-reference field; use
 * `actionUrl` (a deep link) for that.
 */
export const sendNotification = async (input: SendNotificationInput): Promise<void> => {
  await adminApi.post('/admin/notifications/send', input);
};

/**
 * POST /admin/notifications/broadcast — enqueues a single background job that
 * fans out to every ACTIVE customer. Returns 202 immediately; the response
 * body is undocumented, so callers should treat any 2xx as success.
 */
export const broadcastNotification = async (input: BroadcastNotificationInput): Promise<void> => {
  await adminApi.post('/admin/notifications/broadcast', input);
};
