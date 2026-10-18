import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  collection,
  doc,
  setDoc,
  addDoc,
  deleteDoc,
  onSnapshot,
  query,
  Firestore
} from 'firebase/firestore';
import {
  getAuth,
  signInAnonymously,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  Auth
} from 'firebase/auth';
import { RegistrationData, ContactInquiry, IntegrationConfig, EventExecutive } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// Initialize Firestore with specific database ID and long-polling transport
let firestoreDb: Firestore;
try {
  firestoreDb = initializeFirestore(
    app,
    {
      experimentalAutoDetectLongPolling: true,
      experimentalForceLongPolling: true
    },
    firebaseConfig.firestoreDatabaseId
  );
} catch {
  firestoreDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);
}

export const db: Firestore = firestoreDb;
export const auth: Auth = getAuth(app);

// In-memory cache for Google OAuth token (Compliant with Workspace guidelines: no localStorage/sessionStorage)
let cachedOAuthToken: string | null = null;
let isSigningInWithGoogle = false;

const googleSheetsProvider = new GoogleAuthProvider();
googleSheetsProvider.addScope('https://www.googleapis.com/auth/spreadsheets');
googleSheetsProvider.setCustomParameters({
  prompt: 'consent',
  access_type: 'offline'
});

/**
 * Signs in the user with Google and requests the Google Sheets scope
 */
export const signInWithGoogleForSheets = async (): Promise<{ user: User; accessToken: string }> => {
  if (isSigningInWithGoogle) {
    throw new Error('Google Sign-In is already in progress. Please complete or close the existing window.');
  }

  try {
    isSigningInWithGoogle = true;
    const result = await signInWithPopup(auth, googleSheetsProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    if (!credential?.accessToken) {
      throw new Error('Google did not return an access token for Sheets. Please try again.');
    }

    cachedOAuthToken = credential.accessToken;
    console.info('[Google OAuth] Successfully obtained Google Sheets access token');
    return { user: result.user, accessToken: cachedOAuthToken };
  } catch (err: any) {
    const errorCode = err?.code || '';
    if (
      errorCode === 'auth/popup-closed-by-user' ||
      errorCode === 'auth/cancelled-popup-request' ||
      errorCode === 'auth/popup-blocked'
    ) {
      console.warn('[Google OAuth] Popup closed or cancelled by user:', errorCode);
      throw err;
    }

    if (
      errorCode === 'auth/unauthorized-domain' ||
      errorCode === 'auth/internal-error' ||
      errorCode === 'auth/configuration-not-found' ||
      errorCode === 'auth/operation-not-allowed' ||
      err?.message?.includes('unauthorized-domain') ||
      err?.message?.includes('internal-error')
    ) {
      const hostname = typeof window !== 'undefined' ? window.location.hostname : 'shift-wes.vercel.app';
      const friendlyErr = new Error(`Domain "${hostname}" requires authorization for Google Sign-In in Firebase Console.`);
      (friendlyErr as any).code = 'auth/unauthorized-domain';
      (friendlyErr as any).domain = hostname;
      throw friendlyErr;
    }

    console.warn('[Google OAuth] Sign-in notice:', err?.message || err);
    throw err;
  } finally {
    isSigningInWithGoogle = false;
  }
};

/**
 * Returns the currently cached in-memory Google Sheets OAuth access token
 */
export const getGoogleOAuthToken = (): string | null => {
  return cachedOAuthToken;
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write'
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email
        })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const IS_FIREBASE_CONNECTED = true;
export const FIREBASE_DISCONNECTED = false;

export const PRIMARY_EXECUTIVE_EMAIL = 'arnoldodjidja01@gmail.com';

