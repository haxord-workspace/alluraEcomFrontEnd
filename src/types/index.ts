export type ProductCategory =
  | 'Ethnic Wear'
  | 'Modest Wear'
  | 'Party Wear'
  | 'Curated Sets'
  | 'Anarkalis'
  | 'Kurta Sets'
  | 'Dresses'
  | 'Western Wear'
  | 'Co-ord Sets'
  | 'Bridal Edit'
  | 'Occasion Wear'
  | 'Tops'
  | 'Bottoms'
  | 'Accessories';

export interface Category {
  id: string;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED' | string;
  image?: { url: string } | string; // backend sends object {url}, keep string fallback for local presets
  order?: number;
}

/** Backend-schema product type used exclusively in the Admin portal */
export interface AdminProduct {
  id: string;
  name: string;
  sku: string;
  description?: string;
  shortDescription?: string;
  categoryId?: string;
  pricing: {
    mrp: number;
    sellingPrice: number;
    currency: string;
  };
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  images?: { url: string; isPrimary?: boolean }[];
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export type OccasionType = 'Bridal' | 'Festive' | 'Party Wear' | 'Modest Wear' | 'Ethnic' | 'Contemporary' | 'Reception';

export interface ProductColor {
  name: string;
  hex: string;
  image?: string;
}

export interface ProductVariant {
  id: string;
  sku: string;
  barcode: string;
  barcodeType?: 'EAN-13' | 'CODE128' | 'QR';
  color: ProductColor;
  size: string;
  price: number;
  mrp: number;
  costPrice?: number;
  stockOnHand: number;
  stockReserved: number;
  stockAvailable: number;
  lowStockThreshold?: number;
}

export interface ProductSEO {
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  canonicalUrl?: string;
  robots?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  structuredData?: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  price: number;
  originalPrice?: number;
  costPrice?: number;
  category: ProductCategory | string;
  categoryId?: string;
  subcategory?: string;
  occasion: OccasionType | string;
  gender?: 'Women' | 'Unisex' | 'Girls';
  material?: string;
  fit?: string;
  fabric?: string;
  pattern?: string;
  rating: number;
  reviewsCount: number;
  isBestSeller?: boolean;
  isNewArrival?: boolean;
  isFeatured?: boolean;
  colors: ProductColor[];
  sizes: string[];
  variants?: ProductVariant[];
  inStock: boolean;
  stockCount?: number;
  images: {
    primary: string;
    secondary: string;
    gallery?: string[];
  };
  description: string;
  shortDescription?: string;
  fabricDetails: string;
  careInstructions: string;
  stylingTips: string;
  sku: string;
  barcode?: string;
  status?: 'Active' | 'Draft' | 'Archived';
  createdAt?: string;
  updatedAt?: string;
  seo?: ProductSEO;
}

export interface OccasionItem {
  id: string;
  title: string;
  subtitle: string;
  slug: string;
  image: string;
}

export interface CollectionItem {
  id: string;
  title: string;
  slug: string;
  tagline: string;
  description: string;
  image: string;
  banner?: string;
  itemCount: number;
  products?: string[];
  rules?: {
    type: 'manual' | 'automated';
    condition?: string;
  };
  seo?: ProductSEO;
  status?: 'Active' | 'Draft' | 'Archived';
}

export interface CartItem {
  product: Product;
  selectedSize: string;
  selectedColor: ProductColor;
  quantity: number;
}

export interface FilterState {
  category: string;
  occasion: string;
  colors: string[];
  sizes: string[];
  priceRange: [number, number];
  inStockOnly: boolean;
  sortBy: 'featured' | 'newest' | 'price-asc' | 'price-desc' | 'rating';
}

export interface LookbookItem {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  category: string;
  hotspots: {
    x: number;
    y: number;
    product: Product;
  }[];
}

// Customer & Auth
export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  isCircleMember: boolean;
  circleTier?: 'Gold' | 'Platinum' | 'Privilege';
  addresses: SavedAddress[];
  sizePreferences?: {
    bust?: string;
    waist?: string;
    hip?: string;
    preferredSize?: string;
    height?: string;
  };
  totalSpent?: number;
  ordersCount?: number;
  createdDate?: string;
  lastOrderDate?: string;
}

