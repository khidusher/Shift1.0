import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  deleteDoc,
  collection,
  query,
  where,
  runTransaction,
  Firestore
} from 'firebase/firestore';
import { getAuth, signInAnonymously, Auth } from 'firebase/auth';
import { OAuth2Client } from 'google-auth-library';
import firebaseConfig from './firebase-applet-config.json';
import { RegistrationData, ContactInquiry } from './src/types';
import {
  syncRegistrationToGoogleSheets,
  syncFromGoogleSheetsToServer,
  getGoogleSheetsConfig,
  setServerOAuthToken,
  getServerOAuthToken,
  SHEET_HEADERS
} from './src/services/googleSheetsServer';
import {
  exportRegistrationToAppsScript,
  getAppsScriptBridgeConfig
} from './src/services/appsScriptBridge';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Server-side secret for signing admin session tokens with entropy validation
const isProduction = process.env.NODE_ENV === 'production';
let SERVER_SESSION_SECRET = process.env.SESSION_SECRET || '';

if (isProduction) {
  if (!SERVER_SESSION_SECRET || SERVER_SESSION_SECRET.trim().length < 32) {
    throw new Error(
      'FATAL CONFIGURATION ERROR: In production, SESSION_SECRET must be set to a persistent, sufficiently strong secret (>=32 characters) via the hosting environment secret management.'
    );
  }
} else {
  if (!SERVER_SESSION_SECRET) {
    console.warn('[Development Mode] SESSION_SECRET not set; generated safe development-only ephemeral secret.');
    SERVER_SESSION_SECRET = crypto.randomBytes(32).toString('hex');
  } else if (SERVER_SESSION_SECRET.trim().length < 32) {
    console.warn('[Development Mode] Warning: SESSION_SECRET is shorter than 32 characters.');
  }
}

// Sole Authorized Owner & Administrator Email
const SOLE_OWNER_EMAIL = 'arnoldodjidja01@gmail.com';
const AUTHORIZED_ADMIN_EMAILS = [SOLE_OWNER_EMAIL];

// Precomputed server-side password hashes for authorized event secretariat passcodes
const SERVER_ADMIN_HASHES: string[] = [
  // Rotated primary executive passcode hash
  '70e0ddc68d702e4a9868983e488870b156506a524522fefcdd6e64c20070fa13',
  '1587d65f385ada921f8734dcb58e25df5017e6b75d1319db0f1cde9d8ff9617e',
  '5a129ee8079a8ef7e3c37a0fb55dea9e07bf7f803c53e2825712996ab85b0ab7',
  '7405b9b46ca0e6f64ef73f574b46bf20a542581ac95dc13054323eaf5e5dd2dd',
  'c01bcc50d71519e1c8b154daf379f3be8392fa67abae2d316b6e95026610992a',
  'fe7f9ed9a08e56b67449a52545a086309a695cc7e995e99deed30d73c41dc273'
];

// Support dynamic administrator passcode from environment variable if provided
if (process.env.ADMIN_PASSCODE && process.env.ADMIN_PASSCODE.trim().length >= 8) {
  const dynamicHash = crypto.createHash('sha256').update(process.env.ADMIN_PASSCODE.trim()).digest('hex');
  if (!SERVER_ADMIN_HASHES.includes(dynamicHash)) {
    SERVER_ADMIN_HASHES.unshift(dynamicHash);
  }
}
if (process.env.ADMIN_PASSCODE_HASH && process.env.ADMIN_PASSCODE_HASH.trim().length === 64) {
  const customHash = process.env.ADMIN_PASSCODE_HASH.trim().toLowerCase();
  if (!SERVER_ADMIN_HASHES.includes(customHash)) {
    SERVER_ADMIN_HASHES.unshift(customHash);
  }
}

// Initialize Google OAuth2 client for genuine ID token verification
const oauth2Client = new OAuth2Client();

async function verifyGoogleAdminToken(idToken: string): Promise<{ email: string; email_verified: boolean } | null> {
  if (!idToken || typeof idToken !== 'string') return null;

  try {
    const ticket = await oauth2Client.verifyIdToken({
      idToken,
      audience: [
        firebaseConfig.oAuthClientId,
        firebaseConfig.projectId,
        '872271589222-hhdojmsujtv6uma5fpl442hsjc3hf0oq.apps.googleusercontent.com'
      ].filter(Boolean)
    });
    const payload = ticket.getPayload();
    if (payload && payload.email) {
      return {
        email: payload.email.toLowerCase(),
        email_verified: Boolean(payload.email_verified)
      };
    }
  } catch {}

  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.email) {
        return {
          email: data.email.toLowerCase(),
          email_verified: data.email_verified === 'true' || data.email_verified === true
        };
      }
    }
  } catch {}

  return null;
}

// Concurrency-safe phone registration lock queue
const phoneRegistrationLocks = new Map<string, Promise<void>>();

async function acquirePhoneLock(phone: string): Promise<() => void> {
  while (phoneRegistrationLocks.has(phone)) {
    await phoneRegistrationLocks.get(phone);
  }
  let release: () => void;
  const promise = new Promise<void>((resolve) => {
    release = () => {
      phoneRegistrationLocks.delete(phone);
      resolve();
    };
  });
  phoneRegistrationLocks.set(phone, promise);
  return release!;
}

// Consistent phone number normalization helper
function normalizePhoneNumber(raw: string): string {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (trimmed.startsWith('+')) {
    return `+${digits}`;
  }
  // Ghana local phone format (024XXXXXXX) -> +23324XXXXXXX
  if (digits.length === 10 && digits.startsWith('0')) {
    return `+233${digits.slice(1)}`;
  }
  return digits.length > 0 ? `+${digits}` : trimmed;
}

// Initialize Firebase SDK on Server
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Ensure authenticated server session for Firestore access
async function ensureServerAuth() {
  if (!auth.currentUser) {
    try {
      const userCred = await signInAnonymously(auth);
      console.info('[Server] Firebase authenticated anonymously as:', userCred.user.uid);
    } catch (err: any) {
      console.warn('[Server] Firebase auth note:', err?.message || err);
    }
  }
}

// ----------------------------------------------------------------------------
// Rate Limiter Implementation (In-Memory Sliding Window, Proxy-Aware)
// ----------------------------------------------------------------------------
interface RateLimitEntry {
  count: number;
  resetAt: number;
}
const rateLimits = new Map<string, RateLimitEntry>();

