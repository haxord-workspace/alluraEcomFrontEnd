import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type {
  Product,
  CartItem,
  ProductColor,
  Order,
  CustomerProfile,
  CustomerNotification,
  Coupon,
  AIMessage,
  ReturnRequest,
  Category,
} from '../types';
import { login, register, logout, googleLogin } from '../service/auth';
import type { LoginData, RegisterData, GoogleLoginData } from '../service/auth';
import { getStoreProducts, getStoreCategories, getStoreProduct, NO_COLOR } from '../service/store';
import { getAddresses, addAddress, updateAddress, deleteAddress } from '../service/address';
import { getWishlist, addWishlistItem, removeWishlistItem, clearWishlist as clearWishlistApi } from '../service/wishlist';
import type { SavedAddress } from '../types';
import {
  getCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  clearCart as clearCartApi,
  recalculateCart as recalculateCartApi,
  validateCart as validateCartApi,
} from '../service/cart';
import type { CartSnapshot, CartTotals, CartValidationResult } from '../service/cart';
import { validateCoupon } from '../service/coupons';
import { newMetaEventId, metaHeaders, trackMetaEvent } from '../utils/metaPixel';
import { getMyOrders, getMyOrder, cancelMyOrder, orderErrorMessage, enrichOrder } from '../service/orders';

interface ToastNotification {
  id: string;
  message: string;
  type?: 'success' | 'info' | 'gold' | 'error';
}

interface ShopContextType {
  // Products
  products: Product[];
  categories: Category[];
  isLoadingProducts: boolean;

  // Cart & Wishlist
  cart: CartItem[];
  wishlist: string[];
  cartTotals: CartTotals;
  /** Server cart id (needed by coupon validation and checkout) */
  cartId?: string;
  isCartLoading: boolean;
  /**
   * Adds to the bag. Resolves true when the item is in the bag.
   * Pass { silent: true } (e.g. for Buy Now) to skip the toast and keep the bag drawer closed.
   */
  addToCart: (product: Product, size?: string, color?: ProductColor, quantity?: number, options?: { silent?: boolean }) => Promise<boolean>;
  removeFromCart: (productId: string, size: string, colorName: string) => Promise<void>;
  updateQuantity: (productId: string, size: string, colorName: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
  recalculateCart: () => Promise<void>;
  validateCart: () => Promise<CartValidationResult>;
  wishlistProducts: Product[];
  isWishlistLoading: boolean;
  toggleWishlist: (product: Product) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  refreshWishlist: () => Promise<void>;
  clearWishlist: () => Promise<void>;

  // Recently Viewed
  recentlyViewed: Product[];
  addRecentlyViewed: (product: Product) => void;

  // Pricing & Free Shipping
  cartCount: number;
  cartSubtotal: number;
  freeShippingThreshold: number;
  freeShippingRemaining: number;
  freeShippingProgress: number;
  appliedCoupon: Coupon | null;
  couponDiscount: number;
  applyCoupon: (code: string) => Promise<{ success: boolean; message: string }>;
  isApplyingCoupon: boolean;
  removeCoupon: () => void;
  finalOrderTotal: number;

  // Customer Auth & Profile
  customer: CustomerProfile | null;
  isAuthenticated: boolean;
  loginUser: (data: LoginData) => Promise<void>;
  registerUser: (data: RegisterData) => Promise<void>;
  loginWithGoogle: (data: GoogleLoginData) => Promise<void>;
  completeProfile: (profile: Partial<CustomerProfile>) => void;
  logoutCustomer: () => Promise<void>;

  // Address Management
  fetchCustomerAddresses: () => Promise<void>;
  addCustomerAddress: (data: Omit<SavedAddress, 'id'>) => Promise<SavedAddress | undefined>;
  updateCustomerAddress: (id: string, data: Partial<SavedAddress>) => Promise<void>;
  deleteCustomerAddress: (id: string) => Promise<void>;

  // Orders & Returns
  orders: Order[];
  ordersTotal: number;
  isLoadingOrders: boolean;
  /** GET /orders — refreshes the customer's order list */
  refreshOrders: () => Promise<void>;
  /** GET /orders/{id} — loads one order into the cache and returns it */
  loadOrder: (orderId: string) => Promise<Order | undefined>;
  /** POST /orders/{id}/cancel */
  cancelCustomerOrder: (orderId: string, reason: string, note?: string) => Promise<boolean>;
  placeOrder: (orderData: Partial<Order>) => Order;
  getOrderById: (orderId: string) => Order | undefined;
  returns: ReturnRequest[];
  submitReturnRequest: (returnData: Omit<ReturnRequest, 'id' | 'status' | 'requestedDate'>) => ReturnRequest;

  // Notifications
  notifications: CustomerNotification[];
  unreadNotificationCount: number;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;

  // AI Assistant
  isAIAssistantOpen: boolean;
  setIsAIAssistantOpen: (open: boolean) => void;
  aiMessages: AIMessage[];
  isAITyping: boolean;
  sendAIMessage: (text: string) => Promise<void>;
  clearAIConversation: () => void;

  // Modals & UI States
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  quickViewProduct: Product | null;
  setQuickViewProduct: (product: Product | null) => void;
  invoiceOrder: Order | null;
  setInvoiceOrder: (order: Order | null) => void;

  // Toast Notifications
  toasts: ToastNotification[];
  showToast: (message: string, type?: 'success' | 'info' | 'gold' | 'error') => void;
  removeToast: (id: string) => void;

  // Currency & Utility Formatters
  formatPrice: (price: number) => string;
}

const ShopContext = createContext<ShopContextType | undefined>(undefined);

const FREE_SHIPPING_THRESHOLD = 2999;

const INITIAL_NOTIFICATIONS: CustomerNotification[] = [
  {
    id: 'notif-1',
    title: 'Order Dispatched',
    message: 'Your order #ALR-ORD-849201 is in transit with Delhivery Express.',
    category: 'Shipping',
    timestamp: '2 hours ago',
    isRead: false,
    actionUrl: '/account/orders/ord-849201/tracking',
    actionLabel: 'Track Shipment',
  },
  {
    id: 'notif-2',
    title: 'Festive Luxury Edit 2026',
    message: 'Use code FESTIVE15 to unlock 15% savings across all handcrafted silk sets.',
    category: 'Offers',
    timestamp: '1 day ago',
    isRead: false,
    actionUrl: '/offers',
    actionLabel: 'View Offer',
  },
  {
    id: 'notif-3',
    title: 'Allura Circle Member Reward',
    message: 'You have earned Gold tier privileges. Enjoy priority atelier stitching.',
    category: 'Account',
    timestamp: '3 days ago',
    isRead: true,
  },
];

const INITIAL_AI_MESSAGES: AIMessage[] = [
  {
    id: 'msg-init-1',
    sender: 'assistant',
    text: "Namaste! I am your personal ALLURA Stylist. Whether you are looking for an ethereal Anarkali for a wedding reception, need sizing advice, or wish to track an order, I am delighted to assist you.",
    timestamp: 'Just now',
  },
];
import { useAppDispatch } from '../store/hooks';
import { fetchCustomerProfile } from '../store/slices/authSlice';
import { hasCustomerSession, storeCustomerTokens, clearCustomerTokens, CUSTOMER_SESSION_EXPIRED_EVENT } from '../service/api';

export const ShopProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  // The admin portal doesn't use the storefront catalog or the customer's cart / wishlist
  const isAdminRoute = useLocation().pathname.startsWith('/admin');

