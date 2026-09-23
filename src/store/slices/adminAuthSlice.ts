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

      const token =
        data?.accessToken || data?.token || response.data?.accessToken || response.data?.token;

      if (token) {
        setAdminAccessToken(token);
      }

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
      const { default: adminApi } = await import('../../service/adminApi');
      await adminApi.post('/auth/logout');
    } catch {
      // Always clear client-side even if API fails
    } finally {
      clearAdminAccessToken();
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
      clearAdminAccessToken();
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
        clearAdminAccessToken();
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
