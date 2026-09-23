import axios from 'axios';
import type { AxiosRequestConfig } from 'axios';
import { API_BASE_URL } from './api';
import {
  getAdminAccessToken,
  setAdminAccessToken,
  clearAdminAccessToken,
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

// ─── Admin Axios Instance ─────────────────────────────────────────────────────

const adminApi = axios.create({
  baseURL: API_BASE_URL,
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

    // Only attempt refresh on 401 and if we haven't already retried this request
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        // Another refresh is already in flight — queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers['Authorization'] = `Bearer ${token}`;
            }
            return adminApi(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Call refresh endpoint — browser auto-sends httpOnly refresh cookie
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const newToken =
          refreshResponse.data?.data?.accessToken ||
          refreshResponse.data?.accessToken ||
          refreshResponse.data?.data?.token ||
          refreshResponse.data?.token;

        if (newToken) {
          setAdminAccessToken(newToken);
          processQueue(null, newToken);

          if (originalRequest.headers) {
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
          }
          return adminApi(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed — there's no valid session (or never was one, e.g.
        // a fresh visit to /admin/login itself). Just clear local state and
        // let it reject; AdminLayout's own <Navigate> already redirects
        // unauthenticated visitors to /admin/login client-side. A forced
        // `window.location.href` reload here used to retrigger the mount-time
        // session check, which 401s again, which reloads again — an infinite
        // reload loop that also stomped on in-progress login submissions.
        processQueue(refreshError, null);
        clearAdminAccessToken();

        // Dynamically import store to avoid circular dep, then dispatch clearAdmin
        import('../store').then(({ store }) => {
          import('../store/slices/adminAuthSlice').then(({ clearAdmin }) => {
            store.dispatch(clearAdmin());
          });
        });

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default adminApi;
