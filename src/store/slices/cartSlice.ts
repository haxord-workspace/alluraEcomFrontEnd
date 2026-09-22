import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { CartItem, Coupon } from '../../types';
import api from '../../service/api';

interface CartState {
  items: CartItem[];
  appliedCoupon: Coupon | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
}

const initialState: CartState = {
  items: [],
  appliedCoupon: null,
  status: 'idle',
};

// Async thunk for fetching cart
export const fetchCart = createAsyncThunk(
  'cart/fetchCart',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/cart');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || 'Failed to fetch cart');
    }
  }
);

// Async thunk for updating cart
export const updateCartApi = createAsyncThunk(
  'cart/updateCartApi',
  async (items: CartItem[], { rejectWithValue }) => {
    try {
      const response = await api.post('/cart', { items });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || 'Failed to update cart');
    }
  }
);

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    setCart: (state, action: PayloadAction<CartItem[]>) => {
      state.items = action.payload;
    },
    setAppliedCoupon: (state, action: PayloadAction<Coupon | null>) => {
      state.appliedCoupon = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.items = action.payload.items || [];
        state.status = 'succeeded';
      });
  },
});

export const { setCart, setAppliedCoupon } = cartSlice.actions;
export default cartSlice.reducer;
