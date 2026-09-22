import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { login, register, logout } from '../service/auth';
import type { LoginData, RegisterData } from '../service/auth';
import { getStoreProducts, getStoreCategories } from '../service/store';
import { getAddresses, addAddress, updateAddress, deleteAddress } from '../service/address';
import type { SavedAddress } from '../types';
import { mockCouponsData } from '../data/mockCoupons';

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
  addToCart: (product: Product, size: string, color: ProductColor, quantity?: number) => void;
  removeFromCart: (productId: string, size: string, colorName: string) => void;
  updateQuantity: (productId: string, size: string, colorName: string, quantity: number) => void;
  clearCart: () => void;
  toggleWishlist: (product: Product) => void;
  isInWishlist: (productId: string) => boolean;

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
  applyCoupon: (code: string) => { success: boolean; message: string };
  removeCoupon: () => void;
  finalOrderTotal: number;

  // Customer Auth & Profile
  customer: CustomerProfile | null;
  isAuthenticated: boolean;
  loginUser: (data: LoginData) => Promise<void>;
  registerUser: (data: RegisterData) => Promise<void>;
  completeProfile: (profile: Partial<CustomerProfile>) => void;
  logoutCustomer: () => Promise<void>;

  // Address Management
  fetchCustomerAddresses: () => Promise<void>;
  addCustomerAddress: (data: Omit<SavedAddress, 'id'>) => Promise<void>;
  updateCustomerAddress: (id: string, data: Partial<SavedAddress>) => Promise<void>;
  deleteCustomerAddress: (id: string) => Promise<void>;

  // Orders & Returns
  orders: Order[];
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
import { fetchCart } from '../store/slices/cartSlice';
import { fetchWishlist } from '../store/slices/wishlistSlice';
import { fetchOrders } from '../store/slices/orderSlice';

