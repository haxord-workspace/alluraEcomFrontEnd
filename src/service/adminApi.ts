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

    // Only attempt refresh on 401 and if we haven't already retried this request
    if (error.response?.status === 401 && !originalRequest._retry) {
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
        // Refresh failed — session is dead, clear everything and redirect
        processQueue(refreshError, null);
        clearAdminAccessToken();

        // Dynamically import store to avoid circular dep, then dispatch clearAdmin
        import('../store').then(({ store }) => {
          import('./adminApi').then(() => {
            import('../store/slices/adminAuthSlice').then(({ clearAdmin }) => {
              store.dispatch(clearAdmin());
            });
          });
        });

        // Redirect to admin login
        if (typeof window !== 'undefined') {
          window.location.href = '/admin/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default adminApi;