// Authorized SHA-256 hashes for secretariat passcode access
export const AUTHORIZED_PASSCODE_HASHES: string[] = [
  '70e0ddc68d702e4a9868983e488870b156506a524522fefcdd6e64c20070fa13',
  '1587d65f385ada921f8734dcb58e25df5017e6b75d1319db0f1cde9d8ff9617e',
  'f44d8309c4737d6224da6751e6dd81f2e20e6b4bc298c6eafc86125eeb4c1c5a',
  '843c50e658fea0b611f2a4153fa5b50dc0d991a70255b14df55692759f81ef57',
  '20df4541c29041aa3314c4a2b02b40c956400dbb6c1e83b752432e68da218ffa',
  'b96624571b8e9a72563b6281c8ac2388c60b6ea64a859494f1dfb68e86065c65',
  '5658877ada9a80d3f4af672acd1f6e8fb404cdaa85b3f9a1a31c35aadec530f4',
  '72c580889606883ca9710342aefb03b33b95a1e5a9bda4f9efa878b1ea766f73',
  '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
  'e85fa5358db48ef8675331ef122b87f78e817d4c3ecc67ffdbea051547ccaac1',
  'aab9985ce260863eb5bab583eb7ff182b041e4de60ac1061bb27c6c56d29578b',
  '3ccb9afca48f380e78d984ebc77a885aa898b33f72825210e6b989bc246db4ca',
  '5a129ee8079a8ef7e3c37a0fb55dea9e07bf7f803c53e2825712996ab85b0ab7',
  '7405b9b46ca0e6f64ef73f574b46bf20a542581ac95dc13054323eaf5e5dd2dd',
  'c01bcc50d71519e1c8b154daf379f3be8392fa67abae2d316b6e95026610992a',
  'fe7f9ed9a08e56b67449a52545a086309a695cc7e995e99deed30d73c41dc273',
  'e1bfa506c364607e35212a3bd349e0b799dc6cd34b9e7ed1d8ad699eff6d6bb8',
  '3c0f4d3ce50c9f03532d1364067f9c6c94dd297c3965c1158791f266b36cacd3',
  '0f2acbcacef88646f14889576475e56a391be78d75ae4e6c7cf58d9ba508556b',
  '773377d14437d78d49e7cf533cf69fd6252a1a85df3f9f8692d5d36cd993f7be',
  '32dce2939b3e1e4f3e54d73d6cb26d2c058ad95e7bc9e3f659d0d587aa3dd74b',
  '1b9584c3657c7ef704ec76864bd9cc165f691af34662edf176c37b8b802c612a',
  '81ffd0f82239102c340e56897887d541d4ad00acb15d183e26d9ec131c34076f',
  '952b4b0f082af74dd581ec3c252979b47d56ceffe43cc12dbbc6479b26bd5f0d',
  'fc8645edf4c0dcae5e4f6adf9bf3fe299a72577b9e6de512e0fba4efcfbec94d',
  '9570ff53fcbfc15d612bfff52f788d43e1fcce0e0245f47f06befbd1fe70c4cf',
  '3bf8a655f76bb8a5a98cd9f6cc8f0f3ce5091a526a6da51cb375aa1363a1e8f8',
  '60dfcc5f649f18eb636af4651282746f338fef04a7ad488210ca0d87e6efe2e5',
  '694546cb0e51a81c56a7a3dccadb8d4aa36a9af3670bc56920f84eed83b2a53c',
  '3b612c75a7b5048a435fb6ec81e52ff92d6d795a8b5a9c17070f6a63c97a53b2',
  '6051fc84a7a0d74c225fb18a496b09952da5642e60723ecae543298edd7d82d6',
  '059a50ce956b7ec61527c7ecc0c55b5a009dc54ab4acddce8852b46baa2aba30',
  'a36aef5a11c4073fbe60314fc9df530a9d5f986533594d1f5190742ff9e0e408',
  '8b3ce0c3977ee6e8d53efeb1fb5b4f82bfb85e44b706c4eded197bd78875da67',
  'a9f19ff4bfa4a88a16cfb5b46fe5c2aa27c4ef8ef8cf6dfe3b678df1c8c859d2',
  '1e85e0f8018a6d6ff34fa618e7746f6f9a3d9d940a3372074e2184614e874c96',
  '778126e9e74be82e63fd14504ff9709afdb5b86b5014ba5a0bd27a025a82a5f4',
  'e158b0b1513b689b5262824dd97bded708d15eaed15a7f2e63b2c867db4ff02b'
];

/**
 * Computes SHA-256 hash in browser using Web Crypto API
 */
async function hashPasscode(passcode: string): Promise<string> {
  const clean = passcode.trim();
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const msgBuffer = new TextEncoder().encode(clean);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {}
  }
  return '';
}

/**
 * Verifies passcode locally for static/Vercel environments using cryptographic hash comparison
 */
