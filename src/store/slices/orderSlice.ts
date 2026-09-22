import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Order, ReturnRequest } from '../../types';
import api from '../../service/api';

interface OrderState {
  orders: Order[];
  returns: ReturnRequest[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
}

const initialState: OrderState = {
  orders: [],
  returns: [],
  status: 'idle',
};

export const fetchOrders = createAsyncThunk(
  'order/fetchOrders',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/orders');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || 'Failed to fetch orders');
    }
  }
);

const orderSlice = createSlice({
  name: 'order',
  initialState,
  reducers: {
    setOrders: (state, action: PayloadAction<Order[]>) => {
      state.orders = action.payload;
    },
    setReturns: (state, action: PayloadAction<ReturnRequest[]>) => {
      state.returns = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.orders = action.payload.orders || [];
        state.returns = action.payload.returns || [];
        state.status = 'succeeded';
      });
  },
});

export const { setOrders, setReturns } = orderSlice.actions;
export default orderSlice.reducer;
