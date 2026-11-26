import type { AdminRole } from '../types';
import {
  RBAC_ACTIONS,
  RBAC_MODULE_KEYS,
  RBAC_ROLES,
  type AdminStaffMember,
  type AnyModuleKey,
  type ModulePermissions,
  type NormalizedRolesMatrix,
  type PermissionValue,
  type RbacAction,
  type RbacModuleKey,
  type RbacModuleMeta,
  type RbacRole,
  type RolePermissionsMap,
  type RolesMatrixMap,
} from '../types/settings';

export const DEFAULT_RBAC_MODULES: RbacModuleMeta[] = [
  { key: 'executive_dashboard', label: 'Executive Dashboard', description: 'KPI statistics and sales charts' },
  { key: 'products_catalog', label: 'Products & Catalog', description: 'Product creation, editing, pricing, archive' },
  { key: 'supplier_management', label: 'Supplier Management', description: 'Suppliers, product sourcing and supplier analytics' },
  { key: 'inventory_stock', label: 'Inventory & Stock', description: 'Stock adjustments, cycle count logs' },
  { key: 'order_processing', label: 'Order Processing', description: 'Status updates, Delhivery AWB dispatch' },
  { key: 'customer_crm', label: 'Customer CRM', description: 'Customer histories, lifetime values' },
  { key: 'coupons_banners', label: 'Coupons & Banners', description: 'Promotions, abandoned cart recovery' },
  { key: 'cms_store_content', label: 'CMS & Store Content', description: 'Pages, FAQs, and policies' },
  { key: 'seo_management', label: 'SEO Management', description: 'Meta tags, SERP snippets' },
  { key: 'analytics_funnel', label: 'Analytics & Funnel', description: 'Conversion analytics, search trends' },
  { key: 'ai_knowledge_logs', label: 'AI Knowledge & Logs', description: 'Stylist prompt logs and knowledge base' },
  { key: 'push_email_alerts', label: 'Push & Email Alerts', description: 'Omnichannel campaign broadcasts' },
  { key: 'system_settings', label: 'System Settings', description: 'Razorpay, Delhivery, WhatsApp configs' },
  { key: 'audit_trail_logs', label: 'Audit Trail Logs', description: 'Security activity ledger' },
  { key: 'admin_management', label: 'Admin Management', description: 'Role permissions and user access' },
  { key: 'reviews', label: 'Reviews & Moderation', description: 'Product review moderation, reports and analytics' },
];

export const DEFAULT_APPLICABLE_ACTIONS: Record<RbacModuleKey, readonly RbacAction[]> = {
  executive_dashboard: ['view'],
  products_catalog: ['view', 'create', 'edit', 'delete', 'publish'],
  inventory_stock: ['view', 'edit'],
  supplier_management: ['view', 'create', 'edit', 'delete', 'publish'],
  order_processing: ['view', 'edit'],
  customer_crm: ['view', 'edit'],
  reviews: ['view', 'edit', 'delete', 'publish', 'export'],
  coupons_banners: ['view', 'create', 'edit', 'delete', 'publish'],
  cms_store_content: ['view', 'create', 'edit', 'delete', 'publish'],
  seo_management: ['view', 'edit'],
  analytics_funnel: ['view'],
  push_email_alerts: ['view', 'create'],
  system_settings: ['view', 'edit'],
  admin_management: ['view', 'create', 'edit', 'delete'],
  ai_knowledge_logs: [],
  audit_trail_logs: [],
};

export const DEFAULT_SUPER_ADMIN_ONLY_CELLS: readonly string[] = [
  'admin_management:create',
  'admin_management:edit',
  'admin_management:delete',
];

export const DEFAULT_ROLE_DEFAULTS: Record<
  RbacRole,
  Partial<Record<RbacModuleKey, Partial<Record<RbacAction, boolean>>>>
> = {
  SUPER_ADMIN: {
    reviews: {
      view: true,
      edit: true,
      delete: true,
      publish: true,
      export: true,
    },
  },
  ADMIN: {
    reviews: {
      view: true,
      edit: true,
      delete: true,
      publish: true,
      export: true,
    },
  },
  CATALOG_MANAGER: {
    reviews: {
      view: true,
      edit: true,
      delete: false,
      publish: false,
      export: false,
    },
  },
  ORDER_MANAGER: {
    reviews: {
      view: true,
      edit: false,
      delete: false,
      publish: false,
      export: false,
    },
  },
};