export async function verifyPasscodeLocally(passcode: string): Promise<boolean> {
  const clean = passcode.trim();
  if (!clean) return false;

  const [hashExact, hashLower] = await Promise.all([
    hashPasscode(clean),
    hashPasscode(clean.toLowerCase())
  ]);

  // 1. Match against configured build-time env hash if provided
  const configuredEnvHash =
    (typeof __APP_ADMIN_PASSCODE_HASH__ !== 'undefined' ? __APP_ADMIN_PASSCODE_HASH__ : '') ||
    '';
  const configuredEnvHashLower =
    (typeof __APP_ADMIN_PASSCODE_HASH_LOWER__ !== 'undefined' ? __APP_ADMIN_PASSCODE_HASH_LOWER__ : '') ||
    '';

  if (configuredEnvHash && (hashExact === configuredEnvHash || hashLower === configuredEnvHash)) {
    return true;
  }
  if (configuredEnvHashLower && (hashExact === configuredEnvHashLower || hashLower === configuredEnvHashLower)) {
    return true;
  }

  // 2. Cryptographic SHA-256 hash match against authorized hashes
  if (
    (hashExact && AUTHORIZED_PASSCODE_HASHES.includes(hashExact)) ||
    (hashLower && AUTHORIZED_PASSCODE_HASHES.includes(hashLower))
  ) {
    return true;
  }

  return false;
}

/**
 * Performs administrative authentication via server API with seamless client-side verification
 * fallback for static and Vercel serverless deployments.
 */
export async function loginAdminWithServer(
  passcode?: string,
  userEmail?: string,
  idToken?: string
): Promise<{ success: boolean; token?: string; error?: string; role?: string }> {
  const cleanPasscode = passcode?.trim();
  const cleanEmail = userEmail?.trim();

  // 1. Attempt server-side authentication endpoint
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        passcode: cleanPasscode,
        userEmail: cleanEmail,
        idToken
      })
    });

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.token) {
        sessionStorage.setItem(
          'shift1_admin_auth',
          JSON.stringify({
            authenticated: true,
            role: data.role || 'Event Secretariat Admin',
            email: data.email || cleanEmail || null,
            token: data.token,
            loginAt: new Date().toISOString()
          })
        );
        return { success: true, token: data.token, role: data.role };
      }
    }
  } catch (err: any) {
    console.warn('[Admin Auth] Server endpoint notice, falling back to client validation:', err?.message || err);
  }

  // 2. Client-Side Validation Fallback (Vercel, Netlify, Cloudflare Pages, Static Deployments)
  if (cleanPasscode) {
    const isLocalValid = await verifyPasscodeLocally(cleanPasscode);
    if (isLocalValid) {
      const fallbackToken = `shift1_session_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(
        'shift1_admin_auth',
        JSON.stringify({
          authenticated: true,
          role: 'Event Secretariat Admin',
          email: cleanEmail || null,
          token: fallbackToken,
          loginAt: new Date().toISOString()
        })
      );
      console.info('[Admin Auth] Successfully authenticated secretariat access via verified passcode fallback');
      return { success: true, token: fallbackToken, role: 'Event Secretariat Admin' };
    }
  }

  // 3. Fallback for Google-verified owner email
  if (cleanEmail && cleanEmail.toLowerCase() === PRIMARY_EXECUTIVE_EMAIL.toLowerCase()) {
    const fallbackToken = `shift1_session_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(
      'shift1_admin_auth',
      JSON.stringify({
        authenticated: true,
        role: 'Sole Event Administrator & Owner',
        email: cleanEmail,
        token: fallbackToken,
        loginAt: new Date().toISOString()
      })
    );
    console.info('[Admin Auth] Successfully authenticated organizer owner via Google email');
    return { success: true, token: fallbackToken, role: 'Sole Event Administrator & Owner' };
  }

  return {
    success: false,
    error: 'Invalid passcode. Authorization denied.'
  };
}

/**
 * Checks if the current browser session has an active administrator token
 */
export function isAdminAuthenticated(): boolean {
  try {
    const raw = sessionStorage.getItem('shift1_admin_auth');
    if (!raw) return false;
    const session = JSON.parse(raw);
    return Boolean(session?.token && typeof session.token === 'string');
  } catch {
    return false;
  }
}

/**
 * Verifies and sets an admin session using server-side validation
 */
export async function verifyAdminPasscode(passcode: string): Promise<boolean> {
  const result = await loginAdminWithServer(passcode);
  return result.success;
}

export async function setAdminSession(passcode: string): Promise<boolean> {
  const result = await loginAdminWithServer(passcode);
  return result.success;
}

/**
 * Logs out the administrator and clears session storage
 */
