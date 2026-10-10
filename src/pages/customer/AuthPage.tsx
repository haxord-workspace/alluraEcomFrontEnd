import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle2, ArrowRight, ShieldCheck, Phone, User, Mail, Lock, Unlock, Loader2 } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { AlluraLogo } from '../../components/common/AlluraLogo';
import { getCustomerProfile, updateCustomerProfile, profileDisplayName, profilePhone, profileErrorMessage } from '../../service/customer';
import { normalizeMobile, mobileError } from '../../utils/addressValidation';
import { useGoogleLogin } from '@react-oauth/google';

// After signing in, go to the Home page, unless the customer was sent here from a specific page
// (e.g. checkout or wishlist), in which case return them there. The Account page and the auth
// pages themselves don't count, since that's just how people reach the login screen.
const postLoginPath = (from?: string) =>
  from && !from.startsWith('/auth') && from !== '/account' ? from : '/';

export const AuthPage: React.FC = () => {
  const { customer, loginUser, registerUser, loginWithGoogle, completeProfile, logoutCustomer, showToast } = useShop();
  const navigate = useNavigate();
  const location = useLocation();

  const isCompleteProfile = location.pathname === '/auth/complete-profile';
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsLoading(true);
      try {
        await loginWithGoogle({ token: tokenResponse.access_token });
        setIsSuccess(true);
        setTimeout(() => {
          setIsLoading(false);
          const from = postLoginPath((location.state as any)?.from?.pathname);
          navigate(from, { replace: true });
        }, 1000);
      } catch {
        setIsLoading(false);
      }
    },
    onError: () => {
      showToast('Google Login Failed', 'error');
    }
  });

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
  const [phoneTouched, setPhoneTouched] = useState(false);
  // Indian numbers get the 10-digit check; other country codes only need digits
  const isIndia = countryCode.replace(/\s/g, '') === '+91';
  const phoneError = isIndia
    ? mobileError(phoneNumber)
    : /^\d{6,15}$/.test(phoneNumber) ? '' : 'Enter a valid phone number (digits only).';

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
        setPhoneNumber((profile.phone?.countryCode || '+91') === '+91' ? normalizeMobile(profile.phone?.number || '') : profile.phone?.number || '');
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
        const from = postLoginPath((location.state as any)?.from?.pathname);
        navigate(from, { replace: true });
      }, 1000);
    } catch {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneError) {
      setPhoneTouched(true);
      return;
    }
    setIsSavingProfile(true);
    try {
      const body = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        ...(displayName.trim() ? { displayName: displayName.trim() } : {}),
        phone: { countryCode: countryCode.replace(/\s/g, ''), number: phoneNumber },
        ...(avatarUrl.trim() ? { avatarUrl: avatarUrl.trim() } : {}),
      };
      const updated = await updateCustomerProfile(body);
      // Use what the backend saved; fall back to what was sent if the response is minimal
      completeProfile({
        name: profileDisplayName(updated) || profileDisplayName(body),
        phone: profilePhone(updated) || profilePhone(body),
        avatar: updated.avatarUrl || body.avatarUrl,
      });
      navigate('/account');
    } catch (err) {
      showToast(profileErrorMessage(err, 'Failed to update profile. Please try again.'), 'error');
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

            <div className="relative space-y-4" aria-busy={isLoadingProfile}>
              {/* Loading the saved profile (GET /customer/profile) */}
              {isLoadingProfile && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-allura-card/80 backdrop-blur-[1px] rounded-xl">
                  <Loader2 size={26} className="animate-spin text-allura-goldDark" />
                  <p className="text-xs font-sans text-allura-muted" aria-live="polite">Loading your profile…</p>
                </div>
              )}
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
                      inputMode="numeric"
                      autoComplete="tel-national"
                      value={phoneNumber}
                      onChange={e => setPhoneNumber(isIndia ? normalizeMobile(e.target.value) : e.target.value.replace(/\D/g, '').slice(0, 15))}
                      onBlur={() => setPhoneTouched(true)}
                      maxLength={isIndia ? 10 : 15}
                      placeholder={isIndia ? '10-digit mobile number' : 'Phone number'}
                      required
                      disabled={isLoadingProfile}
                      aria-invalid={phoneTouched && !!phoneError}
                      className={`w-full pl-10 pr-4 py-2.5 bg-allura-bg border rounded-xl text-xs font-sans text-allura-text focus:outline-none focus:border-allura-gold disabled:opacity-60 ${
                        phoneTouched && phoneError ? 'border-red-400' : 'border-allura-border'
                      }`}
                    />
                  </div>
                </div>
                {phoneTouched && phoneError && <p className="mt-1 text-[11px] text-red-600">{phoneError}</p>}
              </div>

              <div>
                <label className="block text-[11px] font-sans font-bold uppercase tracking-wider text-allura-muted mb-1">
                  Profile Image
                </label>
                <div className="flex items-center gap-3">
                  {avatarUrl && (
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-allura-border shrink-0 bg-allura-bg">
                      <img src={avatarUrl} alt="Avatar preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isLoadingProfile}
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = event => {
                          if (event.target?.result) {
                            setAvatarUrl(event.target.result as string);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="flex-1 w-full text-xs font-sans text-allura-text file:cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-allura-gold/10 file:text-allura-goldDark hover:file:bg-allura-gold/20 focus:outline-none disabled:opacity-60"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoadingProfile || isSavingProfile}
              className="w-full bg-allura-darkBrown hover:bg-allura-softBrown text-white py-3 rounded-xl text-xs font-sans font-bold tracking-widest uppercase transition-colors flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
            >
              {isSavingProfile && <Loader2 size={14} className="animate-spin" />}
              <span>{isSavingProfile ? 'Saving…' : isLoadingProfile ? 'Loading…' : 'Save & Continue to Boutique'}</span>
              {!isSavingProfile && !isLoadingProfile && <ArrowRight size={14} />}
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

            <div className="flex items-center my-4 before:flex-1 before:border-t before:border-allura-border/60 before:mr-3 after:flex-1 after:border-t after:border-allura-border/60 after:ml-3">
              <span className="text-[10px] font-sans uppercase tracking-widest text-allura-muted">Or</span>
            </div>

            <button
              type="button"
              onClick={() => handleGoogleLogin()}
              disabled={isLoading}
              className="w-full bg-white border border-allura-border hover:bg-gray-50 text-gray-800 py-3 rounded-xl text-xs font-sans font-bold tracking-widest uppercase transition-colors flex items-center justify-center gap-3 disabled:opacity-50 shadow-sm"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span>Continue with Google</span>
            </button>
            
            <div className="text-center pt-2 border-t border-allura-border/60 mt-4">
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
