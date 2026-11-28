import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

// Cookie helpers
export const ADMIN_ACCESS_TOKEN_COOKIE = 'allura_admin_access';

export const getAdminAccessToken = (): string | null => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${ADMIN_ACCESS_TOKEN_COOKIE}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
};

export const setAdminAccessToken = (token: string, maxAgeSeconds = 86400) => {
  // Mirrors the backend access token's real lifetime (~24h). The short-lived
  // security boundary is the httpOnly refresh-token cookie, not this one —
  // letting this expire early just forces needless silent-refresh churn.
  document.cookie = `${ADMIN_ACCESS_TOKEN_COOKIE}=${token}; path=/; max-age=${maxAgeSeconds}; SameSite=Strict`;
};

export const clearAdminAccessToken = () => {
  document.cookie = `${ADMIN_ACCESS_TOKEN_COOKIE}=; path=/; max-age=0; SameSite=Strict`;
};

// POST /auth/refresh and /auth/logout require the refresh token in the request body,
// so it has to be kept client-side (the backend doesn't read it from a cookie).
export const ADMIN_REFRESH_TOKEN_COOKIE = 'allura_admin_refresh';

export const getAdminRefreshToken = (): string | null => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${ADMIN_REFRESH_TOKEN_COOKIE}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
};

export const setAdminRefreshToken = (token: string, maxAgeSeconds = 7 * 86400) => {
  document.cookie = `${ADMIN_REFRESH_TOKEN_COOKIE}=${token}; path=/; max-age=${maxAgeSeconds}; SameSite=Strict`;
};

/** Clears both admin tokens */
export const clearAdminSession = () => {
  clearAdminAccessToken();
  document.cookie = `${ADMIN_REFRESH_TOKEN_COOKIE}=; path=/; max-age=0; SameSite=Strict`;
};

export const clearAdminTokens = clearAdminSession;

/** Pulls the access / refresh tokens out of a login or refresh response and stores them */
export const storeAdminTokens = (body: any) => {
  const data = body?.data || body;
  const accessToken =
    data?.accessToken || data?.token || data?.tokens?.accessToken || body?.accessToken || body?.token;
  const refreshToken = data?.refreshToken || data?.tokens?.refreshToken || body?.refreshToken;
  if (accessToken) setAdminAccessToken(accessToken);
  if (refreshToken) setAdminRefreshToken(refreshToken);
  return { accessToken: accessToken as string | undefined, refreshToken: refreshToken as string | undefined };
};

export const saveAdminTokens = storeAdminTokens;

/** True when there is anything to restore a session from */
export const hasAdminSession = () => !!(getAdminAccessToken() || getAdminRefreshToken());

// ─── State ────────────────────────────────────────────────────────────────────

export interface AdminPermissions {
  role: string;
  superAdmin: boolean;
  granted: string[];
  matrix?: Record<string, Record<string, boolean | null>>;
}

export interface AdminAuthState {
  admin: Record<string, any> | null;
  permissions: AdminPermissions | null;
  isAuthenticated: boolean;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: AdminAuthState = {
  admin: null,
  permissions: null,
  isAuthenticated: false,
  // Always start 'loading' — even when the short-lived access token cookie
  // has already expired, the backend's httpOnly refresh cookie may still be
  // valid, so AdminLayout must wait for fetchAdminProfile() to resolve
  // before deciding whether to redirect to login. Gating this on the
  // access-token cookie's mere presence silently dropped sessions early.
  status: 'loading',
  error: null,
};

// ─── Async Thunks ─────────────────────────────────────────────────────────────

/**
 * Login: POST /admin/auth/login
 * Stores access token in cookie; backend sets httpOnly refresh token cookie.
 */
import { getBackendErrorMessage } from '../../utils/apiResponse';
import { normalizeAdminRole } from '../../utils/rbac';

const extractJwtRole = (token?: string | null): unknown => {
  if (!token) return undefined;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return undefined;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const payload = JSON.parse(atob(padded));
    return payload?.role ?? payload?.userRole ?? (Array.isArray(payload?.roles) ? payload.roles[0] : undefined);
  } catch {
    return undefined;
  }
};

const extractUserAndRole = (body: any, accessToken?: string | null) => {
  const data = body?.data ?? body;
  const user = data?.user || data?.admin || data;
  const rawPerms = data?.permissions || body?.permissions;
  const permissions: AdminPermissions | null = rawPerms
    ? {
        role: rawPerms.role || user?.role || '',
        superAdmin: Boolean(rawPerms.superAdmin ?? rawPerms.isSuperAdmin ?? user?.role === 'SUPER_ADMIN'),
        granted: Array.isArray(rawPerms.granted) ? rawPerms.granted : [],
        matrix: rawPerms.matrix && typeof rawPerms.matrix === 'object' ? rawPerms.matrix : undefined,
      }
    : null;

  const rawRole =
    permissions?.role ??
    user?.role ??
    user?.adminRole ??
    data?.role ??
    body?.role ??
    (Array.isArray(user?.roles) ? user.roles[0] : undefined) ??
    extractJwtRole(accessToken);

  return { user, rawRole, permissions };
};

