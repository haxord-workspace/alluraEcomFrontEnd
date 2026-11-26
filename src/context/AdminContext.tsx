import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import type {
  Product,
  Order,
  OrderStatus,
  ReturnRequest,
  ReturnStatus,
  Coupon,
  Promotion,
  Banner,
  AbandonedCart,
  AdminUser,
  AdminRole,
  AuditLogItem,
  StockTransaction,
  StockReservation,
  FAQItem,
  AIKnowledgeArticle,
  CustomerProfile,
} from '../types';
import { productsData } from '../data/products';
import { mockOrdersData, mockReturnRequestsData } from '../data/mockOrders';
import { mockCouponsData, mockPromotionsData } from '../data/mockCoupons';
import { mockCustomersData, mockAbandonedCartsData } from '../data/mockCustomers';
import { getAdminBanners, getPublicBanners } from '../service/adminBanners';
import {
  mockAuditLogsData,
  mockStockTransactionsData,
  mockStockReservationsData,
} from '../data/mockAdminSettings';
import {
  getRolesMatrix,
  settingsErrorMessage,
} from '../service/settings';
import {
  DEFAULT_RBAC_MODULES,
  formatStaffLastActive,
  normalizeAdminRole,
  resolveRbacModuleKey,
} from '../utils/rbac';
import {
  RBAC_ROLES,
  type AnyModuleKey,
  type NormalizedRolesMatrix,
  type PermissionValue,
  type RbacAction,
  type RbacModuleMeta,
  type RbacRole,
  type RolesMatrixMap,
} from '../types/settings';
import { mockFaqsData } from '../data/mockFaqs';
import { mockAIKnowledgeData } from '../data/mockAIKnowledge';
import { useShop } from './ShopContext';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import {
  loginAdmin,
  logoutAdmin,
  fetchAdminProfile,
} from '../store/slices/adminAuthSlice';

interface AdminContextType {
  // Admin Session & Roles
  currentAdmin: AdminUser;
  setCurrentAdmin: (admin: AdminUser) => void;
  realRole: AdminRole | null;
  role: AdminRole | null;
  setRole: (role: AdminRole) => void;
  rolesMatrix: RolesMatrixMap | null;
  rbacModules: RbacModuleMeta[];
  availableRoles: RbacRole[];
  lockedRoles: RbacRole[];
  isLoadingPermissions: boolean;
  isRefreshingPermissions: boolean;
  permissionsError: string | null;
  refreshPermissions: (options?: { background?: boolean }) => Promise<NormalizedRolesMatrix | null>;
  setRolesMatrixState: React.Dispatch<React.SetStateAction<NormalizedRolesMatrix | null>>;
  getPermissionState: (module: AnyModuleKey, action?: string) => PermissionValue;
  hasPermission: (module: AnyModuleKey, action?: string) => boolean;
  isAdminAuthenticated: boolean;
  adminLogin: (email: string, pass: string) => Promise<boolean>;
  adminLogout: () => void;

  // Products & Catalog
  products: Product[];
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Product;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  duplicateProduct: (id: string) => Product;
  archiveProduct: (id: string) => void;

  // Inventory & Stock
  stockTransactions: StockTransaction[];
  stockReservations: StockReservation[];
  adjustStock: (
    productId: string,
    operation: 'Add' | 'Remove' | 'Set',
    quantity: number,
    reason: string,
    sku?: string
  ) => void;

  // Orders Management
  orders: Order[];
  updateOrderStatus: (orderId: string, status: OrderStatus, note?: string) => void;
  generateDelhiveryAWB: (orderId: string) => string;
  cancelOrder: (orderId: string, reason: string) => void;

  // Returns & Refunds
  returns: ReturnRequest[];
  updateReturnStatus: (returnId: string, status: ReturnStatus, adminNotes?: string) => void;
  scheduleReturnPickup: (returnId: string, date: string) => void;

  // Customers
  customers: CustomerProfile[];
  getCustomerById: (id: string) => CustomerProfile | undefined;

  // Marketing
  coupons: Coupon[];
  addCoupon: (coupon: Omit<Coupon, 'id' | 'usageCount'>) => Coupon;
  updateCoupon: (id: string, updates: Partial<Coupon>) => void;
  deleteCoupon: (id: string) => void;
  promotions: Promotion[];
  addPromotion: (promo: Omit<Promotion, 'id'>) => Promotion;
  banners: Banner[];
  isLoadingBanners: boolean;
  setBannersList: (banners: Banner[]) => void;
  addBanner: (banner: Omit<Banner, 'id'>) => Banner;
  updateBanner: (id: string, updates: Partial<Banner>) => void;
  deleteBanner: (id: string) => void;
  resetBannersToDefault: () => void;
  abandonedCarts: AbandonedCart[];
  sendCartReminder: (id: string, channel: 'WhatsApp' | 'Email') => void;