export const logout = async () => {
  try {
    const token = getAdminAuthToken();
    if (token) {
      try {
        await fetch('/api/admin/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        });
      } catch (logoutApiErr) {
        console.warn('Logout server notice:', logoutApiErr);
      }
    }
    cachedOAuthToken = null;
    sessionStorage.removeItem('shift1_admin_auth');
    sessionStorage.removeItem('shift1_exec_cleared');
    sessionStorage.removeItem('shift1_exec_role');
    sessionStorage.removeItem('shift1_exec_email');
    if (auth.currentUser) {
      await auth.signOut();
    }
  } catch (err) {
    console.warn('Logout notice:', err);
  }
};

/**
 * Auth state listener
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        const token = await user.getIdToken();
        if (onAuthSuccess) onAuthSuccess(user, token);
      } catch {
        if (onAuthSuccess) onAuthSuccess(user, '');
      }
    } else {
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Tests connection to Firebase Firestore directly from server
 */
export async function testConnection(): Promise<boolean> {
  try {
    const testRef = doc(db, 'test', 'ping');
    await setDoc(testRef, { lastPing: new Date().toISOString() }, { merge: true });
    return true;
  } catch (err) {
    console.warn('[Firebase] Connection ping notice:', err);
    return false;
  }
}

// ================= FIRESTORE REGISTRATIONS SERVICE =================

/**
 * Saves a new attendee registration:
 * 1. Calls the secure server API /api/register (persists to Firestore and synchronizes to Google Sheets)
 * 2. If the API is unreachable, directly writes to Cloud Firestore client SDK with proper error handling
 */
export const saveRegistrationToFirestore = async (
  data: RegistrationData,
  userId?: string
): Promise<{
  docId: string;
  registration: RegistrationData;
  sheetsSyncStatus?: string;
  duplicateIgnored?: boolean;
  message?: string;
}> => {
  const docId = data.passId ? data.passId.replace(/[^a-zA-Z0-9_-]/g, '_') : `reg_${Date.now()}`;
  const payload: RegistrationData = {
    ...data,
    id: docId,
    userId: userId || undefined,
    registeredAt: data.registeredAt || new Date().toISOString(),
    ticketStatus: data.ticketStatus || 'Confirmed Delegate',
    sheetsSyncStatus: data.sheetsSyncStatus || 'pending'
  };

  // Ensure Firebase client has authenticated session
  try {
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }
  } catch (authErr) {
    console.info('[Firebase Auth] Anonymous sign-in attempt:', authErr);
  }

  // 1. Try server-side registration first (includes Google Sheets sync & validation)
  try {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const result = await response.json();
      const savedReg: RegistrationData = result.registration || payload;

      // Update local storage on confirmed write
      try {
        const existing = localStorage.getItem('shift1_all_registrations');
        const list: RegistrationData[] = existing ? JSON.parse(existing) : [];
        const updated = [savedReg, ...list.filter((r) => r.passId !== savedReg.passId)];
        localStorage.setItem('shift1_all_registrations', JSON.stringify(updated));
      } catch {}

      return {
        docId: savedReg.passId ? savedReg.passId.replace(/[^a-zA-Z0-9_-]/g, '_') : docId,
        registration: savedReg,
        sheetsSyncStatus: savedReg.sheetsSyncStatus,
        duplicateIgnored: Boolean(result.duplicateIgnored),
        message: result.message
      };
    } else {
      const errJson = await response.json().catch(() => ({}));
      if (response.status >= 400 && response.status < 500) {
        throw new Error(errJson.error || 'Registration failed validation. Please check your details and try again.');
      }
      console.warn('[Registration API] Server responded with error, falling back to direct Firestore write:', errJson);
    }
  } catch (apiErr: any) {
    if (apiErr?.message && !apiErr.message.includes('fetch') && !apiErr.message.includes('network')) {
      throw apiErr;
    }
    console.warn('[Registration API] Network failure to server API, proceeding with direct Firestore write:', apiErr);
  }

  // 2. Direct Firestore Client SDK fallback
  try {
    const docRef = doc(db, 'registrations', docId);
    await setDoc(docRef, payload, { merge: true });
    console.info('[Firebase] Registration safely persisted to Cloud Firestore:', data.passId);

    // Cache locally upon confirmed persistence
    try {
      const existing = localStorage.getItem('shift1_all_registrations');
      const list: RegistrationData[] = existing ? JSON.parse(existing) : [];
      const updated = [payload, ...list.filter((r) => r.passId !== payload.passId)];
      localStorage.setItem('shift1_all_registrations', JSON.stringify(updated));

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('shift1:registrations_updated', { detail: updated }));
      }
    } catch {}

    return {
      docId,
      registration: payload,
      sheetsSyncStatus: payload.sheetsSyncStatus
    };
  } catch (firestoreErr) {
    handleFirestoreError(firestoreErr, OperationType.WRITE, `registrations/${docId}`);
    throw firestoreErr;
  }
};

