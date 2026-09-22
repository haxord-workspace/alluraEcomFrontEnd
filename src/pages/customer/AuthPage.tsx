import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle2, ArrowRight, ShieldCheck, Phone, User, Mail, Lock, Unlock } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { AlluraLogo } from '../../components/common/AlluraLogo';
import { getCustomerProfile, updateCustomerProfile } from '../../service/customer';

export const AuthPage: React.FC = () => {
  const { customer, loginUser, registerUser, completeProfile, logoutCustomer, showToast } = useShop();
  const navigate = useNavigate();
  const location = useLocation();

  const isCompleteProfile = location.pathname === '/auth/complete-profile';
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Auth Form State
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Profile Form State — mirrors the PATCH /customer/profile body exactly
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Prefill the edit-profile form from the real backend profile
  useEffect(() => {
    if (!isCompleteProfile) return;
    let cancelled = false;
    setIsLoadingProfile(true);
    getCustomerProfile()
      .then(profile => {
        if (cancelled) return;
        setFirstName(profile.firstName || '');
        setLastName(profile.lastName || '');
        setDisplayName(profile.displayName || '');
        setCountryCode(profile.phone?.countryCode || '+91');
        setPhoneNumber(profile.phone?.number || '');
        setAvatarUrl(profile.avatarUrl || '');
      })
      .catch(() => {
        // No profile yet (e.g. brand-new account) — leave the form blank.
      })
      .finally(() => {
        if (!cancelled) setIsLoadingProfile(false);
      });
    return () => { cancelled = true; };
  }, [isCompleteProfile]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isLoginMode) {
        await loginUser({ email: authEmail, password: authPassword });
      } else {
        if (authPassword !== authConfirmPassword) {
          showToast('Passwords do not match.', 'error');
          setIsLoading(false);
          return;
        }
        await registerUser({ name: authName, email: authEmail, password: authPassword });
      }
      setIsSuccess(true);
      setTimeout(() => {
        setIsLoading(false);
        const from = (location.state as any)?.from?.pathname || '/account';
        navigate(from, { replace: true });
      }, 1000);
    } catch {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const updated = await updateCustomerProfile({
        firstName,
        lastName,
        displayName,
        phone: { countryCode, number: phoneNumber },
        avatarUrl,
      });
      completeProfile({
        name: updated.displayName || [updated.firstName, updated.lastName].filter(Boolean).join(' ') || displayName,
        phone: updated.phone ? `${updated.phone.countryCode} ${updated.phone.number}`.trim() : `${countryCode} ${phoneNumber}`.trim(),
        avatar: updated.avatarUrl || avatarUrl,
      });
      showToast('Profile updated successfully.', 'gold');
      navigate('/account');
    } catch (err) {
      showToast('Failed to update profile. Please try again.', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="bg-allura-card border border-allura-border rounded-2xl w-full max-w-md p-8 sm:p-10 shadow-luxury text-center space-y-6 animate-slide-up">
        
        {/* Brand Logo */}
        <div className="flex flex-col items-center space-y-2">
          <AlluraLogo size="md" variant="dark" />
          <span className="text-[10px] font-sans font-bold tracking-[0.25em] uppercase text-allura-goldDark">
            BOUTIQUE ATELIER & VIP CIRCLE
          </span>
        </div>

        {/* Dynamic State views */}
        {isCompleteProfile || (customer && !isSuccess) ? (
          <form onSubmit={handleSaveProfile} className="space-y-5 text-left pt-2">
            <div className="text-center pb-2">
              <h1 className="font-serif text-2xl text-allura-text font-normal">Complete Your Profile</h1>
              <p className="text-xs font-sans text-allura-muted mt-1">
                Personalize your atelier experience
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-sans font-bold uppercase tracking-wider text-allura-muted mb-1">
                    First Name
                  </label>
                  <div className="relative">
                    <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-allura-muted" />
                    <input
                      type="text"
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      required
                      disabled={isLoadingProfile}
                      className="w-full pl-10 pr-4 py-2.5 bg-allura-bg border border-allura-border rounded-xl text-xs font-sans text-allura-text focus:outline-none focus:border-allura-gold disabled:opacity-60"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-sans font-bold uppercase tracking-wider text-allura-muted mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    required
                    disabled={isLoadingProfile}
                    className="w-full px-4 py-2.5 bg-allura-bg border border-allura-border rounded-xl text-xs font-sans text-allura-text focus:outline-none focus:border-allura-gold disabled:opacity-60"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-sans font-bold uppercase tracking-wider text-allura-muted mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="How you'd like to be addressed"
                  disabled={isLoadingProfile}
                  className="w-full px-4 py-2.5 bg-allura-bg border border-allura-border rounded-xl text-xs font-sans text-allura-text focus:outline-none focus:border-allura-gold disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-[11px] font-sans font-bold uppercase tracking-wider text-allura-muted mb-1">
                  WhatsApp Number
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={countryCode}
                    onChange={e => setCountryCode(e.target.value)}
                    required
                    disabled={isLoadingProfile}
                    className="w-16 px-2 py-2.5 bg-allura-bg border border-allura-border rounded-xl text-xs font-sans text-allura-text text-center focus:outline-none focus:border-allura-gold disabled:opacity-60"
                  />
                  <div className="relative flex-1">
                    <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-allura-muted" />
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={e => setPhoneNumber(e.target.value)}
                      required
                      disabled={isLoadingProfile}
                      className="w-full pl-10 pr-4 py-2.5 bg-allura-bg border border-allura-border rounded-xl text-xs font-sans text-allura-text focus:outline-none focus:border-allura-gold disabled:opacity-60"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-sans font-bold uppercase tracking-wider text-allura-muted mb-1">
                  Avatar URL
                </label>
                <input
                  type="text"
                  value={avatarUrl}
                  onChange={e => setAvatarUrl(e.target.value)}
                  placeholder="https://..."
                  disabled={isLoadingProfile}
                  className="w-full px-4 py-2.5 bg-allura-bg border border-allura-border rounded-xl text-xs font-sans text-allura-text focus:outline-none focus:border-allura-gold disabled:opacity-60"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoadingProfile || isSavingProfile}
              className="w-full bg-allura-darkBrown hover:bg-allura-softBrown text-white py-3 rounded-xl text-xs font-sans font-bold tracking-widest uppercase transition-colors flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
            >
              <span>{isSavingProfile ? 'Saving...' : 'Save & Continue to Boutique'}</span>
              <ArrowRight size={14} />
            </button>

            <button
              type="button"
              onClick={logoutCustomer}
              className="w-full text-center text-xs font-sans text-rose-700 hover:underline pt-2"
            >
              Sign Out from this Device
            </button>
          </form>
        ) : (
          <div className="space-y-6 text-left">
            <div className="space-y-2 text-center">
              <h1 className="font-serif text-2xl sm:text-3xl text-allura-text font-normal">
                {isLoginMode ? 'Welcome Back' : 'Create an Account'}
              </h1>
              <p className="text-xs font-sans text-allura-muted leading-relaxed">
                {isLoginMode 
                  ? 'Sign in to view your orders, saved wishlists, and connect with your stylist.'
                  : 'Join Allura to track orders, save wishlists, and enjoy VIP privileges.'}
              </p>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4 pt-2">
              {!isLoginMode && (
                <div>
                  <label className="block text-[11px] font-sans font-bold uppercase tracking-wider text-allura-muted mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-allura-muted" />
                    <input
                      type="text"
                      value={authName}
                      onChange={e => setAuthName(e.target.value)}
                      required
                      placeholder="Full Name"
                      className="w-full pl-10 pr-4 py-2.5 bg-allura-bg border border-allura-border rounded-xl text-xs font-sans text-allura-text focus:outline-none focus:border-allura-gold"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-sans font-bold uppercase tracking-wider text-allura-muted mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-allura-muted" />
                  <input
                    type="email"
                    value={authEmail}
                    onChange={e => setAuthEmail(e.target.value)}
                    required
                    placeholder="user@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-allura-bg border border-allura-border rounded-xl text-xs font-sans text-allura-text focus:outline-none focus:border-allura-gold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-sans font-bold uppercase tracking-wider text-allura-muted mb-1">
                  Password
                </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-allura-muted hover:text-allura-text focus:outline-none"
                    >
                      {showPassword ? <Unlock size={15} /> : <Lock size={15} />}
                    </button>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={authPassword}
                      onChange={e => setAuthPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2.5 bg-allura-bg border border-allura-border rounded-xl text-xs font-sans text-allura-text focus:outline-none focus:border-allura-gold"
                    />
                  </div>
              </div>

              {!isLoginMode && (
                <div>
                  <label className="block text-[11px] font-sans font-bold uppercase tracking-wider text-allura-muted mb-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-allura-muted hover:text-allura-text focus:outline-none"
                    >
                      {showConfirmPassword ? <Unlock size={15} /> : <Lock size={15} />}
                    </button>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={authConfirmPassword}
                      onChange={e => setAuthConfirmPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2.5 bg-allura-bg border border-allura-border rounded-xl text-xs font-sans text-allura-text focus:outline-none focus:border-allura-gold"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-allura-darkBrown hover:bg-allura-softBrown text-white py-3 rounded-xl text-xs font-sans font-bold tracking-widest uppercase transition-colors flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="w-4 h-4 rounded-full border-2 border-allura-gold border-t-transparent animate-spin" />
                ) : isSuccess ? (
                  <CheckCircle2 size={16} className="text-emerald-400" />
                ) : null}
                <span>{isLoginMode ? 'Sign In' : 'Register'}</span>
              </button>
            </form>
            
            <div className="text-center pt-2 border-t border-allura-border/60">
              <button
                type="button"
                onClick={() => setIsLoginMode(!isLoginMode)}
                className="text-xs font-sans text-allura-muted hover:text-allura-text transition-colors"
              >
                {isLoginMode ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </div>

            <div className="flex items-center gap-2 text-[10px] font-sans text-allura-muted justify-center">
              <ShieldCheck size={13} className="text-emerald-700" />
              <span>Encrypted & secure customer authentication</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
