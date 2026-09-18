import React from 'react';
import { ShieldAlert, ArrowLeft, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import type { AdminRole, AdminPermissionMatrix } from '../../types';

interface AdminAccessGuardProps {
  module: keyof AdminPermissionMatrix;
  action?: string;
  children: React.ReactNode;
}

const moduleDisplayNames: Record<keyof AdminPermissionMatrix, string> = {
  dashboard: 'Executive Dashboard',
  products: 'Products & Catalog',
  inventory: 'Inventory & Stock Management',
  orders: 'Orders & Fulfillment Operations',
  customers: 'Customer CRM & Patrons',
  marketing: 'Marketing, Coupons & Banners',
  cms: 'CMS & Store Content',
  seo: 'Search Engine Optimization (SEO)',
  analytics: 'Intelligence & Sales Analytics',
  ai: 'AI Stylist Knowledge Base',
  notifications: 'Omnichannel Notifications',
  settings: 'Store System Settings',
  auditLogs: 'System Security Audit Logs',
  adminManagement: 'Staff Roles & Permission Matrix',
};

export const AdminAccessGuard: React.FC<AdminAccessGuardProps> = ({
  module,
  action = 'view',
  children,
}) => {
  const { hasPermission, role, setRole } = useAdmin();

  if (hasPermission(module, action)) {
    return <>{children}</>;
  }

  const moduleName = moduleDisplayNames[module] || module;
  const roles: AdminRole[] = ['SUPER_ADMIN', 'ADMIN', 'CATALOG_MANAGER', 'ORDER_MANAGER'];

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
          Restricted Access
        </h2>
        <p className="text-xs font-sans text-stone-600 leading-relaxed mb-6">
          Your current active role <strong className="text-stone-900 font-mono bg-stone-100 px-1.5 py-0.5 rounded">{role}</strong> does not have <span className="font-semibold text-stone-800">{action}</span> permission for <strong className="text-stone-900">{moduleName}</strong>.
        </p>

        {/* Role Switcher in Demo */}
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 mb-6 text-left">
          <div className="flex items-center gap-1.5 text-xs font-sans font-bold text-stone-700 mb-2">
            <ShieldCheck size={14} className="text-amber-800" />
            <span>Switch Role for Testing:</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {roles.map(r => (
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

        {/* Navigation fallback */}
        <div className="flex items-center justify-center gap-3">
          <Link
            to="/admin/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-stone-900 text-white text-xs font-sans font-semibold hover:bg-stone-800 transition-colors shadow-xs"
          >
            <ArrowLeft size={14} />
            <span>Return to Dashboard</span>
          </Link>
        </div>

      </div>
    </div>
  );
};