export const ShopProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    // When the application loads (i.e. Redux state is gone on refresh),
    // we call the provided approximate APIs to restore the state.
    dispatch(fetchCustomerProfile());
    dispatch(fetchCart());
    dispatch(fetchWishlist());
    dispatch(fetchOrders());
  }, [dispatch]);
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  // Load the real storefront catalog on mount: categories first so product
  // category names can be resolved from the raw categoryId the list endpoint returns.
  useEffect(() => {
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
      } finally {
        if (!cancelled) setIsLoadingProducts(false);
      }
    };

    loadCatalog();
    return () => { cancelled = true; };
  }, []);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('allura_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Wishlist state
  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('allura_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

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
      const saved = localStorage.getItem('allura_customer');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Orders state
  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem('allura_orders');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

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

  // Sync state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('allura_cart', JSON.stringify(cart));
    } catch (e) {
      console.error(e);
    }
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem('allura_wishlist', JSON.stringify(wishlist));
    } catch (e) {
      console.error(e);
    }
  }, [wishlist]);

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

  useEffect(() => {
    try {
      localStorage.setItem('allura_orders', JSON.stringify(orders));
    } catch (e) {
      console.error(e);
    }
  }, [orders]);

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

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addRecentlyViewed = useCallback((product: Product) => {
    setRecentlyViewed(prev => {
      const filtered = prev.filter(p => p.id !== product.id);
      return [product, ...filtered].slice(0, 8);
    });
  }, []);

  const addToCart = useCallback((product: Product, size: string, color: ProductColor, quantity = 1) => {
    if (!customer) {
      navigate('/auth/login');
      return;
    }
    setCart(prev => {
      const existingIndex = prev.findIndex(
        item => item.product.id === product.id && item.selectedSize === size && item.selectedColor.name === color.name
      );
      if (existingIndex > -1) {
        const next = [...prev];
        next[existingIndex].quantity += quantity;
        return next;
      }
      return [...prev, { product, selectedSize: size, selectedColor: color, quantity }];
    });

    addRecentlyViewed(product);
    showToast(`Added ${product.name} (${size}) to your Bag`, 'gold');
    setIsCartOpen(true);
  }, [addRecentlyViewed, showToast, customer, navigate]);

  const removeFromCart = useCallback((productId: string, size: string, colorName: string) => {
    setCart(prev =>
      prev.filter(
        item => !(item.product.id === productId && item.selectedSize === size && item.selectedColor.name === colorName)
      )
    );
    showToast('Item removed from Bag', 'info');
  }, [showToast]);

  const updateQuantity = useCallback((productId: string, size: string, colorName: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId, size, colorName);
      return;
    }
    setCart(prev =>
      prev.map(item => {
        if (item.product.id === productId && item.selectedSize === size && item.selectedColor.name === colorName) {
          return { ...item, quantity };
        }
        return item;
      })
    );
  }, [removeFromCart]);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const toggleWishlist = useCallback((product: Product) => {
    if (!customer) {
      navigate('/auth/login');
      return;
    }
    const exists = wishlist.includes(product.id);
    if (exists) {
      setWishlist(prev => prev.filter(id => id !== product.id));
      showToast(`Removed from your Wishlist`, 'info');
    } else {
      setWishlist(prev => [...prev, product.id]);
      showToast(`Added to your Wishlist ❤️`, 'gold');
    }
  }, [wishlist, showToast, customer, navigate]);

  const isInWishlist = useCallback((productId: string) => wishlist.includes(productId), [wishlist]);

  // Pricing calculations
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cartSubtotal = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const freeShippingRemaining = Math.max(0, FREE_SHIPPING_THRESHOLD - cartSubtotal);
  const freeShippingProgress = Math.min(100, (cartSubtotal / FREE_SHIPPING_THRESHOLD) * 100);

  // Coupon calculations
  let couponDiscount = 0;
  if (appliedCoupon && cartSubtotal >= appliedCoupon.minOrderValue) {
    if (appliedCoupon.discountType === 'Percentage') {
      const calc = (cartSubtotal * appliedCoupon.discountValue) / 100;
      couponDiscount = appliedCoupon.maxDiscount ? Math.min(calc, appliedCoupon.maxDiscount) : calc;
    } else {
      couponDiscount = appliedCoupon.discountValue;
    }
  }

  const finalOrderTotal = Math.max(0, cartSubtotal - couponDiscount);

  const applyCoupon = useCallback((code: string) => {
    const clean = code.trim().toUpperCase();
    const found = mockCouponsData.find(c => c.code === clean && c.status === 'Active');
    if (!found) {
      showToast(`Invalid coupon code: "${code}"`, 'error');
      return { success: false, message: 'Invalid or expired coupon code.' };
    }
    if (cartSubtotal < found.minOrderValue) {
      showToast(`Minimum order of ₹${found.minOrderValue.toLocaleString('en-IN')} required for ${clean}`, 'info');
      return { success: false, message: `Minimum cart value of ₹${found.minOrderValue} required.` };
    }
    setAppliedCoupon(found);
    showToast(`Coupon ${found.code} applied successfully!`, 'success');
    return { success: true, message: `Applied ${found.code} successfully!` };
  }, [cartSubtotal, showToast]);

  const removeCoupon = useCallback(() => {
    setAppliedCoupon(null);
    showToast('Coupon removed', 'info');
  }, [showToast]);

  // Customer Auth
  const loginUser = async (data: LoginData) => {
    try {
      const response = await login(data);
      if (response.token) {
        document.cookie = `token=${response.token}; path=/; max-age=86400; SameSite=Strict`;
      } else if (response.data?.accessToken) {
        document.cookie = `token=${response.data.accessToken}; path=/; max-age=86400; SameSite=Strict`;
      }
      
      if (response.refreshToken) {
        document.cookie = `refreshToken=${response.refreshToken}; path=/; max-age=604800; SameSite=Strict`;
      } else if (response.data?.refreshToken) {
        document.cookie = `refreshToken=${response.data.refreshToken}; path=/; max-age=604800; SameSite=Strict`;
      }
      
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

  const registerUser = async (data: RegisterData) => {
    try {
      const response = await register(data);
      if (response.token) {
        document.cookie = `token=${response.token}; path=/; max-age=86400; SameSite=Strict`;
      } else if (response.data?.accessToken) {
        document.cookie = `token=${response.data.accessToken}; path=/; max-age=86400; SameSite=Strict`;
      }

      if (response.refreshToken) {
        document.cookie = `refreshToken=${response.refreshToken}; path=/; max-age=604800; SameSite=Strict`;
      } else if (response.data?.refreshToken) {
        document.cookie = `refreshToken=${response.data.refreshToken}; path=/; max-age=604800; SameSite=Strict`;
      }
      
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
    document.cookie = 'token=; path=/; max-age=0; SameSite=Strict';
    document.cookie = 'refreshToken=; path=/; max-age=0; SameSite=Strict';
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

  const addCustomerAddress = async (data: Omit<SavedAddress, 'id'>) => {
    if (!customer) return;
    try {
      const newAddress = await addAddress(data);
      setCustomer((prev) => {
        if (!prev) return prev;
        return { ...prev, addresses: [...prev.addresses, newAddress] };
      });
      showToast('Address saved successfully', 'success');
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
        unitPrice: item.product.price,
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

  const getOrderById = (orderId: string) => {
    return orders.find(o => o.id === orderId || o.orderNumber === orderId);
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
        wishlist,
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
        removeCoupon,
        finalOrderTotal,
        customer,
        isAuthenticated,
        loginUser,
        registerUser,
        completeProfile,
        logoutCustomer,
        fetchCustomerAddresses,
        addCustomerAddress,
        updateCustomerAddress,
        deleteCustomerAddress,
        orders,
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
