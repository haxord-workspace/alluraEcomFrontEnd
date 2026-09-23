import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Unlock, Mail, ShieldCheck, ArrowRight } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { AlluraLogo } from '../../components/common/AlluraLogo';

export const AdminLoginPage: React.FC = () => {
  const { adminLogin, isAdminAuthenticated } = useAdmin();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // If already authenticated, go to dashboard
  useEffect(() => {
    if (isAdminAuthenticated) {
      navigate('/admin/dashboard');
    }
  }, [isAdminAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const success = await adminLogin(email, password);
    setIsLoading(false);
    if (success) {
      navigate('/admin/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
      <div className="bg-white border border-stone-200 rounded-3xl w-full max-w-md p-8 sm:p-10 shadow-2xl space-y-6 animate-slide-up text-stone-900">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <AlluraLogo size="md" variant="dark" />
          <div className="flex items-center justify-center gap-2 pt-1">
            <span className="text-[10px] font-sans font-bold tracking-[0.25em] text-allura-goldDark uppercase">
              OPERATIONS PLATFORM
            </span>
            <span className="w-1 h-1 rounded-full bg-stone-300" />
            <span className="text-[10px] font-mono text-stone-500 font-bold">ATELIER v2.4</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans pt-2">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">
              Admin Email ID
            </label>
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:border-stone-800"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                Password
              </label>
              <span className="text-[10px] text-stone-400 cursor-pointer hover:underline">
                Forgot?
              </span>
            </div>
            <div className="relative">
              {showPassword ? (
                <Unlock 
                  size={15} 
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 cursor-pointer hover:text-stone-700 transition-colors" 
                  onClick={() => setShowPassword(false)}
                />
              ) : (
                <Lock 
                  size={15} 
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 cursor-pointer hover:text-stone-700 transition-colors" 
                  onClick={() => setShowPassword(true)}
                />
              )}
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder='••••••••••••'
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:border-stone-800"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-stone-600">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="rounded accent-stone-900 w-3.5 h-3.5"
              />
              <span>Remember 30 days</span>
            </label>
            <span className="text-emerald-700 font-semibold text-[11px]">VPN Verified</span>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-stone-900 hover:bg-stone-800 text-white py-3 rounded-xl text-xs font-sans font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 mt-4"
          >
            {isLoading ? (
              <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <>
                <span>Sign In to Ops Hub</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>

        <div className="border-t border-stone-100 pt-4 text-center text-[10px] text-stone-400 font-sans flex items-center justify-center gap-1.5">
          <ShieldCheck size={13} className="text-emerald-600" />
          <span>Restricted to Authorized Allura Boutique Personnel</span>
        </div>

      </div>
    </div>
  );
};