const LEGACY_TO_RBAC_MODULE: Record<string, RbacModuleKey> = {
  dashboard: 'executive_dashboard',
  products: 'products_catalog',
  suppliers: 'supplier_management',
  inventory: 'inventory_stock',
  orders: 'order_processing',
  customers: 'customer_crm',
  marketing: 'coupons_banners',
  cms: 'cms_store_content',
  seo: 'seo_management',
  analytics: 'analytics_funnel',
  ai: 'ai_knowledge_logs',
  notifications: 'push_email_alerts',
  settings: 'system_settings',
  auditlogs: 'audit_trail_logs',
  adminmanagement: 'admin_management',
  reviews: 'reviews',
  reviewmoderation: 'reviews',
};

const MODULE_KEY_SET = new Set<string>(RBAC_MODULE_KEYS);
const ROLE_SET = new Set<string>(RBAC_ROLES);

export const isValidAdminRole = (role: unknown): role is AdminRole =>
  typeof role === 'string' && ROLE_SET.has(role.trim().toUpperCase().replace(/[\s-]+/g, '_'));

export const normalizeAdminRole = (role: unknown): AdminRole | null => {
  if (typeof role !== 'string') return null;
  const upper = role.trim().toUpperCase().replace(/[\s-]+/g, '_');
  return ROLE_SET.has(upper) ? (upper as AdminRole) : null;
};

export const resolveRbacModuleKey = (key: AnyModuleKey | string): RbacModuleKey | null => {
  if (!key) return null;
  const raw = String(key).trim();
  const lower = raw.toLowerCase();
  if (MODULE_KEY_SET.has(lower)) return lower as RbacModuleKey;
  const compact = lower.replace(/[-_\s]/g, '');
  if (LEGACY_TO_RBAC_MODULE[compact]) return LEGACY_TO_RBAC_MODULE[compact];
  // Match canonical key ignoring underscores
  for (const canonical of RBAC_MODULE_KEYS) {
    if (canonical.replace(/_/g, '') === compact) return canonical;
  }
  return null;
};

const createEmptyModulePermissions = (): ModulePermissions => ({
  view: null,
  create: null,
  edit: null,
  delete: null,
  publish: null,
  export: null,
});

const createEmptyRolePermissions = (): RolePermissionsMap => {
  const map = {} as RolePermissionsMap;
  RBAC_MODULE_KEYS.forEach((key) => {
    map[key] = createEmptyModulePermissions();
  });
  return map;
};

const createEmptyRolesMatrix = (): RolesMatrixMap => ({
  SUPER_ADMIN: createEmptyRolePermissions(),
  ADMIN: createEmptyRolePermissions(),
  CATALOG_MANAGER: createEmptyRolePermissions(),
  ORDER_MANAGER: createEmptyRolePermissions(),
});

/** Preserves null as null; never coerces null/undefined to false. */
const toPermissionValue = (val: unknown): PermissionValue => {
  if (val === true) return true;
  if (val === false) return false;
  if (val === null || val === undefined) return null;
  console.warn('[RBAC] Unexpected permission flag value:', val);
  return null;
};

const extractModulePermissions = (rawEntry: any): ModulePermissions => {
  const perms = createEmptyModulePermissions();
  if (!rawEntry || typeof rawEntry !== 'object') return perms;

  const source =
    rawEntry.permissions && typeof rawEntry.permissions === 'object'
      ? rawEntry.permissions
      : rawEntry.actions && typeof rawEntry.actions === 'object'
        ? rawEntry.actions
        : rawEntry;

  // Read case-insensitively so both `view` and `VIEW` work
  const lowerEntries = new Map<string, unknown>();
  Object.entries(source).forEach(([k, v]) => {
    lowerEntries.set(k.toLowerCase(), v);
  });

  RBAC_ACTIONS.forEach((action) => {
    if (lowerEntries.has(action)) {
      perms[action] = toPermissionValue(lowerEntries.get(action));
    }
  });

  return perms;
};

