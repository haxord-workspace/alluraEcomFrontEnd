import React, { useState } from 'react';
import { Check, X, Shield, RotateCcw } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { mockDefaultPermissions } from '../../data/mockAdminSettings';
import type { AdminRole, AdminPermissionMatrix } from '../../types';

interface PermissionMatrixProps {
  selectedRole?: AdminRole;
}

export const PermissionMatrix: React.FC<PermissionMatrixProps> = ({ selectedRole }) => {
  const { permissionsMatrix, updatePermissions, role: currentLoggedInRole } = useAdmin();
  const [internalRoleTab, setInternalRoleTab] = useState<AdminRole>('SUPER_ADMIN');
  
  const activeRole = selectedRole || internalRoleTab;
  const isSuperAdmin = currentLoggedInRole === 'SUPER_ADMIN';

  const rolesList: AdminRole[] = ['SUPER_ADMIN', 'ADMIN', 'CATALOG_MANAGER', 'ORDER_MANAGER'];
  const targetPerms = permissionsMatrix[activeRole] || mockDefaultPermissions[activeRole] || mockDefaultPermissions.SUPER_ADMIN;

  const modules: { key: keyof AdminPermissionMatrix; label: string; desc: string }[] = [
    { key: 'dashboard', label: 'Executive Dashboard', desc: 'KPI statistics and sales charts' },
    { key: 'products', label: 'Products & Catalog', desc: 'Product creation, editing, pricing, archive' },
    { key: 'inventory', label: 'Inventory & Stock', desc: 'Stock adjustments, cycle count logs' },
    { key: 'orders', label: 'Order Processing', desc: 'Status updates, Delhivery AWB dispatch' },
    { key: 'customers', label: 'Customer CRM', desc: 'Customer histories, lifetime values' },
    { key: 'marketing', label: 'Coupons & Banners', desc: 'Promotions, abandoned cart recovery' },
    { key: 'cms', label: 'CMS & Store Content', desc: 'Pages, FAQs, and policies' },
    { key: 'seo', label: 'SEO Management', desc: 'Meta tags, SERP snippets' },
    { key: 'analytics', label: 'Analytics & Funnel', desc: 'Conversion analytics, search trends' },
    { key: 'ai', label: 'AI Knowledge & Logs', desc: 'Stylist prompt logs and knowledge base' },
    { key: 'notifications', label: 'Push & Email Alerts', desc: 'Omnichannel campaign broadcasts' },
    { key: 'settings', label: 'System Settings', desc: 'Razorpay, Delhivery, WhatsApp configs' },
    { key: 'auditLogs', label: 'Audit Trail Logs', desc: 'Security activity ledger' },
    { key: 'adminManagement', label: 'Admin Management', desc: 'Role permissions and user access' },
  ];

  const handleToggle = (moduleKey: keyof AdminPermissionMatrix, action: string) => {
    if (!isSuperAdmin) return;
    const currentModule = (targetPerms[moduleKey] || {}) as Record<string, boolean>;
    const updatedModule = {
      ...currentModule,
      [action]: !currentModule[action],
    };

    updatePermissions(activeRole, {
      [moduleKey]: updatedModule,
    });
  };

  const handleResetDefaults = () => {
    if (!isSuperAdmin) return;
    if (mockDefaultPermissions[activeRole]) {
      updatePermissions(activeRole, mockDefaultPermissions[activeRole]);
    }
  };

  return (
    <div className="bg-allura-card border border-allura-border rounded-2xl overflow-hidden shadow-subtle text-xs font-sans">
      <div className="p-4 bg-allura-bgSecondary/80 border-b border-allura-border flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h3 className="font-serif text-lg text-allura-text font-normal flex items-center gap-2">
            <Shield size={16} className="text-allura-goldDark" />
            <span>Role Permissions Matrix</span>
          </h3>
          <p className="text-[11px] text-allura-muted">
            {isSuperAdmin
              ? 'Click toggles to grant or restrict specific operational capabilities for each role.'
              : 'View-only mode. Super Admin privileges required to modify role matrices.'}
          </p>
        </div>

        {!selectedRole && (
          <div className="flex items-center gap-2">
            <div className="flex bg-stone-200/80 p-1 rounded-xl gap-1">
              {rolesList.map(r => (
                <button
                  key={r}
                  onClick={() => setInternalRoleTab(r)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all ${
                    activeRole === r
                      ? 'bg-allura-darkBrown text-white font-bold shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            {isSuperAdmin && (
              <button
                type="button"
                onClick={handleResetDefaults}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-stone-300 text-[11px] text-stone-600 hover:bg-stone-100 transition-colors"
                title="Reset active role to system default permissions"
              >
                <RotateCcw size={12} />
                <span>Reset</span>
              </button>
            )}
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-allura-border text-[10px] uppercase font-bold text-allura-muted bg-allura-bg/60">
              <th className="p-4">Module Name</th>
              <th className="p-4 text-center">View</th>
              <th className="p-4 text-center">Create</th>
              <th className="p-4 text-center">Edit</th>
              <th className="p-4 text-center">Delete</th>
              <th className="p-4 text-center">Publish</th>
              <th className="p-4 text-center">Export</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-allura-border/60">
            {modules.map(mod => {
              const modPerms = (targetPerms[mod.key] || {}) as Record<string, boolean>;

              return (
                <tr key={mod.key} className="hover:bg-white/60 transition-colors">
                  <td className="p-4">
                    <p className="font-medium text-allura-text">{mod.label}</p>
                    <p className="text-[10px] text-allura-muted">{mod.desc}</p>
                  </td>

                  {['view', 'create', 'edit', 'delete', 'publish', 'export'].map(action => {
                    const hasAccess = modPerms[action] !== undefined ? modPerms[action] : false;
                    const isApplicable = modPerms[action] !== undefined;

                    return (
                      <td key={action} className="p-4 text-center">
                        {isApplicable ? (
                          <button
                            type="button"
                            disabled={!isSuperAdmin}
                            onClick={() => handleToggle(mod.key, action)}
                            className={`w-7 h-7 rounded-lg inline-flex items-center justify-center transition-all ${
                              hasAccess
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-stone-100 text-stone-400 hover:bg-stone-200'
                            } ${!isSuperAdmin ? 'cursor-default' : 'cursor-pointer'}`}
                          >
                            {hasAccess ? <Check size={14} /> : <X size={14} />}
                          </button>
                        ) : (
                          <span className="text-stone-300 font-mono text-xs">—</span>
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
    </div>
  );
};

export default PermissionMatrix;
