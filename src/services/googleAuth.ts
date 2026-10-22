import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Reuse existing app instance if already initialized
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const GOOGLE_WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

const provider = new GoogleAuthProvider();
GOOGLE_WORKSPACE_SCOPES.forEach((scope) => {
  provider.addScope(scope);
});
// Request offline access prompt when needed
provider.setCustomParameters({
  prompt: 'select_account',
});

// Flag to track ongoing sign-in flow
let isSigningIn = false;
// In-memory cache for access token (never stored in localStorage/sessionStorage as required)
let cachedAccessToken: string | null = null;
let cachedUser: User | null = null;

export interface GoogleAuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

type AuthCallback = (user: User | null, token: string | null) => void;
const authListeners: Set<AuthCallback> = new Set();

const notifyListeners = (user: User | null, token: string | null) => {
  authListeners.forEach((callback) => {
    try {
      callback(user, token);
    } catch (e) {
      console.error('Error in auth listener:', e);
    }
  });
};

/**
 * Initialize auth state listener.
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
): (() => void) => {
  const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
    cachedUser = user;
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
        notifyListeners(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // User is logged into Firebase Auth, but in-memory OAuth token is not cached yet (e.g. page refresh)
        // Note: Google Workspace API calls require the OAuth access token from signInWithPopup
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
        notifyListeners(user, null);
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
      notifyListeners(null, null);
    }
  });

  return unsubscribe;
};

export const subscribeToAuth = (callback: AuthCallback): (() => void) => {
  authListeners.add(callback);
  // Initial fire with current state
  callback(cachedUser, cachedAccessToken);
  return () => {
    authListeners.delete(callback);
  };
};

/**
 * Initiates Google sign-in popup with Google Sheets and Google Drive scopes
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Không thể lấy mã truy cập Google OAuth từ Firebase Auth');
    }

    cachedAccessToken = credential.accessToken;
    cachedUser = result.user;
    notifyListeners(result.user, cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Lỗi đăng nhập Google Workspace:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Gets currently cached in-memory access token
 */
export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

/**
 * Returns current user
 */
export const getCurrentUser = (): User | null => {
  return cachedUser || auth.currentUser;
};

/**
 * Signs out from Firebase and clears in-memory token
 */
export const googleSignOut = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
  cachedUser = null;
  notifyListeners(null, null);
};