const updateMetaFromRaw = (
  metaMap: Map<RbacModuleKey, RbacModuleMeta>,
  moduleKey: RbacModuleKey,
  rawEntry: any
) => {
  if (!rawEntry || typeof rawEntry !== 'object') return;
  const existing = metaMap.get(moduleKey);
  if (!existing) return;
  const rawName = rawEntry.name || rawEntry.label || rawEntry.title;
  const rawDesc = rawEntry.description || rawEntry.desc;
  metaMap.set(moduleKey, {
    key: moduleKey,
    label: typeof rawName === 'string' && rawName.trim() ? rawName.trim() : existing.label,
    description: typeof rawDesc === 'string' && rawDesc.trim() ? rawDesc.trim() : existing.description,
  });
};

/**
 * Normalizes the GET /admin/settings/roles-matrix payload into a consistent
 * { matrix, modules, roles, lockedRoles } structure.
 *
 * Tolerates:
 * 1. Role -> modules object map: `{ ADMIN: { executive_dashboard: { view: true, ... } } }`
 *    (or wrapped under `.roles`, `.matrix`, `.rolesMatrix`, or `{ modules: { ... } }` per role)
 * 2. Role -> modules array: `{ ADMIN: [{ key: 'executive_dashboard', name, view, ... }] }`
 *    (or `{ roles: [{ role: 'ADMIN', isLocked: true, modules: [...] }] }`)
 * 3. Module-first array: `{ modules: [{ key: 'executive_dashboard', roles: { ADMIN: { view: true, ... } } }] }`
 */
