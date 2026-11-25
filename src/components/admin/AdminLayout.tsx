import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Navigate, useNavigate } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { AdminCommandSearch } from './AdminCommandSearch';
import { useAdmin } from '../../context/AdminContext';
import { useShop } from '../../context/ShopContext';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { fetchAdminProfile } from '../../store/slices/adminAuthSlice';

interface AdminLayoutProps {
  children?: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { isAdminAuthenticated } = useAdmin();
  const { showToast } = useShop();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const adminAuthStatus = useSelector((state: RootState) => state.adminAuth.status);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const lastFocusRef = useRef<number>(0);

  // Handle global permission denied and account deactivation events
  useEffect(() => {
    const handleDenied = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      const msg = detail?.message || 'Access denied: You do not have permission for this action.';
      showToast(msg, 'error');
      // Refetch /auth/me to update permission flags and adjust button visibility immediately
      if (isAdminAuthenticated) {
        dispatch(fetchAdminProfile());
      }
    };

    const handleAuthError = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      const msg = detail?.message || 'Session expired or deactivated. Please sign in again.';
      showToast(msg, 'error');
      navigate('/admin/login', { replace: true });
    };

    window.addEventListener('allura:permission-denied', handleDenied);
    window.addEventListener('allura:admin-auth-error', handleAuthError);
    return () => {
      window.removeEventListener('allura:permission-denied', handleDenied);
      window.removeEventListener('allura:admin-auth-error', handleAuthError);
    };
  }, [showToast, dispatch, navigate, isAdminAuthenticated]);

  // Window focus throttling: refresh /auth/me at most once every 60 seconds
  useEffect(() => {
    const onFocus = () => {
      const now = Date.now();
      if (isAdminAuthenticated && now - lastFocusRef.current >= 60000) {
        lastFocusRef.current = now;
        dispatch(fetchAdminProfile());
      }
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [isAdminAuthenticated, dispatch]);

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
    <div className="min-h-screen bg-stone-50 flex text-stone-900 relative">
      {/* Mobile Sidebar Backdrop Overlay */}
      {isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 bg-stone-950/50 backdrop-blur-xs z-30 lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Responsive Admin Sidebar */}
      <AdminSidebar
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader onMobileMenuToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)} />
        
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children || <Outlet />}
        </main>
      </div>

      {/* Global Command / Search Modal (Cmd+K) */}
      <AdminCommandSearch />
    </div>
  );
};
