import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Layers, 
  Barcode, 
  ShoppingBag, 
  Truck, 
  RotateCcw, 
  CreditCard, 
  Users, 
  Tag, 
  FileText, 
  Globe, 
  Sparkles, 
  TrendingUp, 
  Settings, 
  ShieldCheck, 
  Shield, 
  ChevronDown, 
  ChevronRight,
  Boxes,
  Bell,
  Image as ImageIcon,
  HelpCircle,
  X
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { AlluraLogo } from '../common/AlluraLogo';

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
  const { hasPermission, role } = useAdmin();

  // Collapsible section state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    catalog: true,
    inventory: true,
    orders: true,
    marketing: false,
    content: false,
    intelligence: false,
    settings: false,
  });

  const toggleSection = (sec: string) => {
    setOpenSections(prev => ({ ...prev, [sec]: !prev[sec] }));
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-sans font-medium transition-all ${
      isActive
        ? 'bg-allura-darkBrown text-white shadow-xs'
        : 'text-allura-muted hover:text-allura-text hover:bg-allura-bgSecondary/60'
    }`;

  return (
    <aside
      className={`fixed lg:sticky top-0 left-0 z-40 h-screen bg-allura-card border-r border-allura-border flex flex-col transition-all duration-300 ${
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
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
          <span className="font-bold text-allura-darkBrown font-mono">{role}</span>
        </div>
      )}

      {/* Scrollable Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-4 text-xs font-sans">
        
        {/* Dashboard */}
        {hasPermission('dashboard') && (
          <NavLink to="/admin/dashboard" className={navLinkClass}>
            <LayoutDashboard size={16} />
            {!isCollapsed && <span>Dashboard</span>}
          </NavLink>
        )}

        {/* CATALOG SECTION */}
        {hasPermission('products') && (
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
                <NavLink to="/admin/products/new" className={navLinkClass}>
                  <Package size={15} className="text-emerald-700" />
                  {!isCollapsed && <span>Add Product</span>}
                </NavLink>
                <NavLink to="/admin/categories" className={navLinkClass}>
                  <Layers size={15} />
                  {!isCollapsed && <span>Categories</span>}
                </NavLink>
                <NavLink to="/admin/collections" className={navLinkClass}>
                  <Boxes size={15} />
                  {!isCollapsed && <span>Collections</span>}
                </NavLink>
                <NavLink to="/admin/variants" className={navLinkClass}>
                  <Layers size={15} />
                  {!isCollapsed && <span>Variants</span>}
                </NavLink>
                <NavLink to="/admin/barcodes" className={navLinkClass}>
                  <Barcode size={15} />
                  {!isCollapsed && <span>Barcodes & Scanner</span>}
                </NavLink>
              </div>
            )}
          </div>
        )}

        {/* INVENTORY SECTION */}
        {hasPermission('inventory') && (
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
                <NavLink to="/admin/inventory" className={navLinkClass}>
                  <Package size={15} />
                  {!isCollapsed && <span>Stock Levels</span>}
                </NavLink>
                <NavLink to="/admin/inventory/transactions" className={navLinkClass}>
                  <FileText size={15} />
                  {!isCollapsed && <span>Transactions Log</span>}
                </NavLink>
                <NavLink to="/admin/inventory/reservations" className={navLinkClass}>
                  <Boxes size={15} />
                  {!isCollapsed && <span>Reservations</span>}
                </NavLink>
              </div>
            )}
          </div>
        )}

        {/* ORDERS & FULFILLMENT */}
        {hasPermission('orders') && (
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
                <NavLink to="/admin/shipping" className={navLinkClass}>
                  <Truck size={15} />
                  {!isCollapsed && <span>Delhivery Shipping</span>}
                </NavLink>
                <NavLink to="/admin/orders/returns" className={navLinkClass}>
                  <RotateCcw size={15} />
                  {!isCollapsed && <span>Return Requests</span>}
                </NavLink>
                <NavLink to="/admin/orders/refunds" className={navLinkClass}>
                  <CreditCard size={15} />
                  {!isCollapsed && <span>Refunds</span>}
                </NavLink>
                <NavLink to="/admin/payments" className={navLinkClass}>
                  <CreditCard size={15} />
                  {!isCollapsed && <span>Payments Ledger</span>}
                </NavLink>
              </div>
            )}
          </div>
        )}

        {/* CUSTOMERS */}
        {hasPermission('customers') && (
          <NavLink to="/admin/customers" className={navLinkClass}>
            <Users size={16} />
            {!isCollapsed && <span>Customers CRM</span>}
          </NavLink>
        )}

        {/* MARKETING */}
        {hasPermission('marketing') && (
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
                <NavLink to="/admin/marketing/banners" className={navLinkClass}>
                  <ImageIcon size={15} />
                  {!isCollapsed && <span>Store Banners</span>}
                </NavLink>
                <NavLink to="/admin/marketing/abandoned-carts" className={navLinkClass}>
                  <ShoppingBag size={15} />
                  {!isCollapsed && <span>Abandoned Carts</span>}
                </NavLink>
                <NavLink to="/admin/notifications" className={navLinkClass}>
                  <Bell size={15} />
                  {!isCollapsed && <span>Notifications Hub</span>}
                </NavLink>
              </div>
            )}
          </div>
        )}

        {/* CMS & CONTENT */}
        {hasPermission('cms') && (
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
                <NavLink to="/admin/content" className={navLinkClass}>
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
        {hasPermission('analytics') && (
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
                  {!isCollapsed && <span>Sales & Funnel</span>}
                </NavLink>
                <NavLink to="/admin/analytics/search" className={navLinkClass}>
                  <Globe size={15} />
                  {!isCollapsed && <span>Search Analytics</span>}
                </NavLink>
                {hasPermission('ai') && (
                  <NavLink to="/admin/ai" className={navLinkClass}>
                    <Sparkles size={15} />
                    {!isCollapsed && <span>AI Stylist Admin</span>}
                  </NavLink>
                )}
                {hasPermission('seo') && (
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
        {hasPermission('settings') && (
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
                <NavLink to="/admin/settings" className={navLinkClass}>
                  <Settings size={15} />
                  {!isCollapsed && <span>Store Settings</span>}
                </NavLink>
                {hasPermission('adminManagement') && (
                  <NavLink to="/admin/settings/admins" className={navLinkClass}>
                    <ShieldCheck size={15} />
                    {!isCollapsed && <span>Admin Roles & Matrix</span>}
                  </NavLink>
                )}
                {hasPermission('auditLogs') && (
                  <NavLink to="/admin/audit-logs" className={navLinkClass}>
                    <FileText size={15} />
                    {!isCollapsed && <span>System Audit Logs</span>}
                  </NavLink>
                )}
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
