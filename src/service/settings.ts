import type { AxiosResponse } from 'axios';
import adminApi from './adminApi';
import { getBackendErrorMessage, getBackendFieldErrors } from '../utils/apiResponse';
import { normalizeAdminStaffList, normalizeRolesMatrix } from '../utils/rbac';
import type {
  AdminStaffMember,
  NormalizedRolesMatrix,
  PermissionRegistryResponse,
  RbacRole,
  RbacModuleKey,
  RoleModuleChanges,
  RolePermissionsPatchPayload,
  SettingsResponse,
  UpdateBoutiqueProfileRequest,
} from '../types/settings';

// -----------------------------------------------------------------------------
// Admin Settings endpoints (OpenAPI confirmed):
//   GET   /admin/settings
//   PATCH /admin/settings/boutique-profile
//
// Admin Settings - RBAC endpoints:
//   GET   /admin/settings/admins
//   GET   /admin/settings/roles-matrix
//   PATCH /admin/settings/roles-matrix/{role}
//   POST  /admin/settings/roles-matrix/reset
// -----------------------------------------------------------------------------

interface ApiEnvelope<T> {
  success?: boolean;
  message?: string;
  data?: T;
}

const unwrap = <T>(response: AxiosResponse<ApiEnvelope<T> | T>): T => {
  const body = response.data;
  if (body && typeof body === 'object' && 'data' in body && body.data !== undefined) {
    return body.data;
  }
  return body as T;
};

/** GET /admin/settings — Boutique Profile + shipping tariffs */
export const getBoutiqueSettings = async (): Promise<SettingsResponse> => {
  const response = await adminApi.get<ApiEnvelope<SettingsResponse>>('/admin/settings');
  return unwrap(response);
};

/** PATCH /admin/settings/boutique-profile — pass only the fields that changed */
export const updateBoutiqueSettings = async (
  payload: UpdateBoutiqueProfileRequest
): Promise<SettingsResponse> => {
  const response = await adminApi.patch<ApiEnvelope<SettingsResponse>>(
    '/admin/settings/boutique-profile',
    payload
  );
  return unwrap(response);
};

/** GET /admin/settings/permission-registry — Canonical RBAC registry */
export const getPermissionRegistry = async (): Promise<PermissionRegistryResponse> => {
  const response = await adminApi.get<ApiEnvelope<PermissionRegistryResponse>>(
    '/admin/settings/permission-registry'
  );
  return unwrap(response);
};

/** GET /admin/settings/admins — Staff list */
export const getAdminStaff = async (): Promise<AdminStaffMember[]> => {
  const response = await adminApi.get<ApiEnvelope<unknown>>('/admin/settings/admins');
  return normalizeAdminStaffList(unwrap(response));
};

export interface CreateAdminStaffPayload {
  name: string;
  email: string;
  role: RbacRole;
  password?: string;
}

export interface CreateAdminStaffResponse {
  staff: AdminStaffMember;
  setupEmailSent: boolean;
}

/** POST /admin/settings/admins — Add new staff member (Super Admin only) */
export const createAdminStaff = async (
  payload: CreateAdminStaffPayload
): Promise<CreateAdminStaffResponse> => {
  const body: Record<string, any> = {
    name: payload.name.trim(),
    email: payload.email.trim(),
    role: payload.role,
  };
  if (payload.password?.trim()) {
    body.password = payload.password.trim();
  }
  const response = await adminApi.post<ApiEnvelope<any>>('/admin/settings/admins', body);
  const raw = unwrap(response);
  const staff = raw?.staff || raw?.admin || raw;
  return {
    staff: normalizeAdminStaffList([staff])[0],
    setupEmailSent: Boolean(raw?.setupEmailSent ?? !payload.password?.trim()),
  };
};

export interface UpdateAdminStaffPayload {
  role?: RbacRole;
  status?: 'active' | 'inactive';
}

export interface UpdateAdminStaffResponse {
  staff: AdminStaffMember;
  changed: boolean;
  sessionsRevoked: boolean;
}

