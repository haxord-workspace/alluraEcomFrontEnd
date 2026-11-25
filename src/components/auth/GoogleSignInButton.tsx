import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import axios from 'axios';
import { Loader2 } from 'lucide-react';
import api, { storeCustomerTokens } from '../../service/api';
import { useShop } from '../../context/ShopContext';
import { useAppDispatch } from '../../store/hooks';
import { fetchCustomerProfile } from '../../store/slices/authSlice';
import type { CustomerProfile } from '../../types';
import { hasPendingShopAction } from '../../utils/pendingShopAction';

// After signing in, go to the Home page, unless the customer was sent here from a specific page
// (e.g. checkout or wishlist), in which case return them there. The Account page and the auth
// pages themselves don't count, since that's just how people reach the login screen.
const getPostLoginRedirect = (from?: string): string =>
  from && !from.startsWith('/auth') && from !== '/account' ? from : '/';

export interface GoogleSignInButtonProps {
  redirectTo?: string;
  onSuccess?: () => void;
  className?: string;
}

interface GoogleAuthResponse {
  success: boolean;
  message: string;
  data: {
    accessToken: string;
    refreshToken: string;
  };
}

interface MeResponse {
  success?: boolean;
  data?: {
    user?: any;
    [key: string]: any;
  };
  user?: any;
  [key: string]: any;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  redirectTo,
  onSuccess,
  className = '',
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { setCustomer, showToast } = useShop();

  const handleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      setError('Google sign-in failed. Please try again.');
      return;
    }

    setIsLoading(true);
    setError(null);
    // Checked before signing in: ShopContext finishes a pending Add to Bag / Buy Now and navigates itself
    const resumesShopAction = hasPendingShopAction();

    try {
      // 1. Call POST /auth/google with body { credential: response.credential }
      const res = await api.post<GoogleAuthResponse>('/auth/google', {
        credential: credentialResponse.credential,
      });

      // 2. Save tokens using the exact same storage logic as email login
      storeCustomerTokens(res.data);

      // 3. Load current user via GET /auth/me the same way email login does
      let userProfile: CustomerProfile;
      try {
        const meRes = await api.get<MeResponse>('/auth/me');
        const rawUser =
          meRes.data?.data?.user ||
          meRes.data?.user ||
          meRes.data?.data ||
          meRes.data ||
          {};
        const profile = rawUser.profile || {};
        const name =
          profile.displayName ||
          [profile.firstName, profile.lastName].filter(Boolean).join(' ') ||
          rawUser.name ||
          rawUser.email?.split('@')[0] ||
          'Customer';

        userProfile = {
          id: rawUser._id || rawUser.id || `usr-${Date.now()}`,
          name,
          email: rawUser.email || '',
          phone:
            rawUser.phone?.number ||
            (typeof rawUser.phone === 'string' ? rawUser.phone : '') ||
            '',
          addresses: rawUser.addresses || [],
          avatar: profile.avatarUrl || rawUser.avatarUrl,
          isCircleMember: !!rawUser.isCircleMember,
        };
      } catch {
        userProfile = {
          id: `usr-${Date.now()}`,
          name: 'Google User',
          email: '',
          phone: '',
          addresses: [],
          isCircleMember: false,
        };
      }

      // Update Redux state
      dispatch(fetchCustomerProfile());

      // Update ShopContext state
      setCustomer(userProfile);
      showToast(`Welcome back, ${userProfile.name}`, 'gold');

      // 4. Navigate to destination
      if (onSuccess) {
        onSuccess();
      } else if (resumesShopAction) {
        // ShopContext navigates to the bag / checkout once the action completes
      } else if (redirectTo) {
        navigate(redirectTo, { replace: true });
      } else {
        const from = (location.state as { from?: { pathname?: string } })?.from?.pathname;
        navigate(getPostLoginRedirect(from), { replace: true });
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 403) {
          setError('Your account is not active. Please contact support.');
        } else if (status === 429) {
          setError('Too many attempts. Please wait a few minutes and try again.');
        } else {
          setError('Google sign-in failed. Please try again.');
        }
      } else {
        setError('Google sign-in failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleError = () => {
    setError('Google sign-in was cancelled or failed.');
  };

  return (
    <div className={`w-full flex flex-col items-center ${className}`}>
      <div
        className={`w-full flex justify-center ${
          isLoading ? 'pointer-events-none opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={handleError}
          text="continue_with"
          shape="rectangular"
          width="100%"
        />
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 mt-2 text-xs text-allura-muted">
          <Loader2 size={14} className="animate-spin text-allura-goldDark" />
          <span>Signing in with Google…</span>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500 font-sans mt-2 text-center" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default GoogleSignInButton;