export const normalizeRolesMatrix = (raw: unknown): NormalizedRolesMatrix => {
  const matrix = createEmptyRolesMatrix();
  const metaMap = new Map<RbacModuleKey, RbacModuleMeta>(
    DEFAULT_RBAC_MODULES.map((m) => [m.key, { ...m }])
  );
  const observedRoles: RbacRole[] = [];
  const lockedRoleSet = new Set<RbacRole>(['SUPER_ADMIN']);

  const recordRole = (role: RbacRole) => {
    if (!observedRoles.includes(role)) observedRoles.push(role);
  };

  if (!raw || typeof raw !== 'object') {
    console.warn('[RBAC] Unexpected roles-matrix payload (expected object or array):', raw);
    return {
      matrix,
      modules: DEFAULT_RBAC_MODULES,
      roles: [...RBAC_ROLES],
      lockedRoles: ['SUPER_ADMIN'],
    };
  }

  const rawObj = raw as Record<string, any>;
  const root = (rawObj.data && typeof rawObj.data === 'object' ? rawObj.data : rawObj) as Record<string, any>;

  // Harvest module metadata (name/description) if provided as a top-level `modules` array
  if (Array.isArray(root.modules)) {
    root.modules.forEach((item: any) => {
      const moduleCandidate = resolveRbacModuleKey(item?.key || item?.module || item?.moduleKey || item?.id);
      if (moduleCandidate) {
        updateMetaFromRaw(metaMap, moduleCandidate, item);
      }
    });
  }

  const container =
    root.matrix && typeof root.matrix === 'object'
      ? root.matrix
      : root.rolesMatrix && typeof root.rolesMatrix === 'object'
        ? root.rolesMatrix
        : root.roles && typeof root.roles === 'object'
          ? root.roles
          : root;

  const parseRoleModules = (role: RbacRole, rawRolePayload: any) => {
    if (!rawRolePayload) return;
    recordRole(role);

    if (
      typeof rawRolePayload === 'object' &&
      !Array.isArray(rawRolePayload) &&
      (rawRolePayload.isLocked === true ||
        rawRolePayload.locked === true ||
        rawRolePayload.readOnly === true ||
        rawRolePayload.editable === false ||
        rawRolePayload.isEditable === false)
    ) {
      lockedRoleSet.add(role);
    }

    const modulesSource =
      Array.isArray(rawRolePayload)
        ? rawRolePayload
        : Array.isArray(rawRolePayload?.modules)
          ? rawRolePayload.modules
          : rawRolePayload?.modules && typeof rawRolePayload.modules === 'object'
            ? rawRolePayload.modules
            : rawRolePayload?.permissions && typeof rawRolePayload.permissions === 'object'
              ? rawRolePayload.permissions
              : rawRolePayload;

    if (Array.isArray(modulesSource)) {
      modulesSource.forEach((modItem: any) => {
        const rawKey = modItem?.key || modItem?.module || modItem?.moduleKey || modItem?.id;
        const resolved = resolveRbacModuleKey(rawKey);
        if (!resolved) {
          if (rawKey) console.warn('[RBAC] Unrecognized module key in roles-matrix:', rawKey, modItem);
          return;
        }
        updateMetaFromRaw(metaMap, resolved, modItem);
        matrix[role][resolved] = extractModulePermissions(modItem);
      });
      return;
    }

    if (modulesSource && typeof modulesSource === 'object') {
      Object.entries(modulesSource).forEach(([rawKey, modVal]) => {
        if (['isLocked', 'locked', 'readOnly', 'role', 'name', 'label'].includes(rawKey)) return;
        const resolved = resolveRbacModuleKey(rawKey);
        if (!resolved) {
          console.warn('[RBAC] Unrecognized module key in roles-matrix:', rawKey, modVal);
          return;
        }
        updateMetaFromRaw(metaMap, resolved, modVal);
        matrix[role][resolved] = extractModulePermissions(modVal);
      });
    }
  };

  if (Array.isArray(container)) {
    // Either array of role entries ([{ role: 'ADMIN', modules: ... }])
    // or array of module entries ([{ key: 'executive_dashboard', roles: { ADMIN: ... } }])
    container.forEach((item: any) => {
      if (!item || typeof item !== 'object') return;
      const roleCandidate = normalizeAdminRole(item.role || item.name || item.key);
      if (roleCandidate) {
        parseRoleModules(roleCandidate, item);
        return;
      }
      const moduleCandidate = resolveRbacModuleKey(item.key || item.module || item.moduleKey);
      if (moduleCandidate && item.roles && typeof item.roles === 'object') {
        updateMetaFromRaw(metaMap, moduleCandidate, item);
        Object.entries(item.roles).forEach(([rawRole, modPerms]) => {
          const r = normalizeAdminRole(rawRole);
          if (!r) return;
          recordRole(r);
          matrix[r][moduleCandidate] = extractModulePermissions(modPerms);
        });
      }
    });
  } else if (Array.isArray(root.modules)) {
    // Module-first shape under `{ modules: [...] }`
    root.modules.forEach((item: any) => {
      const moduleCandidate = resolveRbacModuleKey(item?.key || item?.module || item?.moduleKey);
      if (!moduleCandidate) return;
      updateMetaFromRaw(metaMap, moduleCandidate, item);
      const roleMap = item?.roles || item?.permissionsByRole || item?.matrix;
      if (roleMap && typeof roleMap === 'object') {
        Object.entries(roleMap).forEach(([rawRole, modPerms]) => {
          const r = normalizeAdminRole(rawRole);
          if (!r) return;
          recordRole(r);
          matrix[r][moduleCandidate] = extractModulePermissions(modPerms);
        });
      }
    });
  } else if (container && typeof container === 'object') {
    Object.entries(container).forEach(([rawRoleKey, rawRoleVal]) => {
      const role = normalizeAdminRole(rawRoleKey);
      if (!role) return;
      parseRoleModules(role, rawRoleVal);
    });
  }

  if (observedRoles.length === 0) {
    console.warn('[RBAC] No recognized roles parsed from roles-matrix payload:', raw);
  } else if (!observedRoles.includes('SUPER_ADMIN')) {
    console.warn('[RBAC] SUPER_ADMIN omitted from roles-matrix payload; deriving applicable actions from other roles:', raw);
    RBAC_MODULE_KEYS.forEach((modKey) => {
      RBAC_ACTIONS.forEach((act) => {
        const isApplicableInOtherRole = observedRoles.some((r) => matrix[r][modKey][act] !== null);
        matrix.SUPER_ADMIN[modKey][act] = isApplicableInOtherRole ? true : null;
      });
    });
    observedRoles.unshift('SUPER_ADMIN');
  }

  // Ensure every canonical module has applicable cells defined even if missing from backend roles-matrix response
  RBAC_MODULE_KEYS.forEach((modKey) => {
    const applicable = DEFAULT_APPLICABLE_ACTIONS[modKey] || [];
    const applicableSet = new Set<RbacAction>(applicable);

    RBAC_ROLES.forEach((r) => {
      RBAC_ACTIONS.forEach((act) => {
        if (!applicableSet.has(act)) {
          // Action has no such feature in this module -> always null ("—")
          matrix[r][modKey][act] = null;
        } else if (r === 'SUPER_ADMIN') {
          // Super Admin has full, locked access to all applicable features
          matrix.SUPER_ADMIN[modKey][act] = true;
        } else {
          // For editable staff roles, if the backend payload did not provide a boolean,
          // build from the fallback registry defaults rather than leaving it as null ("—")
          if (matrix[r][modKey][act] === null) {
            const roleDefaults = DEFAULT_ROLE_DEFAULTS[r]?.[modKey];
            if (roleDefaults && act in roleDefaults) {
              matrix[r][modKey][act] = roleDefaults[act] ?? false;
            } else {
              matrix[r][modKey][act] = false;
            }
          }
        }
      });
    });
  });

  // Keep canonical role ordering for UI tabs while including any API-ordered roles
  const orderedRoles = RBAC_ROLES.filter((r) => observedRoles.length === 0 || observedRoles.includes(r));

  return {
    matrix,
    modules: RBAC_MODULE_KEYS.map((k) => metaMap.get(k)!),
    roles: orderedRoles.length > 0 ? orderedRoles : [...RBAC_ROLES],
    lockedRoles: Array.from(lockedRoleSet),
  };
};

