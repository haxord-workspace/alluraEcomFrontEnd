import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Product, Order, CustomerNotification, AIMessage } from '../../types';
import { productsData } from '../../data/products';

interface ToastNotification {
  id: string;
  message: string;
  type?: 'success' | 'info' | 'gold' | 'error';
}

const INITIAL_AI_MESSAGES: AIMessage[] = [
  { id: '1', text: 'Hello! I am Allura, your personal AI stylist. How can I assist you today?', sender: 'assistant', timestamp: new Date().toLocaleTimeString() }
];

interface UiState {
  products: Product[];
  isCartOpen: boolean;
  isSearchOpen: boolean;
  isMobileMenuOpen: boolean;
  isAIAssistantOpen: boolean;
  isAITyping: boolean;
  aiMessages: AIMessage[];
  quickViewProduct: Product | null;
  invoiceOrder: Order | null;
  toasts: ToastNotification[];
  notifications: CustomerNotification[];
  recentlyViewed: Product[];
}

const initialState: UiState = {
  products: productsData,
  isCartOpen: false,
  isSearchOpen: false,
  isMobileMenuOpen: false,
  isAIAssistantOpen: false,
  isAITyping: false,
  aiMessages: INITIAL_AI_MESSAGES,
  quickViewProduct: null,
  invoiceOrder: null,
  toasts: [],
  notifications: [],
  recentlyViewed: [],
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setIsCartOpen: (state, action: PayloadAction<boolean>) => { state.isCartOpen = action.payload; },
    setIsSearchOpen: (state, action: PayloadAction<boolean>) => { state.isSearchOpen = action.payload; },
    setIsMobileMenuOpen: (state, action: PayloadAction<boolean>) => { state.isMobileMenuOpen = action.payload; },
    setIsAIAssistantOpen: (state, action: PayloadAction<boolean>) => { state.isAIAssistantOpen = action.payload; },
    setIsAITyping: (state, action: PayloadAction<boolean>) => { state.isAITyping = action.payload; },
    setQuickViewProduct: (state, action: PayloadAction<Product | null>) => { state.quickViewProduct = action.payload; },
    setInvoiceOrder: (state, action: PayloadAction<Order | null>) => { state.invoiceOrder = action.payload; },
    
    // Toasts
    addToast: (state, action: PayloadAction<ToastNotification>) => {
      state.toasts.push(action.payload);
    },
    removeToast: (state, action: PayloadAction<string>) => {
      state.toasts = state.toasts.filter(t => t.id !== action.payload);
    },
    
    // AI
    addAiMessage: (state, action: PayloadAction<AIMessage>) => {
      state.aiMessages.push(action.payload);
    },
    clearAiMessages: (state) => {
      state.aiMessages = INITIAL_AI_MESSAGES;
    },

    // Recently Viewed
    addRecentlyViewed: (state, action: PayloadAction<Product>) => {
      const exists = state.recentlyViewed.find(p => p.id === action.payload.id);
      if (!exists) {
        state.recentlyViewed.unshift(action.payload);
        if (state.recentlyViewed.length > 10) state.recentlyViewed.pop();
      }
    },
    
    // Notifications
    setNotifications: (state, action: PayloadAction<CustomerNotification[]>) => {
      state.notifications = action.payload;
    },
    markNotificationAsRead: (state, action: PayloadAction<string>) => {
      const notif = state.notifications.find(n => n.id === action.payload);
      if (notif) notif.isRead = true;
    },
    markAllNotificationsAsRead: (state) => {
      state.notifications.forEach(n => n.isRead = true);
    },
  },
});

export const {
  setIsCartOpen,
  setIsSearchOpen,
  setIsMobileMenuOpen,
  setIsAIAssistantOpen,
  setIsAITyping,
  setQuickViewProduct,
  setInvoiceOrder,
  addToast,
  removeToast,
  addAiMessage,
  clearAiMessages,
  addRecentlyViewed,
  setNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} = uiSlice.actions;

export default uiSlice.reducer;