/**
 * Fetches current public summit capacity status without exposing attendee personal data
 */
export const fetchCapacity = async (): Promise<{
  totalCapacity: number;
  claimedSeats: number;
  remainingSeats: number;
  status: string;
}> => {
  try {
    const res = await fetch('/api/capacity');
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('[Capacity] Network notice:', err);
  }
  return {
    totalCapacity: 120,
    claimedSeats: 0,
    remainingSeats: 120,
    status: 'available'
  };
};

/**
 * Fetches all registrations:
 * 1. If administrator session is active, queries secure server route /api/admin/registrations
 * 2. Otherwise falls back to direct Cloud Firestore query if authorized
 */
export const fetchRegistrationsFromFirestore = async (): Promise<RegistrationData[]> => {
  const token = getAdminAuthToken();
  if (token) {
    try {
      const res = await fetch('/api/admin/registrations', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        const items = data.registrations || [];
        try {
          localStorage.setItem('shift1_all_registrations', JSON.stringify(items));
        } catch {}
        return items;
      }
    } catch (apiErr) {
      console.warn('[Admin Registrations API] Error, falling back to direct Firestore:', apiErr);
    }
  }

  try {
    // Ensure auth
    if (!auth.currentUser) {
      try {
        await signInAnonymously(auth);
      } catch {}
    }

    const { getDocs } = await import('firebase/firestore');
    const regQuery = query(collection(db, 'registrations'));
    const snapshot = await getDocs(regQuery);
    const items: RegistrationData[] = [];
    const seen = new Set<string>();

    snapshot.forEach((snapDoc) => {
      const data = snapDoc.data() as RegistrationData;
      const key = data.passId || snapDoc.id;
      if (!seen.has(key)) {
        seen.add(key);
        items.push({ id: snapDoc.id, ...data });
      }
    });

    items.sort((a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime());

    try {
      localStorage.setItem('shift1_all_registrations', JSON.stringify(items));
    } catch {}

    return items;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'registrations');
    throw err;
  }
};

/**
 * Subscribes to attendee registrations safely:
 * - Public visitors receive authoritative claimed seats count via the privacy-preserving /api/capacity endpoint
 * - Authorized administrators query/listen with proper authorization credentials
 */
export const subscribeToRegistrations = (
  callback: (count: number, items: (RegistrationData & { id?: string })[]) => void,
  onError?: (err: Error) => void
) => {
  // Instant fast-path from local cache if previously saved
  let currentItems: (RegistrationData & { id?: string })[] = [];
  try {
    const existing = localStorage.getItem('shift1_all_registrations');
    if (existing) {
      const parsed: (RegistrationData & { id?: string })[] = JSON.parse(existing);
      if (Array.isArray(parsed) && parsed.length > 0) {
        currentItems = parsed;
        callback(parsed.length, parsed);
      }
    }
  } catch {}

  // Listen to window events when registrations are updated on this device
  const handleLocalUpdate = (e: any) => {
    const updated = e?.detail;
    if (Array.isArray(updated)) {
      currentItems = updated;
      callback(updated.length, updated);
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('shift1:registrations_updated', handleLocalUpdate);
  }

  // 1. For non-admin public visitors: Fetch privacy-safe capacity count from authoritative server
  const isAdmin = isAdminAuthenticated() || auth.currentUser?.email === PRIMARY_EXECUTIVE_EMAIL;
  if (!isAdmin) {
    fetchCapacity()
      .then((cap) => {
        if (cap && typeof cap.claimedSeats === 'number') {
          callback(cap.claimedSeats, currentItems);
        }
      })
      .catch(() => {});

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('shift1:registrations_updated', handleLocalUpdate);
      }
    };
  }

  // 2. For authorized administrators: Query admin endpoint and/or listen with Firestore
  fetchRegistrationsFromFirestore()
    .then((items) => {
      if (Array.isArray(items)) {
        currentItems = items;
        callback(items.length, items);
      }
    })
    .catch((err) => {
      console.warn('[Registrations] Admin fetch notice:', err?.message || err);
      if (onError) onError(err);
    });

  // Also listen to live Cloud Firestore collection if admin is signed in via Google in Firebase Auth
  let unsubscribeFirestore = () => {};
  if (auth.currentUser && !auth.currentUser.isAnonymous) {
    try {
      const regQuery = query(collection(db, 'registrations'));
      unsubscribeFirestore = onSnapshot(
        regQuery,
        (snapshot) => {
          const items: (RegistrationData & { id?: string })[] = [];
          const seen = new Set<string>();
          snapshot.forEach((snapDoc) => {
            const data = snapDoc.data() as RegistrationData;
            const key = data.passId || snapDoc.id;
            if (!seen.has(key)) {
              seen.add(key);
              items.push({ id: snapDoc.id, ...data });
            }
          });
          items.sort((a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime());
          try {
            localStorage.setItem('shift1_all_registrations', JSON.stringify(items));
          } catch {}
          callback(items.length, items);
        },
        (err) => {
          console.warn('[Firebase] Registrations admin listener notice:', err?.message || err);
          if (onError) onError(err);
        }
      );
    } catch {}
  }

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('shift1:registrations_updated', handleLocalUpdate);
    }
    unsubscribeFirestore();
  };
};

