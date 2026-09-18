import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { ShopProvider } from './context/ShopContext';
import { AdminProvider } from './context/AdminContext';

// Layout & Navigation Components
import { AnnouncementBar } from './components/layout/AnnouncementBar';
import { DesktopHeader } from './components/layout/DesktopHeader';
import { MobileHeader } from './components/layout/MobileHeader';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { MobileMenuDrawer } from './components/layout/MobileMenuDrawer';
import { WhatsAppButton } from './components/layout/WhatsAppButton';
import { Footer } from './components/layout/Footer';
import { CartDrawer } from './components/modals/CartDrawer';
import { SearchModal } from './components/modals/SearchModal';
import { QuickViewModal } from './components/modals/QuickViewModal';
import { ToastContainer } from './components/common/ToastContainer';
import { AlluraAIAssistant } from './components/customer/AlluraAIAssistant';

// Storefront Core Pages
import { HomePage } from './pages/HomePage';
import { ShopPage } from './pages/ShopPage';
import { CollectionPage } from './pages/CollectionPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { LookbookPage } from './pages/LookbookPage';
import { AboutPage } from './pages/AboutPage';
import { ContactPage } from './pages/ContactPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { WishlistPage } from './pages/WishlistPage';
import { AccountPage } from './pages/AccountPage';
import { SizeGuidePage } from './pages/SizeGuidePage';
import { ShippingReturnsPage } from './pages/ShippingReturnsPage';

// Customer Flow Pages
import { AuthPage } from './pages/customer/AuthPage';
import { AccountOrdersPage } from './pages/customer/AccountOrdersPage';
import { OrderDetailPage } from './pages/customer/OrderDetailPage';
import { OrderTrackingPage } from './pages/customer/OrderTrackingPage';
import { OrderReturnPage } from './pages/customer/OrderReturnPage';
import { NotificationsPage } from './pages/customer/NotificationsPage';
import { OffersPage } from './pages/customer/OffersPage';
import { FaqPage } from './pages/customer/FaqPage';
import { AIAssistantPage } from './pages/customer/AIAssistantPage';

// Admin Operations Suite Components & Pages
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminProductsPage } from './pages/admin/AdminProductsPage';
import { AdminProductCreatePage } from './pages/admin/AdminProductCreatePage';
import { AdminProductEditPage } from './pages/admin/AdminProductEditPage';
import { AdminCategoriesPage } from './pages/admin/AdminCategoriesPage';
import { AdminCollectionsPage } from './pages/admin/AdminCollectionsPage';
import { AdminVariantsPage } from './pages/admin/AdminVariantsPage';
import { AdminBarcodesPage } from './pages/admin/AdminBarcodesPage';
import { AdminInventoryPage } from './pages/admin/AdminInventoryPage';
import { AdminTransactionsPage } from './pages/admin/AdminTransactionsPage';
import { AdminReservationsPage } from './pages/admin/AdminReservationsPage';
import { AdminOrdersPage } from './pages/admin/AdminOrdersPage';
import { AdminReturnsPage } from './pages/admin/AdminReturnsPage';
import { AdminRefundsPage } from './pages/admin/AdminRefundsPage';
import { AdminOrderDetailPage } from './pages/admin/AdminOrderDetailPage';
import { AdminPaymentsPage } from './pages/admin/AdminPaymentsPage';
import { AdminShippingPage } from './pages/admin/AdminShippingPage';
import { AdminCustomersPage } from './pages/admin/AdminCustomersPage';
import { AdminCustomerDetailPage } from './pages/admin/AdminCustomerDetailPage';
import { AdminCouponsPage } from './pages/admin/AdminCouponsPage';
import { AdminPromotionsPage } from './pages/admin/AdminPromotionsPage';
import { AdminBannersPage } from './pages/admin/AdminBannersPage';
import { AdminAbandonedCartsPage } from './pages/admin/AdminAbandonedCartsPage';
import { AdminNotificationsPage } from './pages/admin/AdminNotificationsPage';
import { AdminContentPage } from './pages/admin/AdminContentPage';
import { AdminSeoPage } from './pages/admin/AdminSeoPage';
import { AdminAnalyticsPage } from './pages/admin/AdminAnalyticsPage';
import { AdminAiPage } from './pages/admin/AdminAiPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';
import { AdminAuditLogsPage } from './pages/admin/AdminAuditLogsPage';
import { AdminAccessGuard } from './components/admin/AdminAccessGuard';