  // Content & FAQs
  faqs: FAQItem[];
  addFAQ: (faq: Omit<FAQItem, 'id' | 'updatedAt'>) => FAQItem;
  updateFAQ: (id: string, updates: Partial<FAQItem>) => void;
  deleteFAQ: (id: string) => void;

  // AI & SEO
  aiArticles: AIKnowledgeArticle[];
  addAIArticle: (article: Omit<AIKnowledgeArticle, 'id' | 'lastUpdated'>) => AIKnowledgeArticle;
  updateAIArticle: (id: string, updates: Partial<AIKnowledgeArticle>) => void;

  // Audit Logs
  auditLogs: AuditLogItem[];
  logAdminAction: (
    action: AuditLogItem['action'],
    module: string,
    resource: string,
    details?: string
  ) => void;

  // Global Command Bar & Notifications
  isCommandOpen: boolean;
  setIsCommandOpen: (open: boolean) => void;
  isAdminNotificationsOpen: boolean;
  setIsAdminNotificationsOpen: (open: boolean) => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useShop();
  const dispatch = useDispatch<AppDispatch>();

  // Admin auth state lives in Redux
  const isAdminAuthenticated = useSelector((state: RootState) => state.adminAuth.isAuthenticated);

  // On mount: always attempt to restore the admin session via /auth/me.
  // Don't gate this on the access-token cookie's presence — it's short-lived
  // and may have already expired while the httpOnly refresh cookie is still
  // valid, in which case adminApi's response interceptor silently refreshes
  // it on the 401. Skipping this call whenever the cookie was already gone
  // is what caused admins to be bounced to /admin/login after being away.
  // Only needed on admin pages; the storefront never uses the admin session.
  const isAdminRoute = useLocation().pathname.startsWith('/admin');
  useEffect(() => {
    if (isAdminRoute && !isAdminAuthenticated) {
      dispatch(fetchAdminProfile());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminRoute]);

  // Clean up any legacy localStorage caches for staff/permissions/admin profile
  useEffect(() => {
    try {
      localStorage.removeItem('allura_admin_users');
      localStorage.removeItem('allura_current_admin');
      localStorage.removeItem('allura_admin_permissions');
    } catch {
      // Ignore storage cleanup errors
    }
  }, []);

  const authAdmin = useSelector((state: RootState) => state.adminAuth.admin);
  const authPermissions = useSelector((state: RootState) => state.adminAuth.permissions);
  const adminAuthStatus = useSelector((state: RootState) => state.adminAuth.status);
  const realRole = normalizeAdminRole(authPermissions?.role || authAdmin?.role);

  const [currentAdmin, setCurrentAdmin] = useState<AdminUser>({
    id: '',
    name: 'Admin',
    email: '',
    role: 'ORDER_MANAGER',
    status: 'Active',
    lastLogin: 'Never',
    createdDate: '',
  });
  const [roleOverride, setRoleOverride] = useState<AdminRole | null>(null);

  const [rolesMatrixState, setRolesMatrixState] = useState<NormalizedRolesMatrix | null>(null);
  const rolesMatrixRef = useRef<NormalizedRolesMatrix | null>(null);
  rolesMatrixRef.current = rolesMatrixState;
  const [isLoadingPermissions, setIsLoadingPermissions] = useState<boolean>(false);
  const [isRefreshingPermissions, setIsRefreshingPermissions] = useState<boolean>(false);
  const [permissionsError, setPermissionsError] = useState<string | null>(null);

  // Products
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('allura_admin_products');
      return saved ? JSON.parse(saved) : productsData;
    } catch {
      return productsData;
    }
  });

  // Inventory
  const [stockTransactions, setStockTransactions] = useState<StockTransaction[]>(() => {
    try {
      const saved = localStorage.getItem('allura_stock_tx');
      return saved ? JSON.parse(saved) : mockStockTransactionsData;
    } catch {
      return mockStockTransactionsData;
    }
  });

  const [stockReservations] = useState<StockReservation[]>(mockStockReservationsData);

  // Orders
  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem('allura_orders');
      return saved ? JSON.parse(saved) : mockOrdersData;
    } catch {
      return mockOrdersData;
    }
  });

  // Returns
  const [returns, setReturns] = useState<ReturnRequest[]>(() => {
    try {
      const saved = localStorage.getItem('allura_returns');
      return saved ? JSON.parse(saved) : mockReturnRequestsData;
    } catch {
      return mockReturnRequestsData;
    }
  });

  // Marketing
  const [coupons, setCoupons] = useState<Coupon[]>(() => {
    try {
      const saved = localStorage.getItem('allura_coupons');
      return saved ? JSON.parse(saved) : mockCouponsData;
    } catch {
      return mockCouponsData;
    }
  });

  const [promotions, setPromotions] = useState<Promotion[]>(mockPromotionsData);
  const [banners, setBanners] = useState<Banner[]>(() => {
    try {
      const fromSession = sessionStorage.getItem('allura_banners_session');
      if (fromSession) {
        const parsed = JSON.parse(fromSession);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      const saved = localStorage.getItem('allura_banners');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isLoadingBanners, setIsLoadingBanners] = useState<boolean>(() => banners.length === 0);
  const [abandonedCarts, setAbandonedCarts] = useState<AbandonedCart[]>(mockAbandonedCartsData);

  // Customers
  const [customers] = useState<CustomerProfile[]>(mockCustomersData);

  // FAQs, AI Knowledge
  const [faqs, setFaqs] = useState<FAQItem[]>(mockFaqsData);
  const [aiArticles, setAiArticles] = useState<AIKnowledgeArticle[]>(mockAIKnowledgeData);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(() => {
    try {
      const saved = localStorage.getItem('allura_audit_logs');
      return saved ? JSON.parse(saved) : mockAuditLogsData;
    } catch {
      return mockAuditLogsData;
    }
  });

  // UI States
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isAdminNotificationsOpen, setIsAdminNotificationsOpen] = useState(false);

  // Sync currentAdmin directly from the authenticated admin profile (adminAuthSlice)
  useEffect(() => {
    if (!authAdmin) {
      setRoleOverride(null);
      setRolesMatrixState(null);
      setPermissionsError(null);
      setIsLoadingPermissions(false);
      setCurrentAdmin({
        id: '',
        name: 'Admin',
        email: '',
        role: 'ORDER_MANAGER',
        status: 'Active',
        lastLogin: 'Never',
        createdDate: '',
      });
      return;
    }

    const p = authAdmin.profile || {};
    const name =
      p.displayName ||
      [p.firstName, p.lastName].filter(Boolean).join(' ') ||
      authAdmin.name ||
      authAdmin.fullName ||
      authAdmin.email ||
      'Admin';
    const resolvedRole = normalizeAdminRole(authAdmin.role) || 'ORDER_MANAGER';

    setRoleOverride(null);
    setCurrentAdmin({
      id: String(authAdmin._id || authAdmin.id || ''),
      name,
      email: authAdmin.email || '',
      role: resolvedRole,
      status: authAdmin.status && authAdmin.status !== 'ACTIVE' ? 'Suspended' : 'Active',
      lastLogin: formatStaffLastActive(authAdmin.lastLoginAt || authAdmin.lastActiveAt || authAdmin.lastLogin),
      createdDate: authAdmin.createdAt || '',
    });
  }, [authAdmin]);

  const refreshPermissions = useCallback(
    async (options?: { background?: boolean }): Promise<NormalizedRolesMatrix | null> => {
      if (!isAdminAuthenticated || !realRole) {
        setRolesMatrixState(null);
        setPermissionsError(null);
        setIsLoadingPermissions(false);
        setIsRefreshingPermissions(false);
        return null;
      }

      // Non-super roles MUST NEVER call getRolesMatrix() (avoids 403)
      if (realRole !== 'SUPER_ADMIN') {
        await dispatch(fetchAdminProfile());
        return null;
      }

      // Only SUPER_ADMIN calls getRolesMatrix()
      const isBackground = Boolean(options?.background && rolesMatrixRef.current);
      if (isBackground) {
        setIsRefreshingPermissions(true);
      } else {
        setIsLoadingPermissions(true);
      }
      setPermissionsError(null);

      try {
        const normalized = await getRolesMatrix();
        setRolesMatrixState(normalized);
        return normalized;
      } catch (err) {
        const message = settingsErrorMessage(err, "Couldn't load permissions");
        setPermissionsError(message);
        if (!isBackground) {
          setRolesMatrixState(null);
        }
        return null;
      } finally {
        if (isBackground) {
          setIsRefreshingPermissions(false);
        } else {
          setIsLoadingPermissions(false);
        }
      }
    },
    [isAdminAuthenticated, realRole, dispatch]
  );

  useEffect(() => {
    // Only call getRolesMatrix on mount if the real role is SUPER_ADMIN
    if (isAdminAuthenticated && realRole === 'SUPER_ADMIN') {
      void refreshPermissions();
    }
  }, [isAdminAuthenticated, realRole, refreshPermissions]);

  const safeLocalStorageSet = (key: string, value: any) => {
    try {
      localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    } catch (err) {
      console.warn(`[AdminContext] Failed to cache ${key} to localStorage:`, err);
    }
  };

  const safeSaveBannersToStorage = (list: Banner[]) => {
    try {
      // Exclude oversized base64 strings from local storage cache to keep storage light (<20KB) and prevent main-thread freeze
      const sanitized = list.map(b => ({
        ...b,
        desktopImage: (b.desktopImage?.startsWith('data:') && b.desktopImage.length > 30000) ? '' : b.desktopImage,
        mobileImage: (b.mobileImage?.startsWith('data:') && b.mobileImage.length > 30000) ? '' : b.mobileImage,
      }));
      const serialized = JSON.stringify(sanitized);
      sessionStorage.setItem('allura_banners_session', serialized);
      localStorage.setItem('allura_banners', serialized);
    } catch (err) {
      console.warn('[AdminContext] Could not cache banners to storage:', err);
    }
  };

  useEffect(() => {
    safeLocalStorageSet('allura_admin_products', products);
  }, [products]);

  useEffect(() => {
    safeLocalStorageSet('allura_stock_tx', stockTransactions);
  }, [stockTransactions]);

  useEffect(() => {
    safeLocalStorageSet('allura_orders', orders);
  }, [orders]);

  useEffect(() => {
    safeLocalStorageSet('allura_returns', returns);
  }, [returns]);

  useEffect(() => {
    safeLocalStorageSet('allura_coupons', coupons);
  }, [coupons]);

  useEffect(() => {
    safeLocalStorageSet('allura_audit_logs', auditLogs);
  }, [auditLogs]);

  useEffect(() => {
    let isMounted = true;
    const fetchBannersData = async () => {
      // 1. If authenticated as an admin, query the admin banners endpoint
      if (isAdminAuthenticated) {
        try {
          const res = await getAdminBanners({ sortBy: 'displayOrder', sortOrder: 'asc' });
          if (Array.isArray(res) && res.length > 0) {
            if (isMounted) setBanners(res);
            return;
          }
        } catch (err) {
          console.warn('[AdminContext] Admin banners fetch failed, falling back to public banners endpoint:', err);
        }
      }

      // 2. For storefront visitors and unauthenticated users, directly call public banners:
      // GET /api/v1/banners?sortBy=displayOrder&sortOrder=asc
      try {
        const publicBanners = await getPublicBanners({ sortBy: 'displayOrder', sortOrder: 'asc' });
        if (isMounted && Array.isArray(publicBanners) && publicBanners.length > 0) {
          setBanners(publicBanners);
        }
      } catch (err) {
        console.warn('[AdminContext] Could not load public banners:', err);
      } finally {
        if (isMounted) setIsLoadingBanners(false);
      }
    };

    fetchBannersData();
    return () => {
      isMounted = false;
    };
  }, [isAdminAuthenticated]);

  useEffect(() => {
    if (banners.length > 0) {
      safeSaveBannersToStorage(banners);
    }
  }, [banners]);

  // Logging
  const logAdminAction = useCallback((
    action: AuditLogItem['action'],
    module: string,
    resource: string,
    details?: string
  ) => {
    const newLog: AuditLogItem = {
      id: `aud-${Date.now()}`,
      userName: currentAdmin.name,
      userRole: currentAdmin.role,
      action,
      module,
      resource,
      ipAddress: '117.218.42.10 (Atelier Secure VPN)',
      timestamp: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
      details,
    };
    setAuditLogs(prev => [newLog, ...prev]);
  }, [currentAdmin]);

  // Permissions — backed by /auth/me for staff, and by rolesMatrix for Super Admin / preview
  const role: AdminRole | null = realRole === 'SUPER_ADMIN' ? (roleOverride ?? realRole) : realRole;

  const setRole = (newRole: AdminRole) => {
    if (realRole !== 'SUPER_ADMIN') return;
    const normalized = normalizeAdminRole(newRole);
    if (!normalized) return;
    setRoleOverride(normalized === realRole ? null : normalized);
    setCurrentAdmin(prev => ({ ...prev, role: normalized }));
    logAdminAction('Changed Permission', 'Admin Management', `Role changed to ${normalized}`);
    showToast(`Switched active role to ${normalized}`, 'gold');
    void refreshPermissions({ background: true });
  };

  const effectiveIsLoadingPermissions =
    adminAuthStatus === 'loading' ||
    (realRole === 'SUPER_ADMIN' && isLoadingPermissions && !rolesMatrixState);

  const getPermissionState = useCallback(
    (module: AnyModuleKey, action = 'view'): PermissionValue => {
      if (!isAdminAuthenticated || !role || effectiveIsLoadingPermissions) {
        return null;
      }
      const canonicalModule = resolveRbacModuleKey(module);
      if (!canonicalModule) return null;

      const normalizedAction = action.toLowerCase();
      const act =
        normalizedAction === 'cancel' || normalizedAction === 'refund'
          ? 'edit'
          : normalizedAction === 'send'
            ? 'create'
            : normalizedAction;

      // 1. If role is overridden (preview mode active by Super Admin)
      if (roleOverride && rolesMatrixState) {
        const modPerms = rolesMatrixState.matrix[roleOverride]?.[canonicalModule];
        return modPerms?.[act as RbacAction] ?? null;
      }

      // 2. If user is Super Admin
      if (authPermissions?.superAdmin === true || realRole === 'SUPER_ADMIN') {
        if (rolesMatrixState?.matrix.SUPER_ADMIN?.[canonicalModule]) {
          return rolesMatrixState.matrix.SUPER_ADMIN[canonicalModule][act as RbacAction] ?? true;
        }
        return true;
      }

      // 3. Non-super user: check authPermissions from /auth/me
      if (authPermissions?.matrix?.[canonicalModule]?.[act] !== undefined) {
        return authPermissions.matrix[canonicalModule][act];
      }

      const permKey = `${canonicalModule}:${act}`;
      return authPermissions?.granted?.includes(permKey) ? true : false;
    },
    [isAdminAuthenticated, role, effectiveIsLoadingPermissions, roleOverride, rolesMatrixState, authPermissions, realRole]
  );

  const hasPermission = useCallback(
    (module: AnyModuleKey, action = 'view'): boolean => {
      if (!isAdminAuthenticated || !role || effectiveIsLoadingPermissions) {
        return false;
      }

      // 1. If role is overridden (preview mode by Super Admin)
      if (roleOverride && rolesMatrixState) {
        const canonicalModule = resolveRbacModuleKey(module);
        if (!canonicalModule) return false;
        const norm = action.toLowerCase();
        const act = norm === 'cancel' || norm === 'refund' ? 'edit' : norm === 'send' ? 'create' : norm;
        return rolesMatrixState.matrix[roleOverride]?.[canonicalModule]?.[act as RbacAction] === true;
      }

      // 2. Super Admin: full access
      if (authPermissions?.superAdmin === true || realRole === 'SUPER_ADMIN') {
        return true;
      }

      // 3. Staff member: evaluate `${module}:${action}` in granted list
      const canonicalModule = resolveRbacModuleKey(module);
      if (!canonicalModule) return false;
      const norm = action.toLowerCase();
      const act = norm === 'cancel' || norm === 'refund' ? 'edit' : norm === 'send' ? 'create' : norm;
      const permKey = `${canonicalModule}:${act}`;
      return Boolean(authPermissions?.granted?.includes(permKey));
    },
    [isAdminAuthenticated, role, effectiveIsLoadingPermissions, roleOverride, rolesMatrixState, authPermissions, realRole]
  );

  const rolesMatrix = rolesMatrixState?.matrix ?? null;
  const rbacModules = rolesMatrixState?.modules ?? DEFAULT_RBAC_MODULES;
  const availableRoles: RbacRole[] = rolesMatrixState?.roles ?? (realRole ? [realRole] : [...RBAC_ROLES]);
  const lockedRoles: RbacRole[] = rolesMatrixState?.lockedRoles ?? ['SUPER_ADMIN'];

  // Auth — dispatches to Redux thunks which handle cookies + API
  const adminLogin = async (email: string, pass: string): Promise<boolean> => {
    const result = await dispatch(loginAdmin({ email, password: pass }));
    if (loginAdmin.fulfilled.match(result)) {
      logAdminAction('Logged In', 'Security', 'Admin Portal Session Started');
      showToast('Admin access granted', 'gold');
      return true;
    } else {
      const msg = (result.payload as string) || 'Login failed. Please check your credentials.';
      showToast(msg, 'error');
      return false;
    }
  };

  const adminLogout = async () => {
    await dispatch(logoutAdmin());
    showToast('Logged out of Admin Portal', 'info');
  };

  // Product CRUD
  const addProduct = (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Product => {
    const id = `prod-${Date.now()}`;
    const newProduct: Product = {
      ...productData,
      id,
      slug: productData.slug || productData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: productData.status || 'Active',
      inStock: (productData.stockCount ?? 1) > 0,
    };

    setProducts(prev => [newProduct, ...prev]);
    logAdminAction('Created', 'Products', newProduct.name, `Created with SKU ${newProduct.sku}`);
    showToast(`Product "${newProduct.name}" created successfully!`, 'success');
    return newProduct;
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts(prev =>
      prev.map(p => (p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p))
    );
    logAdminAction('Updated', 'Products', updates.name || id, `Updated fields: ${Object.keys(updates).join(', ')}`);
    showToast('Product updated successfully', 'success');
  };

  const deleteProduct = (id: string) => {
    const target = products.find(p => p.id === id);
    setProducts(prev => prev.filter(p => p.id !== id));
    logAdminAction('Deleted', 'Products', target?.name || id, 'Product permanently removed from catalog');
    showToast('Product removed from catalog', 'info');
  };

  const duplicateProduct = (id: string): Product => {
    const orig = products.find(p => p.id === id);
    if (!orig) throw new Error('Product not found');
    const copy: Product = {
      ...orig,
      id: `prod-${Date.now()}`,
      name: `${orig.name} (Copy)`,
      slug: `${orig.slug}-copy-${Math.floor(Math.random() * 1000)}`,
      sku: `${orig.sku}-CPY`,
      status: 'Draft',
    };
    setProducts(prev => [copy, ...prev]);
    logAdminAction('Created', 'Products', copy.name, `Duplicated from ${orig.name}`);
    showToast(`Duplicated "${orig.name}" as draft`, 'gold');
    return copy;
  };

  const archiveProduct = (id: string) => {
    updateProduct(id, { status: 'Archived' });
    logAdminAction('Archived', 'Products', id, 'Status changed to Archived');
    showToast('Product moved to archive', 'info');
  };

  // Stock adjustments
  const adjustStock = (
    productId: string,
    operation: 'Add' | 'Remove' | 'Set',
    quantity: number,
    reason: string,
    sku?: string
  ) => {
    const targetProduct = products.find(p => p.id === productId);
    if (!targetProduct) return;

    const prevCount = targetProduct.stockCount || 0;
    let newCount = prevCount;

    if (operation === 'Add') newCount = prevCount + quantity;
    else if (operation === 'Remove') newCount = Math.max(0, prevCount - quantity);
    else if (operation === 'Set') newCount = Math.max(0, quantity);

    updateProduct(productId, {
      stockCount: newCount,
      inStock: newCount > 0,
    });

    const tx: StockTransaction = {
      id: `stk-tx-${Date.now()}`,
      date: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
      productName: targetProduct.name,
      sku: sku || targetProduct.sku,
      operation,
      quantity,
      previousStock: prevCount,
      newStock: newCount,
      reason,
      user: currentAdmin.name,
      reference: `ADJ-${Date.now().toString().slice(-6)}`,
    };

    setStockTransactions(prev => [tx, ...prev]);
    logAdminAction('Updated', 'Inventory', targetProduct.name, `${operation} ${quantity} units. Stock: ${prevCount} -> ${newCount}`);
    showToast(`Inventory updated: ${newCount} units available`, 'success');
  };

  // Order management
  const updateOrderStatus = (orderId: string, status: OrderStatus, note?: string) => {
    setOrders(prev =>
      prev.map(ord => {
        if (ord.id === orderId || ord.orderNumber === orderId) {
          const updated: Order = {
            ...ord,
            orderStatus: status,
            activityHistory: [
              ...(ord.activityHistory || []),
              {
                timestamp: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
                user: currentAdmin.name,
                action: `Order Status updated to ${status}`,
                note,
              },
            ],
          };
          if (status === 'Shipped' && !updated.tracking?.awb) {
            const awb = `DLHV${Math.floor(100000000 + Math.random() * 900000000)}IN`;
            updated.tracking = {
              awb,
              courier: 'Delhivery Luxury Express',
              courierService: 'Express Kerala Handcrafted Dispatch',
              estimatedDelivery: '3 Days from today',
              currentStatus: 'Dispatched from Perinthalmanna Atelier',
              milestones: [
                {
                  status: 'Shipped',
                  location: 'Allura Central Atelier',
                  timestamp: 'Just now',
                  description: 'Manifest handed over to Delhivery Logistics partner.',
                  completed: true,
                  current: true,
                },
                {
                  status: 'Order Confirmed',
                  location: 'Storefront',
                  timestamp: ord.date,
                  description: 'Order placed and payment authorized.',
                  completed: true,
                },
              ],
            };
          }
          return updated;
        }
        return ord;
      })
    );
    logAdminAction('Updated', 'Orders', orderId, `Status transitioned to ${status}`);
    showToast(`Order status updated to "${status}"`, 'success');
  };

  const generateDelhiveryAWB = (orderId: string): string => {
    const awb = `DLHV${Math.floor(100000000 + Math.random() * 900000000)}IN`;
    setOrders(prev =>
      prev.map(ord => {
        if (ord.id === orderId || ord.orderNumber === orderId) {
          return {
            ...ord,
            orderStatus: 'Shipped',
            tracking: {
              ...(ord.tracking || {
                courier: 'Delhivery Luxury Express',
                courierService: 'Doorstep Luxury Air',
                estimatedDelivery: '3 Days from today',
                milestones: [],
              }),
              awb,
              currentStatus: 'Dispatched & Handed to Delhivery Courier Partner',
            },
          };
        }
        return ord;
      })
    );
    logAdminAction('Updated', 'Shipping', orderId, `Generated Delhivery AWB: ${awb}`);
    showToast(`Delhivery AWB ${awb} generated & label printed`, 'gold');
    return awb;
  };

  const cancelOrder = (orderId: string, reason: string) => {
    updateOrderStatus(orderId, 'Cancelled', reason);
    logAdminAction('Updated', 'Orders', orderId, `Order Cancelled: ${reason}`);
    showToast('Order marked as Cancelled', 'info');
  };

  // Returns management
  const updateReturnStatus = (returnId: string, status: ReturnStatus, adminNotes?: string) => {
    setReturns(prev =>
      prev.map(r => (r.id === returnId ? { ...r, status, adminNotes: adminNotes || r.adminNotes } : r))
    );
    logAdminAction('Updated', 'Returns', returnId, `Return status updated to ${status}`);
    showToast(`Return status updated to "${status}"`, 'success');
  };

  const scheduleReturnPickup = (returnId: string, date: string) => {
    setReturns(prev =>
      prev.map(r =>
        r.id === returnId
          ? { ...r, status: 'Pickup Scheduled', scheduledPickupDate: date }
          : r
      )
    );
    logAdminAction('Updated', 'Returns', returnId, `Scheduled Delhivery reverse pickup on ${date}`);
    showToast(`Reverse pickup scheduled with Delhivery for ${date}`, 'gold');
  };

  // Customers
  const getCustomerById = (id: string) => {
    return customers.find(c => c.id === id);
  };

  // Coupons & Promotions
  const addCoupon = (couponData: Omit<Coupon, 'id' | 'usageCount'>): Coupon => {
    const newCoupon: Coupon = {
      ...couponData,
      id: `coup-${Date.now()}`,
      usageCount: 0,
      status: couponData.status || 'Active',
    };
    setCoupons(prev => [newCoupon, ...prev]);
    logAdminAction('Created', 'Marketing', newCoupon.code, `Discount: ${newCoupon.discountValue}% / Min: ₹${newCoupon.minOrderValue}`);
    showToast(`Coupon ${newCoupon.code} published!`, 'success');
    return newCoupon;
  };

  const updateCoupon = (id: string, updates: Partial<Coupon>) => {
    setCoupons(prev => prev.map(c => (c.id === id ? { ...c, ...updates } : c)));
    logAdminAction('Updated', 'Marketing', id, 'Coupon parameters updated');
    showToast('Coupon details updated', 'success');
  };

  const deleteCoupon = (id: string) => {
    setCoupons(prev => prev.filter(c => c.id !== id));
    logAdminAction('Deleted', 'Marketing', id, 'Coupon deleted');
    showToast('Coupon deleted', 'info');
  };

  const addPromotion = (promo: Omit<Promotion, 'id'>): Promotion => {
    const newPromo: Promotion = { ...promo, id: `promo-${Date.now()}` };
    setPromotions(prev => [newPromo, ...prev]);
    showToast(`Promotion "${newPromo.title}" saved`, 'success');
    return newPromo;
  };

  // Banners
  const addBanner = (banner: Omit<Banner, 'id'>): Banner => {
    const newBanner: Banner = { ...banner, id: `ban-${Date.now()}` };
    setBanners(prev => [newBanner, ...prev]);
    logAdminAction('Created', 'Marketing', newBanner.title, 'Published new marketing banner');
    showToast(`Banner "${newBanner.title}" published!`, 'success');
    return newBanner;
  };

  const updateBanner = (id: string, updates: Partial<Banner>) => {
    setBanners(prev => prev.map(b => (b.id === id ? { ...b, ...updates } : b)));
    showToast('Banner updated', 'success');
  };

  const deleteBanner = (id: string) => {
    setBanners(prev => prev.filter(b => b.id !== id));
    showToast('Banner deleted', 'info');
  };

  const setBannersList = (list: Banner[]) => {
    setBanners(list);
    safeSaveBannersToStorage(list);
  };

  const resetBannersToDefault = () => {
    const fetchPromise = isAdminAuthenticated
      ? getAdminBanners({ sortBy: 'displayOrder', sortOrder: 'asc' })
      : getPublicBanners({ sortBy: 'displayOrder', sortOrder: 'asc' });

    fetchPromise
      .then(apiList => {
        setBanners(apiList);
        safeSaveBannersToStorage(apiList);
        showToast('Store banners synchronized with live backend API', 'gold');
      })
      .catch(() => {
        setBanners([]);
        try {
          localStorage.removeItem('allura_banners');
        } catch {}
        showToast('No active backend banners found', 'info');
      });
  };

  const sendCartReminder = (id: string, channel: 'WhatsApp' | 'Email') => {
    setAbandonedCarts(prev =>
      prev.map(c => {
        if (c.id === id) {
          return {
            ...c,
            reminder1Sent: true,
            reminder1Date: `Just now (${channel})`,
            recoveryChannel: channel,
          };
        }
        return c;
      })
    );
    showToast(`Recovery message triggered to customer via ${channel}`, 'gold');
    logAdminAction('Created', 'Marketing', id, `Sent abandoned cart reminder via ${channel}`);
  };


  const addFAQ = (faq: Omit<FAQItem, 'id' | 'updatedAt'>): FAQItem => {
    const newFAQ: FAQItem = {
      ...faq,
      id: `faq-${Date.now()}`,
      updatedAt: new Date().toLocaleDateString('en-GB'),
    };
    setFaqs(prev => [...prev, newFAQ]);
    showToast('New FAQ published', 'success');
    return newFAQ;
  };

  const updateFAQ = (id: string, updates: Partial<FAQItem>) => {
    setFaqs(prev =>
      prev.map(f =>
        f.id === id ? { ...f, ...updates, updatedAt: new Date().toLocaleDateString('en-GB') } : f
      )
    );
    showToast('FAQ updated', 'success');
  };

  const deleteFAQ = (id: string) => {
    setFaqs(prev => prev.filter(f => f.id !== id));
    showToast('FAQ deleted', 'info');
  };

  // AI Knowledge
  const addAIArticle = (article: Omit<AIKnowledgeArticle, 'id' | 'lastUpdated'>): AIKnowledgeArticle => {
    const newArt: AIKnowledgeArticle = {
      ...article,
      id: `kb-${Date.now()}`,
      lastUpdated: new Date().toLocaleDateString('en-GB'),
    };
    setAiArticles(prev => [newArt, ...prev]);
    showToast('Article added to AI Knowledge Base', 'gold');
    return newArt;
  };

  const updateAIArticle = (id: string, updates: Partial<AIKnowledgeArticle>) => {
    setAiArticles(prev =>
      prev.map(a =>
        a.id === id ? { ...a, ...updates, lastUpdated: new Date().toLocaleDateString('en-GB') } : a
      )
    );
    showToast('AI Knowledge Article updated', 'success');
  };

  return (
    <AdminContext.Provider
      value={{
        currentAdmin,
        setCurrentAdmin,
        realRole,
        role,
        setRole,
        rolesMatrix,
        rbacModules,
        availableRoles,
        lockedRoles,
        isLoadingPermissions: effectiveIsLoadingPermissions,
        isRefreshingPermissions,
        permissionsError,
        refreshPermissions,
        setRolesMatrixState,
        getPermissionState,
        hasPermission,
        isAdminAuthenticated,
        adminLogin,
        adminLogout,
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        duplicateProduct,
        archiveProduct,
        stockTransactions,
        stockReservations,
        adjustStock,
        orders,
        updateOrderStatus,
        generateDelhiveryAWB,
        cancelOrder,
        returns,
        updateReturnStatus,
        scheduleReturnPickup,
        customers,
        getCustomerById,
        coupons,
        addCoupon,
        updateCoupon,
        deleteCoupon,
        promotions,
        addPromotion,
        banners,
        isLoadingBanners,
        setBannersList,
        addBanner,
        updateBanner,
        deleteBanner,
        resetBannersToDefault,
        abandonedCarts,
        sendCartReminder,
        faqs,
        addFAQ,
        updateFAQ,
        deleteFAQ,
        aiArticles,
        addAIArticle,
        updateAIArticle,
        auditLogs,
        logAdminAction,
        isCommandOpen,
        setIsCommandOpen,
        isAdminNotificationsOpen,
        setIsAdminNotificationsOpen,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};
