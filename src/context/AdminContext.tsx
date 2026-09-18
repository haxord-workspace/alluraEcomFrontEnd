import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  AdminPermissionMatrix,
  AuditLogItem,
  StockTransaction,
  StockReservation,
  CMSPage,
  FAQItem,
  AIKnowledgeArticle,
  CustomerProfile,
} from '../types';
import { productsData } from '../data/products';
import { mockOrdersData, mockReturnRequestsData } from '../data/mockOrders';
import { mockCouponsData, mockPromotionsData } from '../data/mockCoupons';
import { mockCustomersData, mockAbandonedCartsData } from '../data/mockCustomers';
import { mockBannersData } from '../data/mockBanners';
import {
  mockAdminUsers,
  mockDefaultPermissions,
  mockAuditLogsData,
  mockStockTransactionsData,
  mockStockReservationsData,
  mockCMSPagesData,
} from '../data/mockAdminSettings';
import { mockFaqsData } from '../data/mockFaqs';
import { mockAIKnowledgeData } from '../data/mockAIKnowledge';
import { useShop } from './ShopContext';

interface AdminContextType {
  // Admin Session & Roles
  currentAdmin: AdminUser;
  setCurrentAdmin: (admin: AdminUser) => void;
  adminUsers: AdminUser[];
  role: AdminRole;
  setRole: (role: AdminRole) => void;
  permissions: AdminPermissionMatrix;
  permissionsMatrix: Record<string, AdminPermissionMatrix>;
  updatePermissions: (role: AdminRole, perms: Partial<AdminPermissionMatrix>) => void;
  hasPermission: (module: keyof AdminPermissionMatrix, action?: string) => boolean;
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
  addBanner: (banner: Omit<Banner, 'id'>) => Banner;
  updateBanner: (id: string, updates: Partial<Banner>) => void;
  deleteBanner: (id: string) => void;
  abandonedCarts: AbandonedCart[];
  sendCartReminder: (id: string, channel: 'WhatsApp' | 'Email') => void;

  // Content & FAQs
  cmsPages: CMSPage[];
  updateCMSPage: (id: string, updates: Partial<CMSPage>) => void;
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
  adminNotifications: {
    id: string;
    title: string;
    description: string;
    time: string;
    type: 'order' | 'stock' | 'return' | 'payment';
    isRead: boolean;
  }[];
  markAdminNotificationRead: (id: string) => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useShop();