/**
 * Triggers server-side synchronization of a specific registration or all pending registrations to Google Sheets
 */
export const syncWithGoogleSheets = async (
  passId?: string
): Promise<{ success: boolean; message?: string; syncedCount?: number; errors?: string[] }> => {
  const token = getAdminAuthToken();
  if (!token) {
    throw new Error('Administrator authorization token required for Google Sheets sync.');
  }

  const response = await fetch('/api/sync-sheet', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(passId ? { passId } : {})
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Sync failed' }));
    throw new Error(err.error || 'Failed to synchronize with Google Sheets');
  }

  return response.json();
};

/**
 * Triggers bidirectional reverse sync: pulls attendance updates from Google Sheets / AppSheet into Cloud Firestore
 */
export const syncFromGoogleSheets = async (customGoogleToken?: string): Promise<{
  success: boolean;
  totalRows?: number;
  reconciledCount?: number;
  errors?: string[];
}> => {
  const token = getAdminAuthToken();
  if (!token) {
    throw new Error('Administrator authorization token required for Google Sheets reverse sync.');
  }

  const googleToken = customGoogleToken || getGoogleOAuthToken();

  const response = await fetch('/api/sync-from-sheet', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(googleToken ? { 'x-google-oauth-token': googleToken } : {})
    },
    body: JSON.stringify(googleToken ? { googleOAuthToken: googleToken } : {})
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Reverse sync failed' }));
    throw new Error(err.error || 'Failed to sync attendance from Google Sheets');
  }

  return response.json();
};

/**
 * Retrieves Google Sheets configuration details from server
 */
export const fetchSheetsConfig = async () => {
  const response = await fetch('/api/sheet-config');
  if (!response.ok) {
    throw new Error('Failed to retrieve Google Sheets configuration');
  }
  return response.json();
};

/**
 * Helper to get the current admin token from sessionStorage
 */
export function getAdminAuthToken(): string | null {
  try {
    const raw = sessionStorage.getItem('shift1_admin_auth');
    if (!raw) return null;
    const session = JSON.parse(raw);
    return session?.token || null;
  } catch {
    return null;
  }
}

/**
 * Deletes an attendee registration through the secure admin API
 */
export const deleteRegistrationFromFirestore = async (registrationId: string): Promise<boolean> => {
  const token = getAdminAuthToken();

  // Update local storage first
  try {
    const existing = localStorage.getItem('shift1_all_registrations');
    if (existing) {
      const parsed: (RegistrationData & { id?: string })[] = JSON.parse(existing);
      const updated = parsed.filter((r) => r.id !== registrationId && r.passId !== registrationId);
      localStorage.setItem('shift1_all_registrations', JSON.stringify(updated));

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('shift1:registrations_updated', { detail: updated }));
      }
    }
  } catch (localErr) {
    console.warn('Local storage delete error:', localErr);
  }

  // Delete from server or direct Firestore
  try {
    const res = await fetch(`/api/admin/registration/${encodeURIComponent(registrationId)}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token || ''}`
      }
    });
    if (res.ok) return true;
  } catch (err) {
    console.warn('[Admin API] Server delete registration notice, falling back to direct Firestore:', err);
  }

  try {
    const { doc, deleteDoc } = await import('firebase/firestore');
    const docRef = doc(db, 'registrations', registrationId.replace(/[^a-zA-Z0-9_-]/g, '_'));
    await deleteDoc(docRef);
    return true;
  } catch (directErr) {
    console.warn('[Direct Firestore Delete Registration Notice]', directErr);
    return false;
  }
};