  useEffect(() => {
    // Restore the customer's profile after a refresh, but only if they are actually logged in
    // (GET /orders is not part of the API, so it is no longer called here)
    if (!isAdminRoute && hasCustomerSession()) dispatch(fetchCustomerProfile());
  }, [dispatch, isAdminRoute]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  // Load the real storefront catalog the first time a storefront page is shown: categories first
  // so product category names can be resolved from the raw categoryId the list endpoint returns.
  const catalogRequested = useRef(false);
  useEffect(() => {
    if (isAdminRoute || catalogRequested.current) return;
    catalogRequested.current = true;
    let cancelled = false;

    const loadCatalog = async () => {
      setIsLoadingProducts(true);
      try {
        const fetchedCategories = await getStoreCategories();
        if (cancelled) return;
        setCategories(fetchedCategories);

        const categoryMap = fetchedCategories.reduce<Record<string, string>>((acc, cat) => {
          acc[cat.id] = cat.name;
          return acc;
        }, {});

        const { products: fetchedProducts } = await getStoreProducts({ limit: 100 }, categoryMap);
        if (cancelled) return;
        setProducts(fetchedProducts);
      } catch (e) {
        console.error('Failed to load storefront catalog:', e);
        catalogRequested.current = false; // allow a retry on the next storefront visit
      } finally {
        if (!cancelled) setIsLoadingProducts(false);
      }
    };

    loadCatalog();
    return () => {
      cancelled = true;
      // StrictMode unmounts/remounts once in development: let the remount issue the (de-duplicated) request
      catalogRequested.current = false;
    };
  }, [isAdminRoute]);

  // Cart state (server is the source of truth; loaded once the customer is known)
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartId, setCartId] = useState<string | undefined>(undefined);
  const [cartTotals, setCartTotals] = useState<CartTotals>({});
  const [isCartLoading, setIsCartLoading] = useState(false);

  // Lets cart responses that only carry a productId resolve to a full catalog product
  const productsRef = useRef<Product[]>(products);
  useEffect(() => { productsRef.current = products; }, [products]);
  const lookupProduct = useCallback((productId: string) => productsRef.current.find(p => p.id === productId), []);

  // Wishlist state (server is the source of truth; loaded once the customer is known)
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [wishlistProductMap, setWishlistProductMap] = useState<Record<string, Product>>({});
  const [isWishlistLoading, setIsWishlistLoading] = useState(false);

  // Recently Viewed state
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('allura_recently_viewed');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Customer Profile & Session
  const [customer, setCustomer] = useState<CustomerProfile | null>(() => {
    try {
      // The profile is cached in localStorage, but it's only valid while a login token
      // (or a refresh token to renew it) still exists; otherwise start signed out.
      const saved = localStorage.getItem('allura_customer');
      if (!saved || !hasCustomerSession()) {
        localStorage.removeItem('allura_customer');
        return null;
      }
      return JSON.parse(saved);
    } catch {
      return null;
    }
  });

  // showToast is declared further down; reach it through a ref
  const showToastRef = useRef<((message: string, type?: 'success' | 'info' | 'gold' | 'error') => void) | null>(null);