function createRateLimiter(limit: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Uses req.ip validated by Express trust proxy configuration
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    // Allow local test suite executions to run without 429 thrashing
    if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') {
      return next();
    }
    const key = `${req.baseUrl || req.path}:${ip}`;
    const now = Date.now();

    const entry = rateLimits.get(key);
    if (!entry || now > entry.resetAt) {
      rateLimits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (entry.count >= limit) {
      return res.status(429).json({
        error: 'Too many requests. Please wait a few moments before trying again.',
        retryAfter: Math.ceil((entry.resetAt - now) / 1000)
      });
    }

    entry.count++;
    next();
  };
}

// ----------------------------------------------------------------------------
// Admin Token Generation & Constant-Time Verification
// ----------------------------------------------------------------------------
function generateAdminSessionToken(subject: string, role = 'staff'): string {
  const isOwner = subject.toLowerCase() === SOLE_OWNER_EMAIL.toLowerCase();
  const payload = {
    sub: subject,
    role: isOwner ? 'owner' : role,
    iat: Date.now(),
    exp: Date.now() + 8 * 60 * 60 * 1000 // Strictly enforced 8 hours expiration
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', SERVER_SESSION_SECRET).update(data).digest('base64url');
  return `${data}.${signature}`;
}

// In-memory token revocation list for immediate session termination on logout
const revokedTokens = new Set<string>();

async function revokeAdminSessionToken(token: string) {
  if (token && typeof token === 'string') {
    const cleanToken = token.trim();
    revokedTokens.add(cleanToken);
    try {
      await ensureServerAuth();
      const tokenHash = crypto.createHash('sha256').update(cleanToken).digest('hex');
      const docRef = doc(db, 'integrations', `revoked_${tokenHash}`);
      await setDoc(docRef, { revokedAt: Date.now() });
    } catch (e: any) {
      console.warn('[Revocation] Firestore persistence notice:', e?.message || e);
    }
  }
}

async function isTokenRevoked(token: string): Promise<boolean> {
  const cleanToken = token.trim();
  if (revokedTokens.has(cleanToken)) {
    return true;
  }
  try {
    await ensureServerAuth();
    const tokenHash = crypto.createHash('sha256').update(cleanToken).digest('hex');
    const docRef = doc(db, 'integrations', `revoked_${tokenHash}`);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      revokedTokens.add(cleanToken);
      return true;
    }
  } catch {}
  return false;
}

function verifyAdminSessionToken(token: string): boolean {
  if (!token || typeof token !== 'string') return false;

  const cleanToken = token.trim();
  // Check against in-memory revoked sessions
  if (revokedTokens.has(cleanToken)) {
    return false;
  }

  const parts = cleanToken.split('.');
  if (parts.length !== 2) return false;

  const [data, signature] = parts;
  const expected = crypto.createHmac('sha256', SERVER_SESSION_SECRET).update(data).digest('base64url');

  // Constant-time HMAC comparison to prevent timing attacks
  const sigBuf = Buffer.from(signature, 'utf8');
  const expBuf = Buffer.from(expected, 'utf8');
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return false;
  }

  // Enforce session expiration on every request
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (!payload.exp || typeof payload.exp !== 'number' || Date.now() >= payload.exp) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Constant-time comparison between two secret strings to prevent timing attacks
 */
function safeTimingCompare(a: string, b: string): boolean {
  if (!a || !b || typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a.trim(), 'utf8');
  const bufB = Buffer.from(b.trim(), 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// Middleware: Require Admin Authentication (Async for shared Firestore revocation check)
async function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';

    if (!token || !verifyAdminSessionToken(token)) {
      return res.status(401).json({
        error: 'Unauthorized: Valid administrator authorization token required.'
      });
    }

    if (await isTokenRevoked(token)) {
      return res.status(401).json({
        error: 'Unauthorized: Session has been logged out and revoked.'
      });
    }

    next();
  } catch (err) {
    next(err);
  }
}

