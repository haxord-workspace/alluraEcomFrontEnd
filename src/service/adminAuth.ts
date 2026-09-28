import adminApi from './adminApi';
import {
  getAdminRefreshToken,
  storeAdminTokens,
  clearAdminSession,
} from '../store/slices/adminAuthSlice';

export interface AdminLoginResponse {
  admin?: Record<string, any>;
  user?: Record<string, any>;
  accessToken?: string;
  token?: string;
  data?: {
    admin?: Record<string, any>;
    user?: Record<string, any>;
    accessToken?: string;
    token?: string;
  };
  [key: string]: any;
}

/**
 * Login as admin.
 * POST /admin/auth/login
 * The backend sets the httpOnly refresh-token cookie automatically.
 * We store the short-lived access token in a JS-readable cookie.
 */
export const adminLogin = async (
  email: string,
  password: string
): Promise<AdminLoginResponse> => {
  const response = await adminApi.post<AdminLoginResponse>('/auth/login', {
    email,
    password,
  });
  const data = response.data?.data || response.data;
  storeAdminTokens(response.data);
  return data;
};

/**
 * Refresh the admin access token.
 * POST /auth/refresh with { refreshToken }
 */
export const refreshAdminToken = async (): Promise<string | null> => {
  const refreshToken = getAdminRefreshToken();
  if (!refreshToken) return null;
  try {
    const response = await adminApi.post('/auth/refresh', { refreshToken });
    return storeAdminTokens(response.data).accessToken || null;
  } catch {
    clearAdminSession();
    return null;
  }
};

/**
 * Logout from admin session.
 * POST /admin/auth/logout
 * Clears the access token cookie; backend clears the refresh cookie.
 */
export const adminLogout = async (): Promise<void> => {
  try {
    const refreshToken = getAdminRefreshToken();
    if (refreshToken) await adminApi.post('/auth/logout', { refreshToken });
  } catch {
    // Always clear client-side regardless
  } finally {
    clearAdminSession();
  }
};

/**
 * Get the currently authenticated admin's profile.
 * GET /admin/auth/me
 */
export const getAdminMe = async (): Promise<Record<string, any>> => {
  const response = await adminApi.get('/auth/me');
  return response.data?.data || response.data;
};
