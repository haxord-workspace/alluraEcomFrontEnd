import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Layers,
  Barcode,
  ShoppingBag,
  Truck,
  BarChart3,
  // RotateCcw,
  CreditCard,
  Users,
  Tag,
  FileText,
  Globe,
  Sparkles,
  TrendingUp,
  Settings,
  // ShieldCheck,
  Shield,
  ChevronDown,
  ChevronRight,
  Boxes,
  Warehouse,
  Bell,
  Image as ImageIcon,
  HelpCircle,
  X
} from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';
import { AlluraLogo } from '../common/AlluraLogo';
import { AdminReviewsNavSection } from './reviews/AdminReviewsNavSection';

interface AdminSidebarProps {
  isOpen: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  isOpen,
  onClose,
  isCollapsed = false,
}) => {
  const { can, role, realRole } = usePermissions();
  const location = useLocation();
  const activeRoleLabel = role || realRole || '—';

  // Collapsible section state
  const isContentActive =
    location.pathname.startsWith('/admin/content') ||
    location.pathname.startsWith('/admin/homepage/experience') ||
    location.pathname.startsWith('/admin/marketing/banners');

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    catalog: true,
    suppliers: true,
    inventory: true,
    orders: true,
    crm: true,
    marketing: true,
    content: isContentActive,
    intelligence: false,
    settings: false,
  });

  React.useEffect(() => {
    if (isContentActive) {
      setOpenSections(prev => (prev.content ? prev : { ...prev, content: true }));
    }
  }, [isContentActive]);

  const toggleSection = (sec: string) => {
    setOpenSections(prev => ({ ...prev, [sec]: !prev[sec] }));
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-sans font-medium transition-all ${isActive
      ? 'bg-allura-darkBrown text-white shadow-xs'
      : 'text-allura-muted hover:text-allura-text hover:bg-allura-bgSecondary/60'
    }`;

  return (
    <aside
      className={`print:hidden fixed lg:sticky top-0 left-0 z-40 h-screen bg-allura-card border-r border-allura-border flex flex-col transition-all duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'w-20' : 'w-64'}`}
    >
      {/* Sidebar Header */}
      <div className="p-4 border-b border-allura-border flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-hidden">
          <AlluraLogo size="sm" variant="dark" />
          {!isCollapsed && (
            <span className="text-[9px] font-sans font-bold bg-allura-bgSecondary text-allura-goldDark px-2 py-0.5 rounded uppercase tracking-wider">
              Ops Hub
            </span>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1 text-allura-muted hover:text-allura-text"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Role Badge Indicator */}
      {!isCollapsed && (
        <div className="px-4 py-2 bg-allura-bgSecondary/50 border-b border-allura-border/60 flex items-center justify-between text-[11px] font-sans">
          <div className="flex items-center gap-1.5">
            <Shield size={13} className="text-allura-goldDark" />
            <span className="text-allura-muted">Active Role:</span>
          </div>
          <span className="font-bold text-allura-darkBrown font-mono">{activeRoleLabel}</span>
        </div>
      )}

      {/* Scrollable Navigation */}
      <nav
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('a')) {
            onClose?.();
          }
        }}
        className="flex-1 overflow-y-auto p-3 space-y-4 text-xs font-sans"
      >

        {/* Dashboard */}
        {can('executive_dashboard', 'view') && (
          <NavLink to="/admin/dashboard" className={navLinkClass}>
            <LayoutDashboard size={16} />
            {!isCollapsed && <span>Dashboard</span>}
          </NavLink>
        )}

        {/* CATALOG SECTION */}
        {can('products_catalog', 'view') && (
          <div className="space-y-1">
            <button
              onClick={() => toggleSection('catalog')}
              className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-allura-muted/80 hover:text-allura-text"
            >
              <span>Catalog</span>
              {!isCollapsed && (
                openSections.catalog ? <ChevronDown size={13} /> : <ChevronRight size={13} />
              )}
            </button>
            {(openSections.catalog || isCollapsed) && (
              <div className="space-y-0.5 pl-1">
                <NavLink to="/admin/products" className={navLinkClass}>
                  <Package size={15} />
                  {!isCollapsed && <span>All Products</span>}
                </NavLink>

                <NavLink to="/admin/categories" className={navLinkClass}>
                  <Layers size={15} />
                  {!isCollapsed && <span>Categories</span>}
                </NavLink>
                <NavLink to="/admin/collections" className={navLinkClass}>
                  <Boxes size={15} />
                  {!isCollapsed && <span>Collections</span>}
                </NavLink>
                {/* <NavLink to="/admin/variants" className={navLinkClass}>
                  <Layers size={15} />
                  {!isCollapsed && <span>Variants</span>}
                </NavLink> */}
                <NavLink to="/admin/barcodes" className={navLinkClass}>
                  <Barcode size={15} />
                  {!isCollapsed && <span>Barcodes & Scanner</span>}
                </NavLink>
              </div>
            )}
          </div>
        )}

        {/* SUPPLIERS */}
        {can('supplier_management', 'view') && (
          <div className="space-y-1">
            <button
              onClick={() => toggleSection('suppliers')}
              className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-allura-muted/80 hover:text-allura-text"
            >
              <span>Suppliers</span>
              {!isCollapsed && (
                openSections.suppliers ? <ChevronDown size={13} /> : <ChevronRight size={13} />
              )}
            </button>
            {(openSections.suppliers || isCollapsed) && (
              <div className="space-y-0.5 pl-1">
                <NavLink
                  to="/admin/suppliers"
                  className={({ isActive }) =>
                    navLinkClass({ isActive: isActive && !location.pathname.startsWith('/admin/suppliers/analytics') })
                  }
                >
                  <Truck size={15} />
                  {!isCollapsed && <span>All suppliers</span>}
                </NavLink>
                <NavLink to="/admin/suppliers/analytics" className={navLinkClass}>
                  <BarChart3 size={15} />
                  {!isCollapsed && <span>Supplier analytics</span>}
                </NavLink>
              </div>
            )}
          </div>
        )}

        {/* INVENTORY SECTION */}
        {can('inventory_stock', 'view') && (
          <div className="space-y-1">
            <button
              onClick={() => toggleSection('inventory')}
              className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-allura-muted/80 hover:text-allura-text"
            >
              <span>Inventory</span>
              {!isCollapsed && (
                openSections.inventory ? <ChevronDown size={13} /> : <ChevronRight size={13} />
              )}
            </button>
            {(openSections.inventory || isCollapsed) && (
              <div className="space-y-0.5 pl-1">
                <NavLink to="/admin/inventory" end className={navLinkClass}>
                  <Warehouse size={15} />
                  {!isCollapsed && <span>Stock Levels</span>}
                </NavLink>
              </div>
            )}
          </div>
        )}

        {/* ORDERS & FULFILLMENT */}
        {can('order_processing', 'view') && (
          <div className="space-y-1">
            <button
              onClick={() => toggleSection('orders')}
              className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-allura-muted/80 hover:text-allura-text"
            >
              <span>Operations & Orders</span>
              {!isCollapsed && (
                openSections.orders ? <ChevronDown size={13} /> : <ChevronRight size={13} />
              )}
            </button>
            {(openSections.orders || isCollapsed) && (
              <div className="space-y-0.5 pl-1">
                <NavLink to="/admin/orders" className={navLinkClass}>
                  <ShoppingBag size={15} />
                  {!isCollapsed && <span>All Orders</span>}
                </NavLink>
                {/* <NavLink to="/admin/shipping" className={navLinkClass}>
                  <Truck size={15} />
                  {!isCollapsed && <span>Delhivery Shipping</span>}
                </NavLink> */}
                {/* <NavLink to="/admin/orders/returns" className={navLinkClass}>
                  <RotateCcw size={15} />
                  {!isCollapsed && <span>Return Requests</span>}
                </NavLink> */}
                {/* <NavLink to="/admin/orders/refunds" className={navLinkClass}>
                  <CreditCard size={15} />
                  {!isCollapsed && <span>Refunds</span>}
                </NavLink> */}
                <NavLink to="/admin/payments" className={navLinkClass}>
                  <CreditCard size={15} />
                  {!isCollapsed && <span>Payments Ledger</span>}
                </NavLink>
              </div>
            )}
          </div>
        )}

        {/* CUSTOMER CRM */}
        {can('customer_crm', 'view') && (
          <div className="space-y-1">
            <button
              onClick={() => toggleSection('crm')}
              className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-allura-muted/80 hover:text-allura-text"
            >
              <span>Customer CRM</span>
              {!isCollapsed && (
                openSections.crm ? <ChevronDown size={13} /> : <ChevronRight size={13} />
              )}
            </button>
            {(openSections.crm || isCollapsed) && (
              <div className="space-y-0.5 pl-1">
                <NavLink to="/admin/customers" className={navLinkClass}>
                  <Users size={15} />
                  {!isCollapsed && <span>Customers CRM</span>}
                </NavLink>
              </div>
            )}
          </div>
        )}
        <AdminReviewsNavSection navLinkClass={navLinkClass} isCollapsed={isCollapsed} />

        {/* MARKETING */}
        {can('coupons_banners', 'view') && (
          <div className="space-y-1">
            <button
              onClick={() => toggleSection('marketing')}
              className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-allura-muted/80 hover:text-allura-text"
            >
              <span>Marketing</span>
              {!isCollapsed && (
                openSections.marketing ? <ChevronDown size={13} /> : <ChevronRight size={13} />
              )}
            </button>
            {(openSections.marketing || isCollapsed) && (
              <div className="space-y-0.5 pl-1">
                <NavLink to="/admin/marketing/coupons" className={navLinkClass}>
                  <Tag size={15} />
                  {!isCollapsed && <span>Coupons Builder</span>}
                </NavLink>
                <NavLink to="/admin/marketing/promotions" className={navLinkClass}>
                  <Sparkles size={15} />
                  {!isCollapsed && <span>Promotions</span>}
                </NavLink>
                {/* <NavLink to="/admin/marketing/banners" className={navLinkClass}>
                  <ImageIcon size={15} />
                  {!isCollapsed && <span>Store Banners</span>}
                </NavLink> */}
                <NavLink to="/admin/marketing/abandoned-carts" className={navLinkClass}>
                  <ShoppingBag size={15} />
                  {!isCollapsed && <span>Abandoned Carts</span>}
                </NavLink>
                {can('push_email_alerts', 'view') && (
                  <NavLink to="/admin/notifications" className={navLinkClass}>
                    <Bell size={15} />
                    {!isCollapsed && <span>Notifications Hub</span>}
                  </NavLink>
                )}
              </div>
            )}
          </div>
        )}

        {/* CMS & CONTENT */}
        {can('cms_store_content', 'view') && (
          <div className="space-y-1">
            <button
              onClick={() => toggleSection('content')}
              className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-allura-muted/80 hover:text-allura-text"
            >
              <span>Content & CMS</span>
              {!isCollapsed && (
                openSections.content ? <ChevronDown size={13} /> : <ChevronRight size={13} />
              )}
            </button>
            {(openSections.content || isCollapsed) && (
              <div className="space-y-0.5 pl-1">
                <NavLink to="/admin/homepage/experience" className={navLinkClass}>
                  <Sparkles size={15} />
                  {!isCollapsed && <span>Homepage Experience</span>}
                </NavLink>
                <NavLink to="/admin/marketing/banners" className={navLinkClass}>
                  <ImageIcon size={15} />
                  {!isCollapsed && <span>Store Banners</span>}
                </NavLink>
                <NavLink to="/admin/content" end className={navLinkClass}>
                  <FileText size={15} />
                  {!isCollapsed && <span>Pages & Policies</span>}
                </NavLink>
                <NavLink to="/admin/content/faqs" className={navLinkClass}>
                  <HelpCircle size={15} />
                  {!isCollapsed && <span>Store FAQs</span>}
                </NavLink>
              </div>
            )}
          </div>
        )}

        {/* INTELLIGENCE & ANALYTICS */}
        {can('analytics_funnel', 'view') && (
          <div className="space-y-1">
            <button
              onClick={() => toggleSection('intelligence')}
              className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-allura-muted/80 hover:text-allura-text"
            >
              <span>Intelligence</span>
              {!isCollapsed && (
                openSections.intelligence ? <ChevronDown size={13} /> : <ChevronRight size={13} />
              )}
            </button>
            {(openSections.intelligence || isCollapsed) && (
              <div className="space-y-0.5 pl-1">
                <NavLink to="/admin/analytics" className={navLinkClass}>
                  <TrendingUp size={15} />
                  {!isCollapsed && <span>Sales & Analytics</span>}
                </NavLink>
                {/* <NavLink to="/admin/analytics/search" className={navLinkClass}>
                  <Globe size={15} />
                  {!isCollapsed && <span>Search Analytics</span>}
                </NavLink> */}
                {/* {can('ai_knowledge_logs', 'view') && (
                  <NavLink to="/admin/ai" className={navLinkClass}>
                    <Sparkles size={15} />
                    {!isCollapsed && <span>AI Stylist Admin</span>}
                  </NavLink>
                )} */}
                {can('seo_management', 'view') && (
                  <NavLink to="/admin/seo" className={navLinkClass}>
                    <Globe size={15} />
                    {!isCollapsed && <span>SEO Health</span>}
                  </NavLink>
                )}
              </div>
            )}
          </div>
        )}

        {/* SETTINGS & GOVERNANCE */}
        {(can('system_settings', 'view') || can('admin_management', 'view')) && (
          <div className="space-y-1">
            <button
              onClick={() => toggleSection('settings')}
              className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-allura-muted/80 hover:text-allura-text"
            >
              <span>Administration</span>
              {!isCollapsed && (
                openSections.settings ? <ChevronDown size={13} /> : <ChevronRight size={13} />
              )}
            </button>
            {(openSections.settings || isCollapsed) && (
              <div className="space-y-0.5 pl-1">
                {can('system_settings', 'view') && (
                  <NavLink to="/admin/settings" end className={navLinkClass}>
                    <Settings size={15} />
                    {!isCollapsed && <span>Store Settings</span>}
                  </NavLink>
                )}
                {/* {can('admin_management', 'view') && (
                  <NavLink to="/admin/settings/admins" className={navLinkClass}>
                    <ShieldCheck size={15} />
                    {!isCollapsed && <span>Admin Roles & Matrix</span>}
                  </NavLink>
                )} */}
                {/* {can('audit_trail_logs', 'view') && (
                  <NavLink to="/admin/audit-logs" className={navLinkClass}>
                    <FileText size={15} />
                    {!isCollapsed && <span>System Audit Logs</span>}
                  </NavLink>
                )} */}
              </div>
            )}
          </div>
        )}

      </nav>

      {/* Footer Storefront Link */}
      <div className="p-3 border-t border-allura-border bg-allura-bg/40">
        <NavLink
          to="/"
          target="_blank"
          className="w-full flex items-center justify-center gap-2 p-2 rounded-xl text-xs font-sans font-bold text-allura-goldDark hover:bg-allura-bgSecondary transition-colors"
        >
          <span>View Customer Storefront</span>
          <ChevronRight size={13} />
        </NavLink>
      </div>
    </aside>
  );
};
