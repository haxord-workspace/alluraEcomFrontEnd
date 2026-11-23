import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { CheckCircle2, ArrowRight, ShieldCheck, Phone, User, Mail, Lock, Unlock, Loader2 } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { AlluraLogo } from '../../components/common/AlluraLogo';
import { getCustomerProfile, updateCustomerProfile, profileDisplayName, profilePhone, profileErrorMessage } from '../../service/customer';
import {
  signUpRules,
  profileRules,
  normalizeEmail,
  type SignUpValues,
  type ProfileValues,
} from '../../utils/userValidation';
import { useFieldValidation } from '../../hooks/useFieldValidation';
import { FormField } from '../../components/common/FormField';
import { GoogleSignInButton } from '../../components/auth/GoogleSignInButton';

// Input ids, also used to focus the first invalid field on submit
const SIGN_UP_IDS: Record<keyof SignUpValues, string> = {
  name: 'signup-name',
  email: 'signup-email',
  phone: 'signup-phone',
  password: 'signup-password',
  confirmPassword: 'signup-confirm-password',
};
const PROFILE_IDS: Record<keyof ProfileValues, string> = {
  firstName: 'profile-first-name',
  lastName: 'profile-last-name',
  displayName: 'profile-display-name',
  countryCode: 'profile-country-code',
  phoneNumber: 'profile-phone-number',
};
// Backend validation paths -> form fields
const SIGN_UP_SERVER_FIELDS: Record<string, keyof SignUpValues> = {
  name: 'name',
  email: 'email',
  phone: 'phone',
  'phone.number': 'phone',
  password: 'password',
};
const PROFILE_SERVER_FIELDS: Record<string, keyof ProfileValues> = {
  firstName: 'firstName',
  lastName: 'lastName',
  displayName: 'displayName',
  'phone.countryCode': 'countryCode',
  'phone.number': 'phoneNumber',
  phone: 'phoneNumber',
};

const focusField = (id: string) => document.getElementById(id)?.focus();

