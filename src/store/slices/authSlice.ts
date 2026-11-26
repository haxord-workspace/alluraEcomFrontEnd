import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { CustomerProfile } from '../../types';
import api from '../../service/api';

interface AuthState {
  customer: CustomerProfile | null;
  isAuthenticated: boolean;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: AuthState = {
  customer: null,
  isAuthenticated: false,
  status: 'idle',
  error: null,
};

// Thunk to fetch user profile if missing
export const fetchCustomerProfile = createAsyncThunk(
  'auth/fetchCustomerProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/auth/me');
      return response.data.user || response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || 'Failed to fetch profile');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCustomer: (state, action: PayloadAction<CustomerProfile | null>) => {
      state.customer = action.payload;
      state.isAuthenticated = !!action.payload;
    },
    logout: (state) => {
      state.customer = null;
      state.isAuthenticated = false;
      document.cookie = 'token=; path=/; max-age=0; SameSite=Strict';
      document.cookie = 'refreshToken=; path=/; max-age=0; SameSite=Strict';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCustomerProfile.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchCustomerProfile.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.customer = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(fetchCustomerProfile.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || null;
      });
  },
});

export const { setCustomer, logout } = authSlice.actions;
export default authSlice.reducer;