/** PATCH /admin/settings/admins/:userId — Change role or activate/deactivate (Super Admin only) */
export const updateAdminStaff = async (
  userId: string,
  payload: UpdateAdminStaffPayload
): Promise<UpdateAdminStaffResponse> => {
  const response = await adminApi.patch<ApiEnvelope<any>>(
    `/admin/settings/admins/${encodeURIComponent(userId)}`,
    payload
  );
  const raw = unwrap(response);
  const staff = raw?.staff || raw?.admin || raw;
  return {
    staff: normalizeAdminStaffList([staff])[0],
    changed: Boolean(raw?.changed ?? true),
    sessionsRevoked: Boolean(raw?.sessionsRevoked ?? (payload.status === 'inactive')),
  };
};

/** GET /admin/settings/roles-matrix — Role permissions matrix for all 4 roles (Super Admin only) */
export const getRolesMatrix = async (): Promise<NormalizedRolesMatrix> => {
  const response = await adminApi.get<ApiEnvelope<unknown>>('/admin/settings/roles-matrix');
  return normalizeRolesMatrix(unwrap(response));
};

/**
 * Builds payload for PATCH /admin/settings/roles-matrix/{role}.
 * NEVER sends null (fails with VALIDATION_ERROR). Sends only non-null boolean flags.
 */
export const buildRolePatchPayload = (
  changedFlags: RoleModuleChanges
): RolePermissionsPatchPayload => {
  const cleanPermissions: RoleModuleChanges = {};
  Object.entries(changedFlags).forEach(([mKey, actionMap]) => {
    if (!actionMap) return;
    const cleanActions: Record<string, boolean> = {};
    Object.entries(actionMap).forEach(([act, val]) => {
      if (typeof val === 'boolean') {
        cleanActions[act] = val;
      }
    });
    if (Object.keys(cleanActions).length > 0) {
      cleanPermissions[mKey as RbacModuleKey] = cleanActions as any;
    }
  });
  return {
    permissions: cleanPermissions,
  };
};

/** Error mapper for roles-matrix errors */
export const mapRoleMatrixErrorCode = (err: any, fallback: string): string => {
  const code = err?.response?.data?.error?.code || err?.response?.data?.code;
  switch (code) {
    case 'SUPER_ADMIN_IMMUTABLE':
      return 'Super Admin permissions are fixed.';
    case 'INVALID_MODULE':
    case 'INVALID_ACTION':
      return 'Unknown module or action. Reload the page.';
    case 'ACTION_NOT_APPLICABLE':
      return 'This action does not exist for that module.';
    case 'RESERVED_FOR_SUPER_ADMIN':
      return 'Only Super Admin can hold this permission.';
    case 'CONFLICTING_PERMISSIONS':
      return 'A module cannot have actions without View.';
    case 'VALIDATION_ERROR':
      return err?.response?.data?.message || err?.response?.data?.error?.message || 'Validation error.';
    case 'PERMISSION_DENIED':
      return 'Only Super Admin can modify role permissions.';
    default:
      return settingsErrorMessage(err, fallback);
  }
};

/** PATCH /admin/settings/roles-matrix/{role} — Partial toggle update of one role's permissions */
export const updateRolePermissions = async (
  role: RbacRole,
  payload: RolePermissionsPatchPayload
): Promise<NormalizedRolesMatrix | null> => {
  const response = await adminApi.patch<ApiEnvelope<unknown>>(
    `/admin/settings/roles-matrix/${encodeURIComponent(role)}`,
    payload
  );
  const raw = unwrap(response);
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (obj.matrix || obj.roles || obj.rolesMatrix || obj.SUPER_ADMIN || obj.ADMIN) {
      return normalizeRolesMatrix(raw);
    }
  }
  return null;
};

/** POST /admin/settings/roles-matrix/reset — Reset role(s) to default permission matrix */
export const resetRolesMatrix = async (role?: RbacRole): Promise<NormalizedRolesMatrix | null> => {
  const payload = role ? { role } : {};
  const response = await adminApi.post<ApiEnvelope<unknown>>(
    '/admin/settings/roles-matrix/reset',
    payload
  );
  const raw = unwrap(response);
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (obj.matrix || obj.roles || obj.rolesMatrix || obj.SUPER_ADMIN || obj.ADMIN) {
      return normalizeRolesMatrix(raw);
    }
  }
  return null;
};

export const settingsErrorMessage = (error: unknown, fallback: string): string =>
  getBackendErrorMessage(error, fallback);

export const settingsFieldErrors = (error: unknown): Record<string, string> =>
  getBackendFieldErrors(error);