  // Admin Session
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('allura_admin_auth') === 'true';
  });

  const [adminUsers] = useState<AdminUser[]>(() => {
    try {
      const saved = localStorage.getItem('allura_admin_users');
      return saved ? JSON.parse(saved) : mockAdminUsers;
    } catch {
      return mockAdminUsers;
    }
  });

  const [currentAdmin, setCurrentAdmin] = useState<AdminUser>(() => {
    try {
      const saved = localStorage.getItem('allura_current_admin');
      return saved ? JSON.parse(saved) : mockAdminUsers[0];
    } catch {
      return mockAdminUsers[0];
    }
  });

  const [permissionsMatrix, setPermissionsMatrix] = useState<Record<string, AdminPermissionMatrix>>(() => {
    try {
      const saved = localStorage.getItem('allura_admin_permissions');
      return saved ? { ...mockDefaultPermissions, ...JSON.parse(saved) } : mockDefaultPermissions;
    } catch {
      return mockDefaultPermissions;
    }
  });

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
  const [banners, setBanners] = useState<Banner[]>(mockBannersData);
  const [abandonedCarts, setAbandonedCarts] = useState<AbandonedCart[]>(mockAbandonedCartsData);

  // Customers
  const [customers] = useState<CustomerProfile[]>(mockCustomersData);

  // CMS, FAQs, AI Knowledge
  const [cmsPages, setCmsPages] = useState<CMSPage[]>(mockCMSPagesData);
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
  const [adminNotifications, setAdminNotifications] = useState([
    {
      id: 'adm-notif-1',
      title: 'New Prepaid Order Received',
      description: 'Order ALR-ORD-882045 (₹5,849) by Dr. Shahina K.',
      time: '10 mins ago',
      type: 'order' as const,
      isRead: false,
    },
    {
      id: 'adm-notif-2',
      title: 'Low Stock Alert',
      description: 'Classic Cream Anarkali (Size M) has only 2 units left in atelier.',
      time: '1 hour ago',
      type: 'stock' as const,
      isRead: false,
    },
    {
      id: 'adm-notif-3',
      title: 'Return Request Submitted',
      description: 'Ananya Menon requested size exchange for Blush Pleated Set.',
      time: '3 hours ago',
      type: 'return' as const,
      isRead: true,
    },
  ]);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('allura_admin_auth', isAdminAuthenticated ? 'true' : 'false');
  }, [isAdminAuthenticated]);

  useEffect(() => {
    localStorage.setItem('allura_current_admin', JSON.stringify(currentAdmin));
  }, [currentAdmin]);

  useEffect(() => {
    localStorage.setItem('allura_admin_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('allura_stock_tx', JSON.stringify(stockTransactions));
  }, [stockTransactions]);

  useEffect(() => {
    localStorage.setItem('allura_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('allura_returns', JSON.stringify(returns));
  }, [returns]);

  useEffect(() => {
    localStorage.setItem('allura_coupons', JSON.stringify(coupons));
  }, [coupons]);

  useEffect(() => {
    localStorage.setItem('allura_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem('allura_admin_permissions', JSON.stringify(permissionsMatrix));
  }, [permissionsMatrix]);

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

  // Permissions
  const role = currentAdmin.role;
  const setRole = (newRole: AdminRole) => {
    setCurrentAdmin(prev => ({ ...prev, role: newRole }));
    logAdminAction('Changed Permission', 'Admin Management', `Role changed to ${newRole}`);
    showToast(`Switched active role to ${newRole}`, 'gold');
  };

  const permissions = permissionsMatrix[role] || mockDefaultPermissions.SUPER_ADMIN;

  const updatePermissions = (targetRole: AdminRole, perms: Partial<AdminPermissionMatrix>) => {
    setPermissionsMatrix(prev => ({
      ...prev,
      [targetRole]: {
        ...prev[targetRole],
        ...perms,
      },
    }));
    logAdminAction('Changed Permission', 'Admin Management', `Updated permissions for ${targetRole}`);
    showToast(`Permissions updated for ${targetRole}`, 'success');
  };

  const hasPermission = (module: keyof AdminPermissionMatrix, action = 'view'): boolean => {
    const mod = permissions[module] as Record<string, boolean> | undefined;
    if (!mod) return false;
    return !!mod[action];
  };

  // Auth
  const adminLogin = async (_email: string, _pass: string): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, 600));
    setIsAdminAuthenticated(true);
    logAdminAction('Logged In', 'Security', 'Admin Portal Session Started');
    showToast('Admin access granted', 'gold');
    return true;
  };

  const adminLogout = () => {
    setIsAdminAuthenticated(false);
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

  // CMS & FAQs
  const updateCMSPage = (id: string, updates: Partial<CMSPage>) => {
    setCmsPages(prev =>
      prev.map(p =>
        p.id === id ? { ...p, ...updates, updatedAt: new Date().toLocaleDateString('en-GB') } : p
      )
    );
    logAdminAction('Updated', 'CMS', id, 'CMS content updated');
    showToast('Page content saved', 'success');
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

  const markAdminNotificationRead = (id: string) => {
    setAdminNotifications(prev => prev.map(n => (n.id === id ? { ...n, isRead: true } : n)));
  };

  return (
    <AdminContext.Provider
      value={{
        currentAdmin,
        setCurrentAdmin,
        adminUsers,
        role,
        setRole,
        permissions,
        permissionsMatrix,
        updatePermissions,
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
        addBanner,
        updateBanner,
        deleteBanner,
        abandonedCarts,
        sendCartReminder,
        cmsPages,
        updateCMSPage,
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
        adminNotifications,
        markAdminNotificationRead,
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
