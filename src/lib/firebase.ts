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

/**
 * Performs server-side administrative authentication via passcode or verified executive Google email
 */
export async function loginAdminWithServer(
  passcode?: string,
  userEmail?: string
): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        passcode: passcode?.trim(),
        userEmail: userEmail?.trim()
      })
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && data.token) {
      sessionStorage.setItem(
        'shift1_admin_auth',
        JSON.stringify({
          authenticated: true,
          role: data.role || 'Event Secretariat Admin',
          email: data.email || userEmail || null,
          token: data.token,
          loginAt: new Date().toISOString()
        })
      );
      return { success: true, token: data.token };
    }

    return {
      success: false,
      error: data.error || 'Invalid credentials. Access denied.'
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Authentication server unreachable.'
    };
  }
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

  // Delete from server
  try {
    const res = await fetch(`/api/admin/registration/${encodeURIComponent(registrationId)}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token || ''}`
      }
    });
    return res.ok;
  } catch (err) {
    console.warn('[Admin API] Delete registration notice:', err);
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

  // Persist to server & Firestore
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
    return { success: false };
  } catch (err) {
    console.error('[Checkin Error]', err);
    return { success: false };
  }
};

/**
 * Retrieves the AppSheet schema and Cloud Firestore parameters
 */
export const fetchAppSheetSchema = async () => {
  const res = await fetch('/api/appsheet/schema');
  if (!res.ok) throw new Error('Failed to load AppSheet schema');
  return res.json();
};

/**
 * Deletes a contact inquiry through the secure admin API
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
    return res.ok;
  } catch (err) {
    console.warn('[Admin API] Delete inquiry notice:', err);
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
    console.warn('[Admin Inquiries API] Error:', err);
  }
  return [];
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

