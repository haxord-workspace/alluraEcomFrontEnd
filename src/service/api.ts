import axios from 'axios';
import type { AxiosRequestConfig } from 'axios';
import { attachRequestGuards } from './requestGuards';

// Base URL for the backend API, loaded from environment variables
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ─── Customer session cookies ────────────────────────────────────────────────
// POST /auth/refresh and /auth/logout take the refresh token in the request body,
// so both tokens are kept in cookies the app can read.

export const CUSTOMER_TOKEN_COOKIE = 'token';
export const CUSTOMER_REFRESH_COOKIE = 'refreshToken';
/** Fired when the session can't be renewed; ShopContext signs the customer out */
export const CUSTOMER_SESSION_EXPIRED_EVENT = 'allura:customer-session-expired';

const readCookie = (name: string): string | null => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
};

const writeCookie = (name: string, value: string, maxAgeSeconds: number) => {
  document.cookie = `${name}=${value}; path=/; max-age=${maxAgeSeconds}; SameSite=Strict`;
};

export const getCustomerToken = () => readCookie(CUSTOMER_TOKEN_COOKIE);
export const getCustomerRefreshToken = () => readCookie(CUSTOMER_REFRESH_COOKIE);

/** Saves the access / refresh tokens from a login, register or refresh response */
export const storeCustomerTokens = (body: any) => {
  const data = body?.data || body;
  const accessToken = data?.accessToken || data?.token || data?.tokens?.accessToken || body?.accessToken || body?.token;
  const refreshToken = data?.refreshToken || data?.tokens?.refreshToken || body?.refreshToken;
  if (accessToken) writeCookie(CUSTOMER_TOKEN_COOKIE, accessToken, 86400);
  if (refreshToken) writeCookie(CUSTOMER_REFRESH_COOKIE, refreshToken, 7 * 86400);
  return { accessToken: accessToken as string | undefined, refreshToken: refreshToken as string | undefined };
};

export const clearCustomerTokens = () => {
  writeCookie(CUSTOMER_TOKEN_COOKIE, '', 0);
  writeCookie(CUSTOMER_REFRESH_COOKIE, '', 0);
};

/**
 * True when the customer has a session the API can use: a valid-looking access token,
 * or a refresh token that can get a new one.
 */
export const hasCustomerSession = (): boolean => !!(getCustomerToken() || getCustomerRefreshToken());

// ─── Axios instance ──────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Ensure cookies are sent with cross-origin requests
  withCredentials: true,
});

// Attach the access token
api.interceptors.request.use(
  (config) => {
    const token = getCustomerToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// One refresh at a time; requests that 401 meanwhile wait for it
let refreshPromise: Promise<string> | null = null;

const refreshAccessToken = (): Promise<string> => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = getCustomerRefreshToken();
      if (!refreshToken) throw new Error('No refresh token');
      // Plain axios (not `api`) so this call never triggers the interceptor itself
      const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken }, { withCredentials: true });
      const { accessToken } = storeCustomerTokens(response.data);
      if (!accessToken) throw new Error('Refresh response had no access token');
      return accessToken;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
};

// On 401: renew the access token once and retry; if that's impossible, end the session
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;
    const isAuthEndpoint = /\/auth\/(login|register|refresh|logout|google)$/.test(original?.url || '');

    if (error.response?.status === 401 && original && !original._retry && !isAuthEndpoint) {
      original._retry = true;
      try {
        const token = await refreshAccessToken();
        original.headers = { ...(original.headers || {}), Authorization: `Bearer ${token}` };
        return api(original);
      } catch {
        clearCustomerTokens();
        window.dispatchEvent(new Event(CUSTOMER_SESSION_EXPIRED_EVENT));
      }
    }
    return Promise.reject(error);
  }
);

attachRequestGuards(api);

export default api;