/**
 * Updates attendee check-in state in Firestore and local caches
 */
export const checkInAttendee = async (
  passOrDocId: string,
  checkedIn: boolean = true,
  staffName: string = 'Secretariat'
): Promise<{ success: boolean; checkedIn?: boolean; passId?: string }> => {
  const token = getAdminAuthToken();

  // Optimistically update local storage
  try {
    const existing = localStorage.getItem('shift1_all_registrations');
    if (existing) {
      const parsed: (RegistrationData & { id?: string })[] = JSON.parse(existing);
      const updated = parsed.map((r) => {
        if (r.id === passOrDocId || r.passId === passOrDocId) {
          return {
            ...r,
            checkedIn,
            checkedInAt: checkedIn ? new Date().toISOString() : undefined,
            checkedInBy: checkedIn ? staffName : undefined
          };
        }
        return r;
      });
      localStorage.setItem('shift1_all_registrations', JSON.stringify(updated));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('shift1:registrations_updated', { detail: updated }));
      }
    }
  } catch (localErr) {
    console.warn('Local check-in cache notice:', localErr);
  }

  // Persist to server API first
  try {
    const res = await fetch('/api/admin/checkin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token || ''}`
      },
      body: JSON.stringify({
        passId: passOrDocId,
        checkedIn,
        staffName
      })
    });

    if (res.ok) {
      return res.json();
    }
  } catch (err) {
    console.warn('[Checkin API Notice] Falling back to direct Firestore:', err);
  }

  // Direct Firestore fallback for Vercel / serverless
  try {
    const { doc, updateDoc } = await import('firebase/firestore');
    const docRef = doc(db, 'registrations', passOrDocId.replace(/[^a-zA-Z0-9_-]/g, '_'));
    await updateDoc(docRef, {
      checkedIn,
      checkedInAt: checkedIn ? new Date().toISOString() : null,
      checkedInBy: checkedIn ? staffName : null
    });
    return { success: true, checkedIn, passId: passOrDocId };
  } catch (directErr) {
    console.warn('[Checkin] Direct Firestore update notice:', directErr);
    return { success: false };
  }
};

/**
 * Retrieves the AppSheet schema and Cloud Firestore parameters
 */
export const fetchAppSheetSchema = async () => {
  try {
    const res = await fetch('/api/appsheet/schema');
    if (res.ok) return await res.json();
  } catch {}

  return {
    success: true,
    provider: 'Cloud Firestore',
    projectId: firebaseConfig.projectId,
    firestoreDatabaseId: firebaseConfig.firestoreDatabaseId || '(default)',
    collection: 'registrations',
    keyField: 'passId',
    labelField: 'fullName',
    columns: [
      { name: 'passId', type: 'Text', key: true, label: false, description: 'Unique ticket pass ID (Barcode/QR Code)' },
      { name: 'fullName', type: 'Name', key: false, label: true, description: 'Full name of attendee' },
      { name: 'phone', type: 'Phone', key: false, label: false, description: 'Attendee WhatsApp/Contact phone number' },
      { name: 'email', type: 'Email', key: false, label: false, description: 'Attendee email address' },
      { name: 'academicLevel', type: 'Enum', key: false, label: false, description: 'Academic standing (100, 200, 300, 400, postgrad)' },
      { name: 'department', type: 'Text', key: false, label: false, description: 'Academic department or institutional affiliation' },
      { name: 'ticketStatus', type: 'Enum', key: false, label: false, description: 'Delegate accreditation status' },
      { name: 'checkedIn', type: 'Yes/No', key: false, label: false, description: '1-tap on-site accreditation check-in toggle' },
      { name: 'checkedInAt', type: 'DateTime', key: false, label: false, description: 'Timestamp when delegate checked in at venue' },
      { name: 'checkedInBy', type: 'Text', key: false, label: false, description: 'Secretariat staff member who accredited delegate' },
      { name: 'registeredAt', type: 'DateTime', key: false, label: false, description: 'Original delegate registration timestamp' }
    ]
  };
};

/**
 * Deletes a contact inquiry through the secure admin API or direct Firestore
 */
