import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  X,
  Shield,
  RotateCcw,
  Lock,
  AlertCircle,
  RefreshCw,
  Info,
  Save,
  Loader2,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { useShop } from '../../context/ShopContext';
import { useConfirm } from '../../context/ConfirmContext';
import { usePermissions } from '../../hooks/usePermissions';
import {
  buildRolePatchPayload,
  resetRolesMatrix,
  settingsErrorMessage,
  updateRolePermissions,
} from '../../service/settings';
import type { AdminRole } from '../../types';
import {
  RBAC_ACTIONS,
  RBAC_MODULE_KEYS,
  RBAC_ROLES,
  type PermissionValue,
  type RbacAction,
  type RbacModuleKey,
  type RbacRole,
  type RoleModuleChanges,
  type RolePermissionsMap,
  type RolesMatrixMap,
} from '../../types/settings';

interface PermissionMatrixProps {
  selectedRole?: AdminRole;
  onDirtyChange?: (isDirty: boolean) => void;
}

const ACTION_HEADERS: { key: RbacAction; label: string }[] = [
  { key: 'view', label: 'View' },
  { key: 'create', label: 'Create' },
  { key: 'edit', label: 'Edit' },
  { key: 'delete', label: 'Delete' },
  { key: 'publish', label: 'Publish' },
  { key: 'export', label: 'Export' },
];

const cloneRolePermissions = (rolePerms: RolePermissionsMap): RolePermissionsMap => {
  const copy = {} as RolePermissionsMap;
  RBAC_MODULE_KEYS.forEach((modKey) => {
    copy[modKey] = { ...rolePerms[modKey] };
  });
  return copy;
};

const cloneMatrix = (src: RolesMatrixMap): RolesMatrixMap => ({
  SUPER_ADMIN: cloneRolePermissions(src.SUPER_ADMIN),
  ADMIN: cloneRolePermissions(src.ADMIN),
  CATALOG_MANAGER: cloneRolePermissions(src.CATALOG_MANAGER),
  ORDER_MANAGER: cloneRolePermissions(src.ORDER_MANAGER),
});

