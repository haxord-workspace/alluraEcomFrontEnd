import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Eye, EyeOff, Loader2, ArrowLeft, AlertTriangle } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { AlluraLogo } from '../../components/common/AlluraLogo';
import { resetPassword } from '../../service/auth';
import { clearCustomerTokens, hasCustomerSession, CUSTOMER_SESSION_EXPIRED_EVENT } from '../../service/api';
import { getBackendErrorMessage, getBackendSuccessMessage } from '../../utils/apiResponse';

const MIN_PASSWORD_LENGTH = 8;

const isInvalidTokenError = (err: any): boolean => {
  const data = err?.response?.data;
  return err?.response?.status === 400 && (data?.error?.code === 'INVALID_RESET_TOKEN' || data?.code === 'INVALID_RESET_TOKEN');
};

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  visible: boolean;
  onToggleVisible: () => void;
  error?: string;
  disabled?: boolean;
}

const PasswordField: React.FC<PasswordFieldProps> = ({ id, label, value, onChange, onBlur, visible, onToggleVisible, error, disabled }) => (
  <div>
    <label htmlFor={id} className="block text-[11px] font-sans font-bold uppercase tracking-wider text-allura-muted mb-1">
      {label}
    </label>
    <div className="relative">
      <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-allura-muted" />
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        autoComplete="new-password"
        autoCapitalize="none"
        spellCheck={false}
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={onBlur}
        disabled={disabled}
        placeholder="••••••••"
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`w-full pl-10 pr-12 py-3 bg-allura-bg border rounded-xl text-base sm:text-sm font-sans text-allura-text focus:outline-none focus:border-allura-gold disabled:opacity-60 ${
          error ? 'border-red-400' : 'border-allura-border'
        }`}
      />
      <button
        type="button"
        onClick={onToggleVisible}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-allura-muted hover:text-allura-text focus:outline-none"
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
    {error && <p id={`${id}-error`} className="mt-1 text-[11px] text-red-600">{error}</p>}
  </div>
);

export const ResetPasswordPage: React.FC = () => {
  const { showToast } = useShop();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Read the token once and keep it only in component state (never rendered or logged)
  const [token] = useState(() => searchParams.get('token')?.trim() || '');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [touched, setTouched] = useState({ newPassword: false, confirmPassword: false });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTokenRejected, setIsTokenRejected] = useState(false);

  // Remove the token from the address bar / history so it isn't left in the browser URL.
  // This runs before the app-level page-view tracking effect, so analytics see the clean URL.
  useEffect(() => {
    if (searchParams.has('token')) {
      const rest = new URLSearchParams(searchParams);
      rest.delete('token');
      const search = rest.toString();
      navigate({ pathname: location.pathname, search: search ? `?${search}` : '' }, { replace: true });
    }
    // Only on mount: the token has already been captured in state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const newPasswordError = !newPassword
    ? 'Please enter a new password.'
    : newPassword.length < MIN_PASSWORD_LENGTH ? `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` : '';
  const confirmPasswordError = !confirmPassword
    ? 'Please confirm your new password.'
    : confirmPassword !== newPassword ? 'Passwords do not match.' : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setTouched({ newPassword: true, confirmPassword: true });
    setFormError('');
    if (newPasswordError || confirmPasswordError) return;

    setIsSubmitting(true);
    try {
      const response = await resetPassword(token, newPassword);
      // The backend revokes every session for this account, so drop any session held on this device too
      if (hasCustomerSession()) {
        clearCustomerTokens();
        window.dispatchEvent(new Event(CUSTOMER_SESSION_EXPIRED_EVENT));
      }
      setNewPassword('');
      setConfirmPassword('');
      showToast(
        getBackendSuccessMessage(response, 'Password has been reset successfully. Please log in with your new password.'),
        'success'
      );
      navigate('/auth/login', { replace: true });
    } catch (err: any) {
      if (isInvalidTokenError(err)) {
        setIsTokenRejected(true);
      } else if (err?.response?.status === 400) {
        setFormError(getBackendErrorMessage(err, 'Please choose a different password.'));
      } else if (err?.response?.status === 429) {
        setFormError('Too many attempts, please try again later.');
      } else {
        showToast(getBackendErrorMessage(err, 'Something went wrong. Please try again.'), 'error');
      }
      setIsSubmitting(false);
    }
  };

  const showInvalidLink = !token || isTokenRejected;

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="bg-allura-card border border-allura-border rounded-2xl w-full max-w-md p-6 sm:p-10 shadow-luxury text-center space-y-6 animate-slide-up">
        <div className="flex flex-col items-center space-y-2">
          <AlluraLogo size="md" variant="dark" />
          <span className="text-[10px] font-sans font-bold tracking-[0.25em] uppercase text-allura-goldDark">
            BOUTIQUE ATELIER & VIP CIRCLE
          </span>
        </div>

        {showInvalidLink ? (
          <div className="space-y-5" role="alert">
            <div className="mx-auto w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center">
              <AlertTriangle size={22} className="text-amber-700" />
            </div>
            <h1 className="font-serif text-2xl text-allura-text font-normal">
              {isTokenRejected ? 'Link Expired' : 'Invalid Link'}
            </h1>
            <p className="text-sm font-sans text-allura-muted leading-relaxed">
              {isTokenRejected
                ? 'This reset link is invalid or has expired. Please request a new one.'
                : 'This reset link is invalid.'}
            </p>
            <Link
              to="/forgot-password"
              className="w-full min-h-12 bg-allura-darkBrown hover:bg-allura-softBrown text-white py-3 rounded-xl text-xs font-sans font-bold tracking-widest uppercase transition-colors flex items-center justify-center"
            >
              Request a New Link
            </Link>
          </div>
        ) : (
          <div className="space-y-6 text-left">
            <div className="space-y-2 text-center">
              <h1 className="font-serif text-2xl sm:text-3xl text-allura-text font-normal">Reset Password</h1>
              <p className="text-xs font-sans text-allura-muted leading-relaxed">
                Choose a new password for your account.
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-4 pt-2">
              <PasswordField
                id="reset-new-password"
                label="New Password"
                value={newPassword}
                onChange={v => { setNewPassword(v); setFormError(''); }}
                onBlur={() => setTouched(t => ({ ...t, newPassword: true }))}
                visible={showNew}
                onToggleVisible={() => setShowNew(v => !v)}
                error={touched.newPassword ? newPasswordError : ''}
                disabled={isSubmitting}
              />
              <PasswordField
                id="reset-confirm-password"
                label="Confirm Password"
                value={confirmPassword}
                onChange={v => { setConfirmPassword(v); setFormError(''); }}
                onBlur={() => setTouched(t => ({ ...t, confirmPassword: true }))}
                visible={showConfirm}
                onToggleVisible={() => setShowConfirm(v => !v)}
                error={touched.confirmPassword ? confirmPasswordError : ''}
                disabled={isSubmitting}
              />

              <p className="text-[11px] font-sans text-allura-muted">
                At least {MIN_PASSWORD_LENGTH} characters. This link expires 60 minutes after it was requested.
              </p>

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
                <span>{isSubmitting ? 'Resetting…' : 'Reset Password'}</span>
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
