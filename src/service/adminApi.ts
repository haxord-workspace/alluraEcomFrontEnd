import axios from 'axios';
import type { AxiosRequestConfig } from 'axios';
import { API_BASE_URL } from './api';
import { attachRequestGuards } from './requestGuards';
import {
  getAdminAccessToken,
  getAdminRefreshToken,
  storeAdminTokens,
  clearAdminSession,
} from '../store/slices/adminAuthSlice';

// Track whether a refresh is already in flight to avoid parallel refreshes
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: any) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

/** Helper to cleanly end the admin session and notify listeners */
const endAdminSession = (message: string) => {
  clearAdminSession();
  import('../store').then(({ store }) => {
    import('../store/slices/adminAuthSlice').then(({ clearAdmin }) => {
      store.dispatch(clearAdmin());
    });
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('allura:admin-auth-error', {
        detail: { message, redirectToLogin: true },
      })
    );
  }
};

// ─── Admin Axios Instance ─────────────────────────────────────────────────────

const adminApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 45000,
  headers: { 'Content-Type': 'application/json' },
  // withCredentials ensures the browser sends httpOnly refresh-token cookie
  withCredentials: true,
});

// ─── Request Interceptor — attach access token from cookie ───────────────────

adminApi.interceptors.request.use(
  (config) => {
    const token = getAdminAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor — silent token refresh on 401 ─────────────────────

adminApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Never run the refresh dance for the auth endpoints themselves — a 401
    // from /auth/login means "wrong credentials", not "expired session", and
    // retrying it after a (futile) refresh attempt would just mask the real
    // error and waste a round trip on every failed login attempt.
    const isAuthEndpoint = /\/auth\/(login|refresh|register|logout)$/.test(
      originalRequest.url || ''
    );

    const status = error.response?.status;
    const code =
      error.response?.data?.error?.code ||
      (typeof error.response?.data?.error === 'string' ? error.response?.data?.error : undefined) ||
      error.response?.data?.code;

    // 1) Expired access token → ONE refresh (others wait in the queue) → retry
    if (status === 401 && code === 'TOKEN_EXPIRED' && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => failedQueue.push({ resolve, reject }))
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers['Authorization'] = `Bearer ${token}`;
            }
            return adminApi(originalRequest);
          });
      }
      originalRequest._retry = true;
      isRefreshing = true;
      try {
        const refreshToken = getAdminRefreshToken();
        if (!refreshToken) throw new Error('No admin refresh token');
        const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken }, { withCredentials: true });
        const { accessToken } = storeAdminTokens(res.data);
        if (!accessToken) throw new Error('Refresh response did not include an access token');
        processQueue(null, accessToken);
        if (originalRequest.headers) {
          originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
        }
        return adminApi(originalRequest);
      } catch (refreshError: any) {
        processQueue(refreshError, null);
        if (refreshError?.response?.status === 401 || refreshError?.message === 'No admin refresh token') {
          endAdminSession('Your session has expired. Please sign in again.');
        }
        // network error / 5xx on refresh → do NOT log out; just fail this request
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    // 2) Invalid or missing token → sign in again (no refresh attempt)
    if (status === 401 && !isAuthEndpoint && (code === 'INVALID_TOKEN' || code === 'UNAUTHORIZED')) {
      endAdminSession('Please sign in again.');
      return Promise.reject(error);
    }

    // 3) Older backend without codes (401 + no code) → keep today's behaviour (refresh once)
    if (status === 401 && !code && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => failedQueue.push({ resolve, reject }))
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers['Authorization'] = `Bearer ${token}`;
            }
            return adminApi(originalRequest);
          });
      }
      originalRequest._retry = true;
      isRefreshing = true;
      try {
        const refreshToken = getAdminRefreshToken();
        if (!refreshToken) throw new Error('No admin refresh token');
        const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken }, { withCredentials: true });
        const { accessToken } = storeAdminTokens(res.data);
        if (!accessToken) throw new Error('Refresh response did not include an access token');
        processQueue(null, accessToken);
        if (originalRequest.headers) {
          originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
        }
        return adminApi(originalRequest);
      } catch (refreshError: any) {
        processQueue(refreshError, null);
        if (refreshError?.response?.status === 401 || refreshError?.message === 'No admin refresh token') {
          endAdminSession('Your session has expired. Please sign in again.');
        }
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    // 4) 403 handling: unchanged (ACCOUNT_INACTIVE / FORBIDDEN → endAdminSession,
    //    PERMISSION_DENIED → dispatch "allura:permission-denied")
    if (status === 403) {
      const data = error.response?.data;
      const errorCode = code;
      const details = data?.error?.details || data?.details;
      const detail0 = Array.isArray(details) && details.length > 0 ? details[0] : undefined;
      const errModule = detail0?.module;
      const errAction = detail0?.action;
      const serverMessage = data?.message || data?.error?.message;

      if (errorCode === 'ACCOUNT_INACTIVE') {
        endAdminSession('Your account has been deactivated. Contact the Super Admin.');
        return Promise.reject(error);
      }

      if (errorCode === 'FORBIDDEN') {
        endAdminSession('Admin access only.');
        return Promise.reject(error);
      }

      // PERMISSION_DENIED (or any other 403)
      const friendlyMessage =
        serverMessage && typeof serverMessage === 'string'
          ? serverMessage
          : errModule && errAction
            ? `Permission denied: ${errModule}:${errAction}.`
            : 'You do not have permission to perform this action.';

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('allura:permission-denied', {
            detail: {
              code: errorCode || 'PERMISSION_DENIED',
              message: friendlyMessage,
              module: errModule,
              action: errAction,
              status: 403,
              url: originalRequest?.url,
            },
          })
        );
      }
    }

    return Promise.reject(error);
  }
);

attachRequestGuards(adminApi);

export default adminApi;