export interface SavedAddress {
  id: string;
  label: string; // was type
  fullName: string; // was name
  phone: {
    countryCode: string;
    number: string;
  };
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  postalCode: string; // was pincode
  country: string;
  isDefaultShipping: boolean;
  isDefaultBilling: boolean;
}

// Order & Shipment Management
export type OrderStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Processing'
  | 'Packed'
  | 'Shipped'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Cancelled'
  | 'Returned'
  | 'Refunded';

export type PaymentStatus = 'Pending' | 'Authorized' | 'Captured' | 'Paid' | 'Failed' | 'Refunded';

export interface OrderItem {
  product: Product;
  selectedSize: string;
  selectedColor: ProductColor;
  quantity: number;
  unitPrice: number;
  mrp: number;
  sku: string;
}

export interface TrackingMilestone {
  status: string;
  location: string;
  timestamp: string;
  description: string;
  completed: boolean;
  current?: boolean;
}

export interface OrderTrackingInfo {
  awb: string;
  courier: string;
  courierService: string;
  estimatedDelivery: string;
  currentStatus: string;
  trackingUrl?: string;
  milestones: TrackingMilestone[];
}

export interface Order {
  id: string;
  orderNumber: string;
  date: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  shippingAddress: SavedAddress;
  billingAddress?: SavedAddress;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  couponCode?: string;
  tax: number;
  total: number;
  paymentMethod: 'UPI' | 'Card' | 'COD' | 'NetBanking';
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  tracking?: OrderTrackingInfo;
  notes?: string;
  activityHistory?: {
    timestamp: string;
    user: string;
    action: string;
    note?: string;
  }[];
}

// Returns & Exchanges
export type ReturnReason =
  | 'Size issue'
  | 'Color difference'
  | 'Damaged product'
  | 'Wrong product'
  | 'Fit & drape preference'
  | 'Other';

export type ReturnStatus =
  | 'Request Submitted'
  | 'Under Review'
  | 'Approved'
  | 'Pickup Scheduled'
  | 'Picked Up'
  | 'Inspected & Accepted'
  | 'Exchange Shipped'
  | 'Refund Processed'
  | 'Rejected';

export interface ReturnRequest {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: {
    productName: string;
    size: string;
    color: string;
    sku: string;
    price: number;
    image: string;
    quantity: number;
  }[];
  reason: ReturnReason;
  reasonDetail?: string;
  images?: string[];
  preference: 'Exchange for different size' | 'Store Credit' | 'Refund to source';
  exchangeSize?: string;
  pickupAddress: SavedAddress;
  status: ReturnStatus;
  requestedDate: string;
  scheduledPickupDate?: string;
  adminNotes?: string;
}

// Marketing & Coupons
export interface Coupon {
  id: string;
  code: string;
  description: string;
  discountType: 'Percentage' | 'Fixed';
  discountValue: number;
  minOrderValue: number;
  maxDiscount?: number;
  usageLimit?: number;
  usageCount: number;
  perCustomerLimit?: number;
  startDate: string;
  endDate: string;
  applicableCategories?: string[];
  applicableProducts?: string[];
  status: 'Active' | 'Draft' | 'Expired' | 'Paused';
  isExclusive?: boolean;
}

export interface Promotion {
  id: string;
  title: string;
  type: 'Tiered Discount' | 'Buy X Get Y' | 'Free Shipping Gift' | 'Flash Sale';
  conditions: string;
  discount: string;
  startDate: string;
  endDate: string;
  status: 'Active' | 'Scheduled' | 'Paused' | 'Draft';
  eligibleCategories: string[];
}

export interface Banner {
  id: string;
  title: string;
  headline: string;
  subtitle?: string;
  description: string;
  badge?: string;
  eyebrow?: string;
  offerPill?: string;
  ctaText: string;
  targetUrl: string;
  secondaryCtaText?: string;
  secondaryTargetUrl?: string;
  desktopImage: string;
  mobileImage?: string;
  startDate?: string;
  endDate?: string;
  status: 'Active' | 'Scheduled' | 'Draft';
  position: 'Hero' | 'Editorial' | 'Secondary' | 'Announcement';
  displayOrder?: number;
}

