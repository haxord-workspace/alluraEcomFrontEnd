// -----------------------------------------------------------------------------
// Admin Settings — schemas confirmed from the live backend OpenAPI spec:
//   GET   /admin/settings
//   PATCH /admin/settings/boutique-profile
//
// Admin Settings - RBAC endpoints:
//   GET   /admin/settings/admins
//   GET   /admin/settings/roles-matrix
//   PATCH /admin/settings/roles-matrix/{role}
//   POST  /admin/settings/roles-matrix/reset
// -----------------------------------------------------------------------------

import type { AdminRole } from './index';

/**
 * The "From" address printed on shipping slips and used as the seller address on invoices.
 * `null` means it hasn't been set yet — documents fall back to `BoutiqueProfile.address`.
 */
export interface PickupAddress {
  contactName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface BoutiqueProfile {
  legalName: string;
  tagline: string;
  whatsappNumber: string;
  supportEmail: string;
  gstin: string;
  currency: string;
  timezone: string;
  address: string;
  /** From GET /admin/settings; absent on older responses, `null` when not configured. */
  pickupAddress?: PickupAddress | null;
}

export interface ShippingTariffs {
  freeShippingMinOrder: number;
  standardTariff: number;
  expressTariff: number;
}

export interface SettingsResponse {
  boutiqueProfile: BoutiqueProfile;
  shipping: ShippingTariffs;
}

export interface UpdateBoutiqueProfileRequest {
  legalName?: string;
  tagline?: string;
  whatsappNumber?: string;
  supportEmail?: string;
  gstin?: string;
  currency?: string;
  timezone?: string;
  address?: string;
  freeShippingMinOrder?: number;
  standardTariff?: number;
  expressTariff?: number;
  /**
   * Replaces the saved dispatch address entirely (never merged) — always send the whole
   * object. Send `null` to clear it.
   */
  pickupAddress?: PickupAddress | null;
}

// ─── RBAC & Staff Types ──────────────────────────────────────────────────────

export const RBAC_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'CATALOG_MANAGER',
  'ORDER_MANAGER',
] as const;

export type RbacRole = (typeof RBAC_ROLES)[number];

export const RBAC_MODULE_KEYS = [
  'executive_dashboard',
  'products_catalog',
  'supplier_management',
  'inventory_stock',
  'order_processing',
  'customer_crm',
  'coupons_banners',
  'cms_store_content',
  'seo_management',
  'analytics_funnel',
  'ai_knowledge_logs',
  'push_email_alerts',
  'system_settings',
  'audit_trail_logs',
  'admin_management',
  'reviews',
] as const;

export type RbacModuleKey = (typeof RBAC_MODULE_KEYS)[number];

export const RBAC_ACTIONS = [
  'view',
  'create',
  'edit',
  'delete',
  'publish',
  'export',
] as const;

export type RbacAction = (typeof RBAC_ACTIONS)[number];

/** Tri-state permission flag: true = granted, false = not granted, null = not applicable */
export type PermissionValue = boolean | null;

export type ModulePermissions = Record<RbacAction, PermissionValue>;

export type RolePermissionsMap = Record<RbacModuleKey, ModulePermissions>;

export type RolesMatrixMap = Record<RbacRole, RolePermissionsMap>;

export interface RbacModuleMeta {
  key: RbacModuleKey;
  label: string;
  description: string;
}

export interface PermissionRegistryModule {
  key: RbacModuleKey;
  label: string;
  description: string;
  actions: RbacAction[];
}

export interface PermissionRegistryResponse {
  actions: RbacAction[];
  modules: PermissionRegistryModule[];
  superAdminOnly: string[];
  editableRoles: RbacRole[];
  defaults: Record<string, Record<string, Record<string, boolean | null>>>;
  rules: string[];
}

export interface NormalizedRolesMatrix {
  matrix: RolesMatrixMap;
  modules: RbacModuleMeta[];
  roles: RbacRole[];
  lockedRoles: RbacRole[];
}

export type LegacyModuleKey =
  | 'dashboard'
  | 'products'
  | 'suppliers'
  | 'inventory'
  | 'orders'
  | 'customers'
  | 'marketing'
  | 'cms'
  | 'seo'
  | 'analytics'
  | 'ai'
  | 'notifications'
  | 'settings'
  | 'auditLogs'
  | 'adminManagement';

export type AnyModuleKey = RbacModuleKey | LegacyModuleKey;

export interface AdminStaffMember {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  status: 'Active' | 'Suspended' | 'active' | 'inactive';
  lastLogin: string;
  lastActiveAt: string | null;
}

export type RoleModuleChanges = Partial<Record<RbacModuleKey, Partial<Record<RbacAction, boolean>>>>;

export type RolePermissionsPatchPayload = {
  permissions: RoleModuleChanges;
};

export type ResetRolesMatrixPayload = {
  role?: RbacRole;
  roles?: RbacRole[];
};
