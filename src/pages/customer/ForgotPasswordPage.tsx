import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Loader2, MailCheck, ArrowLeft } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { AlluraLogo } from '../../components/common/AlluraLogo';
import { forgotPassword } from '../../service/auth';
import { getBackendErrorMessage } from '../../utils/apiResponse';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The backend deliberately answers the same way whether or not the account exists,
// so the confirmation must never say whether this email is registered.
const GENERIC_SUCCESS_MESSAGE =
  "If an account with that email exists, we've sent password reset instructions. Please check your inbox (and spam folder).";

export const ForgotPasswordPage: React.FC = () => {
  const { showToast } = useShop();
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const trimmedEmail = email.trim();
  const emailError = !trimmedEmail
    ? 'Please enter your email address.'
    : EMAIL_PATTERN.test(trimmedEmail) ? '' : 'Please enter a valid email address.';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setEmailTouched(true);
    setFormError('');
    if (emailError) return;

    setIsSubmitting(true);
    try {
      await forgotPassword(trimmedEmail);
      setIsSent(true);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 429) {
        setFormError('Too many attempts, please try again later.');
      } else if (status === 400) {
        setFormError(getBackendErrorMessage(err, 'Please enter a valid email address.'));
      } else {
        showToast(getBackendErrorMessage(err, 'Something went wrong. Please try again.'), 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="bg-allura-card border border-allura-border rounded-2xl w-full max-w-md p-6 sm:p-10 shadow-luxury text-center space-y-6 animate-slide-up">
        <div className="flex flex-col items-center space-y-2">
          <AlluraLogo size="md" variant="dark" />
          <span className="text-[10px] font-sans font-bold tracking-[0.25em] uppercase text-allura-goldDark">
            BOUTIQUE ATELIER & VIP CIRCLE
          </span>
        </div>

        {isSent ? (
          <div className="space-y-5" role="status" aria-live="polite">
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
              <MailCheck size={22} className="text-emerald-700" />
            </div>
            <h1 className="font-serif text-2xl text-allura-text font-normal">Check Your Email</h1>
            <p className="text-sm font-sans text-allura-muted leading-relaxed">{GENERIC_SUCCESS_MESSAGE}</p>
          </div>
        ) : (
          <div className="space-y-6 text-left">
            <div className="space-y-2 text-center">
              <h1 className="font-serif text-2xl sm:text-3xl text-allura-text font-normal">Forgot Password</h1>
              <p className="text-xs font-sans text-allura-muted leading-relaxed">
                Enter the email you use for your account and we'll send you instructions to reset your password.
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-4 pt-2">
              <div>
                <label
                  htmlFor="forgot-email"
                  className="block text-[11px] font-sans font-bold uppercase tracking-wider text-allura-muted mb-1"
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-allura-muted" />
                  <input
                    id="forgot-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    value={email}
                    onChange={e => { setEmail(e.target.value); setFormError(''); }}
                    onBlur={() => setEmailTouched(true)}
                    disabled={isSubmitting}
                    placeholder="user@example.com"
                    aria-invalid={emailTouched && !!emailError}
                    aria-describedby={emailTouched && emailError ? 'forgot-email-error' : undefined}
                    className={`w-full pl-10 pr-4 py-3 bg-allura-bg border rounded-xl text-base sm:text-sm font-sans text-allura-text focus:outline-none focus:border-allura-gold disabled:opacity-60 ${
                      emailTouched && emailError ? 'border-red-400' : 'border-allura-border'
                    }`}
                  />
                </div>
                {emailTouched && emailError && (
                  <p id="forgot-email-error" className="mt-1 text-[11px] text-red-600">{emailError}</p>
                )}
              </div>

              {formError && (
                <p role="alert" className="text-xs font-sans text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  {formError}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full min-h-12 bg-allura-darkBrown hover:bg-allura-softBrown text-white py-3 rounded-xl text-xs font-sans font-bold tracking-widest uppercase transition-colors flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
              >
                {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                <span>{isSubmitting ? 'Sending…' : 'Send Reset Instructions'}</span>
              </button>
            </form>
          </div>
        )}

        <div className="pt-2 border-t border-allura-border/60">
          <Link
            to="/auth/login"
            className="inline-flex items-center justify-center gap-1.5 min-h-11 px-3 text-xs font-sans text-allura-muted hover:text-allura-text transition-colors"
          >
            <ArrowLeft size={13} />
            <span>Back to login</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
