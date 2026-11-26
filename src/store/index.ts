import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import adminAuthReducer from './slices/adminAuthSlice';
import cartReducer from './slices/cartSlice';
import wishlistReducer from './slices/wishlistSlice';
import orderReducer from './slices/orderSlice';
import uiReducer from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    adminAuth: adminAuthReducer,
    cart: cartReducer,
    wishlist: wishlistReducer,
    order: orderReducer,
    ui: uiReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
