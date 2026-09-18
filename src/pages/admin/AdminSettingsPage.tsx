import React, { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { useShop } from '../../context/ShopContext';
import { PermissionMatrix } from '../../components/admin/PermissionMatrix';
import { 
  Building2, 
  CreditCard, 
  Truck, 
  Sparkles, 
  ShieldCheck, 
  Users, 
  Save, 
  RotateCcw,
  CheckCircle2,
  Key,
  Database,
  Lock
} from 'lucide-react';
import type { AdminRole } from '../../types';

export const AdminSettingsPage: React.FC = () => {
  const { 
    adminUsers, 
    role, 
    setRole, 
    logAdminAction,
    hasPermission
  } = useAdmin();
  const { showToast } = useShop();

  const [activeTab, setActiveTab] = useState<'store' | 'integrations' | 'admins' | 'security'>('store');

  // Store Settings Form
  const [storeSettings, setStoreSettings] = useState({
    storeName: 'Allura Boutique Atelier',
    tagline: 'Kerala Modest & Ethnic Couture',
    phone: '+91 90379 91774',
    whatsapp: '9037991774',
    email: 'concierge@alluraboutique.in',
    gstin: '32AAACA1234A1Z5',
    address: 'Near Jubilee Mission Hospital, Bypass Road, Perinthalmanna, Malappuram, Kerala - 679322',
    currency: 'INR (₹)',
    timezone: 'Asia/Kolkata (IST +05:30)',
    freeShippingThreshold: 2999,
    standardShippingFee: 149,
    expressShippingFee: 299,
  });

  // Integrations Form
  const [integrations, setIntegrations] = useState({
    razorpayKey: 'rzp_live_892Kls9910293J',
    razorpaySecret: '••••••••••••••••••••••••••••',
    razorpayTestMode: false,
    delhiveryToken: 'dlhv_live_tok_99182371928419',
    delhiveryClientId: 'ALLURA_EXP_PERINTHALMANNA',
    delhiveryWarehouseCode: 'KL-PMNA-HUB-01',
    whatsappPhoneId: '109832819284719',
    whatsappToken: '••••••••••••••••••••••••••••',
    whatsappEnabled: true,
    emailApiKey: 're_live_9981293847192',
    fromEmail: 'orders@alluraboutique.in',
    aiModel: 'gemini-1.5-flash',
    aiTemperature: 0.7,
  });

  // Security Form
  const [securitySettings, setSecuritySettings] = useState({
    enforce2FA: true,
    sessionTimeoutMins: 60,
    ipWhitelisting: false,
    auditRetentionDays: 90,
  });

  const isEditable = hasPermission('settings', 'edit');

  const handleSaveStore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditable) {
      showToast('Action restricted: Read-only access for current role', 'error');
      return;
    }
    logAdminAction('Updated', 'Settings', 'Store Configuration', 'Updated boutique details and shipping rates');
    showToast('Boutique settings saved successfully', 'success');
  };

  const handleSaveIntegrations = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditable) {
      showToast('Action restricted: Read-only access for current role', 'error');
      return;
    }
    logAdminAction('Updated', 'Settings', 'API Integrations', 'Updated Razorpay, Delhivery & AI gateway credentials');
    showToast('Integration keys and parameters saved', 'gold');
  };

  const handleSaveSecurity = (e: React.FormEvent) => {
    e.preventDefault();
    if (role !== 'SUPER_ADMIN') {
      showToast('Super Admin access required for security settings', 'error');
      return;
    }
    logAdminAction('Updated', 'Settings', 'Security Policies', 'Updated 2FA and session timeout policies');
    showToast('Security configurations updated', 'success');
  };

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-primary-200/60 pb-5">
        <div>
          <span className="text-xs uppercase tracking-widest text-accent-gold font-bold">Administration</span>
          <h1 className="font-serif text-3xl text-primary-900 mt-1">Atelier Settings & Integrations</h1>
          <p className="text-primary-600 text-sm mt-1 font-sans">
            Configure boutique metadata, logistics APIs, payment gateways, permissions, and security controls.
          </p>
        </div>

        {/* Role Quick Switch */}
        <div className="flex items-center gap-2 bg-primary-100/70 p-1.5 rounded-lg border border-primary-200">
          <span className="text-xs font-semibold text-primary-700 px-2">Role:</span>
          {(['SUPER_ADMIN', 'ADMIN', 'CATALOG_MANAGER', 'ORDER_MANAGER'] as AdminRole[]).map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`px-2.5 py-1 text-xs font-mono font-medium rounded transition-colors ${
                role === r
                  ? 'bg-primary-900 text-primary-50 shadow-sm font-bold'
                  : 'text-primary-700 hover:bg-primary-200/50'
              }`}
            >
              {r.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {!isEditable && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-sans flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm">⚠️</span>
            <span><strong>Read-Only Configuration Mode:</strong> Active role (<span className="font-mono font-bold">{role}</span>) has view access only.</span>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
            Protected
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-primary-200/80 gap-6">
        <button
          onClick={() => setActiveTab('store')}
          className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'store'
              ? 'border-accent-gold text-primary-950 font-semibold'
              : 'border-transparent text-primary-600 hover:text-primary-900'
          }`}
        >
          <Building2 size={16} />
          Boutique Profile
        </button>

        <button
          onClick={() => setActiveTab('integrations')}
          className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'integrations'
              ? 'border-accent-gold text-primary-950 font-semibold'
              : 'border-transparent text-primary-600 hover:text-primary-900'
          }`}
        >
          <Key size={16} />
          Gateways & Logistics
        </button>

        {hasPermission('adminManagement') && (
          <button
            onClick={() => setActiveTab('admins')}
            className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'admins'
                ? 'border-accent-gold text-primary-950 font-semibold'
                : 'border-transparent text-primary-600 hover:text-primary-900'
            }`}
          >
            <Users size={16} />
            Admins & RBAC Matrix
          </button>
        )}

        {(hasPermission('adminManagement') || role === 'SUPER_ADMIN') && (
          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'security'
                ? 'border-accent-gold text-primary-950 font-semibold'
                : 'border-transparent text-primary-600 hover:text-primary-900'
            }`}
          >
            <ShieldCheck size={16} />
            Security & Maintenance
          </button>
        )}
      </div>

      {/* Tab 1: Store Settings */}
      {activeTab === 'store' && (
        <form onSubmit={handleSaveStore} className="space-y-6">
          <div className="bg-primary-50 rounded-xl border border-primary-200/80 p-6 shadow-sm space-y-6">
            <h2 className="font-serif text-xl text-primary-900 flex items-center gap-2">
              <Building2 className="text-accent-gold" size={20} />
              General Boutique Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-primary-700 mb-1.5">
                  Boutique Legal Name
                </label>
                <input
                  type="text"
                  value={storeSettings.storeName}
                  onChange={(e) => setStoreSettings({ ...storeSettings, storeName: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-primary-200 rounded-lg text-primary-900 focus:outline-none focus:border-accent-gold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-primary-700 mb-1.5">
                  Tagline / Brand Signature
                </label>
                <input
                  type="text"
                  value={storeSettings.tagline}
                  onChange={(e) => setStoreSettings({ ...storeSettings, tagline: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-primary-200 rounded-lg text-primary-900 focus:outline-none focus:border-accent-gold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-primary-700 mb-1.5">
                  WhatsApp Concierge Number
                </label>
                <input
                  type="text"
                  value={storeSettings.whatsapp}
                  onChange={(e) => setStoreSettings({ ...storeSettings, whatsapp: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-primary-200 rounded-lg text-primary-900 focus:outline-none focus:border-accent-gold"
                  placeholder="9037991774"
                />
                <p className="text-[11px] text-primary-500 mt-1">Direct link for client consultations & order inquiries</p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-primary-700 mb-1.5">
                  Concierge Support Email
                </label>
                <input
                  type="email"
                  value={storeSettings.email}
                  onChange={(e) => setStoreSettings({ ...storeSettings, email: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-primary-200 rounded-lg text-primary-900 focus:outline-none focus:border-accent-gold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-primary-700 mb-1.5">
                  GSTIN / Tax Identification
                </label>
                <input
                  type="text"
                  value={storeSettings.gstin}
                  onChange={(e) => setStoreSettings({ ...storeSettings, gstin: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-primary-200 rounded-lg text-primary-900 focus:outline-none focus:border-accent-gold font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-primary-700 mb-1.5">
                  Currency & Timezone
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={storeSettings.currency}
                    disabled
                    className="px-3.5 py-2 text-sm bg-primary-100/60 border border-primary-200 rounded-lg text-primary-700 font-mono"
                  />
                  <input
                    type="text"
                    value={storeSettings.timezone}
                    disabled
                    className="px-3.5 py-2 text-sm bg-primary-100/60 border border-primary-200 rounded-lg text-primary-700 text-xs"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-primary-700 mb-1.5">
                  Kerala Physical Atelier & Dispatch Hub Address
                </label>
                <textarea
                  rows={2}
                  value={storeSettings.address}
                  onChange={(e) => setStoreSettings({ ...storeSettings, address: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-primary-200 rounded-lg text-primary-900 focus:outline-none focus:border-accent-gold"
                />
              </div>
            </div>
          </div>

          {/* Shipping Thresholds */}
          <div className="bg-primary-50 rounded-xl border border-primary-200/80 p-6 shadow-sm space-y-6">
            <h2 className="font-serif text-xl text-primary-900 flex items-center gap-2">
              <Truck className="text-accent-gold" size={20} />
              Shipping Tariffs & Complimentary Thresholds
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-primary-700 mb-1.5">
                  Free Shipping Min. Order (₹)
                </label>
                <input
                  type="number"
                  value={storeSettings.freeShippingThreshold}
                  onChange={(e) => setStoreSettings({ ...storeSettings, freeShippingThreshold: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-primary-200 rounded-lg text-primary-900 focus:outline-none focus:border-accent-gold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-primary-700 mb-1.5">
                  Standard Surface Tariff (₹)
                </label>
                <input
                  type="number"
                  value={storeSettings.standardShippingFee}
                  onChange={(e) => setStoreSettings({ ...storeSettings, standardShippingFee: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-primary-200 rounded-lg text-primary-900 focus:outline-none focus:border-accent-gold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-primary-700 mb-1.5">
                  Express Air Courier (₹)
                </label>
                <input
                  type="number"
                  value={storeSettings.expressShippingFee}
                  onChange={(e) => setStoreSettings({ ...storeSettings, expressShippingFee: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-primary-200 rounded-lg text-primary-900 focus:outline-none focus:border-accent-gold"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 bg-primary-900 text-white rounded-lg text-sm font-semibold hover:bg-accent-gold transition-colors shadow-sm"
            >
              <Save size={16} />
              Save Boutique Profile
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Gateways & Logistics */}
      {activeTab === 'integrations' && (
        <form onSubmit={handleSaveIntegrations} className="space-y-6">
          {/* Razorpay */}
          <div className="bg-primary-50 rounded-xl border border-primary-200/80 p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                  <CreditCard size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-primary-950 text-base">Razorpay Payment Gateway</h3>
                  <p className="text-xs text-primary-600">Accept UPI, Credit/Debit Cards, NetBanking, and EMI seamlessly</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-medium">
                <CheckCircle2 size={13} /> Connected
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-primary-700 mb-1">
                  Razorpay Key ID
                </label>
                <input
                  type="text"
                  value={integrations.razorpayKey}
                  onChange={(e) => setIntegrations({ ...integrations, razorpayKey: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-primary-200 rounded-lg font-mono text-primary-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-primary-700 mb-1">
                  Razorpay Key Secret
                </label>
                <input
                  type="password"
                  value={integrations.razorpaySecret}
                  onChange={(e) => setIntegrations({ ...integrations, razorpaySecret: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-primary-200 rounded-lg font-mono text-primary-900"
                />
              </div>
            </div>
          </div>

          {/* Delhivery */}
          <div className="bg-primary-50 rounded-xl border border-primary-200/80 p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                  <Truck size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-primary-950 text-base">Delhivery Logistics Express API</h3>
                  <p className="text-xs text-primary-600">Automated AWB generation, live dispatch tracking & reverse pickups</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-medium">
                <CheckCircle2 size={13} /> Connected
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-primary-700 mb-1">
                  API Token
                </label>
                <input
                  type="text"
                  value={integrations.delhiveryToken}
                  onChange={(e) => setIntegrations({ ...integrations, delhiveryToken: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-primary-200 rounded-lg font-mono text-primary-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-primary-700 mb-1">
                  Client ID
                </label>
                <input
                  type="text"
                  value={integrations.delhiveryClientId}
                  onChange={(e) => setIntegrations({ ...integrations, delhiveryClientId: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-primary-200 rounded-lg font-mono text-primary-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-primary-700 mb-1">
                  Warehouse Location Code
                </label>
                <input
                  type="text"
                  value={integrations.delhiveryWarehouseCode}
                  onChange={(e) => setIntegrations({ ...integrations, delhiveryWarehouseCode: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-primary-200 rounded-lg font-mono text-primary-900"
                />
              </div>
            </div>
          </div>

          {/* AI Stylist Engine */}
          <div className="bg-primary-50 rounded-xl border border-primary-200/80 p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-primary-950 text-base">Allura AI Assistant & Stylist Engine</h3>
                  <p className="text-xs text-primary-600">Client stylist conversations, saree draping recommendations, catalog knowledge</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-100 text-purple-900 border border-purple-200 rounded-full text-xs font-medium">
                Active: Gemini 1.5 Flash
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-primary-700 mb-1">
                  Active Model
                </label>
                <select
                  value={integrations.aiModel}
                  onChange={(e) => setIntegrations({ ...integrations, aiModel: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-primary-200 rounded-lg text-primary-900"
                >
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash (Ultra-Fast Stylist)</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deep Multimodal & Heritage Reasoning)</option>
                  <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-primary-700 mb-1">
                  Stylist Temperature ({integrations.aiTemperature})
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  value={integrations.aiTemperature}
                  onChange={(e) => setIntegrations({ ...integrations, aiTemperature: parseFloat(e.target.value) })}
                  className="w-full accent-accent-gold mt-2"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 bg-primary-900 text-white rounded-lg text-sm font-semibold hover:bg-accent-gold transition-colors shadow-sm"
            >
              <Save size={16} />
              Save Integration Credentials
            </button>
          </div>
        </form>
      )}

      {/* Tab 3: Admins & RBAC Matrix */}
      {activeTab === 'admins' && (
        <div className="space-y-8">
          {/* Admin Staff Table */}
          <div className="bg-primary-50 rounded-xl border border-primary-200/80 p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif text-xl text-primary-900">Atelier Management & Staff</h2>
                <p className="text-xs text-primary-600 mt-0.5">Assigned roles and active access privileges</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-primary-200/70 text-xs uppercase tracking-wider text-primary-600 font-semibold">
                    <th className="pb-3">Staff Name</th>
                    <th className="pb-3">Email Address</th>
                    <th className="pb-3">Assigned Role</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Last Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary-100">
                  {adminUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-white/50 transition-colors">
                      <td className="py-3 font-medium text-primary-900 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-accent-gold/20 text-accent-gold flex items-center justify-center font-bold text-xs">
                          {u.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        {u.name}
                      </td>
                      <td className="py-3 text-primary-600 font-mono text-xs">{u.email}</td>
                      <td className="py-3">
                        <span className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                          u.role === 'SUPER_ADMIN'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : u.role === 'ADMIN'
                            ? 'bg-blue-100 text-blue-900 border border-blue-300'
                            : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        }`}>
                          {u.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Active
                        </span>
                      </td>
                      <td className="py-3 text-xs text-primary-500">{u.lastLogin}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Granular Permission Matrix Component */}
          <div className="bg-primary-50 rounded-xl border border-primary-200/80 p-6 shadow-sm">
            <PermissionMatrix />
          </div>
        </div>
      )}

      {/* Tab 4: Security & Maintenance */}
      {activeTab === 'security' && (
        <form onSubmit={handleSaveSecurity} className="space-y-6">
          <div className="bg-primary-50 rounded-xl border border-primary-200/80 p-6 shadow-sm space-y-6">
            <h2 className="font-serif text-xl text-primary-900 flex items-center gap-2">
              <Lock className="text-accent-gold" size={20} />
              Atelier Portal Security Policies
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-primary-200">
                <div>
                  <h4 className="text-sm font-semibold text-primary-900">Enforce Two-Factor Authentication (2FA)</h4>
                  <p className="text-xs text-primary-600">Require OTP verification for all staff logging into admin portal</p>
                </div>
                <input
                  type="checkbox"
                  checked={securitySettings.enforce2FA}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, enforce2FA: e.target.checked })}
                  className="w-5 h-5 accent-accent-gold rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-primary-200">
                <div>
                  <h4 className="text-sm font-semibold text-primary-900">Atelier VPN & IP Whitelisting</h4>
                  <p className="text-xs text-primary-600">Restrict access to verified Perinthalmanna atelier IP subnets</p>
                </div>
                <input
                  type="checkbox"
                  checked={securitySettings.ipWhitelisting}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, ipWhitelisting: e.target.checked })}
                  className="w-5 h-5 accent-accent-gold rounded cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-primary-700 mb-1">
                    Staff Inactivity Session Timeout (Minutes)
                  </label>
                  <input
                    type="number"
                    value={securitySettings.sessionTimeoutMins}
                    onChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeoutMins: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm bg-white border border-primary-200 rounded-lg text-primary-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-primary-700 mb-1">
                    Audit Log Retention Period (Days)
                  </label>
                  <input
                    type="number"
                    value={securitySettings.auditRetentionDays}
                    onChange={(e) => setSecuritySettings({ ...securitySettings, auditRetentionDays: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm bg-white border border-primary-200 rounded-lg text-primary-900"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Maintenance & Demo Snapshot */}
          <div className="bg-primary-50 rounded-xl border border-primary-200/80 p-6 shadow-sm space-y-4">
            <h2 className="font-serif text-xl text-primary-900 flex items-center gap-2">
              <Database className="text-accent-gold" size={20} />
              Database Snapshots & Data Reset
            </h2>
            <p className="text-xs text-primary-600">
              Manage reactive localStorage state, download a full JSON backup of orders, products, and clients, or reset to fresh boutique mock data.
            </p>

            <div className="flex flex-wrap gap-4 pt-2">
              <button
                type="button"
                onClick={() => {
                  const state = {
                    products: localStorage.getItem('allura_admin_products'),
                    orders: localStorage.getItem('allura_orders'),
                    returns: localStorage.getItem('allura_returns'),
                    auditLogs: localStorage.getItem('allura_audit_logs'),
                  };
                  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `allura-atelier-backup-${Date.now()}.json`;
                  a.click();
                  showToast('Database backup JSON exported successfully', 'gold');
                }}
                className="px-4 py-2 bg-white border border-primary-300 text-primary-800 rounded-lg text-xs font-semibold hover:bg-primary-100 transition-colors shadow-sm"
              >
                Export Complete System Snapshot
              </button>

              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Reset all demo orders, stock changes, and logs back to original master data?')) {
                    localStorage.clear();
                    showToast('Demo state reset. Reloading boutique...', 'gold');
                    setTimeout(() => window.location.reload(), 800);
                  }
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors"
              >
                <RotateCcw size={14} />
                Reset Demo to Master Seed
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 bg-primary-900 text-white rounded-lg text-sm font-semibold hover:bg-accent-gold transition-colors shadow-sm"
            >
              <Save size={16} />
              Save Security Policies
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default AdminSettingsPage;