  // The API client signals when the session can't be renewed (refresh token missing/expired)
  useEffect(() => {
    const onExpired = () => {
      setCustomer(prev => {
        if (prev) showToastRef.current?.('Your session has expired. Please sign in again.', 'info');
        return null;
      });
    };
    window.addEventListener(CUSTOMER_SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(CUSTOMER_SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // Return requests state
  const [returns, setReturns] = useState<ReturnRequest[]>(() => {
    try {
      const saved = localStorage.getItem('allura_returns');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Notifications state
  const [notifications, setNotifications] = useState<CustomerNotification[]>(() => {
    try {
      const saved = localStorage.getItem('allura_notifications');
      return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
    } catch {
      return INITIAL_NOTIFICATIONS;
    }
  });

  // Applied coupon state
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(() => {
    try {
      const saved = localStorage.getItem('allura_applied_coupon');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // AI Assistant state
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState<AIMessage[]>(() => {
    try {
      const saved = localStorage.getItem('allura_ai_messages');
      return saved ? JSON.parse(saved) : INITIAL_AI_MESSAGES;
    } catch {
      return INITIAL_AI_MESSAGES;
    }
  });
  const [isAITyping, setIsAITyping] = useState(false);

  // UI States
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  
  const isAuthenticated = !!customer;
  const customerId: string | null = customer ? customer.id || customer.email || 'signed-in' : null;

  // Sync state to localStorage

  useEffect(() => {
    try {
      localStorage.setItem('allura_recently_viewed', JSON.stringify(recentlyViewed));
    } catch (e) {
      console.error(e);
    }
  }, [recentlyViewed]);

  useEffect(() => {
    try {
      localStorage.setItem('allura_customer', JSON.stringify(customer));
    } catch (e) {
      console.error(e);
    }
  }, [customer]);

  // Drop the old locally-stored sample orders and clear orders on logout
  useEffect(() => {
    try { localStorage.removeItem('allura_orders'); } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    if (!customer) {
      setOrders([]);
      setOrdersTotal(0);
    }
  }, [customer]);

  useEffect(() => {
    try {
      localStorage.setItem('allura_returns', JSON.stringify(returns));
    } catch (e) {
      console.error(e);
    }
  }, [returns]);

  useEffect(() => {
    try {
      localStorage.setItem('allura_notifications', JSON.stringify(notifications));
    } catch (e) {
      console.error(e);
    }
  }, [notifications]);

  useEffect(() => {
    try {
      localStorage.setItem('allura_applied_coupon', JSON.stringify(appliedCoupon));
    } catch (e) {
      console.error(e);
    }
  }, [appliedCoupon]);

  useEffect(() => {
    try {
      localStorage.setItem('allura_ai_messages', JSON.stringify(aiMessages));
    } catch (e) {
      console.error(e);
    }
  }, [aiMessages]);

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'gold' | 'error' = 'gold') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3600);
  }, []);
  showToastRef.current = showToast;

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addRecentlyViewed = useCallback((product: Product) => {
    setRecentlyViewed(prev => {
      const filtered = prev.filter(p => p.id !== product.id);
      return [product, ...filtered].slice(0, 8);
    });
  }, []);

  const cartErrorMessage = (error: any, fallback: string): string =>
    error?.response?.data?.error?.details?.[0]?.message || error?.response?.data?.message || fallback;

  const applyCartSnapshot = useCallback((snapshot: CartSnapshot) => {
    if (snapshot.id) setCartId(snapshot.id);
    setCart(snapshot.items);
    setCartTotals(snapshot.totals);
  }, []);

  const refreshCart = useCallback(async () => {
    if (!customer || !hasCustomerSession()) {
      setCart([]);
      setCartTotals({});
      setCartId(undefined);
      return;
    }
    if (isAdminRoute) return;
    setIsCartLoading(true);
    try {
      applyCartSnapshot(await getCart(lookupProduct));
    } catch (e) {
      console.error('Failed to load cart:', e);
    } finally {
      setIsCartLoading(false);
    }
  }, [customerId, isAdminRoute, applyCartSnapshot, lookupProduct]);

  // Load on login / app start, clear on logout
  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  // Mutations that don't echo the cart back fall back to a re-fetch
  const applyOrRefresh = useCallback(async (snapshot: CartSnapshot | null) => {
    if (snapshot) applyCartSnapshot(snapshot);
    else await refreshCart();
  }, [applyCartSnapshot, refreshCart]);

  const findCartLine = (productId: string, size: string, colorName: string) =>
    cart.find(item => item.product.id === productId && item.selectedSize === size && item.selectedColor.name === colorName);

  const addToCart = useCallback(async (
    product: Product,
    size = '',
    color: ProductColor = NO_COLOR,
    quantity = 1,
    options: { silent?: boolean } = {}
  ): Promise<boolean> => {
    if (!customer) {
      navigate('/auth/login');
      return false;
    }
    try {
      // The list endpoint doesn't include variants, so load the detail to find the SKU for this size / colour
      let variants = product.variants;
      let hasVariants = product.hasVariants;
      if (!variants) {
        try {
          const detail = await getStoreProduct(product.id);
          variants = detail.variants;
          hasVariants = detail.hasVariants;
        } catch {
          variants = undefined;
        }
      }
      const matches = (a: string, b: string) => !a || !b || a.toLowerCase() === b.toLowerCase();
      const variant =
        variants?.find(v => matches(v.size, size) && matches(v.color.name, color.name)) ||
        (variants?.length === 1 ? variants[0] : undefined);

      if (hasVariants && variants && variants.length > 0 && !variant) {
        showToast(`Please choose a size and colour for ${product.name}`, 'error');
        return false;
      }

      if (hasVariants && (!variants || variants.length === 0)) {
        // Warning: product says it has variants but none were loaded.
        // We will proceed to add without a variantId.
        console.warn(`Product ${product.id} hasVariants but no variants array found. Adding base product.`);
      }

      // Meta: same event ID for the Pixel (below) and the backend's CAPI call (headers)
      const metaEventId = newMetaEventId();
      const snapshot = await addCartItem(
        { productId: product.id, variantId: variant?.id, quantity },
        lookupProduct,
        metaHeaders(metaEventId)
      );
      await applyOrRefresh(snapshot);
      const unitPrice = variant?.price || product.price;
      trackMetaEvent(
        'AddToCart',
        {
          content_ids: [variant?.sku || product.sku || product.id],
          content_name: product.name,
          content_type: 'product',
          contents: [{ id: variant?.sku || product.sku || product.id, quantity, item_price: unitPrice }],
          value: unitPrice * quantity,
          currency: 'INR',
        },
        metaEventId
      );

      addRecentlyViewed(product);
      if (!options.silent) {
        showToast(`Added ${product.name}${size ? ` (${size})` : ''} to your Bag`, 'gold');
        setIsCartOpen(true);
      }
      return true;
    } catch (error: any) {
      showToast(cartErrorMessage(error, 'Could not add this piece to your Bag'), 'error');
      return false;
    }
  }, [addRecentlyViewed, showToast, customerId, navigate, lookupProduct, applyOrRefresh]);

  const removeFromCart = useCallback(async (productId: string, size: string, colorName: string) => {
    const line = findCartLine(productId, size, colorName);
    if (!line) return;
    const previous = cart;
    setCart(prev => prev.filter(item => item !== line));
    try {
      if (!line.id) throw new Error('Missing cart item id');
      await applyOrRefresh(await removeCartItem(line.id, lookupProduct));
      showToast('Item removed from Bag', 'info');
    } catch (error: any) {
      setCart(previous);
      showToast(cartErrorMessage(error, 'Could not remove this item'), 'error');
    }
  }, [cart, showToast, lookupProduct, applyOrRefresh]);

  const updateQuantity = useCallback(async (productId: string, size: string, colorName: string, quantity: number) => {
    if (quantity <= 0) {
      await removeFromCart(productId, size, colorName);
      return;
    }
    const line = findCartLine(productId, size, colorName);
    if (!line) return;
    const previous = cart;
    setCart(prev => prev.map(item => (item === line ? { ...item, quantity } : item)));
    try {
      if (!line.id) throw new Error('Missing cart item id');
      await applyOrRefresh(await updateCartItem(line.id, quantity, lookupProduct));
    } catch (error: any) {
      setCart(previous);
      showToast(cartErrorMessage(error, 'Could not update the quantity'), 'error');
    }
  }, [cart, removeFromCart, showToast, lookupProduct, applyOrRefresh]);

  const clearCart = useCallback(async () => {
    setCart([]);
    setCartTotals({});
    if (!customer) return;
    try {
      await clearCartApi();
    } catch (e) {
      console.error('Failed to clear cart:', e);
      await refreshCart();
    }
  }, [customerId, refreshCart]);

  const couponWarning = useRef('');
  const recalculateCart = useCallback(async () => {
    if (!customer) return;
    try {
      await applyOrRefresh(await recalculateCartApi(lookupProduct));
    } catch (e: any) {
      const body = e?.response?.data;
      const isCouponProblem = body?.error?.code === 'COUPON_INVALID' || /coupon/i.test(body?.message || '');
      if (isCouponProblem) {
        // Drop the coupon locally and tell the customer once (not on every recalculation)
        setAppliedCoupon(null);
        setCouponDiscountAmount(0);
        const message = body?.message || 'Your coupon is no longer valid';
        if (couponWarning.current !== message) {
          couponWarning.current = message;
          showToast(`${message}. The coupon was removed from your bag.`, 'info');
        }
      } else {
        console.error('Failed to recalculate cart:', e);
      }
    }
  }, [customerId, lookupProduct, applyOrRefresh, showToast]);

  const validateCart = useCallback(async (): Promise<CartValidationResult> => {
    if (!customer) return { valid: false, issues: ['Please sign in to continue to checkout.'] };
    const result = await validateCartApi();
    if (!result.valid) {
      showToast(result.issues[0] || 'Your Bag needs attention before checkout.', 'error');
      // The server may have adjusted quantities or prices; show the latest state
      await refreshCart();
    }
    return result;
  }, [customerId, showToast, refreshCart]);

  const refreshWishlist = useCallback(async () => {
    if (!customer || !hasCustomerSession()) {
      setWishlist([]);
      setWishlistProductMap({});
      return;
    }
    if (isAdminRoute) return;
    setIsWishlistLoading(true);
    try {
      const entries = await getWishlist();
      setWishlist(entries.map(e => e.productId));
      setWishlistProductMap(
        entries.reduce<Record<string, Product>>((acc, e) => {
          if (e.product) acc[e.productId] = e.product;
          return acc;
        }, {})
      );
    } catch (e) {
      console.error('Failed to load wishlist:', e);
    } finally {
      setIsWishlistLoading(false);
    }
  }, [customerId, isAdminRoute]);

  // Load on login / app start, clear on logout
  useEffect(() => {
    refreshWishlist();
  }, [refreshWishlist]);

  const toggleWishlist = useCallback(async (product: Product) => {
    if (!customer) {
      navigate('/auth/login');
      return;
    }
    const exists = wishlist.includes(product.id);

    // Optimistic update, rolled back if the API call fails
    if (exists) {
      setWishlist(prev => prev.filter(id => id !== product.id));
    } else {
      setWishlist(prev => [...prev, product.id]);
      setWishlistProductMap(prev => ({ ...prev, [product.id]: product }));
    }

    try {
      if (exists) {
        await removeWishlistItem({ productId: product.id });
        showToast(`Removed from your Wishlist`, 'info');
      } else {
        await addWishlistItem({ productId: product.id });
        showToast(`Added to your Wishlist ❤️`, 'gold');
      }
    } catch (error: any) {
      setWishlist(prev => (exists ? [...prev, product.id] : prev.filter(id => id !== product.id)));
      showToast(error.response?.data?.message || 'Could not update your Wishlist', 'error');
    }
  }, [wishlist, showToast, customerId, navigate]);

  const clearWishlist = useCallback(async () => {
    const previous = wishlist;
    setWishlist([]);
    try {
      await clearWishlistApi();
      setWishlistProductMap({});
      showToast('Wishlist cleared', 'info');
    } catch (error: any) {
      setWishlist(previous);
      showToast(error.response?.data?.message || 'Could not clear your Wishlist', 'error');
    }
  }, [wishlist, showToast]);

  const isInWishlist = useCallback((productId: string) => wishlist.includes(productId), [wishlist]);

  // Prefer the server-populated product, fall back to the loaded catalog
  const wishlistProducts = wishlist
    .map(id => wishlistProductMap[id] || products.find(p => p.id === id))
    .filter((p): p is Product => !!p);

  // Pricing calculations
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cartSubtotal = cart.reduce((acc, item) => acc + (item.unitPrice ?? item.product.price) * item.quantity, 0);
  const freeShippingRemaining = Math.max(0, FREE_SHIPPING_THRESHOLD - cartSubtotal);
  const freeShippingProgress = Math.min(100, (cartSubtotal / FREE_SHIPPING_THRESHOLD) * 100);

  // Coupon: the discount amount always comes from POST /coupons/validate
  const [couponDiscountAmount, setCouponDiscountAmount] = useState(0);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const lastValidatedCouponKey = useRef('');
  const couponDiscount = appliedCoupon ? Math.min(couponDiscountAmount, cartSubtotal) : 0;

  const finalOrderTotal = Math.max(0, cartSubtotal - couponDiscount);

  const clearCoupon = useCallback(() => {
    setAppliedCoupon(null);
    setCouponDiscountAmount(0);
    lastValidatedCouponKey.current = '';
  }, []);

  const applyCoupon = useCallback(async (code: string) => {
    const clean = code.trim().toUpperCase();
    if (!clean) return { success: false, message: 'Enter a coupon code.' };
    if (!customer) {
      navigate('/auth/login');
      return { success: false, message: 'Please sign in to use a coupon.' };
    }
    if (!cartId || cart.length === 0) {
      const message = 'Add items to your Bag before applying a coupon.';
      showToast(message, 'info');
      return { success: false, message };
    }

    setIsApplyingCoupon(true);
    try {
      const result = await validateCoupon(clean, cartId);
      if (!result.valid) {
        showToast(result.message, 'error');
        return { success: false, message: result.message };
      }
      lastValidatedCouponKey.current = `${clean}|${cartId}|${cartSubtotal}`;
      setAppliedCoupon(
        result.coupon || {
          id: clean,
          code: clean,
          description: '',
          discountType: 'Fixed',
          discountValue: result.discountAmount,
          minOrderValue: 0,
          usageCount: 0,
          startDate: '',
          endDate: '',
          status: 'Active',
        }
      );
      setCouponDiscountAmount(result.discountAmount);
      const message = `Coupon ${clean} applied: you save ₹${Math.round(result.discountAmount).toLocaleString('en-IN')}`;
      showToast(message, 'success');
      return { success: true, message };
    } catch {
      const message = 'Could not check this coupon right now. Please try again.';
      showToast(message, 'error');
      return { success: false, message };
    } finally {
      setIsApplyingCoupon(false);
    }
  }, [customerId, cartId, cart.length, cartSubtotal, showToast, navigate]);

  const removeCoupon = useCallback(() => {
    clearCoupon();
    showToast('Coupon removed', 'info');
  }, [clearCoupon, showToast]);

  // Re-check the applied coupon whenever the bag changes (the discount or eligibility may change)
  const appliedCouponCode = appliedCoupon?.code;
  useEffect(() => {
    if (!appliedCouponCode) return;
    if (!customer) { clearCoupon(); return; }
    if (!cartId) return; // cart not loaded yet
    if (cart.length === 0) { clearCoupon(); return; }

    const key = `${appliedCouponCode}|${cartId}|${cartSubtotal}`;
    if (key === lastValidatedCouponKey.current) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      validateCoupon(appliedCouponCode, cartId)
        .then(result => {
          if (cancelled) return;
          lastValidatedCouponKey.current = key;
          if (result.valid) {
            setCouponDiscountAmount(result.discountAmount);
          } else {
            clearCoupon();
            showToast(`Coupon ${appliedCouponCode} removed: ${result.message}`, 'info');
          }
        })
        .catch(() => {});
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [appliedCouponCode, cartId, cartSubtotal, cart.length, customerId, clearCoupon, showToast]);

  // Customer Auth
  const loginUser = async (data: LoginData) => {
    try {
      const response = await login(data);
      storeCustomerTokens(response);
      
      const userProfile: CustomerProfile = response.user || {
        id: `usr-${Date.now()}`,
        name: data.email.split('@')[0],
        email: data.email,
        phone: '',
        addresses: [],
        orders: [],
      };
      setCustomer(userProfile);
      showToast(`Welcome back, ${userProfile.name}`, 'gold');
    } catch (error: any) {
      let errorMessage = 'Login failed. Please check your credentials.';
      if (error.response?.data?.error?.details?.[0]?.message) {
        errorMessage = error.response.data.error.details[0].message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      showToast(errorMessage, 'error');
      throw error;
    }
  };

  const loginWithGoogle = async (data: GoogleLoginData) => {
    try {
      const response = await googleLogin(data);
      storeCustomerTokens(response);
      
      const userProfile: CustomerProfile = response.user || {
        id: `usr-${Date.now()}`,
        name: 'Google User',
        email: '',
        phone: '',
        addresses: [],
        orders: [],
      };
      setCustomer(userProfile);
      showToast(`Welcome back, ${userProfile.name}`, 'gold');
    } catch (error: any) {
      let errorMessage = 'Google login failed.';
      if (error.response?.data?.error?.details?.[0]?.message) {
        errorMessage = error.response.data.error.details[0].message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      showToast(errorMessage, 'error');
      throw error;
    }
  };

  const registerUser = async (data: RegisterData) => {
    try {
      const metaEventId = newMetaEventId();
      const response = await register(data, metaHeaders(metaEventId));
      trackMetaEvent('CompleteRegistration', { status: true }, metaEventId);
      storeCustomerTokens(response);
      
      const userProfile: CustomerProfile = response.user || {
        id: `usr-${Date.now()}`,
        name: data.name || data.email.split('@')[0],
        email: data.email,
        phone: '',
        addresses: [],
        orders: [],
      };
      setCustomer(userProfile);
      showToast(`Welcome to Allura, ${userProfile.name}!`, 'gold');
    } catch (error: any) {
      let errorMessage = 'Registration failed.';
      if (error.response?.data?.error?.details?.[0]?.message) {
        errorMessage = error.response.data.error.details[0].message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      showToast(errorMessage, 'error');
      throw error;
    }
  };

  const completeProfile = (profile: Partial<CustomerProfile>) => {
    if (customer) {
      setCustomer({ ...customer, ...profile });
      showToast('Profile updated successfully', 'success');
    }
  };

  const logoutCustomer = async () => {
    try {
      await logout();
    } catch (e) {
      console.warn('Logout API call failed, still clearing local state', e);
    }
    clearCustomerTokens();
    setCustomer(null);
    showToast('Logged out of customer session', 'info');
  };

  const getApiErrorMessage = (error: any, defaultMsg: string) => {
    if (error.response?.data?.error?.details?.[0]?.message) {
      return error.response.data.error.details[0].message;
    }
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    return defaultMsg;
  };

  // Address API Handlers
  const fetchCustomerAddresses = async () => {
    if (!customer) return;
    try {
      const addresses = await getAddresses();
      setCustomer((prev) => prev ? { ...prev, addresses } : prev);
    } catch (error) {
      console.error('Failed to fetch addresses:', error);
    }
  };

  const addCustomerAddress = async (data: Omit<SavedAddress, 'id'>): Promise<SavedAddress | undefined> => {
    if (!customer) return undefined;
    try {
      const newAddress = await addAddress(data);
      setCustomer((prev) => {
        if (!prev) return prev;
        return { ...prev, addresses: [...(prev.addresses || []), newAddress] };
      });
      showToast('Address saved successfully', 'success');
      return newAddress;
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Failed to save address'), 'error');
      throw error;
    }
  };

  const updateCustomerAddress = async (id: string, data: Partial<SavedAddress>) => {
    if (!customer) return;
    try {
      const updated = await updateAddress(id, data);
      setCustomer((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          addresses: prev.addresses.map((a) => (a.id === id ? updated : a)),
        };
      });
      showToast('Address updated successfully', 'success');
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Failed to update address'), 'error');
      throw error;
    }
  };

  const deleteCustomerAddress = async (id: string) => {
    if (!customer) return;
    try {
      await deleteAddress(id);
      setCustomer((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          addresses: prev.addresses.filter((a) => a.id !== id),
        };
      });
      showToast('Address deleted successfully', 'info');
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Failed to delete address'), 'error');
      throw error;
    }
  };

  // Orders
  const placeOrder = (orderData: Partial<Order>): Order => {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const orderNumber = `ALR-ORD-${randomNum}`;
    const newOrder: Order = {
      id: `ord-${randomNum}`,
      orderNumber,
      date: 'Just now',
      customer: {
        id: customer?.id || 'cust-guest',
        name: customer?.name || orderData.customer?.name || 'Valued Guest',
        email: customer?.email || orderData.customer?.email || 'guest@example.com',
        phone: customer?.phone || orderData.customer?.phone || '+91 90000 00000',
      },
      shippingAddress: orderData.shippingAddress || customer?.addresses[0] || {
        id: 'addr-temp',
        label: 'Home',
        fullName: 'Ananya Menon',
        phone: {
          countryCode: '+91',
          number: '98471 23456',
        },
        addressLine1: 'Near Jubilee Hospital',
        city: 'Perinthalmanna',
        state: 'Kerala',
        postalCode: '679322',
        country: 'India',
        isDefaultShipping: true,
        isDefaultBilling: true,
      },
      items: cart.map(item => ({
        product: item.product,
        selectedSize: item.selectedSize,
        selectedColor: item.selectedColor,
        quantity: item.quantity,
        unitPrice: item.unitPrice ?? item.product.price,
        mrp: item.product.originalPrice || item.product.price,
        sku: `${item.product.sku}-${item.selectedSize}`,
      })),
      subtotal: cartSubtotal,
      shippingFee: freeShippingRemaining === 0 ? 0 : 150,
      discount: couponDiscount,
      couponCode: appliedCoupon?.code,
      tax: Math.round(cartSubtotal * 0.05),
      total: finalOrderTotal + (freeShippingRemaining === 0 ? 0 : 150),
      paymentMethod: orderData.paymentMethod || 'UPI',
      paymentStatus: 'Paid',
      orderStatus: 'Processing',
      tracking: {
        awb: `DLHV${Math.floor(100000000 + Math.random() * 900000000)}IN`,
        courier: 'Delhivery Luxury Express',
        courierService: 'Express Kerala Handcrafted Dispatch',
        estimatedDelivery: '3 Days from today',
        currentStatus: 'Order Confirmed — Handing over to Perinthalmanna Atelier',
        milestones: [
          {
            status: 'Delivered',
            location: 'Destination Address',
            timestamp: 'Expected in 3 days',
            description: 'Hand delivery with tamper-proof security seal.',
            completed: false,
          },
          {
            status: 'Shipped',
            location: 'Allura Central Atelier',
            timestamp: 'Scheduled for dispatch tomorrow',
            description: 'Package ready for courier pickup.',
            completed: false,
          },
          {
            status: 'Order Placed & Payment Confirmed',
            location: 'Storefront',
            timestamp: 'Just now',
            description: 'Payment authorized successfully.',
            completed: true,
            current: true,
          },
        ],
      },
    };

    setOrders(prev => [newOrder, ...prev]);
    clearCart();
    setAppliedCoupon(null);

    // Push notification
    const newNotif: CustomerNotification = {
      id: `notif-${Date.now()}`,
      title: 'Order Confirmed',
      message: `Your order ${newOrder.orderNumber} for ₹${newOrder.total.toLocaleString('en-IN')} has been placed successfully.`,
      category: 'Orders',
      timestamp: 'Just now',
      isRead: false,
      actionUrl: `/account/orders/${newOrder.id}`,
      actionLabel: 'View Order',
    };
    setNotifications(prev => [newNotif, ...prev]);

    return newOrder;
  };

  // Order lines only carry ids, so fill in names / images from the storefront catalog
  const enrichedOrders = React.useMemo(
    () =>
      orders.map(o =>
        enrichOrder(o, productId => {
          const p = products.find(pr => pr.id === productId);
          return p ? { name: p.name, image: p.images.primary } : undefined;
        })
      ),
    [orders, products]
  );

  const getOrderById = (orderId: string) => {
    return enrichedOrders.find(o => o.id === orderId || o.orderNumber === orderId);
  };

  const upsertOrder = (order: Order) =>
    setOrders(prev => (prev.some(o => o.id === order.id) ? prev.map(o => (o.id === order.id ? order : o)) : [order, ...prev]));

  const refreshOrders = useCallback(async () => {
    if (!customer || !hasCustomerSession()) return;
    setIsLoadingOrders(true);
    try {
      const result = await getMyOrders({ limit: 50 });
      setOrders(result.orders);
      setOrdersTotal(result.total);
    } catch (e) {
      console.error('Failed to load orders:', e);
    } finally {
      setIsLoadingOrders(false);
    }
  }, [customerId]);

  const loadOrder = useCallback(async (orderId: string) => {
    if (!customer || !hasCustomerSession()) return undefined;
    try {
      const order = await getMyOrder(orderId);
      upsertOrder(order);
      return order;
    } catch (e) {
      console.error('Failed to load order:', e);
      return undefined;
    }
  }, [customerId]);

  const cancelCustomerOrder = async (orderId: string, reason: string, note?: string) => {
    try {
      const updated = await cancelMyOrder(orderId, reason, note);
      if (updated) upsertOrder(updated);
      else await loadOrder(orderId);
      showToast('Your order has been cancelled', 'info');
      return true;
    } catch (e) {
      showToast(orderErrorMessage(e, 'This order can no longer be cancelled'), 'error');
      return false;
    }
  };

  const submitReturnRequest = (returnData: Omit<ReturnRequest, 'id' | 'status' | 'requestedDate'>): ReturnRequest => {
    const newReturn: ReturnRequest = {
      ...returnData,
      id: `ret-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'Request Submitted',
      requestedDate: 'Today, Just now',
    };

    setReturns(prev => [newReturn, ...prev]);
    showToast('Return/Exchange request submitted. Our team will review within 24 hours.', 'gold');
    return newReturn;
  };

  // Notifications
  const unreadNotificationCount = notifications.filter(n => !n.isRead).length;

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const markAllNotificationsAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    showToast('All notifications marked as read', 'info');
  };

  // AI Assistant Engine
  const sendAIMessage = async (text: string) => {
    const userMsg: AIMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: 'Just now',
    };

    setAiMessages(prev => [...prev, userMsg]);
    setIsAITyping(true);

    await new Promise(resolve => setTimeout(resolve, 750));

    const lower = text.toLowerCase();
    let replyText = "I would be happy to assist you with our handcrafted boutique collection.";
    let suggested: Product[] | undefined = undefined;
    let orderSummary: AIMessage['orderSummary'] | undefined = undefined;

    if (lower.includes('wedding') || lower.includes('reception') || lower.includes('bridal') || lower.includes('festive') || lower.includes('occasion')) {
      replyText = "For wedding celebrations and festive receptions, I highly recommend these opulent handcrafted silhouettes featuring authentic zari and scalloped organza dupattas:";
      suggested = products.filter(p => p.occasion === 'Festive' || p.category === 'Ethnic Wear').slice(0, 3);
    } else if (lower.includes('black') || lower.includes('dress') || lower.includes('modest') || lower.includes('pleated')) {
      replyText = "Here are our most coveted modest ensembles with graceful draping and premium wrinkle-resistant crepes:";
      suggested = products.filter(p => p.category === 'Modest Wear' || p.name.toLowerCase().includes('cream') || p.name.toLowerCase().includes('blush')).slice(0, 3);
    } else if (lower.includes('3000') || lower.includes('under 3000') || lower.includes('6000') || lower.includes('under 6000') || lower.includes('affordable')) {
      replyText = "Here are exquisite pieces that fit seamlessly within your budget without compromising on fabric purity:";
      suggested = products.filter(p => p.price <= 6500).slice(0, 3);
    } else if (lower.includes('size') || lower.includes('sizing') || lower.includes('fit') || lower.includes('36')) {
      replyText = "Allura silhouettes are tailored with true-to-size modest proportions and include a generous 2-inch inner margin for easy bespoke adjustments. For a bust size of 36 inches, Size M will offer the most graceful silhouette.";
    } else if (lower.includes('order') || lower.includes('where is') || lower.includes('track') || lower.includes('849201') || lower.includes('alr-ord')) {
      const targetOrder = orders[0];
      replyText = `Your order ${targetOrder.orderNumber} is currently in transit with Delhivery Express. Estimated delivery is ${targetOrder.tracking?.estimatedDelivery || '14 September 2026'}.`;
      orderSummary = {
        orderNumber: targetOrder.orderNumber,
        status: targetOrder.tracking?.currentStatus || 'In Transit',
        estimatedDelivery: targetOrder.tracking?.estimatedDelivery || '14 Sep 2026',
        courier: targetOrder.tracking?.courier || 'Delhivery Express',
      };
    } else if (lower.includes('return') || lower.includes('exchange') || lower.includes('policy')) {
      replyText = "We offer a seamless 7-day doorstep return and size exchange service across India. You can submit an exchange request directly from your Account Orders page or WhatsApp our concierge.";
    } else {
      replyText = "Here are a few of our most beloved best-sellers from the current season atelier edit:";
      suggested = products.slice(0, 3);
    }

    const aiReply: AIMessage = {
      id: `ai-${Date.now()}`,
      sender: 'assistant',
      text: replyText,
      timestamp: 'Just now',
      suggestedProducts: suggested,
      orderSummary,
    };

    setAiMessages(prev => [...prev, aiReply]);
    setIsAITyping(false);
  };

  const clearAIConversation = () => {
    setAiMessages(INITIAL_AI_MESSAGES);
    showToast('AI conversation reset', 'info');
  };

  const formatPrice = (price: number) => {
    return '₹ ' + Math.round(price).toLocaleString('en-IN');
  };

  return (
    <ShopContext.Provider
      value={{
        products,
        categories,
        isLoadingProducts,
        cart,
        cartTotals,
        cartId,
        isCartLoading,
        refreshCart,
        recalculateCart,
        validateCart,
        wishlist,
        wishlistProducts,
        isWishlistLoading,
        refreshWishlist,
        clearWishlist,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        toggleWishlist,
        isInWishlist,
        recentlyViewed,
        addRecentlyViewed,
        cartCount,
        cartSubtotal,
        freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
        freeShippingRemaining,
        freeShippingProgress,
        appliedCoupon,
        couponDiscount,
        applyCoupon,
        isApplyingCoupon,
        removeCoupon,
        finalOrderTotal,
        customer,
        isAuthenticated,
        loginUser,
        registerUser,
        loginWithGoogle,
        completeProfile,
        logoutCustomer,
        fetchCustomerAddresses,
        addCustomerAddress,
        updateCustomerAddress,
        deleteCustomerAddress,
        orders: enrichedOrders,
        ordersTotal,
        isLoadingOrders,
        refreshOrders,
        loadOrder,
        cancelCustomerOrder,
        placeOrder,
        getOrderById,
        returns,
        submitReturnRequest,
        notifications,
        unreadNotificationCount,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        isAIAssistantOpen,
        setIsAIAssistantOpen,
        aiMessages,
        isAITyping,
        sendAIMessage,
        clearAIConversation,
        isCartOpen,
        setIsCartOpen,
        isSearchOpen,
        setIsSearchOpen,
        isMobileMenuOpen,
        setIsMobileMenuOpen,
        quickViewProduct,
        setQuickViewProduct,
        invoiceOrder,
        setInvoiceOrder,
        toasts,
        showToast,
        removeToast,
        formatPrice,
      }}
    >
      {children}
    </ShopContext.Provider>
  );
};

export const useShop = () => {
  const context = useContext(ShopContext);
  if (!context) {
    throw new Error('useShop must be used within a ShopProvider');
  }
  return context;
};
