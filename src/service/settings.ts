import type { AxiosResponse } from 'axios';
import adminApi from './adminApi';
import { getBackendErrorMessage, getBackendFieldErrors } from '../utils/apiResponse';
import { normalizeAdminStaffList, normalizeRolesMatrix } from '../utils/rbac';
import type {
  AdminStaffMember,
  NormalizedRolesMatrix,
  RbacRole,
  ResetRolesMatrixPayload,
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

/** GET /admin/settings/admins — Staff list */
export const getAdminStaff = async (): Promise<AdminStaffMember[]> => {
  const response = await adminApi.get<ApiEnvelope<unknown>>('/admin/settings/admins');
  return normalizeAdminStaffList(unwrap(response));
};

/** GET /admin/settings/roles-matrix — Role permissions matrix for all 4 roles */
export const getRolesMatrix = async (): Promise<NormalizedRolesMatrix> => {
  const response = await adminApi.get<ApiEnvelope<unknown>>('/admin/settings/roles-matrix');
  return normalizeRolesMatrix(unwrap(response));
};

/**
 * ASSUMPTION (to be confirmed against Swagger schema):
 * Single payload-builder function for PATCH /admin/settings/roles-matrix/{role}.
 * Receives only the changed module/action boolean flags for one role and wraps
 * them as `{ permissions: { [moduleKey]: { [action]: value } } }`.
 */
export const buildRolePatchPayload = (
  changedFlags: RoleModuleChanges
): RolePermissionsPatchPayload => ({
  permissions: changedFlags,
});

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

/**
 * ASSUMPTION (to be confirmed against Swagger schema):
 * Builds the request body for POST /admin/settings/roles-matrix/reset.
 * Sends `{ roles }` when specific role(s) are provided, or `{}` to reset all roles.
 */
export const buildResetRolesMatrixPayload = (roles?: RbacRole[]): ResetRolesMatrixPayload =>
  roles && roles.length > 0 ? { roles } : {};

/** POST /admin/settings/roles-matrix/reset — Reset role(s) to default permission matrix */
export const resetRolesMatrix = async (roles?: RbacRole[]): Promise<NormalizedRolesMatrix | null> => {
  const response = await adminApi.post<ApiEnvelope<unknown>>(
    '/admin/settings/roles-matrix/reset',
    buildResetRolesMatrixPayload(roles)
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
