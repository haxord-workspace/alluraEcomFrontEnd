import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle2, ArrowRight, ShieldCheck, Phone, User } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { AlluraLogo } from '../../components/common/AlluraLogo';

export const AuthPage: React.FC = () => {
  const { customer, loginWithGoogle, completeProfile, logoutCustomer } = useShop();
  const navigate = useNavigate();
  const location = useLocation();

  const isCompleteProfile = location.pathname === '/auth/complete-profile';
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [name, setName] = useState(customer?.name || 'Ananya Menon');
  const [phone, setPhone] = useState(customer?.phone || '+91 98471 23456');
  const [city, setCity] = useState(customer?.addresses[0]?.city || 'Perinthalmanna');
  const [preferredSize, setPreferredSize] = useState(customer?.sizePreferences?.preferredSize || 'M');

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await loginWithGoogle();
      setIsSuccess(true);
      setTimeout(() => {
        setIsLoading(false);
        navigate('/account');
      }, 1000);
    } catch {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    completeProfile({
      name,
      phone,
      sizePreferences: {
        preferredSize,
      },
    });
    navigate('/account');
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
                Personalize your atelier experience and size preferences
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-sans font-bold uppercase tracking-wider text-allura-muted mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-allura-muted" />
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-allura-bg border border-allura-border rounded-xl text-xs font-sans text-allura-text focus:outline-none focus:border-allura-gold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-sans font-bold uppercase tracking-wider text-allura-muted mb-1">
                  WhatsApp Number
                </label>
                <div className="relative">
                  <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-allura-muted" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-allura-bg border border-allura-border rounded-xl text-xs font-sans text-allura-text focus:outline-none focus:border-allura-gold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-sans font-bold uppercase tracking-wider text-allura-muted mb-1">
                  Primary Boutique City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  className="w-full px-4 py-2.5 bg-allura-bg border border-allura-border rounded-xl text-xs font-sans text-allura-text focus:outline-none focus:border-allura-gold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-sans font-bold uppercase tracking-wider text-allura-muted mb-1">
                  Standard Sizing Preference
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {['XS', 'S', 'M', 'L', 'XL'].map(size => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setPreferredSize(size)}
                      className={`py-2 text-xs font-sans font-bold rounded-lg border transition-all ${
                        preferredSize === size
                          ? 'border-allura-gold bg-allura-gold/10 text-allura-goldDark'
                          : 'border-allura-border text-allura-muted hover:border-allura-darkBrown'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-allura-darkBrown hover:bg-allura-softBrown text-white py-3 rounded-xl text-xs font-sans font-bold tracking-widest uppercase transition-colors flex items-center justify-center gap-2 mt-4"
            >
              <span>Save & Continue to Boutique</span>
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
          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="font-serif text-2xl sm:text-3xl text-allura-text font-normal">
                Welcome to Allura
              </h1>
              <p className="text-xs font-sans text-allura-muted leading-relaxed">
                Sign in to view your orders, save curated wishlists, and connect with your personal boutique stylist.
              </p>
            </div>

            {/* Google Login Simulation Button */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full bg-white hover:bg-stone-50 border border-stone-300 text-stone-700 py-3 px-4 rounded-xl text-xs font-sans font-semibold transition-all duration-200 flex items-center justify-center gap-3 shadow-xs hover:shadow-md disabled:opacity-50 group"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2 text-allura-goldDark">
                    <span className="w-4 h-4 rounded-full border-2 border-allura-gold border-t-transparent animate-spin" />
                    <span>Verifying Google account...</span>
                  </div>
                ) : isSuccess ? (
                  <div className="flex items-center gap-2 text-emerald-700">
                    <CheckCircle2 size={16} />
                    <span>Authenticated Successfully!</span>
                  </div>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Continue with Google</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2 text-[10px] font-sans text-allura-muted justify-center pt-2">
                <ShieldCheck size={13} className="text-emerald-700" />
                <span>Encrypted & secure customer authentication</span>
              </div>
            </div>

            {/* Privacy note */}
            <p className="text-[11px] font-sans text-allura-muted/70 leading-relaxed border-t border-allura-border/60 pt-4">
              By proceeding, you agree to Allura Boutique’s{' '}
              <a href="/shipping-returns" className="underline hover:text-allura-text">Terms of Service</a> and{' '}
              <a href="/shipping-returns" className="underline hover:text-allura-text">Privacy Policy</a>.
            </p>
          </div>
        )}

      </div>
    </div>
  );
};