export const loginAdmin = createAsyncThunk(
  'adminAuth/login',
  async (
    { email, password }: { email: string; password: string },
    { rejectWithValue }
  ) => {
    try {
      // Lazy import to avoid circular dependency with adminApi
      const { default: adminApi } = await import('../../service/adminApi');
      const response = await adminApi.post('/auth/login', { email, password });
      const { accessToken } = storeAdminTokens(response.data);

      // The login response does NOT contain permissions. Always call /auth/me right after login
      const meResponse = await adminApi.get('/auth/me');
      const { user, rawRole, permissions } = extractUserAndRole(meResponse.data, accessToken || getAdminAccessToken());

      const adminRole = normalizeAdminRole(rawRole);
      if (!adminRole) {
        clearAdminSession();
        return rejectWithValue('Access denied: Admin privileges are required to sign in here.');
      }

      const effectivePermissions: AdminPermissions = permissions || {
        role: adminRole,
        superAdmin: adminRole === 'SUPER_ADMIN',
        granted: [],
      };

      return {
        user: { ...(typeof user === 'object' && user ? user : {}), role: adminRole },
        permissions: effectivePermissions,
      };
    } catch (error: any) {
      clearAdminSession();
      return rejectWithValue(
        getBackendErrorMessage(error, 'Login failed. Check your credentials.')
      );
    }
  }
);

/**
 * Restore session: GET /admin/auth/me
 * Called unconditionally on app startup. Even without a readable access-token
 * cookie, this request lets adminApi's response interceptor silently refresh
 * via the httpOnly refresh-token cookie on a 401 before giving up.
 */
export const fetchAdminProfile = createAsyncThunk(
  'adminAuth/fetchProfile',
  async (_arg: { background?: boolean } | undefined, { rejectWithValue }) => {
    if (!getAdminAccessToken()) return rejectWithValue({ message: 'Not signed in', authFailure: true });
    try {
      const { default: adminApi } = await import('../../service/adminApi');
      const response = await adminApi.get('/auth/me');
      const { user, rawRole, permissions } = extractUserAndRole(response.data, getAdminAccessToken());
      const adminRole = normalizeAdminRole(rawRole);

      if (!adminRole) {
        clearAdminSession();
        return rejectWithValue({ message: 'Access denied: Active session is not an admin account.', authFailure: true });
      }

      const effectivePermissions: AdminPermissions = permissions || {
        role: adminRole,
        superAdmin: adminRole === 'SUPER_ADMIN',
        granted: [],
      };

      return {
        user: { ...(typeof user === 'object' && user ? user : {}), role: adminRole },
        permissions: effectivePermissions,
      };
    } catch (err: any) {
      const status = err?.response?.status;
      const code =
        err?.response?.data?.error?.code ||
        (typeof err?.response?.data?.error === 'string' ? err?.response?.data?.error : undefined) ||
        err?.response?.data?.code;
      const authFailure = status === 401 || code === 'ACCOUNT_INACTIVE' || code === 'FORBIDDEN';
      return rejectWithValue({
        message: getBackendErrorMessage(err, 'Session expired'),
        authFailure,
      });
    }
  }
);

export const fetchProfile = fetchAdminProfile;

/**
 * Logout: POST /admin/auth/logout
 */
export const logoutAdmin = createAsyncThunk(
  'adminAuth/logout',
  async () => {
    try {
      const refreshToken = getAdminRefreshToken();
      if (refreshToken) {
        const { default: adminApi } = await import('../../service/adminApi');
        await adminApi.post('/auth/logout', { refreshToken });
      }
    } catch {
      // Always clear client-side even if API fails
    } finally {
      clearAdminSession();
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const adminAuthSlice = createSlice({
  name: 'adminAuth',
  initialState,
  reducers: {
    setAdminAuthenticated: (state, action: PayloadAction<{ user: Record<string, any>; permissions?: AdminPermissions }>) => {
      state.admin = action.payload.user;
      state.permissions = action.payload.permissions || null;
      state.isAuthenticated = true;
      state.status = 'succeeded';
    },
    clearAdmin: (state) => {
      state.admin = null;
      state.permissions = null;
      state.isAuthenticated = false;
      state.status = 'idle';
      state.error = null;
      clearAdminSession();
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(loginAdmin.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loginAdmin.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.admin = action.payload.user;
        state.permissions = action.payload.permissions;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(loginAdmin.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
        state.admin = null;
        state.permissions = null;
        state.isAuthenticated = false;
      });

    // Fetch Profile
    builder
      .addCase(fetchAdminProfile.pending, (state, action) => {
        if (!action.meta.arg?.background) state.status = 'loading'; // background → no spinner
      })
      .addCase(fetchAdminProfile.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.admin = action.payload.user;
        state.permissions = action.payload.permissions;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(fetchAdminProfile.rejected, (state, action) => {
        const p = action.payload as { authFailure?: boolean; message?: string } | undefined;
        if (p?.authFailure) { // real session end → sign out
          state.status = 'failed';
          state.admin = null;
          state.permissions = null;
          state.isAuthenticated = false;
        } else { // network blip / 5xx → keep the session
          state.status = state.admin ? 'succeeded' : 'failed';
          state.error = p?.message ?? null;
        }
      });

    // Logout
    builder
      .addCase(logoutAdmin.fulfilled, (state) => {
        state.admin = null;
        state.permissions = null;
        state.isAuthenticated = false;
        state.status = 'idle';
        state.error = null;
      });
  },
});

export const { setAdminAuthenticated, clearAdmin } = adminAuthSlice.actions;
export default adminAuthSlice.reducer;