export interface AbandonedCart {
  id: string;
  customerName: string;
  email: string;
  phone: string;
  cartValue: number;
  items: {
    name: string;
    size: string;
    color: string;
    price: number;
    image: string;
  }[];
  lastActivity: string;
  reminder1Sent: boolean;
  reminder1Date?: string;
  reminder2Sent: boolean;
  reminder2Date?: string;
  recovered: boolean;
  recoveryChannel?: 'WhatsApp' | 'Email';
}

// Customer Notifications
export interface CustomerNotification {
  id: string;
  title: string;
  message: string;
  category: 'Orders' | 'Shipping' | 'Offers' | 'Account';
  timestamp: string;
  isRead: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

// AI Shopping Assistant
export interface AIMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  suggestedProducts?: Product[];
  actionType?: 'product_search' | 'size_guide' | 'order_status' | 'faq' | 'stylist_connect';
  orderSummary?: {
    orderNumber: string;
    status: string;
    estimatedDelivery: string;
    courier: string;
  };
}

export interface AIKnowledgeArticle {
  id: string;
  title: string;
  category: 'FAQ' | 'Shipping Policy' | 'Return Policy' | 'Product Sizing' | 'Care & Craft';
  content: string;
  status: 'Active' | 'Draft';
  lastUpdated: string;
}

// Admin Roles, Permissions & Audit
export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'CATALOG_MANAGER' | 'ORDER_MANAGER';

export interface AdminPermissionMatrix {
  dashboard: { view: boolean; export: boolean };
  products: { view: boolean; create: boolean; edit: boolean; delete: boolean; publish: boolean; export: boolean };
  inventory: { view: boolean; edit: boolean; export: boolean };
  orders: { view: boolean; edit: boolean; cancel: boolean; refund: boolean; export: boolean };
  customers: { view: boolean; edit: boolean; export: boolean };
  marketing: { view: boolean; create: boolean; edit: boolean; delete: boolean; publish: boolean };
  cms: { view: boolean; create: boolean; edit: boolean; delete: boolean; publish: boolean };
  seo: { view: boolean; edit: boolean };
  analytics: { view: boolean; export: boolean };
  ai: { view: boolean; edit: boolean };
  notifications: { view: boolean; create: boolean; send: boolean };
  settings: { view: boolean; edit: boolean };
  auditLogs: { view: boolean; export: boolean };
  adminManagement: { view: boolean; create: boolean; edit: boolean; delete: boolean };
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  status: 'Active' | 'Suspended';
  lastLogin: string;
  createdDate: string;
  avatar?: string;
}

export interface AuditLogItem {
  id: string;
  userName: string;
  userRole: AdminRole;
  action: 'Created' | 'Updated' | 'Deleted' | 'Published' | 'Archived' | 'Refunded' | 'Changed Permission' | 'Logged In' | 'Exported Data';
  module: string;
  resource: string;
  ipAddress: string;
  timestamp: string;
  details?: string;
}

// Inventory Transactions & Reservations
export interface StockTransaction {
  id: string;
  date: string;
  productName: string;
  sku: string;
  operation: 'Add' | 'Remove' | 'Set' | 'Sale' | 'Return Restock';
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  user: string;
  reference: string;
}

export interface StockReservation {
  id: string;
  productName: string;
  variant: string;
  sku: string;
  orderNumber: string;
  customerName: string;
  quantity: number;
  created: string;
  expires: string;
  status: 'Active' | 'Released' | 'Converted' | 'Expired';
}

// CMS & FAQ
export interface CMSPage {
  id: string;
  title: string;
  slug: string;
  content: string;
  featuredImage?: string;
  status: 'Published' | 'Draft';
  updatedAt: string;
  seo?: ProductSEO;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: 'Orders' | 'Payments' | 'Shipping' | 'Returns' | 'Products' | 'Sizing' | 'Account';
  order: number;
  status: 'Active' | 'Draft';
  updatedAt: string;
}
