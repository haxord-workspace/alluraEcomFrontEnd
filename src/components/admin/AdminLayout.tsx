import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { AdminCommandSearch } from './AdminCommandSearch';
import { useAdmin } from '../../context/AdminContext';

interface AdminLayoutProps {
  children?: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { isAdminAuthenticated } = useAdmin();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // If not logged in, redirect to login page
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