export const PermissionMatrix: React.FC<PermissionMatrixProps> = ({
  selectedRole,
  onDirtyChange,
}) => {
  const { setRolesMatrixState, logAdminAction } = useAdmin();
  const {
    realRole,
    matrix,
    modules,
    roles,
    lockedRoles,
    isLoading,
    isRefreshing,
    error,
    refreshPermissions,
  } = usePermissions();
  const { showToast } = useShop();
  const confirm = useConfirm();

  const [internalRoleTab, setInternalRoleTab] = useState<RbacRole>(() =>
    realRole === 'SUPER_ADMIN' ? 'ADMIN' : 'SUPER_ADMIN'
  );
  const hasUserSelectedTabRef = useRef(false);
  const [draftMatrix, setDraftMatrix] = useState<RolesMatrixMap | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [failedRole, setFailedRole] = useState<RbacRole | null>(null);
  const isDirtyRef = useRef(false);

  // Default to the first editable role (ADMIN) on first open for a logged-in SUPER_ADMIN
  useEffect(() => {
    if (realRole === 'SUPER_ADMIN' && !hasUserSelectedTabRef.current) {
      setInternalRoleTab('ADMIN');
    }
  }, [realRole]);

  // Fetch fresh matrix when the tab mounts without unmounting parent guards.
  useEffect(() => {
    void refreshPermissions({ background: true });
  }, [refreshPermissions]);

  // Initialize or refresh draft from server matrix unless the user has unsaved edits
  useEffect(() => {
    if (!matrix) return;
    setDraftMatrix((prev) => (!prev || !isDirtyRef.current ? cloneMatrix(matrix) : prev));
  }, [matrix]);

  const rolesList: RbacRole[] = roles.length > 0 ? roles : [...RBAC_ROLES];
  const activeRole: RbacRole = selectedRole || internalRoleTab;
  // Edit permission strictly checks logged-in admin's real role (case-normalized in adminAuthSlice)
  const isLoggedInSuperAdmin = realRole === 'SUPER_ADMIN';
  const isRoleLocked = lockedRoles.includes(activeRole) || activeRole === 'SUPER_ADMIN';
  const canEditActiveRole = isLoggedInSuperAdmin && !isRoleLocked;

  // Compute diff between draftMatrix and last server copy across all editable roles
  const { changedRoles, changesByRoleCount, totalUnsavedCount } = useMemo(() => {
    const emptyCounts: Record<RbacRole, number> = {
      SUPER_ADMIN: 0,
      ADMIN: 0,
      CATALOG_MANAGER: 0,
      ORDER_MANAGER: 0,
    };
    if (!matrix || !draftMatrix) {
      return {
        changedRoles: [] as { role: RbacRole; changes: RoleModuleChanges; count: number }[],
        changesByRoleCount: emptyCounts,
        totalUnsavedCount: 0,
      };
    }

    const list: { role: RbacRole; changes: RoleModuleChanges; count: number }[] = [];
    let total = 0;

    RBAC_ROLES.forEach((r) => {
      if (lockedRoles.includes(r) || r === 'SUPER_ADMIN') return;
      const roleChanges: RoleModuleChanges = {};
      let roleCount = 0;

      RBAC_MODULE_KEYS.forEach((modKey) => {
        const serverMod = matrix[r]?.[modKey];
        const draftMod = draftMatrix[r]?.[modKey];
        if (!serverMod || !draftMod) return;

        const actionDiff: Partial<Record<RbacAction, boolean>> = {};
        let hasModDiff = false;

        RBAC_ACTIONS.forEach((act) => {
          const serverVal = serverMod[act];
          const draftVal = draftMod[act];
          if (serverVal !== null && draftVal !== null && serverVal !== draftVal) {
            actionDiff[act] = draftVal;
            hasModDiff = true;
            roleCount += 1;
          }
        });

        if (hasModDiff) {
          roleChanges[modKey] = actionDiff;
        }
      });

      emptyCounts[r] = roleCount;
      if (roleCount > 0) {
        list.push({ role: r, changes: roleChanges, count: roleCount });
        total += roleCount;
      }
    });

    return { changedRoles: list, changesByRoleCount: emptyCounts, totalUnsavedCount: total };
  }, [matrix, draftMatrix, lockedRoles]);

  const isDirty = isLoggedInSuperAdmin && totalUnsavedCount > 0;
  isDirtyRef.current = isDirty;

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const displayMatrix = isLoggedInSuperAdmin && draftMatrix ? draftMatrix : matrix;
  const targetPerms = displayMatrix ? displayMatrix[activeRole] : undefined;
  const serverTargetPerms = matrix ? matrix[activeRole] : undefined;

  const handleCellToggle = async (moduleKey: RbacModuleKey, action: RbacAction) => {
    if (!canEditActiveRole || isSaving || isResetting || !draftMatrix) return;

    const currentMod = draftMatrix[activeRole]?.[moduleKey];
    if (!currentMod) return;
    const currentValue = currentMod[action];
    if (currentValue === null) return; // Never toggle null (not applicable)

    const nextValue = !currentValue;

    // Safety rule: admin_management create/edit/delete for non-super roles requires confirmation
    if (
      moduleKey === 'admin_management' &&
      (action === 'create' || action === 'edit' || action === 'delete') &&
      nextValue === true
    ) {
      const ok = await confirm({
        title: 'Grant admin management privilege?',
        message: 'Granting this lets this role manage admin accounts. Continue?',
        confirmLabel: 'Continue',
        isDestructive: true,
      });
      if (!ok) return;
    }

    // Safety rule: turning view OFF revokes other granted actions on this module (with confirmation)
    let revokeOtherGranted = false;
    if (action === 'view' && nextValue === false) {
      const hasOtherGranted = RBAC_ACTIONS.some(
        (act) => act !== 'view' && currentMod[act] === true
      );
      if (hasOtherGranted) {
        const ok = await confirm({
          title: 'Revoke module permissions?',
          message:
            'Turning off View will also revoke the other granted permissions on this module. Continue?',
          confirmLabel: 'Revoke all',
          isDestructive: true,
        });
        if (!ok) return;
        revokeOtherGranted = true;
      }
    }

    if (failedRole === activeRole) {
      setFailedRole(null);
    }

    setDraftMatrix((prev) => {
      if (!prev) return prev;
      const prevMod = prev[activeRole][moduleKey];
      const nextMod = { ...prevMod, [action]: nextValue };

      if (revokeOtherGranted) {
        RBAC_ACTIONS.forEach((act) => {
          if (act !== 'view' && nextMod[act] === true) {
            nextMod[act] = false;
          }
        });
      }

      // Safety rule: turning any non-view action ON auto-enables view if currently false
      if (action !== 'view' && nextValue === true && nextMod.view === false) {
        nextMod.view = true;
      }

      return {
        ...prev,
        [activeRole]: {
          ...prev[activeRole],
          [moduleKey]: nextMod,
        },
      };
    });
  };

  const handleSaveChanges = async () => {
    if (!isLoggedInSuperAdmin || isSaving || isResetting || changedRoles.length === 0) return;

    setIsSaving(true);
    setFailedRole(null);

    let lastServerMatrix = null;
    const savedRoleNames: string[] = [];

    for (const item of changedRoles) {
      try {
        const payload = buildRolePatchPayload(item.changes);
        const updated = await updateRolePermissions(item.role, payload);
        if (updated) {
          lastServerMatrix = updated;
        }
        savedRoleNames.push(item.role);

        // Advance server copy for this role immediately so a later failure won't re-send it
        setRolesMatrixState((prev) => {
          if (!prev) return updated ?? prev;
          if (updated) return updated;
          const nextRolePerms = cloneRolePermissions(prev.matrix[item.role]);
          Object.entries(item.changes).forEach(([mKey, actMap]) => {
            if (!actMap) return;
            const mk = mKey as RbacModuleKey;
            nextRolePerms[mk] = { ...nextRolePerms[mk], ...actMap };
          });
          return {
            ...prev,
            matrix: {
              ...prev.matrix,
              [item.role]: nextRolePerms,
            },
          };
        });
      } catch (err: any) {
        setFailedRole(item.role);
        const status = err?.response?.status;
        const message =
          status === 403
            ? 'Only Super Admin can change permissions'
            : settingsErrorMessage(
                err,
                `Couldn't save permissions for ${item.role.replace(/_/g, ' ')}`
              );
        showToast(message, 'error');
        setIsSaving(false);
        return;
      }
    }

    // Sync live permissions across the app (usePermissions / AdminContext)
    if (lastServerMatrix) {
      setRolesMatrixState(lastServerMatrix);
      setDraftMatrix(cloneMatrix(lastServerMatrix.matrix));
    } else {
      const refreshed = await refreshPermissions({ background: true });
      if (refreshed) {
        setDraftMatrix(cloneMatrix(refreshed.matrix));
      }
    }

    logAdminAction(
      'Changed Permission',
      'Admin Management',
      savedRoleNames.join(', '),
      `Updated ${totalUnsavedCount} permission flag(s)`
    );
    showToast('Permissions updated', 'success');
    setIsSaving(false);
  };

  const handleDiscardChanges = async () => {
    if (!matrix || totalUnsavedCount === 0 || isSaving) return;
    const ok = await confirm({
      title: 'Discard unsaved changes?',
      message: `Discard ${totalUnsavedCount} unsaved permission change${totalUnsavedCount === 1 ? '' : 's'}?`,
      confirmLabel: 'Discard',
      isDestructive: true,
    });
    if (!ok) return;

    setDraftMatrix(cloneMatrix(matrix));
    setFailedRole(null);
  };

  const handleResetDefaults = async () => {
    if (!canEditActiveRole || isResetting || isSaving) return;

    const ok = await confirm({
      title: 'Reset role permissions?',
      message: `Reset ${activeRole} permissions to the default matrix? This will discard your saved custom settings for this role.`,
      confirmLabel: 'Reset to Defaults',
      isDestructive: true,
    });
    if (!ok) return;

    setIsResetting(true);
    setFailedRole((prev) => (prev === activeRole ? null : prev));

    try {
      await resetRolesMatrix([activeRole]);
      const refreshed = await refreshPermissions({ background: true });
      if (refreshed) {
        setDraftMatrix((prev) => {
          if (!prev) return cloneMatrix(refreshed.matrix);
          return {
            ...prev,
            [activeRole]: cloneRolePermissions(refreshed.matrix[activeRole]),
          };
        });
      }
      logAdminAction(
        'Changed Permission',
        'Admin Management',
        `Reset ${activeRole} permissions to defaults`
      );
      showToast(`Permissions reset to defaults for ${activeRole.replace(/_/g, ' ')}`, 'success');
    } catch (err: any) {
      const status = err?.response?.status;
      const message =
        status === 403
          ? 'Only Super Admin can change permissions'
          : settingsErrorMessage(err, `Couldn't reset permissions for ${activeRole.replace(/_/g, ' ')}`);
      showToast(message, 'error');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="bg-allura-card border border-allura-border rounded-2xl overflow-hidden shadow-subtle text-xs font-sans">
      <div className="p-4 bg-allura-bgSecondary/80 border-b border-allura-border flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-serif text-lg text-allura-text font-normal flex items-center gap-2">
              <Shield size={16} className="text-allura-goldDark" />
              <span>Role Permissions Matrix</span>
            </h3>
            {isLoggedInSuperAdmin ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-sans font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                Edit mode
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-sans font-bold uppercase tracking-wider bg-stone-200 text-stone-700 border border-stone-300">
                View only
              </span>
            )}
          </div>
          <p className="text-[11px] text-allura-muted mt-0.5">
            {!isLoggedInSuperAdmin
              ? 'View-only mode. Super Admin privileges required to modify role matrices.'
              : isRoleLocked
                ? 'Super Admin has full, fixed access and cannot be edited. Select ADMIN, CATALOG_MANAGER or ORDER_MANAGER to change permissions.'
                : 'Click a cell to grant or revoke. Changes apply after you press Save.'}
          </p>
        </div>

        {!selectedRole && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap bg-stone-200/80 p-1 rounded-xl gap-1">
              {rolesList.map((r) => {
                const roleDirtyCount = isLoggedInSuperAdmin ? changesByRoleCount[r] || 0 : 0;
                const isTabLocked = lockedRoles.includes(r) || r === 'SUPER_ADMIN';
                return (
                  <button
                    key={r}
                    type="button"
                    title={isTabLocked ? 'Super Admin permissions are locked and cannot be edited' : undefined}
                    onClick={() => {
                      hasUserSelectedTabRef.current = true;
                      setInternalRoleTab(r);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all inline-flex items-center gap-1.5 ${
                      activeRole === r
                        ? 'bg-allura-darkBrown text-white font-bold shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    {isTabLocked && <Lock size={10} className="opacity-75" />}
                    <span>{r}</span>
                    {roleDirtyCount > 0 && (
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-amber-400"
                        title={`${roleDirtyCount} unsaved change(s)`}
                        aria-label={`${roleDirtyCount} unsaved changes`}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {isLoggedInSuperAdmin && (
              <button
                type="button"
                onClick={() => void handleResetDefaults()}
                disabled={isRoleLocked || isResetting || isSaving || isLoading}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-stone-300 text-[11px] text-stone-600 hover:bg-stone-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title={
                  isRoleLocked
                    ? 'Super Admin permissions are locked'
                    : 'Reset active role to system default permissions'
                }
              >
                <RotateCcw size={12} className={isResetting ? 'animate-spin' : ''} />
                <span>{isResetting ? 'Resetting…' : 'Reset to defaults'}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Legend + Role helper notes */}
      <div className="px-4 py-2.5 bg-allura-bg/40 border-b border-allura-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-4 text-[11px] text-allura-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-800 inline-flex items-center justify-center">
              <Check size={12} />
            </span>
            <span>Granted</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-md bg-rose-50 text-rose-600 border border-rose-200/80 inline-flex items-center justify-center">
              <X size={12} />
            </span>
            <span>Not granted</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-5 h-5 inline-flex items-center justify-center text-stone-400 font-mono text-xs">
              —
            </span>
            <span>Not applicable</span>
          </span>
          {isLoggedInSuperAdmin && (
            <span className="text-stone-500">
              • Staff see changes the next time their session refreshes.
            </span>
          )}
        </div>

        {isRoleLocked && (
          <span className="inline-flex items-center gap-1 text-[11px] text-amber-800 bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 rounded-full font-medium shrink-0">
            <Lock size={11} />
            <span>Locked — select ADMIN, CATALOG_MANAGER or ORDER_MANAGER to edit</span>
          </span>
        )}
      </div>

      {activeRole === 'ADMIN' && !isLoading && !error && (
        <div className="px-4 py-2.5 bg-stone-50 border-b border-allura-border/60 flex items-start gap-2 text-[11px] text-stone-600">
          <Info size={14} className="text-allura-goldDark shrink-0 mt-0.5" />
          <span>
            <strong>Privilege Escalation Guard:</strong> Admin can view staff (<code className="font-mono">admin_management: view</code>)
            but by default cannot create, edit, or delete staff accounts. Only Super Admin can manage staff.
          </span>
        </div>
      )}

      {error && matrix && (
        <div className="px-4 py-2.5 bg-rose-50 border-b border-rose-200/80 flex items-center justify-between gap-3 text-xs text-rose-800">
          <span>Couldn&apos;t refresh permissions: {error}</span>
          <button
            type="button"
            onClick={() => void refreshPermissions({ background: true })}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1 font-semibold underline disabled:opacity-50"
          >
            <RefreshCw size={11} className={isRefreshing ? 'animate-spin' : ''} />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Content states: Loading -> Error -> Empty -> Matrix Table */}
      {isLoading && !matrix ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-allura-border text-[10px] uppercase font-bold text-allura-muted bg-allura-bg/60">
                <th className="p-4">Module Name</th>
                {ACTION_HEADERS.map((col) => (
                  <th key={col.key} className="p-4 text-center">{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-allura-border/60">
              {Array.from({ length: 8 }).map((_, rowIdx) => (
                <tr key={rowIdx}>
                  <td className="p-4 space-y-1.5">
                    <div className="h-3.5 w-36 bg-stone-200/80 rounded animate-pulse" />
                    <div className="h-2.5 w-52 bg-stone-100 rounded animate-pulse" />
                  </td>
                  {RBAC_ACTIONS.map((act) => (
                    <td key={act} className="p-4 text-center">
                      <div className="w-7 h-7 rounded-lg bg-stone-200/70 animate-pulse mx-auto" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : error && !matrix ? (
        <div className="p-10 text-center space-y-3">
          <AlertCircle size={24} className="text-rose-600 mx-auto" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-stone-900">Couldn&apos;t load permissions</p>
            <p className="text-xs text-rose-600">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => void refreshPermissions()}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <RefreshCw size={12} />
            <span>Retry</span>
          </button>
        </div>
      ) : !targetPerms || modules.length === 0 ? (
        <div className="p-10 text-center text-xs text-allura-muted">
          No permissions configured for {activeRole.replace(/_/g, ' ')}.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-allura-border text-[10px] uppercase font-bold text-allura-muted bg-allura-bg/60">
                <th className="p-4">Module Name</th>
                {ACTION_HEADERS.map((col) => (
                  <th key={col.key} className="p-4 text-center">{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-allura-border/60">
              {modules.map((mod) => {
                const modPerms = targetPerms[mod.key];
                const serverModPerms = serverTargetPerms?.[mod.key];

                return (
                  <tr key={mod.key} className="hover:bg-white/60 transition-colors">
                    <td className="p-4">
                      <p className="font-medium text-allura-text">{mod.label}</p>
                      <p className="text-[10px] text-allura-muted">{mod.description}</p>
                    </td>

                    {ACTION_HEADERS.map(({ key: action, label: colLabel }) => {
                      const flag: PermissionValue = modPerms ? modPerms[action] : null;
                      const serverFlag: PermissionValue = serverModPerms ? serverModPerms[action] : null;
                      const isCellDirty =
                        canEditActiveRole &&
                        flag !== null &&
                        serverFlag !== null &&
                        flag !== serverFlag;

                      return (
                        <td key={action} className="p-4 text-center">
                          {flag === null ? (
                            <span
                              className="text-stone-300 font-mono text-xs select-none"
                              aria-label={`${mod.label}, ${colLabel}, not applicable`}
                            >
                              —
                            </span>
                          ) : canEditActiveRole ? (
                            <button
                              type="button"
                              disabled={isSaving || isResetting}
                              onClick={() => void handleCellToggle(mod.key, action)}
                              aria-pressed={flag}
                              aria-label={`${mod.label}, ${colLabel}, ${flag ? 'granted' : 'not granted'}${isCellDirty ? ', unsaved change' : ''}`}
                              title={flag ? 'Click to revoke permission' : 'Click to grant permission'}
                              className={`relative w-7 h-7 rounded-lg inline-flex items-center justify-center transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-allura-darkBrown focus-visible:ring-offset-1 disabled:opacity-60 disabled:cursor-not-allowed ${
                                flag
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                  : 'bg-rose-50 text-rose-600 border border-rose-200/80 hover:bg-rose-100'
                              } ${isCellDirty ? 'ring-2 ring-amber-500/80 ring-offset-1' : ''}`}
                            >
                              {flag ? <Check size={14} /> : <X size={14} />}
                              {isCellDirty && (
                                <span
                                  className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500 border border-white"
                                  aria-hidden="true"
                                />
                              )}
                            </button>
                          ) : (
                            <span
                              aria-label={`${mod.label}, ${colLabel}, ${flag ? 'granted' : 'not granted'}`}
                              className={`w-7 h-7 rounded-lg inline-flex items-center justify-center ${
                                flag
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-50 text-rose-600 border border-rose-200/80'
                              }`}
                            >
                              {flag ? <Check size={14} /> : <X size={14} />}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Sticky Save / Discard bar when there are unsaved changes */}
      {isDirty && (
        <div className="sticky bottom-0 z-20 px-4 py-3 bg-stone-900 text-white border-t border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" aria-hidden="true" />
            <span className="font-semibold">
              {totalUnsavedCount} unsaved change{totalUnsavedCount === 1 ? '' : 's'}
            </span>
            {failedRole && (
              <span className="text-rose-300 font-medium">
                • Failed saving {failedRole.replace(/_/g, ' ')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => void handleDiscardChanges()}
              disabled={isSaving}
              className="px-3.5 py-1.5 rounded-lg border border-stone-600 text-xs font-semibold text-stone-200 hover:bg-stone-800 transition-colors disabled:opacity-50"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={() => void handleSaveChanges()}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-accent-gold text-stone-950 text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {isSaving ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Save size={13} />
              )}
              <span>{isSaving ? 'Saving…' : 'Save changes'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PermissionMatrix;
