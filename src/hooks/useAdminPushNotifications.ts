import { useCallback, useEffect, useRef, useState } from 'react';
import { isPushConfigured, isPushSupported, requestPushToken, onForegroundPush } from '../service/firebase';
import { registerDeviceToken } from '../service/notifications';
import { getDevicePlatform, getOrCreateDeviceId } from '../utils/pushPlatform';

type PermissionState = NotificationPermission | 'unsupported';

const LAST_TOKEN_KEY = 'allura_admin_fcm_token';

// Module-level so concurrent hook instances (e.g. StrictMode double-mount)
// never fire two registration requests at once.
let registrationInFlight: Promise<void> | null = null;

const readPermission = (): PermissionState => (isPushSupported() ? Notification.permission : 'unsupported');

const registerIfNewToken = async (token: string): Promise<void> => {
  let lastToken: string | null = null;
  try {
    lastToken = localStorage.getItem(LAST_TOKEN_KEY);
  } catch {
    // ignore storage errors
  }
  if (lastToken === token) return;
  await registerDeviceToken({
    token,
    platform: getDevicePlatform(),
    deviceId: getOrCreateDeviceId(),
  });
  try {
    localStorage.setItem(LAST_TOKEN_KEY, token);
  } catch {
    // ignore storage errors
  }
};

/**
 * Admin-side FCM permission + registration flow. Reuses the existing
 * `src/service/firebase.ts` token/messaging plumbing and the existing
 * `registerDeviceToken` endpoint — this hook only adds permission-state
 * awareness and de-duplication on top of them.
 */
export const useAdminPushNotifications = (enabled: boolean) => {
  const [permission, setPermission] = useState<PermissionState>(readPermission);

  const refreshPermission = useCallback(() => {
    setPermission(readPermission());
  }, []);

  const registerToken = useCallback(async () => {
    if (!enabled || !isPushConfigured() || readPermission() !== 'granted') return;
    if (registrationInFlight) return registrationInFlight;
    registrationInFlight = (async () => {
      try {
        const token = await requestPushToken();
        if (!token) return;
        await registerIfNewToken(token);
      } catch (err) {
        console.warn('Admin FCM registration failed:', err);
      } finally {
        registrationInFlight = null;
      }
    })();
    return registrationInFlight;
  }, [enabled]);

  // Case C (granted): silently ensure a token is registered, once per mount.
  useEffect(() => {
    if (enabled && readPermission() === 'granted') {
      registerToken();
    }
  }, [enabled, registerToken]);

  // Browsers never let a denied permission flip back to granted from JS —
  // the admin has to change it via site settings and return to the tab.
  // Recheck on focus/visibility so we notice that and register automatically.
  const lastKnownPermission = useRef(permission);
  useEffect(() => {
    lastKnownPermission.current = permission;
  }, [permission]);

  useEffect(() => {
    if (!enabled) return;
    const recheck = () => {
      if (document.visibilityState !== 'visible') return;
      const next = readPermission();
      if (next !== lastKnownPermission.current) {
        setPermission(next);
        if (next === 'granted') registerToken();
      }
    };
    document.addEventListener('visibilitychange', recheck);
    return () => {
      document.removeEventListener('visibilitychange', recheck);
    };
  }, [enabled, registerToken]);

  // Case A (default): explicit, user-gesture-triggered request. Resolves to
  // the resulting permission state so the caller can react (e.g. close a
  // modal, or show the "blocked" instructions if the admin just denied it).
  const requestAndRegister = useCallback(async (): Promise<PermissionState> => {
    if (!enabled || !isPushConfigured()) return readPermission();
    try {
      const token = await requestPushToken(); // requests permission internally if 'default'
      if (token) await registerIfNewToken(token);
    } catch (err) {
      console.warn('Admin FCM permission/registration failed:', err);
    }
    const next = readPermission();
    setPermission(next);
    return next;
  }, [enabled]);

  // Foreground push: reuse the existing onMessage wiring and surface it as a
  // native browser notification (the SW's onBackgroundMessage already covers
  // the tab-closed/backgrounded case for service-worker-capable browsers).
  useEffect(() => {
    if (!enabled || !isPushConfigured()) return;
    const unsubscribe = onForegroundPush((payload) => {
      if (readPermission() !== 'granted') return;
      try {
        new Notification(payload.title || 'New notification', { body: payload.body });
      } catch {
        // ignore — non-critical
      }
    });
    return unsubscribe;
  }, [enabled]);

  return { permission, refreshPermission, requestAndRegister };
};