const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
};

export const AppContent: React.FC = () => {
  const location = useLocation();
  const isCheckout = location.pathname === '/checkout';
  const isAdminRoute = location.pathname.startsWith('/admin');

  // Admin Portal Views
  if (isAdminRoute) {
    return (
      <div className="min-h-screen flex flex-col bg-stone-100 text-stone-900">
        <ScrollToTop />
        <ToastContainer />
        
        <Routes>
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<AdminAccessGuard module="dashboard"><AdminDashboardPage /></AdminAccessGuard>} />
            <Route path="/admin/dashboard" element={<AdminAccessGuard module="dashboard"><AdminDashboardPage /></AdminAccessGuard>} />
            <Route path="/admin/products" element={<AdminAccessGuard module="products"><AdminProductsPage /></AdminAccessGuard>} />
            <Route path="/admin/products/new" element={<AdminAccessGuard module="products" action="create"><AdminProductCreatePage /></AdminAccessGuard>} />
            <Route path="/admin/products/:id/edit" element={<AdminAccessGuard module="products" action="edit"><AdminProductEditPage /></AdminAccessGuard>} />
            <Route path="/admin/categories" element={<AdminAccessGuard module="products"><AdminCategoriesPage /></AdminAccessGuard>} />
            <Route path="/admin/collections" element={<AdminAccessGuard module="products"><AdminCollectionsPage /></AdminAccessGuard>} />
            <Route path="/admin/variants" element={<AdminAccessGuard module="products"><AdminVariantsPage /></AdminAccessGuard>} />
            <Route path="/admin/barcodes" element={<AdminAccessGuard module="products"><AdminBarcodesPage /></AdminAccessGuard>} />
            <Route path="/admin/inventory" element={<AdminAccessGuard module="inventory"><AdminInventoryPage /></AdminAccessGuard>} />
            <Route path="/admin/inventory/transactions" element={<AdminAccessGuard module="inventory"><AdminTransactionsPage /></AdminAccessGuard>} />
            <Route path="/admin/inventory/reservations" element={<AdminAccessGuard module="inventory"><AdminReservationsPage /></AdminAccessGuard>} />
            <Route path="/admin/orders" element={<AdminAccessGuard module="orders"><AdminOrdersPage /></AdminAccessGuard>} />
            <Route path="/admin/orders/returns" element={<AdminAccessGuard module="orders"><AdminReturnsPage /></AdminAccessGuard>} />
            <Route path="/admin/orders/refunds" element={<AdminAccessGuard module="orders" action="refund"><AdminRefundsPage /></AdminAccessGuard>} />
            <Route path="/admin/orders/:id" element={<AdminAccessGuard module="orders"><AdminOrderDetailPage /></AdminAccessGuard>} />
            <Route path="/admin/payments" element={<AdminAccessGuard module="orders"><AdminPaymentsPage /></AdminAccessGuard>} />
            <Route path="/admin/shipping" element={<AdminAccessGuard module="orders"><AdminShippingPage /></AdminAccessGuard>} />
            <Route path="/admin/customers" element={<AdminAccessGuard module="customers"><AdminCustomersPage /></AdminAccessGuard>} />
            <Route path="/admin/customers/:id" element={<AdminAccessGuard module="customers"><AdminCustomerDetailPage /></AdminAccessGuard>} />
            <Route path="/admin/marketing/coupons" element={<AdminAccessGuard module="marketing"><AdminCouponsPage /></AdminAccessGuard>} />
            <Route path="/admin/marketing/promotions" element={<AdminAccessGuard module="marketing"><AdminPromotionsPage /></AdminAccessGuard>} />
            <Route path="/admin/marketing/banners" element={<AdminAccessGuard module="marketing"><AdminBannersPage /></AdminAccessGuard>} />
            <Route path="/admin/marketing/abandoned-carts" element={<AdminAccessGuard module="marketing"><AdminAbandonedCartsPage /></AdminAccessGuard>} />
            <Route path="/admin/notifications" element={<AdminAccessGuard module="notifications"><AdminNotificationsPage /></AdminAccessGuard>} />
            <Route path="/admin/content" element={<AdminAccessGuard module="cms"><AdminContentPage /></AdminAccessGuard>} />
            <Route path="/admin/content/faqs" element={<AdminAccessGuard module="cms"><AdminContentPage /></AdminAccessGuard>} />
            <Route path="/admin/seo" element={<AdminAccessGuard module="seo"><AdminSeoPage /></AdminAccessGuard>} />
            <Route path="/admin/analytics" element={<AdminAccessGuard module="analytics"><AdminAnalyticsPage /></AdminAccessGuard>} />
            <Route path="/admin/analytics/search" element={<AdminAccessGuard module="analytics"><AdminAnalyticsPage /></AdminAccessGuard>} />
            <Route path="/admin/ai" element={<AdminAccessGuard module="ai"><AdminAiPage /></AdminAccessGuard>} />
            <Route path="/admin/settings" element={<AdminAccessGuard module="settings"><AdminSettingsPage /></AdminAccessGuard>} />
            <Route path="/admin/settings/admins" element={<AdminAccessGuard module="adminManagement"><AdminSettingsPage /></AdminAccessGuard>} />
            <Route path="/admin/audit-logs" element={<AdminAccessGuard module="auditLogs"><AdminAuditLogsPage /></AdminAccessGuard>} />
            <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
          </Route>
        </Routes>
      </div>
    );
  }

  // Customer Storefront Views
  return (
    <div className="min-h-screen flex flex-col bg-allura-bg text-allura-text selection:bg-allura-gold/20 selection:text-allura-darkBrown">
      <ScrollToTop />
      <ToastContainer />
      <CartDrawer />
      <SearchModal />
      <QuickViewModal />
      <MobileMenuDrawer />

      {/* Top Bars (Hidden on minimal checkout) */}
      {!isCheckout && (
        <>
          <AnnouncementBar />
          <DesktopHeader />
          <MobileHeader />
        </>
      )}

      {/* Main Content Area */}
      <main className="flex-1">
        <Routes>
          {/* Core Pages */}
          <Route path="/" element={<HomePage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/collections/:slug" element={<CollectionPage />} />
          <Route path="/product/:slug" element={<ProductDetailPage />} />
          <Route path="/lookbook" element={<LookbookPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/size-guide" element={<SizeGuidePage />} />
          <Route path="/shipping-returns" element={<ShippingReturnsPage />} />

          {/* Customer Flows */}
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/auth/login" element={<AuthPage />} />
          <Route path="/auth/complete-profile" element={<AuthPage />} />
          <Route path="/account/orders" element={<AccountOrdersPage />} />
          <Route path="/account/orders/:orderId" element={<OrderDetailPage />} />
          <Route path="/account/orders/:orderId/tracking" element={<OrderTrackingPage />} />
          <Route path="/account/orders/:orderId/return" element={<OrderReturnPage />} />
          <Route path="/account/notifications" element={<NotificationsPage />} />
          <Route path="/offers" element={<OffersPage />} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="/ai-assistant" element={<AIAssistantPage />} />

          {/* Fallback */}
          <Route path="*" element={<HomePage />} />
        </Routes>
      </main>

      {/* Floating AI Stylist & WhatsApp Concierge */}
      {!isCheckout && (
        <>
          <AlluraAIAssistant />
          <WhatsAppButton />
          <MobileBottomNav />
          <Footer />
        </>
      )}
    </div>
  );
};

export function App() {
  return (
    <BrowserRouter>
      <ShopProvider>
        <AdminProvider>
          <AppContent />
        </AdminProvider>
      </ShopProvider>
    </BrowserRouter>
  );
}

export default App;