// ─── Staff List Normalization & Date Formatting ──────────────────────────────

/**
 * Formats an ISO timestamp into `"Today, 02:15 PM"`, `"Yesterday, 06:40 PM"`,
 * or `"18 Sep 2026, 02:15 PM"`, returning `"Never"` for null/missing values.
 */
export const formatStaffLastActive = (value?: string | null): string => {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Never';

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const dayDiff = Math.round((startOfToday - startOfDate) / 86400000);

  const timePart = date
    .toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
    .replace(/\b(am|pm)\b/i, (m) => m.toUpperCase());

  if (dayDiff === 0) return `Today, ${timePart}`;
  if (dayDiff === 1) return `Yesterday, ${timePart}`;

  const datePart = date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  return `${datePart}, ${timePart}`;
};

export const getStaffInitials = (name: string): string => {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'A';
  return parts
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};

export const normalizeAdminStaffList = (raw: unknown): AdminStaffMember[] => {
  let list: unknown = raw;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    list = obj.admins ?? obj.staff ?? obj.users ?? obj.items ?? obj.data ?? [];
  }

  if (!Array.isArray(list)) {
    console.warn('[RBAC] Unexpected admin staff list payload:', raw);
    return [];
  }

  return list.map((item: any, idx: number) => {
    const profile = item?.profile && typeof item.profile === 'object' ? item.profile : {};
    const name =
      item?.name ||
      item?.fullName ||
      item?.displayName ||
      profile?.displayName ||
      [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') ||
      [item?.firstName, item?.lastName].filter(Boolean).join(' ') ||
      item?.email ||
      `Staff Member ${idx + 1}`;

    const rawStatus = String(item?.status || '').toUpperCase();
    const isSuspended = item?.isActive === false || rawStatus === 'SUSPENDED' || rawStatus === 'INACTIVE' || rawStatus === 'DISABLED';

    const lastActiveRaw: string | null =
      item?.lastActiveAt ??
      item?.lastActive ??
      item?.lastLoginAt ??
      item?.lastLogin ??
      null;

    const normalizedRole = normalizeAdminRole(item?.role) || 'ADMIN';

    return {
      id: String(item?.id || item?._id || item?.email || `staff-${idx}`),
      name: String(name),
      email: String(item?.email || ''),
      role: normalizedRole,
      status: isSuspended ? 'Suspended' : 'Active',
      lastActiveAt: lastActiveRaw,
      lastLogin: formatStaffLastActive(lastActiveRaw),
    };
  });
};
