import { useAdmin } from '../context/AdminContext';
import type { AdminRole } from '../types';
import type {
  AnyModuleKey,
  PermissionValue,
  RbacModuleMeta,
  RbacRole,
  RolesMatrixMap,
  NormalizedRolesMatrix,
} from '../types/settings';

export interface UsePermissionsResult {
  role: AdminRole | null;
  realRole: AdminRole | null;
  matrix: RolesMatrixMap | null;
  modules: RbacModuleMeta[];
  roles: RbacRole[];
  lockedRoles: RbacRole[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  isReady: boolean;
  /** True only when permissions are loaded and the flag is literally `true`. Fails closed while loading or on error. */
  can: (moduleKey: AnyModuleKey, action?: string) => boolean;
  /** Returns the raw tri-state permission value (`true | false | null`), or `null` while loading/errored. */
  getPermission: (moduleKey: AnyModuleKey, action?: string) => PermissionValue;
  /** True when the flag exists on the module (`true` or `false`, not `null`). */
  isApplicable: (moduleKey: AnyModuleKey, action?: string) => boolean;
  refreshPermissions: (options?: { background?: boolean }) => Promise<NormalizedRolesMatrix | null>;
}

/**
 * Shared RBAC permissions hook backed by the live server roles matrix in AdminContext.
 * Fails closed (`can(...) === false`) while loading or when the matrix request fails.
 */
export const usePermissions = (): UsePermissionsResult => {
  const {
    role,
    realRole,
    rolesMatrix,
    rbacModules,
    availableRoles,
    lockedRoles,
    isLoadingPermissions,
    isRefreshingPermissions,
    permissionsError,
    refreshPermissions,
    getPermissionState,
    hasPermission,
  } = useAdmin();

  const isReady = !isLoadingPermissions && !permissionsError && rolesMatrix !== null;

  return {
    role,
    realRole,
    matrix: rolesMatrix,
    modules: rbacModules,
    roles: availableRoles,
    lockedRoles,
    isLoading: isLoadingPermissions,
    isRefreshing: isRefreshingPermissions,
    error: permissionsError,
    isReady,
    can: hasPermission,
    getPermission: getPermissionState,
    isApplicable: (moduleKey: AnyModuleKey, action = 'view') =>
      getPermissionState(moduleKey, action) !== null,
    refreshPermissions,
  };
};
