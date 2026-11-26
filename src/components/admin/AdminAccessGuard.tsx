import React from 'react';
import { ShieldAlert, ArrowLeft, ShieldCheck, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import { usePermissions } from '../../hooks/usePermissions';
import { resolveRbacModuleKey } from '../../utils/rbac';
import type { AnyModuleKey, RbacModuleKey } from '../../types/settings';

interface AdminAccessGuardProps {
  module: AnyModuleKey;
  action?: string;
  children: React.ReactNode;
}

const moduleDisplayNames: Record<RbacModuleKey, string> = {
  executive_dashboard: 'Executive Dashboard',
  products_catalog: 'Products & Catalog',
  supplier_management: 'Supplier Management',
  inventory_stock: 'Inventory & Stock Management',
  order_processing: 'Orders & Fulfillment Operations',
  customer_crm: 'Customer CRM & Patrons',
  coupons_banners: 'Marketing, Coupons & Banners',
  cms_store_content: 'CMS & Store Content',
  seo_management: 'Search Engine Optimization (SEO)',
  analytics_funnel: 'Intelligence & Sales Analytics',
  ai_knowledge_logs: 'AI Stylist Knowledge Base',
  push_email_alerts: 'Omnichannel Notifications',
  system_settings: 'Store System Settings',
  audit_trail_logs: 'System Security Audit Logs',
  admin_management: 'Staff Roles & Permission Matrix',
  // UNCONFIRMED KEY — matches REVIEWS_ADMIN_MODULE constant
  reviews: 'Reviews & Moderation',
};

export const AdminAccessGuard: React.FC<AdminAccessGuardProps> = ({
  module,
  action = 'view',
  children,
}) => {
  const { setRole } = useAdmin();
  const { can, role, realRole, roles, isLoading, error, refreshPermissions } = usePermissions();

  // Fail closed while permissions are loading — do not render privileged routes early
  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-stone-500">
          <Loader2 size={24} className="animate-spin" />
          <p className="text-xs font-sans uppercase tracking-widest">Verifying permissions…</p>
        </div>
      </div>
    );
  }

  if (can(module, action)) {
    return <>{children}</>;
  }

  const canonical = resolveRbacModuleKey(module);
  const moduleName = (canonical && moduleDisplayNames[canonical]) || String(module);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white border border-stone-200 rounded-3xl p-8 shadow-xl text-center">
        {/* Shield Icon */}
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center mx-auto mb-5 shadow-xs">
          <ShieldAlert size={32} />
        </div>

        {/* Text */}
        <span className="inline-block px-3 py-1 rounded-full bg-stone-100 text-stone-600 text-[11px] font-mono font-bold uppercase tracking-wider mb-2">
          RBAC Security Policy
        </span>
        <h2 className="font-serif text-2xl text-stone-900 font-normal mb-2">
          {error ? "Couldn't Verify Permissions" : 'Restricted Access'}
        </h2>
        <p className="text-xs font-sans text-stone-600 leading-relaxed mb-6">
          {error ? (
            <>
              Permissions could not be loaded ({error}). Access is restricted until permissions are verified.
            </>
          ) : (
            <>
              Your current active role{' '}
              <strong className="text-stone-900 font-mono bg-stone-100 px-1.5 py-0.5 rounded">
                {role || realRole || '—'}
              </strong>{' '}
              does not have <span className="font-semibold text-stone-800">{action}</span> permission for{' '}
              <strong className="text-stone-900">{moduleName}</strong>.
            </>
          )}
        </p>

        {/* Role Switcher in Demo (for Super Admin testing) */}
        {realRole === 'SUPER_ADMIN' && roles.length > 0 && (
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 mb-6 text-left">
            <div className="flex items-center gap-1.5 text-xs font-sans font-bold text-stone-700 mb-2">
              <ShieldCheck size={14} className="text-amber-800" />
              <span>Switch Role for Testing:</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {roles.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`px-3 py-2 rounded-xl text-xs font-mono text-center transition-all ${
                    role === r
                      ? 'bg-amber-900 text-white font-bold shadow-xs'
                      : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Navigation / Retry fallback */}
        <div className="flex items-center justify-center gap-3">
          {error && (
            <button
              type="button"
              onClick={() => void refreshPermissions()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-stone-300 text-xs font-sans font-semibold text-stone-700 hover:bg-stone-100 transition-colors"
            >
              Retry
            </button>
          )}
          <Link
            to="/admin/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#561C08] text-white text-xs font-sans font-semibold hover:bg-[#561C08]/90 transition-colors shadow-xs"
          >
            <ArrowLeft size={14} />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
