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

/** True when there is anything to restore a session from */
export const hasAdminSession = () => !!(getAdminAccessToken() || getAdminRefreshToken());

// ─── State ────────────────────────────────────────────────────────────────────

export interface AdminAuthState {
  admin: Record<string, any> | null;
  isAuthenticated: boolean;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: AdminAuthState = {
  admin: null,
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
      const data = response.data?.data || response.data;
      storeAdminTokens(response.data);

      return data?.admin || data?.user || data;
    } catch (error: any) {
      return rejectWithValue(
        error?.response?.data?.message || 'Login failed. Check your credentials.'
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
  async (_, { rejectWithValue }) => {
    // Nothing to restore from: don't send a request that can only fail
    if (!hasAdminSession()) return rejectWithValue('Not signed in');
    try {
      const { default: adminApi } = await import('../../service/adminApi');
      const response = await adminApi.get('/auth/me');
      return response.data?.data || response.data;
    } catch (error: any) {
      return rejectWithValue(
        error?.response?.data?.message || 'Session expired'
      );
    }
  }
);

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
    setAdminAuthenticated: (state, action: PayloadAction<Record<string, any>>) => {
      state.admin = action.payload;
      state.isAuthenticated = true;
      state.status = 'succeeded';
    },
    clearAdmin: (state) => {
      state.admin = null;
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
        state.admin = action.payload;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(loginAdmin.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
        state.isAuthenticated = false;
      });

    // Fetch Profile
    builder
      .addCase(fetchAdminProfile.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchAdminProfile.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.admin = action.payload;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(fetchAdminProfile.rejected, (state) => {
        state.status = 'failed';
        state.admin = null;
        state.isAuthenticated = false;
        // Tokens are cleared by adminApi only when the refresh itself is rejected, so a
        // network blip or a 5xx on /auth/me doesn't throw away a still-valid session.
      });

    // Logout
    builder
      .addCase(logoutAdmin.fulfilled, (state) => {
        state.admin = null;
        state.isAuthenticated = false;
        state.status = 'idle';
        state.error = null;
      });
  },
});

export const { setAdminAuthenticated, clearAdmin } = adminAuthSlice.actions;
export default adminAuthSlice.reducer;
