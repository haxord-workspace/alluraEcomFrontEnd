import React, { useState } from 'react';
import { 
  Search, 
  Bell, 
  Shield, 
  Menu, 
  ChevronDown, 
  LogOut, 
  Check 
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { Link, useNavigate } from 'react-router-dom';
import type { AdminRole } from '../../types';

interface AdminHeaderProps {
  onMobileMenuToggle: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ onMobileMenuToggle }) => {
  const {
    currentAdmin,
    role,
    setRole,
    setIsCommandOpen,
    isAdminNotificationsOpen,
    setIsAdminNotificationsOpen,
    adminNotifications,
    markAdminNotificationRead,
    adminLogout,
  } = useAdmin();

  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const unreadCount = adminNotifications.filter(n => !n.isRead).length;

  const roles: AdminRole[] = ['SUPER_ADMIN', 'ADMIN', 'CATALOG_MANAGER', 'ORDER_MANAGER'];

  const handleRoleChange = (newRole: AdminRole) => {
    setRole(newRole);
    setIsRoleDropdownOpen(false);
  };

  const handleLogout = () => {
    adminLogout();
    navigate('/admin/login');
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/90 backdrop-blur-md border-b border-allura-border flex items-center justify-between px-4 sm:px-6">
      
      {/* Left: Mobile Menu & Search trigger */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMobileMenuToggle}
          className="lg:hidden p-2 text-allura-muted hover:text-allura-text rounded-xl hover:bg-stone-100"
        >
          <Menu size={20} />
        </button>

        {/* Global Search button */}
        <button
          onClick={() => setIsCommandOpen(true)}
          className="hidden sm:flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-500 text-xs font-sans transition-all w-64 md:w-80 shadow-xs"
        >
          <Search size={14} className="text-stone-400" />
          <span className="flex-1 text-left truncate">Search orders, SKU, customers...</span>
          <kbd className="text-[10px] font-mono bg-white text-stone-600 px-1.5 py-0.5 rounded border border-stone-200">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Role Switcher, Notifications, Admin Profile */}
      <div className="flex items-center gap-3">
        
        {/* Role Switcher Pill */}
        <div className="relative">
          <button
            onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-allura-bgSecondary text-allura-darkBrown border border-allura-gold/30 text-xs font-sans font-semibold hover:bg-stone-200 transition-colors"
          >
            <Shield size={13} className="text-allura-goldDark" />
            <span className="hidden md:inline text-[11px] text-allura-muted font-normal">Role:</span>
            <span className="font-bold font-mono text-[11px]">{role}</span>
            <ChevronDown size={13} className="text-allura-muted" />
          </button>

          {isRoleDropdownOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white border border-stone-200 rounded-2xl shadow-xl p-2 space-y-1 z-50 text-xs font-sans animate-slide-up">
              <span className="block px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                Switch Operational Role
              </span>
              {roles.map(r => (
                <button
                  key={r}
                  onClick={() => handleRoleChange(r)}
                  className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-colors ${
                    role === r ? 'bg-allura-gold/15 text-allura-goldDark font-bold' : 'hover:bg-stone-50 text-stone-700'
                  }`}
                >
                  <span className="font-mono text-xs">{r}</span>
                  {role === r && <Check size={14} />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsAdminNotificationsOpen(!isAdminNotificationsOpen)}
            className="relative p-2 text-stone-500 hover:text-stone-800 rounded-xl hover:bg-stone-100 transition-colors"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-600" />
            )}
          </button>

          {isAdminNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-stone-200 rounded-2xl shadow-2xl overflow-hidden z-50 animate-slide-up">
              <div className="p-3.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
                <span className="font-serif text-sm font-bold text-stone-800">
                  Operations Notifications ({unreadCount})
                </span>
                <button
                  onClick={() => setIsAdminNotificationsOpen(false)}
                  className="text-xs text-stone-500 hover:text-stone-800 font-sans"
                >
                  Close
                </button>
              </div>

              <div className="divide-y divide-stone-100 max-h-80 overflow-y-auto">
                {adminNotifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => markAdminNotificationRead(n.id)}
                    className={`p-3.5 text-xs font-sans transition-colors cursor-pointer ${
                      n.isRead ? 'bg-white text-stone-500' : 'bg-amber-50/40 text-stone-800 font-medium'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-stone-900">{n.title}</p>
                      <span className="text-[10px] text-stone-400">{n.time}</span>
                    </div>
                    <p className="text-stone-600 text-[11px] mt-0.5">{n.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Avatar & Menu */}
        <div className="relative">
          <button
            onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
            className="flex items-center gap-2 p-1 text-stone-700 hover:text-stone-900 focus:outline-none"
          >
            <div className="w-8 h-8 rounded-full bg-allura-darkBrown text-white font-serif font-bold text-xs flex items-center justify-center shadow-xs">
              {currentAdmin.name.charAt(0)}
            </div>
            <span className="hidden lg:block text-xs font-sans font-medium text-stone-800">
              {currentAdmin.name}
            </span>
            <ChevronDown size={13} className="text-stone-400 hidden lg:block" />
          </button>

          {isUserDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-stone-200 rounded-2xl shadow-xl p-2 space-y-1 z-50 text-xs font-sans animate-slide-up">
              <div className="px-3 py-2 border-b border-stone-100">
                <p className="font-bold text-stone-900">{currentAdmin.name}</p>
                <p className="text-[10px] text-stone-500 truncate">{currentAdmin.email}</p>
              </div>
              <Link
                to="/admin/settings"
                onClick={() => setIsUserDropdownOpen(false)}
                className="w-full text-left px-3 py-2 rounded-xl text-stone-700 hover:bg-stone-50 flex items-center justify-between"
              >
                <span>Store Settings</span>
              </Link>
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 rounded-xl text-rose-700 hover:bg-rose-50 flex items-center gap-2 font-medium"
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>

      </div>

    </header>
  );
};