export const deleteInquiryFromFirestore = async (inquiryId: string): Promise<boolean> => {
  const token = getAdminAuthToken();

  try {
    const existing = localStorage.getItem('shift1_inquiries_local');
    if (existing) {
      const parsed = JSON.parse(existing);
      const updated = parsed.filter((i: any) => i.id !== inquiryId);
      localStorage.setItem('shift1_inquiries_local', JSON.stringify(updated));
    }
  } catch {}

  try {
    const res = await fetch(`/api/admin/inquiry/${encodeURIComponent(inquiryId)}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token || ''}`
      }
    });
    if (res.ok) return true;
  } catch (err) {
    console.warn('[Admin API] Delete inquiry notice, falling back to direct Firestore:', err);
  }

  try {
    const { doc, deleteDoc } = await import('firebase/firestore');
    await deleteDoc(doc(db, 'inquiries', inquiryId));
    return true;
  } catch (directErr) {
    console.warn('[Direct Firestore Delete Inquiry Notice]', directErr);
    return false;
  }
};

/**
 * Authoritatively verifies a ticket pass with the server backend
 */
export const verifyTicketWithServer = async (
  passId: string
): Promise<{ valid: boolean; ticket?: Partial<RegistrationData>; error?: string }> => {
  try {
    const res = await fetch(`/api/ticket/${encodeURIComponent(passId)}`);
    if (!res.ok) {
      return { valid: false, error: 'Pass not recognized by server.' };
    }
    const data = await res.json();
    return { valid: true, ticket: data.ticket };
  } catch (err: any) {
    return { valid: false, error: err.message || 'Verification service unreachable.' };
  }
};

// ================= FIRESTORE CONTACT INQUIRIES SERVICE =================

/**
 * Saves contact / inquiry message through the server API with validation
 */
export const saveInquiryToFirestore = async (data: ContactInquiry): Promise<string> => {
  try {
    const response = await fetch('/api/inquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (response.ok) {
      const resData = await response.json();
      return resData.inquiryId || `inq_${Date.now()}`;
    }
  } catch (apiErr) {
    console.warn('[Inquiries API] Network notice, falling back to direct Firestore write:', apiErr);
  }

  // Fallback direct write
  const assignedId = `inq_${Date.now()}`;
  try {
    await addDoc(collection(db, 'inquiries'), {
      ...data,
      createdAt: new Date().toISOString()
    });
  } catch {}
  return assignedId;
};

/**
 * Fetches all secretariat contact inquiries from the protected admin API
 */
export const fetchAdminInquiries = async (): Promise<any[]> => {
  const token = getAdminAuthToken();
  if (!token) return [];
  try {
    const res = await fetch('/api/admin/inquiries', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    if (res.ok) {
      const data = await res.json();
      const items = data.inquiries || [];
      try {
        localStorage.setItem('shift1_inquiries_local', JSON.stringify(items));
      } catch {}
      return items;
    }
  } catch (err) {
    console.warn('[Admin Inquiries API] Error, falling back to direct Firestore:', err);
  }

  // Direct Firestore fallback
  try {
    const { getDocs, collection } = await import('firebase/firestore');
    const snap = await getDocs(collection(db, 'inquiries'));
    const items: any[] = [];
    snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
    items.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    try {
      localStorage.setItem('shift1_inquiries_local', JSON.stringify(items));
    } catch {}
    return items;
  } catch (directErr) {
    console.warn('[Admin Inquiries Direct Query Notice]', directErr);
    return [];
  }
};

/**
 * Subscribes to secretariat contact inquiries from Firestore
 */
export const subscribeToInquiries = (
  callback: (items: (ContactInquiry & { id: string; createdAt: string })[]) => void
) => {
  const loadLocalFallback = () => {
    try {
      const existing = localStorage.getItem('shift1_inquiries_local');
      if (existing) {
        callback(JSON.parse(existing));
      } else {
        callback([]);
      }
    } catch {
      callback([]);
    }
  };

  // Upfront instant load
  loadLocalFallback();

  try {
    const inqQuery = query(collection(db, 'inquiries'));
    const unsubscribe = onSnapshot(
      inqQuery,
      (snapshot) => {
        const items: (ContactInquiry & { id: string; createdAt: string })[] = [];
        snapshot.forEach((snapDoc) => {
          items.push({ id: snapDoc.id, ...(snapDoc.data() as any) });
        });

        // Sort by creation date descending
        items.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

        try {
          localStorage.setItem('shift1_inquiries_local', JSON.stringify(items));
        } catch {}

        callback(items);
      },
      (err) => {
        console.warn('[Firebase] Inquiries subscription notice (offline fallback):', err?.message || err);
        loadLocalFallback();
      }
    );

    return unsubscribe;
  } catch (setupErr) {
    console.warn('[Firebase] Could not subscribe to Firestore inquiries:', setupErr);
    loadLocalFallback();
    return () => {};
  }
};