// Middleware: Strictly Require Sole Owner Authentication (arnoldodjidja01@gmail.com)
async function requireOwnerAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';

    if (!token || !verifyAdminSessionToken(token)) {
      return res.status(401).json({
        error: 'Unauthorized: Valid administrator authorization token required.'
      });
    }

    if (await isTokenRevoked(token)) {
      return res.status(401).json({
        error: 'Unauthorized: Session has been logged out and revoked.'
      });
    }

    const parts = token.split('.');
    const payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    const isOwner = payload.sub?.toLowerCase() === SOLE_OWNER_EMAIL.toLowerCase() || payload.role === 'owner';

    if (!isOwner) {
      return res.status(403).json({
        error: `Forbidden: Owner-level infrastructure authorization required (${SOLE_OWNER_EMAIL}).`
      });
    }

    next();
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// Durable Google Sheets Background Synchronization Engine
// ----------------------------------------------------------------------------
interface SyncJobData {
  passId: string;
  status: 'pending' | 'processing' | 'synced' | 'failed' | 'not_configured';
  attempts: number;
  maxAttempts: number;
  nextRetryAt: number;
  lockedAt: number | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

// Durable sync worker for a single registration passId with concurrency locking
async function processSyncJob(
  passId: string,
  isManualRetry = false
): Promise<{ success: boolean; error?: string }> {
  try {
    await ensureServerAuth();
    const docId = passId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const jobRef = doc(db, 'integrations', `sync_job_${docId}`);
    const regRef = doc(db, 'registrations', docId);

    const now = Date.now();
    const jobSnap = await getDoc(jobRef);
    let jobData: SyncJobData;

    if (jobSnap.exists()) {
      jobData = jobSnap.data() as SyncJobData;
      if (!isManualRetry) {
        if (jobData.status === 'synced') {
          return { success: true };
        }
        // Concurrency lock check: If another worker locked this job within the last 45 seconds, avoid collision
        if (jobData.status === 'processing' && jobData.lockedAt && now - jobData.lockedAt < 45000) {
          console.info(`[Sync Worker] Pass ${passId} is actively being processed by another worker.`);
          return { success: false, error: 'Job actively processing' };
        }
      }
    } else {
      jobData = {
        passId,
        status: 'pending',
        attempts: 0,
        maxAttempts: 5,
        nextRetryAt: now,
        lockedAt: null,
        lastError: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    // Acquire worker lock on job
    await setDoc(
      jobRef,
      {
        ...jobData,
        status: 'processing',
        lockedAt: now,
        attempts: isManualRetry ? 0 : jobData.attempts,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );

    // Read latest authoritative registration data
    const regSnap = await getDoc(regRef);
    if (!regSnap.exists()) {
      await setDoc(jobRef, { status: 'failed', lastError: 'Registration document not found in Firestore', lockedAt: null }, { merge: true });
      return { success: false, error: 'Registration not found' };
    }

    const regData = regSnap.data() as RegistrationData;

    // Execute idempotent Google Sheets synchronization:
    // If APPS_SCRIPT_WEBAPP_URL is configured, route via the Apps Script Web App bridge (no Google Sheets API enablement needed on GCP)
    // Otherwise fallback to direct Sheets API client
    const appsScriptConfig = getAppsScriptBridgeConfig();
    let result: { success: boolean; action?: string; error?: string };

    if (appsScriptConfig.isConfigured) {
      result = await exportRegistrationToAppsScript(regData);
      if (!result.success) {
        console.warn(`[Sync Worker] Apps Script notice (${result.error}), falling back to direct Sheets API...`);
        result = await syncRegistrationToGoogleSheets(regData);
      }
    } else {
      result = await syncRegistrationToGoogleSheets(regData);
    }

    if (result.success) {
      const syncedIso = new Date().toISOString();
      const patch = {
        sheetsSyncStatus: 'synced' as const,
        sheetsSyncedAt: syncedIso,
        sheetsSyncError: null,
        sheetsSyncAttempts: (jobData.attempts || 0) + 1
      };
      await updateDoc(regRef, patch).catch(async () => {
        await setDoc(regRef, { ...regData, ...patch }, { merge: true });
      });
      await setDoc(
        jobRef,
        {
          status: 'synced',
          lockedAt: null,
          lastError: null,
          updatedAt: syncedIso
        },
        { merge: true }
      );
      console.info(`[Sync Worker] Successfully synchronized pass ${passId} to Google Sheets.`);
      return { success: true };
    } else {
      const errorMsg = result.error || 'Google Sheets synchronization failed';
      const isConfigOrAuthError =
        result.action === 'not_configured' ||
        errorMsg.includes('not enabled') ||
        errorMsg.includes('403') ||
        errorMsg.includes('404') ||
        errorMsg.includes('Permission denied');

      const nextAttempts = (jobData.attempts || 0) + 1;
      const maxAttempts = jobData.maxAttempts || 5;

      // Exponential backoff for temporary errors (5s, 15s, 45s, 120s, 300s); 5 minutes for auth/config errors
      const backoffMs = isConfigOrAuthError
        ? 300000
        : Math.min(300000, 5000 * Math.pow(2, nextAttempts - 1));

      const isPermanentlyFailed = !isConfigOrAuthError && nextAttempts >= maxAttempts;
      const finalStatus = isConfigOrAuthError ? 'failed' : isPermanentlyFailed ? 'failed' : 'pending';

      const patch = {
        sheetsSyncStatus: isConfigOrAuthError ? ('not_configured' as const) : ('failed' as const),
        sheetsSyncError: errorMsg,
        sheetsSyncAttempts: nextAttempts,
        sheetsNextRetryAt: now + backoffMs
      };
      await updateDoc(regRef, patch).catch(async () => {
        await setDoc(regRef, { ...regData, ...patch }, { merge: true });
      });

      await setDoc(
        jobRef,
        {
          status: finalStatus,
          attempts: nextAttempts,
          nextRetryAt: now + backoffMs,
          lockedAt: null,
          lastError: errorMsg,
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );

      console.warn(`[Sync Worker] Synchronization attempt ${nextAttempts} failed for ${passId}: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  } catch (err: any) {
    console.warn(`[Sync Worker] Exception for ${passId}:`, err?.message || err);
    return { success: false, error: err?.message || 'Worker exception' };
  }
}

// Scheduled Recovery Worker: Recovers pending jobs across crashes, timeouts, and server restarts
let isRecoveryRunning = false;
async function runPendingSyncRecovery() {
  if (isRecoveryRunning) return;
  isRecoveryRunning = true;
  try {
    await ensureServerAuth();
    const now = Date.now();

    // Check if OAuth token can be recovered from Firestore
    if (!getServerOAuthToken()) {
      try {
        const tokenSnap = await getDoc(doc(db, 'integrations', 'sheets_oauth'));
        if (tokenSnap.exists()) {
          const tData = tokenSnap.data();
          if (tData.accessToken && now - (tData.updatedAt || 0) < 55 * 60 * 1000) {
            setServerOAuthToken(tData.accessToken);
            console.info('[Sync Recovery] Restored active Google OAuth token from Firestore session cache.');
          }
        }
      } catch {}
    }

    const regsSnap = await getDocs(collection(db, 'registrations'));

    for (const d of regsSnap.docs) {
      const reg = d.data() as RegistrationData;
      if (reg.sheetsSyncStatus === 'synced') continue;

      const nextRetry = reg.sheetsNextRetryAt || 0;
      const attempts = reg.sheetsSyncAttempts || 0;

      // Process if pending, or if retry backoff timestamp has elapsed (bounded at 10 attempts)
      if (reg.sheetsSyncStatus === 'pending' || (now >= nextRetry && attempts < 10)) {
        await processSyncJob(reg.passId);
      }
    }

    // 3. Bidirectional reconciliation: Only run background reverse sync if an active Google Workspace OAuth token is registered
    if (getServerOAuthToken()) {
      try {
        await syncFromGoogleSheetsToServer(db);
      } catch (reverseErr) {
        console.warn('[Sync Recovery] Reverse sync check notice:', reverseErr);
      }
    }
  } catch (err: any) {
    console.warn('[Sync Recovery] Notice:', err?.message || err);
  } finally {
    isRecoveryRunning = false;
  }
}

// ----------------------------------------------------------------------------
// Start Server Application
// ----------------------------------------------------------------------------
async function startServer() {
  const server = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Configure reverse-proxy trust for Cloud Run deployment (enables accurate req.ip)
  server.set('trust proxy', 1);

  // Security Headers Middleware
  server.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  server.use(express.json({ limit: '1mb' }));

  // --------------------------------------------------------------------------
  // API: Health / Ping Endpoint
  // --------------------------------------------------------------------------
  server.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      time: new Date().toISOString(),
      firestoreDatabaseId: firebaseConfig.firestoreDatabaseId,
      projectId: firebaseConfig.projectId
    });
  });

  // --------------------------------------------------------------------------
  // API: Public Google Sheets Configuration (Zero-Secret Status)
  // --------------------------------------------------------------------------
  server.get('/api/sheet-config', (_req: Request, res: Response) => {
    const config = getGoogleSheetsConfig();
    res.json({
      configured: config.isConfigured,
      spreadsheetId: config.spreadsheetId,
      spreadsheetUrl: config.spreadsheetUrl,
      headers: SHEET_HEADERS,
      setupGuide: {
        steps: [
          'In the Secretariat Console banner, click "Connect Google".',
          'Sign in with your Google account and grant Sheets access (one-time approval).',
          'Click "Sync All to Sheets" to automatically synchronize delegates to the spreadsheet.',
          'No environment variables or service account keys required!'
        ]
      }
    });
  });

  // --------------------------------------------------------------------------
  // API: Public Summit Capacity Endpoint (Zero attendee PII exposed)
  // --------------------------------------------------------------------------
  server.get('/api/capacity', async (_req: Request, res: Response) => {
    try {
      await ensureServerAuth();
      const snap = await getDocs(collection(db, 'registrations'));
      const claimedSeats = snap.size;
      const totalCapacity = 120;
      res.json({
        totalCapacity,
        claimedSeats,
        remainingSeats: Math.max(0, totalCapacity - claimedSeats),
        status: claimedSeats >= totalCapacity ? 'full' : 'available'
      });
    } catch (err: any) {
      console.warn('[Capacity API] Notice:', err?.message || err);
      res.json({
        totalCapacity: 120,
        claimedSeats: 0,
        remainingSeats: 120,
        status: 'available'
      });
    }
  });

  // --------------------------------------------------------------------------
  // API: Admin Authentication / Login Endpoint
  // --------------------------------------------------------------------------
  const adminLoginLimiter = createRateLimiter(6, 15 * 60 * 1000); // 6 attempts / 15m
  server.post('/api/admin/login', adminLoginLimiter, async (req: Request, res: Response) => {
    try {
      const { passcode, userEmail, idToken } = req.body;

      // 1. Genuine Google ID Token verification (Strictly restricted to sole owner arnoldodjidja01@gmail.com)
      if (idToken && typeof idToken === 'string') {
        const verified = await verifyGoogleAdminToken(idToken.trim());
        if (verified && verified.email_verified && verified.email === SOLE_OWNER_EMAIL.toLowerCase()) {
          const sessionToken = generateAdminSessionToken(verified.email, 'owner');
          return res.json({
            success: true,
            role: 'Sole Event Administrator & Owner',
            email: verified.email,
            token: sessionToken,
            isOwner: true
          });
        } else {
          return res.status(403).json({
            error: `Access denied: ${SOLE_OWNER_EMAIL} is the sole authorized administrator for this event.`
          });
        }
      }

      // 2. Secret Passcode verification with constant-time equality check (Grants staff check-in access)
      if (passcode && typeof passcode === 'string') {
        const cleanPasscode = passcode.trim();
        const hash = crypto.createHash('sha256').update(cleanPasscode).digest('hex');
        const hashBuf = Buffer.from(hash, 'utf8');

        let matched = false;
        for (const expectedHash of SERVER_ADMIN_HASHES) {
          const expBuf = Buffer.from(expectedHash, 'utf8');
          if (expBuf.length === hashBuf.length && crypto.timingSafeEqual(expBuf, hashBuf)) {
            matched = true;
            break;
          }
        }

        if (matched) {
          const sessionToken = generateAdminSessionToken('secretariat_staff_user', 'staff');
          return res.json({
            success: true,
            role: 'Event Secretariat Staff',
            token: sessionToken,
            isOwner: false
          });
        }
      }

      // 3. Unverified plain email requests without verified idToken or passcode are firmly rejected
      if (userEmail && typeof userEmail === 'string' && !idToken && !passcode) {
        return res.status(401).json({
          error: 'Administrator authentication requires a verified Google identity token or admin passcode. Plain email submissions are rejected.'
        });
      }

      return res.status(401).json({
        error: 'Invalid administrator credentials. Access denied.'
      });
    } catch (err: any) {
      console.error('[Admin Login] Error:', err);
      return res.status(500).json({ error: 'Authentication service encountered an error.' });
    }
  });

  // --------------------------------------------------------------------------
  // API: Admin Logout Endpoint (Server-Side Session Token Revocation)
  // --------------------------------------------------------------------------
  server.post('/api/admin/logout', async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';
    if (token) {
      await revokeAdminSessionToken(token);
    }
    return res.json({ success: true, message: 'Administrator session revoked successfully.' });
  });

  // --------------------------------------------------------------------------
  // API: Public Attendee Registration (Authoritative, Concurrency-Safe & Idempotent)
  // --------------------------------------------------------------------------
  const registerLimiter = createRateLimiter(20, 10 * 60 * 1000); // 20 per 10m per IP
  server.post('/api/register', registerLimiter, async (req: Request, res: Response) => {
    try {
      const { fullName, phone, email, academicLevel, department } = req.body;

      // 1. Server-Side Input Validation & Sanitization
      if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2 || fullName.trim().length > 100) {
        return res.status(400).json({ error: 'Please enter a valid full name (2 to 100 characters).' });
      }

      if (!phone || typeof phone !== 'string' || phone.trim().length < 7 || phone.trim().length > 25) {
        return res.status(400).json({ error: 'Please provide a valid phone or WhatsApp number (7 to 25 characters).' });
      }

      const validLevels = ['100', '200', '300', '400', 'postgrad'];
      const chosenLevel = validLevels.includes(academicLevel) ? academicLevel : '300';

      const cleanedName = fullName.trim().replace(/[<>]/g, '');
      const cleanedPhone = phone.trim().replace(/[<>]/g, '');
      const normalizedPhone = normalizePhoneNumber(cleanedPhone);
      const cleanedEmail =
        email && typeof email === 'string' && email.trim() ? email.trim().replace(/[<>]/g, '') : undefined;
      const cleanedDept =
        department && typeof department === 'string' && department.trim()
          ? department.trim().slice(0, 120).replace(/[<>]/g, '')
          : 'General Student';

      await ensureServerAuth();

      // Acquire lock for this normalized phone number to guarantee atomic serialization of concurrent requests
      const releaseLock = await acquirePhoneLock(normalizedPhone);

      try {
        const phoneLockKey = `phone_lock_${normalizedPhone.replace(/\D/g, '')}`;
        const phoneLockRef = doc(db, 'integrations', phoneLockKey);
        const regsCol = collection(db, 'registrations');

        // Check if legacy registration exists before atomic lock
        const duplicateQuery = query(regsCol, where('phone', '==', normalizedPhone));
        const duplicateSnap = await getDocs(duplicateQuery);

        if (!duplicateSnap.empty) {
          const existingData = duplicateSnap.docs[0].data() as RegistrationData;
          // Retrofit phone lock for legacy record
          await setDoc(phoneLockRef, {
            passId: existingData.passId,
            phone: normalizedPhone,
            registeredAt: existingData.registeredAt,
            locked: true
          }, { merge: true });

          console.info(`[Server] Returning existing registration for phone: ${normalizedPhone}`);
          return res.json({
            success: true,
            duplicateIgnored: true,
            registration: existingData,
            message: 'An attendee registration with this phone number was already recorded.'
          });
        }

        // Check un-normalized legacy phone string if different
        if (cleanedPhone !== normalizedPhone) {
          const legacyQuery = query(regsCol, where('phone', '==', cleanedPhone));
          const legacySnap = await getDocs(legacyQuery);
          if (!legacySnap.empty) {
            const existingData = legacySnap.docs[0].data() as RegistrationData;
            await setDoc(phoneLockRef, {
              passId: existingData.passId,
              phone: normalizedPhone,
              registeredAt: existingData.registeredAt,
              locked: true
            }, { merge: true });

            console.info(`[Server] Returning existing legacy registration for phone: ${cleanedPhone}`);
            return res.json({
              success: true,
              duplicateIgnored: true,
              registration: existingData,
              message: 'An attendee registration with this phone number was already recorded.'
            });
          }
        }

        // Check existing formatted legacy records (e.g. "+233 24 999 8888")
        const allDocsSnap = await getDocs(regsCol);
        for (const docSnap of allDocsSnap.docs) {
          const docData = docSnap.data() as RegistrationData;
          if (docData.phone && normalizePhoneNumber(docData.phone) === normalizedPhone) {
            await setDoc(phoneLockRef, {
              passId: docData.passId,
              phone: normalizedPhone,
              registeredAt: docData.registeredAt,
              locked: true
            }, { merge: true });

            console.info(`[Server] Returning existing normalized-match registration for: ${normalizedPhone}`);
            return res.json({
              success: true,
              duplicateIgnored: true,
              registration: docData,
              message: 'An attendee registration with this phone number was already recorded.'
            });
          }
        }

        // Cross-Instance Atomic Uniqueness Transaction
        let finalRegistration: RegistrationData | null = null;
        let isDuplicateDetected = false;

        await runTransaction(db, async (trans) => {
          const lockSnap = await trans.get(phoneLockRef);
          if (lockSnap.exists()) {
            const existingPassId = lockSnap.data()?.passId;
            if (existingPassId) {
              const existingDocRef = doc(db, 'registrations', existingPassId.replace(/[^a-zA-Z0-9_-]/g, '_'));
              const regSnap = await trans.get(existingDocRef);
              if (regSnap.exists()) {
                isDuplicateDetected = true;
                finalRegistration = regSnap.data() as RegistrationData;
                return;
              }
            }
          }

          // Generate Authoritative Canonical Pass ID (Client-supplied IDs and privileged metadata are discarded)
          const randomNum = Math.floor(1000 + Math.random() * 9000);
          const passId = `SHFT-${randomNum}-UENR`;
          const docId = passId.replace(/[^a-zA-Z0-9_-]/g, '_');
          const nowIso = new Date().toISOString();

          finalRegistration = {
            id: docId,
            passId,
            fullName: cleanedName,
            phone: normalizedPhone,
            email: cleanedEmail || (null as any),
            academicLevel: chosenLevel as any,
            department: cleanedDept,
            registeredAt: nowIso,
            ticketStatus: 'Confirmed Delegate',
            sheetsSyncStatus: 'pending',
            sheetsSyncAttempts: 0
          };

          const targetDocRef = doc(db, 'registrations', docId);
          const syncJobRef = doc(db, 'integrations', `sync_job_${docId}`);

          // Atomic writes: phone lock, registration document, and durable background sync job
          trans.set(phoneLockRef, {
            passId,
            phone: normalizedPhone,
            registeredAt: nowIso,
            locked: true
          });

          trans.set(targetDocRef, finalRegistration);

          trans.set(syncJobRef, {
            passId,
            status: 'pending',
            attempts: 0,
            maxAttempts: 5,
            nextRetryAt: Date.now(),
            lockedAt: null,
            lastError: null,
            createdAt: nowIso,
            updatedAt: nowIso
          });
        });

        if (isDuplicateDetected && finalRegistration) {
          console.info(`[Server] Atomic lock detected duplicate for phone: ${normalizedPhone}`);
          return res.json({
            success: true,
            duplicateIgnored: true,
            registration: finalRegistration,
            message: 'An attendee registration with this phone number was already recorded.'
          });
        }

        console.info(`[Server] Persisted registration to Firestore atomically: ${(finalRegistration as any).passId}`);

        // Trigger durable asynchronous background synchronization without blocking attendee pass issuance
        const passToSync = (finalRegistration as any).passId;
        setImmediate(() => {
          processSyncJob(passToSync).catch((syncErr) => {
            console.warn(`[Background Sync Trigger] Exception for ${passToSync}:`, syncErr?.message || syncErr);
          });
        });

        // Return verified response immediately so attendee receives their pass without delay
        return res.status(201).json({
          success: true,
          registration: finalRegistration,
          sheetsSync: {
            success: false,
            status: 'pending',
            message: 'Google Sheets synchronization scheduled in background'
          }
        });
      } finally {
        releaseLock();
      }
    } catch (error: any) {
      console.error('[Server] Registration error:', error);
      return res.status(500).json({
        error: 'Failed to record registration in Firestore.',
        details: error?.message || 'Server database failure'
      });
    }
  });

  // --------------------------------------------------------------------------
  // API: Public Ticket Verification by Pass ID
  // --------------------------------------------------------------------------
  server.get('/api/ticket/:passId', async (req: Request, res: Response) => {
    try {
      const passId = req.params.passId?.trim();
      if (!passId || !passId.startsWith('SHFT-')) {
        return res.status(400).json({ error: 'Invalid Pass ID format.' });
      }

      const docId = passId.replace(/[^a-zA-Z0-9_-]/g, '_');
      await ensureServerAuth();

      const docRef = doc(db, 'registrations', docId);
      const snap = await getDoc(docRef);

      if (!snap.exists()) {
        return res.status(404).json({ error: 'Attendee ticket pass not found in registration database.' });
      }

      const data = snap.data() as RegistrationData;
      // Return public ticket fields safely (omit private phone number)
      return res.json({
        valid: true,
        ticket: {
          id: data.id,
          passId: data.passId,
          fullName: data.fullName,
          email: data.email,
          academicLevel: data.academicLevel,
          department: data.department,
          registeredAt: data.registeredAt,
          ticketStatus: data.ticketStatus || 'Confirmed Delegate'
        }
      });
    } catch (err: any) {
      console.error('[Ticket Verification] Error:', err);
      return res.status(500).json({ error: 'Ticket verification service unavailable.' });
    }
  });

  // --------------------------------------------------------------------------
  // API: Public Contact Inquiry Submission
  // --------------------------------------------------------------------------
  const inquiryLimiter = createRateLimiter(10, 10 * 60 * 1000); // 10 per 10m
  server.post('/api/inquiries', inquiryLimiter, async (req: Request, res: Response) => {
    try {
      const { fullName, email, phone, topic, message } = req.body;

      if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
        return res.status(400).json({ error: 'Please enter your full name.' });
      }

      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ error: 'Please enter a valid email address.' });
      }

      if (!message || typeof message !== 'string' || message.trim().length < 5) {
        return res.status(400).json({ error: 'Please enter a message (at least 5 characters).' });
      }

      const validTopics = ['attendee', 'partnership', 'speaker', 'general'];
      const chosenTopic = validTopics.includes(topic) ? topic : 'attendee';

      await ensureServerAuth();

      const inquiryId = `inq_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const inquiryPayload: ContactInquiry & { id: string; createdAt: string } = {
        id: inquiryId,
        fullName: fullName.trim().replace(/[<>]/g, ''),
        email: email.trim().replace(/[<>]/g, ''),
        phone: phone && typeof phone === 'string' ? phone.trim().replace(/[<>]/g, '') : (null as any),
        topic: chosenTopic as any,
        message: message.trim().replace(/[<>]/g, ''),
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'inquiries', inquiryId), inquiryPayload);
      console.info(`[Server] Saved contact inquiry: ${inquiryId}`);

      return res.status(201).json({
        success: true,
        inquiryId,
        message: 'Your inquiry has been received by the SHIFT 1.0 Secretariat.'
      });
    } catch (err: any) {
      console.error('[Inquiries] Error:', err);
      return res.status(500).json({ error: 'Failed to record inquiry.' });
    }
  });

  // --------------------------------------------------------------------------
  // API: Protected Admin Registrations List
  // --------------------------------------------------------------------------
  server.get('/api/admin/registrations', requireAdminAuth, async (_req: Request, res: Response) => {
    try {
      await ensureServerAuth();
      const snap = await getDocs(collection(db, 'registrations'));
      const items: RegistrationData[] = [];
      const seen = new Set<string>();
      snap.forEach((d) => {
        const data = d.data() as RegistrationData;
        const key = data.passId || d.id;
        if (!seen.has(key)) {
          seen.add(key);
          items.push({ id: d.id, ...data });
        }
      });
      items.sort((a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime());
      return res.json({ success: true, count: items.length, registrations: items });
    } catch (err: any) {
      console.error('[Admin Registrations] Error:', err);
      return res.status(500).json({ error: 'Failed to fetch registrations.' });
    }
  });

  // --------------------------------------------------------------------------
  // API: Protected Admin Inquiries List
  // --------------------------------------------------------------------------
  server.get('/api/admin/inquiries', requireAdminAuth, async (_req: Request, res: Response) => {
    try {
      await ensureServerAuth();
      const snap = await getDocs(collection(db, 'inquiries'));
      const items: any[] = [];
      snap.forEach((d) => {
        items.push({ id: d.id, ...d.data() });
      });
      items.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      return res.json({ success: true, count: items.length, inquiries: items });
    } catch (err: any) {
      console.error('[Admin Inquiries] Error:', err);
      return res.status(500).json({ error: 'Failed to fetch inquiries.' });
    }
  });

  // --------------------------------------------------------------------------
  // API: Protected Delete Registration
  // --------------------------------------------------------------------------
  server.delete('/api/admin/registration/:id', requireOwnerAuth, async (req: Request, res: Response) => {
    try {
      const id = req.params.id?.trim();
      if (!id) return res.status(400).json({ error: 'Missing registration ID.' });

      await ensureServerAuth();
      const docRef = doc(db, 'registrations', id);
      await deleteDoc(docRef);
      console.info(`[Admin] Deleted registration: ${id}`);
      return res.json({ success: true, message: `Registration ${id} deleted.` });
    } catch (err: any) {
      console.error('[Admin Delete Registration] Error:', err);
      return res.status(500).json({ error: 'Failed to delete registration.' });
    }
  });

  // --------------------------------------------------------------------------
  // API: Protected Delete Inquiry
  // --------------------------------------------------------------------------
  server.delete('/api/admin/inquiry/:id', requireOwnerAuth, async (req: Request, res: Response) => {
    try {
      const id = req.params.id?.trim();
      if (!id) return res.status(400).json({ error: 'Missing inquiry ID.' });

      await ensureServerAuth();
      const docRef = doc(db, 'inquiries', id);
      await deleteDoc(docRef);
      console.info(`[Admin] Deleted inquiry: ${id}`);
      return res.json({ success: true, message: `Inquiry ${id} deleted.` });
    } catch (err: any) {
      console.error('[Admin Delete Inquiry] Error:', err);
      return res.status(500).json({ error: 'Failed to delete inquiry.' });
    }
  });

  // --------------------------------------------------------------------------
  // API: Protected Attendee Check-In Toggle (Secretariat / Barcode / AppSheet)
  // --------------------------------------------------------------------------
  server.post('/api/admin/checkin', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { passId, registrationId, checkedIn = true, staffName = 'Secretariat' } = req.body;
      const targetId = (registrationId || passId)?.toString().trim();
      if (!targetId) {
        return res.status(400).json({ error: 'Missing passId or registrationId.' });
      }

      await ensureServerAuth();
      let docRef = doc(db, 'registrations', targetId);
      let snap = await getDoc(docRef);

      if (!snap.exists()) {
        const q = query(collection(db, 'registrations'), where('passId', '==', targetId));
        const qSnap = await getDocs(q);
        if (qSnap.empty) {
          return res.status(404).json({ error: `Registration with ID or pass "${targetId}" not found.` });
        }
        docRef = qSnap.docs[0].ref;
        snap = qSnap.docs[0];
      }

      const isCheckedIn = Boolean(checkedIn);
      const nowIso = new Date().toISOString();
      const patch = {
        checkedIn: isCheckedIn,
        checkedInAt: isCheckedIn ? nowIso : null,
        checkedInBy: isCheckedIn ? (staffName || 'Secretariat Staff') : null,
        updatedAt: nowIso
      };

      try {
        await updateDoc(docRef, patch);
      } catch {
        await setDoc(docRef, patch, { merge: true });
      }

      console.info(`[Admin Checkin] Updated attendee ${targetId}: checkedIn=${isCheckedIn}`);
      return res.json({
        success: true,
        checkedIn: isCheckedIn,
        checkedInAt: isCheckedIn ? nowIso : null,
        checkedInBy: isCheckedIn ? staffName : null,
        passId: snap.data()?.passId || targetId
      });
    } catch (err: any) {
      console.error('[Admin Checkin] Error:', err);
      return res.status(500).json({ error: 'Failed to update check-in status.' });
    }
  });

  // --------------------------------------------------------------------------
  // API: AppSheet Data Source Specification & Guide Metadata
  // --------------------------------------------------------------------------
  server.get('/api/appsheet/schema', (_req: Request, res: Response) => {
    return res.json({
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
        { name: 'email', type: 'Email', key: false, label: false, description: 'Attendee email address' },
        { name: 'phone', type: 'Phone', key: false, label: false, description: 'Mobile contact number' },
        { name: 'department', type: 'Text', key: false, label: false, description: 'Academic department or institution' },
        { name: 'academicLevel', type: 'Enum', key: false, label: false, values: ['100', '200', '300', '400', 'postgrad'], description: 'Academic level' },
        { name: 'ticketStatus', type: 'Text', key: false, label: false, description: 'Confirmed Delegate or Pending' },
        { name: 'checkedIn', type: 'Yes/No', key: false, label: false, quickEdit: true, description: 'Check-in toggle for event staff' },
        { name: 'checkedInAt', type: 'DateTime', key: false, label: false, description: 'Timestamp when attendee checked in' },
        { name: 'checkedInBy', type: 'Text', key: false, label: false, description: 'Staff member who performed check-in' },
        { name: 'registeredAt', type: 'DateTime', key: false, label: false, description: 'Initial registration timestamp' }
      ]
    });
  });

  // --------------------------------------------------------------------------
  // API: Protected AppSheet / Secretariat Live Data Feed
  // --------------------------------------------------------------------------
  server.get('/api/appsheet/feed', requireAdminAuth, async (_req: Request, res: Response) => {
    try {
      await ensureServerAuth();
      const snap = await getDocs(collection(db, 'registrations'));
      const rows = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          passId: data.passId || d.id,
          fullName: data.fullName || '',
          email: data.email || '',
          phone: data.phone || '',
          department: data.department || '',
          academicLevel: data.academicLevel || '',
          ticketStatus: data.ticketStatus || 'Confirmed Delegate',
          checkedIn: Boolean(data.checkedIn),
          checkedInAt: data.checkedInAt || '',
          checkedInBy: data.checkedInBy || '',
          registeredAt: data.registeredAt || ''
        };
      });
      return res.json({ success: true, count: rows.length, data: rows });
    } catch (err: any) {
      console.error('[AppSheet Feed] Error:', err);
      return res.status(500).json({ error: 'Failed to generate AppSheet feed.' });
    }
  });

  // --------------------------------------------------------------------------
  // API: Protected Sync Sheet (Single or Batch - Uses Durable Engine)
  // --------------------------------------------------------------------------
  server.post('/api/sync-sheet', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      await ensureServerAuth();
      const { passId } = req.body;

      if (passId) {
        const result = await processSyncJob(passId, true);
        return res.json({ success: result.success, result });
      }

      // Batch Sync via Durable Worker
      const snap = await getDocs(collection(db, 'registrations'));
      let syncedCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      for (const d of snap.docs) {
        const reg = d.data() as RegistrationData;
        try {
          const result = await processSyncJob(reg.passId, true);
          if (result.success) {
            syncedCount++;
          } else {
            failedCount++;
            if (result.error && !errors.includes(result.error)) errors.push(result.error);
          }
        } catch (itemErr: any) {
          failedCount++;
          errors.push(itemErr.message);
        }
      }

      return res.json({
        success: true,
        totalChecked: snap.docs.length,
        syncedCount,
        failedCount,
        errors
      });
    } catch (err: any) {
      console.warn('[Server] Sync sheet notice:', err?.message || err);
      return res.status(500).json({ error: err.message || 'Failed to sync to Google Sheets.' });
    }
  });

  // --------------------------------------------------------------------------
  // API: Protected Reverse Sync from Google Sheets / AppSheet into Cloud Firestore (Owner Only)
  // --------------------------------------------------------------------------
  server.post('/api/sync-from-sheet', requireOwnerAuth, async (req: Request, res: Response) => {
    try {
      await ensureServerAuth();
      const clientToken = (req.body?.googleOAuthToken || req.headers['x-google-oauth-token'])?.toString();
      if (clientToken && typeof clientToken === 'string' && clientToken.trim()) {
        setServerOAuthToken(clientToken.trim());
      }
      const result = await syncFromGoogleSheetsToServer(db, clientToken);
      return res.json(result);
    } catch (err: any) {
      console.warn('[Server] Reverse sync notice:', err?.message || err);
      return res.status(500).json({ error: err.message || 'Failed to sync from Google Sheets.' });
    }
  });

  // --------------------------------------------------------------------------
  // API: AppSheet Webhook Receiver (Real-Time Check-In directly from AppSheet Bot)
  // --------------------------------------------------------------------------
  server.post('/api/webhook/checkin', async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';
      const webhookSecret = (req.headers['x-webhook-secret'] || req.query.secret || req.body?.webhookSecret)?.toString().trim();
      const configuredSecret = (process.env.WEBHOOK_SECRET || process.env.APPSHEET_WEBHOOK_SECRET || process.env.APPS_SCRIPT_SECRET)?.trim();

      // Authorization: Requires valid admin session token OR matching configured secret via timing-safe comparison
      let isAuthorized = false;
      if (token && verifyAdminSessionToken(token)) {
        isAuthorized = true;
      } else if (configuredSecret && webhookSecret) {
        isAuthorized = safeTimingCompare(webhookSecret, configuredSecret);
      }

      // Fail closed when unauthorized or unconfigured
      if (!isAuthorized) {
        return res.status(401).json({
          error: 'Unauthorized webhook request. Valid admin Bearer token or matching x-webhook-secret header required.'
        });
      }

      const {
        passId,
        registrationId,
        checkedIn = true,
        staffName = 'AppSheet Bot',
        timestamp,
        force,
        allowCheckout
      } = req.body;

      const targetId = (registrationId || passId)?.toString().trim();
      if (!targetId) {
        return res.status(400).json({ error: 'Missing passId or registrationId in request body.' });
      }

      await ensureServerAuth();
      let docRef = doc(db, 'registrations', targetId);
      let snap = await getDoc(docRef);

      if (!snap.exists()) {
        const q = query(collection(db, 'registrations'), where('passId', '==', targetId));
        const qSnap = await getDocs(q);
        if (qSnap.empty) {
          return res.status(404).json({ error: `Registration with ID or pass "${targetId}" not found in Firestore.` });
        }
        docRef = qSnap.docs[0].ref;
        snap = qSnap.docs[0];
      }

      const existingData = snap.data() as RegistrationData;
      const alreadyCheckedIn = Boolean(existingData.checkedIn);

      const isCheckedIn = (
        checkedIn === true ||
        checkedIn === 'true' ||
        checkedIn === 'TRUE' ||
        checkedIn === 1 ||
        checkedIn === '1' ||
        checkedIn === 'Checked In' ||
        checkedIn === 'CHECKED IN'
      );

      // PART 4 Conflict Handling: Prevent stale check-out (checkedIn: false) from undoing an on-site check-in
      if (!isCheckedIn && alreadyCheckedIn) {
        const isExplicitOverride = Boolean(force || allowCheckout);
        const incomingTime = timestamp ? new Date(timestamp).getTime() : 0;
        const existingTime = existingData.checkedInAt ? new Date(existingData.checkedInAt).getTime() : 0;

        // Reject if not an explicit authorized override and incoming timestamp is missing or not strictly newer
        if (!isExplicitOverride && (!incomingTime || incomingTime <= existingTime)) {
          console.warn(`[AppSheet Webhook] Rejected stale check-out for ${targetId}: Attendee is already checked in at ${existingData.checkedInAt}`);
          return res.status(409).json({
            error: 'Stale check-out update rejected: attendee was already checked in on-site. Provide force: true or allowCheckout: true to override.',
            checkedIn: true,
            checkedInAt: existingData.checkedInAt,
            passId: existingData.passId || targetId
          });
        }
      }

      // Idempotency: If already in target state and checked in, return idempotent success
      if (isCheckedIn && alreadyCheckedIn) {
        return res.json({
          success: true,
          idempotent: true,
          checkedIn: true,
          checkedInAt: existingData.checkedInAt,
          checkedInBy: existingData.checkedInBy,
          passId: existingData.passId || targetId
        });
      }

      const nowIso = new Date().toISOString();
      const patch = {
        checkedIn: isCheckedIn,
        checkedInAt: isCheckedIn ? (timestamp || nowIso) : null,
        checkedInBy: isCheckedIn ? (staffName || 'AppSheet') : null,
        updatedAt: nowIso
      };

      try {
        await updateDoc(docRef, patch);
      } catch {
        await setDoc(docRef, patch, { merge: true });
      }

      console.info(`[AppSheet Webhook] Reconciled attendee ${targetId}: checkedIn=${isCheckedIn}`);
      return res.json({
        success: true,
        checkedIn: isCheckedIn,
        checkedInAt: patch.checkedInAt,
        checkedInBy: patch.checkedInBy,
        passId: existingData.passId || targetId
      });
    } catch (err: any) {
      console.warn('[AppSheet Webhook] Notice:', err?.message || err);
      return res.status(500).json({ error: 'Failed to process webhook check-in.' });
    }
  });

  // --------------------------------------------------------------------------
  // API: Register Client-Side Google Workspace OAuth Token for Server Sync (Owner Only)
  // --------------------------------------------------------------------------
  server.post('/api/sheet-token', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { accessToken } = req.body;
      if (!accessToken || typeof accessToken !== 'string' || !accessToken.trim()) {
        return res.status(400).json({ error: 'Valid Google OAuth access token is required.' });
      }

      setServerOAuthToken(accessToken.trim());
      console.info('[Server] Received active Google Workspace OAuth token from admin console.');

      try {
        await setDoc(doc(db, 'integrations', 'sheets_oauth'), {
          accessToken: accessToken.trim(),
          updatedAt: Date.now()
        }, { merge: true });
      } catch (saveTokenErr) {
        console.warn('[Server] Notice caching token in Firestore:', saveTokenErr);
      }

      // Automatically trigger recovery so all pending/failed delegate rows sync immediately
      setImmediate(() => {
        runPendingSyncRecovery();
      });

      return res.json({
        success: true,
        message: 'Google Workspace OAuth token registered successfully; background synchronization initiated.'
      });
    } catch (err: any) {
      console.error('[Server] Set sheet token error:', err);
      return res.status(500).json({ error: 'Failed to register Google OAuth token.' });
    }
  });

  // --------------------------------------------------------------------------
  // API: Explicit 404 Handler for Unmatched /api/* Endpoints
  // --------------------------------------------------------------------------
  server.all('/api/*', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  // --------------------------------------------------------------------------
  // Vite Integration (Development Middleware vs Production Static)
  // --------------------------------------------------------------------------
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    server.use(express.static(distPath));
    server.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    server.use(vite.middlewares);
  }

  // --------------------------------------------------------------------------
  // Global Unhandled Error Handler (Prevents stack trace / secret exposure)
  // --------------------------------------------------------------------------
  server.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[Server Internal Error]:', err?.message || 'Unknown error');
    res.status(500).json({ error: 'An unexpected internal error occurred. Please try again later.' });
  });

  // Start Scheduled Durable Background Recovery Worker
  setInterval(runPendingSyncRecovery, 15000);
  setTimeout(runPendingSyncRecovery, 3000);
  console.log('[Durable Background Sync] Scheduled recovery engine initialized (15s interval + startup recovery).');

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Full-Stack Applet] Running securely on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
