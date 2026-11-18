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

export interface BoutiqueProfile {
  legalName: string;
  tagline: string;
  whatsappNumber: string;
  supportEmail: string;
  gstin: string;
  currency: string;
  timezone: string;
  address: string;
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

export interface NormalizedRolesMatrix {
  matrix: RolesMatrixMap;
  modules: RbacModuleMeta[];
  roles: RbacRole[];
  lockedRoles: RbacRole[];
}

export type LegacyModuleKey =
  | 'dashboard'
  | 'products'
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
  status: 'Active' | 'Suspended';
  lastLogin: string;
  lastActiveAt: string | null;
}

export type RoleModuleChanges = Partial<Record<RbacModuleKey, Partial<Record<RbacAction, boolean>>>>;

export type RolePermissionsPatchPayload = {
  permissions: RoleModuleChanges;
};

export type ResetRolesMatrixPayload = {
  roles?: RbacRole[];
};
