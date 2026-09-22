import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { AdminCommandSearch } from './AdminCommandSearch';
import { useAdmin } from '../../context/AdminContext';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';

interface AdminLayoutProps {
  children?: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { isAdminAuthenticated } = useAdmin();
  const adminAuthStatus = useSelector((state: RootState) => state.adminAuth.status);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // While /auth/me is in flight on page refresh, wait — don't redirect yet
  if (adminAuthStatus === 'loading') {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-stone-900 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-sans text-stone-500 tracking-widest uppercase">Verifying session...</p>
        </div>
      </div>
    );
  }

  // If not logged in (and not loading), redirect to login page
  if (!isAdminAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className="min-h-screen bg-stone-50 flex text-stone-900">
      {/* Responsive Admin Sidebar */}
      <AdminSidebar
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader onMobileMenuToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)} />
        
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children || <Outlet />}
        </main>
      </div>

      {/* Global Command / Search Modal (Cmd+K) */}
      <AdminCommandSearch />
    </div>
  );
};
