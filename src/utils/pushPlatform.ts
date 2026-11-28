/**
 * Platform, device detection, and Web Push capability helpers for Allura Boutique.
 * Ensures strict compliance with backend device-token requirements:
 * - platform: 'IOS' | 'ANDROID' | 'WEB'
 * - deviceId: persistent unique identifier
 */

export type PushPlatform = 'IOS' | 'ANDROID' | 'WEB';

const DEVICE_ID_KEY = 'allura_device_id';

/**
 * Accurately detects whether the current environment is a real iOS / iPadOS device
 * (iPhone, iPad, or iPod running Safari or an eligible iOS WebKit browser).
 *
 * Strictly excludes:
 * - Desktop Chrome
 * - Desktop Chrome mobile emulation (DevTools Responsive mode or device presets)
 * - Android devices
 * - Desktop Safari on macOS
 */
export const isIOSDevice = (): boolean => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;

  // 1. Android devices are never iOS
  if (/Android/i.test(navigator.userAgent)) return false;

  // 2. Desktop Chrome and Desktop Chrome mobile emulation:
  // In Chrome (including DevTools mobile emulation with iPhone user agent or responsive mode),
  // navigator.vendor is 'Google Inc.' and window.chrome is present.
  // Real iOS devices run Apple WebKit where navigator.vendor is 'Apple Computer, Inc.'
  // and window.chrome is undefined.
  const isChromium =
    navigator.vendor === 'Google Inc.' ||
    typeof (window as unknown as { chrome?: unknown }).chrome !== 'undefined';

  if (isChromium) {
    return false;
  }

  // 3. Real iPhone, iPod, or iPad (via userAgent)
  const isIOSUserAgent = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  // 4. Real iPadOS desktop-class browser (MacIntel with touch support, running purely Apple WebKit)
  const isIPadOS =
    navigator.platform === 'MacIntel' &&
    navigator.maxTouchPoints > 1 &&
    navigator.vendor === 'Apple Computer, Inc.' &&
    !(window as unknown as { MSStream?: unknown }).MSStream;

  return isIOSUserAgent || isIPadOS;
};

/** Alias for backward compatibility */
export const isIOS = isIOSDevice;

/**
 * Checks if the current browser is running on Android.
 */
export const isAndroid = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
};

/**
 * Returns the exact platform expected by POST /notifications/device-tokens:
 * 'IOS' | 'ANDROID' | 'WEB'
 */
export const getDevicePlatform = (): PushPlatform => {
  if (isIOSDevice()) return 'IOS';
  if (isAndroid()) return 'ANDROID';
  return 'WEB';
};

/**
 * Checks whether the application is running as an installed standalone PWA.
 * Critical for iOS 16.4+, where Web Push is exclusively permitted in standalone mode.
 */
export const isInstalledPWA = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
};

/** Alias for backward compatibility */
export const isStandalonePWA = isInstalledPWA;

/**
 * Parses iOS major and minor version numbers from the user agent.
 * Web Push requires iOS/iPadOS 16.4 or later.
 */
export const getIOSVersion = (): { major: number; minor: number } | null => {
  if (typeof navigator === 'undefined') return null;
  const match = navigator.userAgent.match(/OS (\d+)[_.](\d+)/);
  if (match) {
    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
    };
  }
  return null;
};

/**
 * Checks if the iOS version meets the minimum requirement (16.4+) for Web Push.
 */
export const isIOSWebPushVersionSupported = (): boolean => {
  const version = getIOSVersion();
  if (!version) return true; // Default to true if undetectable to avoid blocking modern devices
  if (version.major > 16) return true;
  if (version.major === 16) return version.minor >= 4;
  return false;
};

/**
 * Retrieves or generates a persistent device ID stored in localStorage.
 * Ensures consistent device registrations across sessions.
 */
export const getOrCreateDeviceId = (): string => {
  if (typeof window === 'undefined') return 'server_render_device';
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;

    const newId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : 'dev_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now().toString(36);

    localStorage.setItem(DEVICE_ID_KEY, newId);
    return newId;
  } catch {
    return 'fallback_device_id';
  }
};

export type PushCapabilityStatus =
  | 'unsupported'
  | 'ios_not_pwa'
  | 'ios_version_unsupported'
  | 'denied'
  | 'granted'
  | 'default';

/**
 * Evaluates the full push capability for the current environment.
 * Evaluates iOS PWA requirements strictly when the device is an eligible iOS environment.
 */
export const getPushCapabilityStatus = (): PushCapabilityStatus => {
  if (typeof window === 'undefined') return 'unsupported';

  // 1. If on a real iOS/iPadOS device
  if (isIOSDevice()) {
    if (!isIOSWebPushVersionSupported()) {
      return 'ios_version_unsupported';
    }
    if (!isInstalledPWA()) {
      return 'ios_not_pwa';
    }
  }

  // 2. Feature checks for Web Push (Desktop Chrome, Android Chrome, Installed iOS PWA, etc.)
  const hasPushAPIs =
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window;

  if (!hasPushAPIs) {
    return 'unsupported';
  }

  // 3. Return native permission state
  return Notification.permission;
};
