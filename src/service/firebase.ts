// -----------------------------------------------------------------------------
// Firebase Cloud Messaging (push notifications). All config comes from env
// vars (see .env.example / README note). If any required VITE_FIREBASE_* var is
// missing, every function here silently no-ops — no crash, no console error,
// no toast. The bell inbox and the rest of the app work either way.
// -----------------------------------------------------------------------------

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const vapidKey: string | undefined = import.meta.env.VITE_FIREBASE_VAPID_KEY;

/** True if the current browser environment supports notifications, service workers, and push manager. */
export const isPushSupported = (): boolean =>
  typeof window !== 'undefined' &&
  'Notification' in window &&
  'serviceWorker' in navigator &&
  'PushManager' in window;

/** True only when required Firebase env vars are set and push is supported. */
export const isPushConfigured = (): boolean =>
  isPushSupported() &&
  !!firebaseConfig.apiKey &&
  !!firebaseConfig.projectId &&
  !!firebaseConfig.messagingSenderId &&
  !!firebaseConfig.appId &&
  !!vapidKey;

let messagingPromise: Promise<import('firebase/messaging').Messaging | null> | null = null;

/** Lazily initializes Firebase + Messaging. Only ever imports the SDK if push is actually configured. */
const getMessagingInstance = (): Promise<import('firebase/messaging').Messaging | null> => {
  if (!isPushConfigured()) return Promise.resolve(null);
  if (!messagingPromise) {
    messagingPromise = (async () => {
      try {
        const { initializeApp } = await import('firebase/app');
        const { getMessaging, isSupported } = await import('firebase/messaging');
        if (!(await isSupported())) return null;
        const app = initializeApp({
          apiKey: firebaseConfig.apiKey,
          projectId: firebaseConfig.projectId,
          messagingSenderId: firebaseConfig.messagingSenderId,
          appId: firebaseConfig.appId,
          ...(firebaseConfig.authDomain ? { authDomain: firebaseConfig.authDomain } : {}),
          ...(firebaseConfig.storageBucket ? { storageBucket: firebaseConfig.storageBucket } : {}),
        });
        return getMessaging(app);
      } catch (err) {
        console.warn('Firebase messaging unavailable:', err);
        return null;
      }
    })();
  }
  return messagingPromise;
};

/**
 * Requests notification permission (if not already decided) and returns a
 * fresh FCM token, or null if push isn't configured, isn't supported, or
 * permission is denied/dismissed. Never throws.
 */
export const requestPushToken = async (): Promise<string | null> => {
  if (!isPushConfigured() || !isPushSupported()) return null;
  try {
    if (!('Notification' in window)) return null;

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return null;
    }
    if (Notification.permission !== 'granted') return null;

    const messaging = await getMessagingInstance();
    if (!messaging) return null;

    const swParams = new URLSearchParams({
      apiKey: firebaseConfig.apiKey || '',
      projectId: firebaseConfig.projectId || '',
      messagingSenderId: firebaseConfig.messagingSenderId || '',
      appId: firebaseConfig.appId || '',
    });
    if (firebaseConfig.authDomain) swParams.set('authDomain', firebaseConfig.authDomain);
    if (firebaseConfig.storageBucket) swParams.set('storageBucket', firebaseConfig.storageBucket);

    const registration = await navigator.serviceWorker.register(
      `/firebase-messaging-sw.js?${swParams.toString()}`,
      { scope: '/' }
    );
    await navigator.serviceWorker.ready;
    const { getToken } = await import('firebase/messaging');
    return await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
  } catch (err) {
    console.warn('Could not get an FCM token:', err);
    return null;
  }
};

/**
 * Listens for pushes that arrive while the site is open in the foreground.
 * No-ops if push isn't configured. Returns an unsubscribe function with
 * safe cleanup protection for React StrictMode and remounts.
 */
export const onForegroundPush = (onMessageReceived: (payload: { title?: string; body?: string }) => void): (() => void) => {
  let isCancelled = false;
  let unsubscribe: (() => void) | undefined;

  getMessagingInstance().then((messaging) => {
    if (!messaging || isCancelled) return;
    import('firebase/messaging').then(({ onMessage }) => {
      if (isCancelled) return;
      unsubscribe = onMessage(messaging, (payload) => {
        onMessageReceived({ title: payload.notification?.title, body: payload.notification?.body });
      });
    });
  });

  return () => {
    isCancelled = true;
    if (unsubscribe) {
      unsubscribe();
    }
  };
};