// After signing in, go to the Home page, unless the customer was sent here from a specific page
// (e.g. checkout or wishlist), in which case return them there. The Account page and the auth
// pages themselves don't count, since that's just how people reach the login screen.
const postLoginPath = (from?: string) =>
  from && !from.startsWith('/auth') && from !== '/account' ? from : '/';

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
  const [authPhone, setAuthPhone] = useState('');
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

  // Shared validation (utils/userValidation) — sign-up only applies in register mode
  const signUp = useFieldValidation(signUpRules, {
    name: authName,
    email: authEmail,
    phone: authPhone,
    password: authPassword,
    confirmPassword: authConfirmPassword,
  });
  const profile = useFieldValidation(profileRules, { firstName, lastName, displayName, countryCode, phoneNumber });
  const signUpError = (field: keyof SignUpValues) => (isLoginMode ? '' : signUp.errorFor(field));

  // Prefill the edit-profile form from the real backend profile
  useEffect(() => {
    if (!isCompleteProfile && !customer) return;
    let cancelled = false;
    setIsLoadingProfile(true);
    getCustomerProfile()
      .then(profile => {
        if (cancelled) return;
        setFirstName(profile.firstName || '');
        setLastName(profile.lastName || '');
        setDisplayName(profile.displayName || '');
        setCountryCode('+91');
        const num = (profile.phone?.number || (customer?.phone ? customer.phone.replace('+91', '') : '')).replace(/\D/g, '').slice(0, 10);
        setPhoneNumber(num);
        setAvatarUrl(profile.avatarUrl || '');
      })
      .catch(() => {
        if (customer?.phone) {
          const num = customer.phone.replace('+91', '').trim().replace(/\D/g, '').slice(0, 10);
          setPhoneNumber(num);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingProfile(false);
      });
    return () => { cancelled = true; };
  }, [isCompleteProfile, customer]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    if (!isLoginMode) {
      // Includes the existing "passwords match" check, now shown under Confirm Password
      const firstInvalid = signUp.validateAll();
      if (firstInvalid) {
        focusField(SIGN_UP_IDS[firstInvalid]);
        return;
      }
    }
    setIsLoading(true);
    try {
      if (isLoginMode) {
        await loginUser({ email: authEmail, password: authPassword });
      } else {
        await registerUser({
          name: authName.trim(),
          email: normalizeEmail(authEmail),
          password: authPassword,
          phone: {
            countryCode: '+91',
            number: authPhone.replace(/\D/g, '').slice(0, 10),
          },
        });
      }
      setIsSuccess(true);
      setTimeout(() => {
        setIsLoading(false);
        const from = postLoginPath((location.state as any)?.from?.pathname);
        navigate(from, { replace: true });
      }, 1000);
    } catch (err) {
      // registerUser already shows the backend message as a toast; also put field errors under their fields
      if (!isLoginMode) {
        const field = signUp.applyServerErrors(err, SIGN_UP_SERVER_FIELDS);
        if (field) focusField(SIGN_UP_IDS[field]);
      }
      setIsLoading(false);
    }
  };

  const toggleAuthMode = () => {
    signUp.reset();
    setAuthPhone('');
    setIsLoginMode(!isLoginMode);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingProfile) return;
    const firstInvalid = profile.validateAll();
    if (firstInvalid) {
      focusField(PROFILE_IDS[firstInvalid]);
      return;
    }
    setIsSavingProfile(true);
    try {
      const cleanPhone = phoneNumber.replace(/\D/g, '').slice(0, 10);
      const body = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        ...(displayName.trim() ? { displayName: displayName.trim() } : {}),
        phone: { countryCode: '+91', number: cleanPhone },
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
      const field = profile.applyServerErrors(err, PROFILE_SERVER_FIELDS);
      if (field) focusField(PROFILE_IDS[field]);
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
          <form onSubmit={handleSaveProfile} noValidate className="space-y-5 text-left pt-2">
            <div className="text-center pb-2">
              <h1 className="font-serif text-2xl text-allura-text font-normal">
                {isCompleteProfile ? 'Edit Profile' : 'Complete Your Profile'}
              </h1>
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
                <FormField id={PROFILE_IDS.firstName} label="First Name" error={profile.errorFor('firstName')}>
                  {f => (
                    <div className="relative">
                      <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-allura-muted" />
                      <input
                        id={f.id}
                        type="text"
                        autoComplete="given-name"
                        value={firstName}
                        onChange={e => { setFirstName(e.target.value); profile.markChanged('firstName'); }}
                        onBlur={() => profile.touch('firstName')}
                        required
                        disabled={isLoadingProfile}
                        aria-invalid={f.invalid}
                        aria-describedby={f.describedBy}
                        className={`w-full pl-10 pr-4 py-2.5 bg-allura-bg border ${f.borderClass} rounded-xl text-xs font-sans text-allura-text focus:outline-none focus:border-allura-gold disabled:opacity-60`}
                      />
                    </div>
                  )}
                </FormField>
                <FormField id={PROFILE_IDS.lastName} label="Last Name" error={profile.errorFor('lastName')}>
                  {f => (
                    <input
                      id={f.id}
                      type="text"
                      autoComplete="family-name"
                      value={lastName}
                      onChange={e => { setLastName(e.target.value); profile.markChanged('lastName'); }}
                      onBlur={() => profile.touch('lastName')}
                      required
                      disabled={isLoadingProfile}
                      aria-invalid={f.invalid}
                      aria-describedby={f.describedBy}
                      className={`w-full px-4 py-2.5 bg-allura-bg border ${f.borderClass} rounded-xl text-xs font-sans text-allura-text focus:outline-none focus:border-allura-gold disabled:opacity-60`}
                    />
                  )}
                </FormField>
              </div>

              <FormField id={PROFILE_IDS.displayName} label="Display Name" error={profile.errorFor('displayName')}>
                {f => (
                  <input
                    id={f.id}
                    type="text"
                    value={displayName}
                    onChange={e => { setDisplayName(e.target.value); profile.markChanged('displayName'); }}
                    onBlur={() => profile.touch('displayName')}
                    placeholder="How you'd like to be addressed"
                    disabled={isLoadingProfile}
                    aria-invalid={f.invalid}
                    aria-describedby={f.describedBy}
                    className={`w-full px-4 py-2.5 bg-allura-bg border ${f.borderClass} rounded-xl text-xs font-sans text-allura-text focus:outline-none focus:border-allura-gold disabled:opacity-60`}
                  />
                )}
              </FormField>

              {/* Country code prefix (+91) + 10-digit mobile number */}
              <FormField
                id={PROFILE_IDS.phoneNumber}
                label="Mobile Number"
                error={profile.errorFor('phoneNumber')}
              >
                {f => {
                  const numberError = !!profile.errorFor('phoneNumber');
                  return (
                    <div className="flex gap-2">
                      <div className="flex items-center justify-center px-3 py-2.5 bg-allura-bgSecondary border border-allura-border rounded-xl text-xs font-sans font-medium text-allura-text select-none cursor-default shrink-0">
                        +91
                      </div>
                      <div className="relative flex-1">
                        <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-allura-muted pointer-events-none" />
                        <input
                          id={f.id}
                          type="tel"
                          inputMode="numeric"
                          autoComplete="tel-national"
                          value={phoneNumber}
                          onChange={e => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                            setPhoneNumber(val);
                            profile.markChanged('phoneNumber');
                          }}
                          onKeyDown={e => {
                            if (
                              !/^\d$/.test(e.key) &&
                              !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'].includes(e.key) &&
                              !e.ctrlKey && !e.metaKey
                            ) {
                              e.preventDefault();
                            }
                          }}
                          onBlur={() => profile.touch('phoneNumber')}
                          maxLength={10}
                          placeholder="10-digit mobile number"
                          required
                          disabled={isLoadingProfile}
                          aria-invalid={numberError}
                          aria-describedby={f.describedBy}
                          className={`w-full pl-10 pr-4 py-2.5 bg-allura-bg border rounded-xl text-xs font-sans text-allura-text focus:outline-none focus:border-allura-gold disabled:opacity-60 ${numberError ? 'border-red-400' : 'border-allura-border'
                            }`}
                        />
                      </div>
                    </div>
                  );
                }}
              </FormField>

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
              <span>{isSavingProfile ? 'Saving…' : isLoadingProfile ? 'Loading…' : isCompleteProfile ? 'Save Changes' : 'Save & Continue to Boutique'}</span>
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

            {/* Login keeps the browser's built-in checks; sign-up uses the shared inline validation */}
            <form onSubmit={handleAuthSubmit} noValidate={!isLoginMode} className="space-y-4 pt-2">
              {!isLoginMode && (
                <FormField id={SIGN_UP_IDS.name} label="Full Name" error={signUpError('name')}>
                  {f => (
                    <div className="relative">
                      <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-allura-muted" />
                      <input
                        id={f.id}
                        type="text"
                        autoComplete="name"
                        value={authName}
                        onChange={e => { setAuthName(e.target.value); signUp.markChanged('name'); }}
                        onBlur={() => signUp.touch('name')}
                        required
                        placeholder="Full Name"
                        aria-invalid={f.invalid}
                        aria-describedby={f.describedBy}
                        className={`w-full pl-10 pr-4 py-2.5 bg-allura-bg border ${f.borderClass} rounded-xl text-xs font-sans text-allura-text focus:outline-none focus:border-allura-gold`}
                      />
                    </div>
                  )}
                </FormField>
              )}

              <FormField id={SIGN_UP_IDS.email} label="Email Address" error={signUpError('email')}>
                {f => (
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-allura-muted" />
                    <input
                      id={f.id}
                      type="email"
                      value={authEmail}
                      onChange={e => { setAuthEmail(e.target.value); signUp.markChanged('email'); }}
                      onBlur={() => { if (!isLoginMode) signUp.touch('email'); }}
                      required
                      placeholder="user@example.com"
                      aria-invalid={f.invalid}
                      aria-describedby={f.describedBy}
                      className={`w-full pl-10 pr-4 py-2.5 bg-allura-bg border ${f.borderClass} rounded-xl text-xs font-sans text-allura-text focus:outline-none focus:border-allura-gold`}
                    />
                  </div>
                )}
              </FormField>

              {!isLoginMode && (
                <FormField id={SIGN_UP_IDS.phone} label="Mobile Number" error={signUpError('phone')}>
                  {f => (
                    <div className="flex gap-2">
                      <div className="flex items-center justify-center px-3 py-2.5 bg-allura-bgSecondary border border-allura-border rounded-xl text-xs font-sans font-medium text-allura-text select-none cursor-default shrink-0">
                        +91
                      </div>
                      <div className="relative flex-1">
                        <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-allura-muted pointer-events-none" />
                        <input
                          id={f.id}
                          type="tel"
                          inputMode="numeric"
                          autoComplete="tel-national"
                          value={authPhone}
                          onChange={e => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                            setAuthPhone(val);
                            signUp.markChanged('phone');
                          }}
                          onKeyDown={e => {
                            if (
                              !/^\d$/.test(e.key) &&
                              !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'].includes(e.key) &&
                              !e.ctrlKey && !e.metaKey
                            ) {
                              e.preventDefault();
                            }
                          }}
                          onBlur={() => signUp.touch('phone')}
                          maxLength={10}
                          placeholder="10-digit mobile number"
                          required
                          aria-invalid={f.invalid}
                          aria-describedby={f.describedBy}
                          className={`w-full pl-10 pr-4 py-2.5 bg-allura-bg border ${f.borderClass} rounded-xl text-xs font-sans text-allura-text focus:outline-none focus:border-allura-gold`}
                        />
                      </div>
                    </div>
                  )}
                </FormField>
              )}

              <div>
                <FormField id={SIGN_UP_IDS.password} label="Password" error={signUpError('password')}>
                  {f => (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-allura-muted hover:text-allura-text focus:outline-none"
                      >
                        {showPassword ? <Unlock size={15} /> : <Lock size={15} />}
                      </button>
                      <input
                        id={f.id}
                        type={showPassword ? 'text' : 'password'}
                        value={authPassword}
                        onChange={e => { setAuthPassword(e.target.value); signUp.markChanged('password'); }}
                        onBlur={() => { if (!isLoginMode) signUp.touch('password'); }}
                        required
                        placeholder="••••••••"
                        aria-invalid={f.invalid}
                        aria-describedby={f.describedBy}
                        className={`w-full pl-10 pr-4 py-2.5 bg-allura-bg border ${f.borderClass} rounded-xl text-xs font-sans text-allura-text focus:outline-none focus:border-allura-gold`}
                      />
                    </div>
                  )}
                </FormField>
                {isLoginMode && (
                  <div className="flex justify-end mt-1">
                    <Link
                      to="/forgot-password"
                      className="py-1 text-[11px] font-sans text-allura-muted hover:text-allura-text transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </div>
                )}
              </div>

              {!isLoginMode && (
                <FormField id={SIGN_UP_IDS.confirmPassword} label="Confirm Password" error={signUpError('confirmPassword')}>
                  {f => (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-allura-muted hover:text-allura-text focus:outline-none"
                      >
                        {showConfirmPassword ? <Unlock size={15} /> : <Lock size={15} />}
                      </button>
                      <input
                        id={f.id}
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={authConfirmPassword}
                        onChange={e => { setAuthConfirmPassword(e.target.value); signUp.markChanged('confirmPassword'); }}
                        onBlur={() => signUp.touch('confirmPassword')}
                        required
                        placeholder="••••••••"
                        aria-invalid={f.invalid}
                        aria-describedby={f.describedBy}
                        className={`w-full pl-10 pr-4 py-2.5 bg-allura-bg border ${f.borderClass} rounded-xl text-xs font-sans text-allura-text focus:outline-none focus:border-allura-gold`}
                      />
                    </div>
                  )}
                </FormField>
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

            <GoogleSignInButton />

            <div className="text-center pt-2 border-t border-allura-border/60 mt-4">
              <button
                type="button"
                onClick={toggleAuthMode}
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
