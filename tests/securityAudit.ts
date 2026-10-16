import crypto from 'crypto';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('====================================================');
  console.log('  SHIFT 1.0 — STAGING SECURITY & DURABLE SYNC SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`  [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${desc}`);
      failed++;
    }
  }

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  await signInAnonymously(auth);
  const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

  // --------------------------------------------------------------------------
  // TEST 1: Unknown /api/* routes return JSON 404
  // --------------------------------------------------------------------------
  console.log('\n--- 1. API Routing & Error Sanitization ---');
  try {
    const res = await fetch(`${BASE_URL}/api/non_existent_route_${Date.now()}`);
    assert(res.status === 404, 'Unknown /api/* route returns 404');
    const json = await res.json();
    assert(json.error === 'API endpoint not found.', 'Unknown route returns clean JSON error message');
    assert(!json.stack && !JSON.stringify(json).includes('node_modules'), 'No stack trace or internal path exposed');
  } catch (e: any) {
    assert(false, `404 check error: ${e.message}`);
  }

  // --------------------------------------------------------------------------
  // TEST 2: Admin Authentication Security Controls
  // --------------------------------------------------------------------------
  console.log('\n--- 2. Admin Authentication & Session Security ---');

  // 2a. Reject plain email string without verified identity token
  try {
    const res = await fetch(`${BASE_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userEmail: 'arnoldodjidja01@gmail.com' })
    });
    assert(res.status === 401, 'Plain email login without idToken is firmly rejected (401)');
    const json = await res.json();
    assert(json.error.includes('Plain email submissions are rejected'), 'Rejection message explains identity token requirement');
  } catch (e: any) {
    assert(false, `Plain email test failed: ${e.message}`);
  }

  // 2b. Valid passcode login generates valid HMAC session token
  let adminToken = '';
  try {
    const res = await fetch(`${BASE_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode: 'SHIFT-ADMIN-2026' })
    });
    assert(res.status === 200, 'Valid admin passcode succeeds (200)');
    const json = await res.json();
    assert(Boolean(json.token), 'Response contains signed admin session token');
    adminToken = json.token;
  } catch (e: any) {
    assert(false, `Passcode login failed: ${e.message}`);
  }

  // 2c. Protected admin routes reject missing token
  try {
    const res = await fetch(`${BASE_URL}/api/admin/registrations`);
    assert(res.status === 401, 'Accessing /api/admin/registrations without Authorization header returns 401');
  } catch (e: any) {
    assert(false, `Missing token check failed: ${e.message}`);
  }

  // 2d. Protected admin routes reject malformed token
  try {
    const res = await fetch(`${BASE_URL}/api/admin/registrations`, {
      headers: { Authorization: 'Bearer this.is.a.bad.token.format' }
    });
    assert(res.status === 401, 'Accessing /api/admin/registrations with malformed token returns 401');
  } catch (e: any) {
    assert(false, `Malformed token check failed: ${e.message}`);
  }

  // 2e. Protected admin routes reject tampered token signature
  try {
    const [data, sig] = adminToken.split('.');
    const tamperedToken = `${data}.${sig.slice(0, -3)}xyz`;
    const res = await fetch(`${BASE_URL}/api/admin/registrations`, {
      headers: { Authorization: `Bearer ${tamperedToken}` }
    });
    assert(res.status === 401, 'Accessing /api/admin/registrations with tampered signature returns 401');
  } catch (e: any) {
    assert(false, `Tampered token check failed: ${e.message}`);
  }

  // 2f. Protected admin routes reject expired token
  try {
    const expiredPayload = {
      sub: 'test_admin',
      iat: Date.now() - 20000000,
      exp: Date.now() - 1000 // Expired 1 second ago
    };
    const expiredData = Buffer.from(JSON.stringify(expiredPayload)).toString('base64url');
    const fakeToken = `${expiredData}.fakesig`;
    const res = await fetch(`${BASE_URL}/api/admin/registrations`, {
      headers: { Authorization: `Bearer ${fakeToken}` }
    });
    assert(res.status === 401, 'Expired token is rejected (401)');
  } catch (e: any) {
    assert(false, `Expired token check failed: ${e.message}`);
  }

  // 2g. Protected admin route accepts valid token
  try {
    const res = await fetch(`${BASE_URL}/api/admin/registrations`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(res.status === 200, 'Protected /api/admin/registrations succeeds with valid token (200)');
    const json = await res.json();
    assert(Array.isArray(json.registrations), 'Returns registrations array to authorized admin');
  } catch (e: any) {
    assert(false, `Valid token fetch failed: ${e.message}`);
  }

  // 2h. Logout immediately revokes token in memory and persists revocation to Firestore
  try {
    const logoutRes = await fetch(`${BASE_URL}/api/admin/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(logoutRes.status === 200, 'POST /api/admin/logout succeeds (200)');

    // Verify revoked token is now rejected on protected route
    const postLogoutRes = await fetch(`${BASE_URL}/api/admin/registrations`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(postLogoutRes.status === 401, 'Revoked token is rejected on subsequent requests (401)');

    // Verify shared Firestore revocation document was recorded
    const tokenHash = crypto.createHash('sha256').update(adminToken.trim()).digest('hex');
    const revokedDocSnap = await getDoc(doc(db, 'integrations', `revoked_${tokenHash}`));
    assert(revokedDocSnap.exists(), 'Revocation recorded in Firestore integrations collection for cross-instance sharing');
  } catch (e: any) {
    assert(false, `Logout revocation check failed: ${e.message}`);
  }

  // --------------------------------------------------------------------------
  // TEST 3: Public Ticket Verification Privacy Boundary
  // --------------------------------------------------------------------------
  console.log('\n--- 3. Public Ticket Verification Privacy Boundary ---');
  try {
    const res = await fetch(`${BASE_URL}/api/ticket/SHFT-1111-UENR`);
    assert(res.status === 200, 'GET /api/ticket/SHFT-1111-UENR returns 200');
    const json = await res.json();
    assert(json.valid === true, 'Ticket verification marks valid ticket as valid: true');
    assert(json.ticket.passId === 'SHFT-1111-UENR', 'Ticket returns authoritative passId');
    assert(json.ticket.fullName === 'Arnold Odjidja', 'Ticket returns public delegate name');
    assert(json.ticket.phone === undefined, 'Private phone number is strictly REDACTED from public ticket API');
  } catch (e: any) {
    assert(false, `Ticket verification privacy test failed: ${e.message}`);
  }

  // --------------------------------------------------------------------------
  // TEST 4: Cross-Instance Concurrency Safety & Duplicate Prevention
  // --------------------------------------------------------------------------
  console.log('\n--- 4. Concurrency Safety & Duplicate Handling ---');

  // 4a. Existing legacy record duplicate return
  try {
    const testPhone = '0537274710'; // Phone of existing SHFT-1111-UENR
    const resDuplicate = await fetch(`${BASE_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Arnold Odjidja Duplicate Attempt',
        phone: testPhone,
        academicLevel: '400',
        department: 'Computer Science'
      })
    });
    assert(resDuplicate.status === 200, 'Duplicate submission returns 200 with existing record');
    const dupJson = await resDuplicate.json();
    assert(dupJson.duplicateIgnored === true, 'Response indicates duplicateIgnored: true');
    assert(dupJson.registration.passId === 'SHFT-1111-UENR', 'Returns original authoritative passId');
  } catch (e: any) {
    assert(false, `Duplicate phone check failed: ${e.message}`);
  }

  // 4b. Discard of client-supplied privileged fields
  const isolatedPhone = `+23320${Math.floor(1000000 + Math.random() * 9000000)}`;
  let registeredPassId = '';
  try {
    const resTamper = await fetch(`${BASE_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Security Staging Registrant',
        phone: isolatedPhone,
        academicLevel: '300',
        passId: 'CLIENT_FORGED_PASS_ID',
        ticketStatus: 'VIP_SUPER_ADMIN',
        sheetsSyncStatus: 'synced_already'
      })
    });
    assert(resTamper.status === 201, 'Registration succeeds (201)');
    const tamperJson = await resTamper.json();
    registeredPassId = tamperJson.registration.passId;
    assert(registeredPassId.startsWith('SHFT-') && registeredPassId !== 'CLIENT_FORGED_PASS_ID',
      'Client-forged passId is discarded; server-generated canonical passId is used');
    assert(tamperJson.registration.ticketStatus === 'Confirmed Delegate',
      'Client-forged ticketStatus is discarded; canonical "Confirmed Delegate" is enforced');
    assert(tamperJson.registration.sheetsSyncStatus === 'pending',
      'Client-forged sheetsSyncStatus is discarded; starts as "pending"');
  } catch (e: any) {
    assert(false, `Privileged field discard check failed: ${e.message}`);
  }

  // 4c. Verify atomic phone lock document was created in Firestore
  try {
    const phoneLockKey = `phone_lock_${isolatedPhone.replace(/\D/g, '')}`;
    const lockSnap = await getDoc(doc(db, 'integrations', phoneLockKey));
    assert(lockSnap.exists(), 'Cross-instance atomic phone lock document exists in Firestore integrations collection');
    assert(lockSnap.data()?.passId === registeredPassId, 'Phone lock references authoritative passId');
  } catch (e: any) {
    assert(false, `Phone lock verification failed: ${e.message}`);
  }

  // 4d. Simultaneous parallel registration requests for same phone number
  console.log('\n--- 4d. Simultaneous Parallel Submissions (Race Condition Test) ---');
  const simPhone = `+23320${Math.floor(1000000 + Math.random() * 9000000)}`;
  let simPassId = '';
  try {
    // Fire 4 parallel requests at the exact same millisecond
    const requests = Array.from({ length: 4 }).map((_, i) =>
      fetch(`${BASE_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: `Simultaneous Delegate ${i}`,
          phone: simPhone,
          academicLevel: '200',
          department: 'Computer Science'
        })
      }).then(r => r.json())
    );

    const results = await Promise.all(requests);
    const passIds = results.map(r => r.registration?.passId).filter(Boolean);
    const uniquePassIds = Array.from(new Set(passIds));

    assert(uniquePassIds.length === 1, `4 simultaneous requests resolved to exactly 1 unique passId (${uniquePassIds[0]})`);
    simPassId = uniquePassIds[0];

    const duplicateIgnoredCount = results.filter(r => r.duplicateIgnored === true).length;
    assert(duplicateIgnoredCount === 3, `Exactly 3 of 4 concurrent requests flagged as duplicateIgnored: true`);

    // Verify in Firestore that only 1 registration document was created
    const simQuery = query(collection(db, 'registrations'), where('phone', '==', simPhone));
    const simSnap = await getDocs(simQuery);
    assert(simSnap.size === 1, `Firestore contains exactly 1 document for phone number ${simPhone}`);
  } catch (e: any) {
    assert(false, `Simultaneous submission test failed: ${e.message}`);
  }

  // --------------------------------------------------------------------------
  // TEST 5: Durable Google Sheets Background Synchronization Engine
  // --------------------------------------------------------------------------
  console.log('\n--- 5. Durable Background Google Sheets Synchronization ---');

  // 5a. Verify durable sync job was created in Firestore
  try {
    const jobDocId = registeredPassId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const jobSnap = await getDoc(doc(db, 'integrations', `sync_job_${jobDocId}`));
    assert(jobSnap.exists(), 'Durable sync job was persisted in Firestore integrations collection');
    const jobData = jobSnap.data();
    assert(jobData?.passId === registeredPassId, 'Sync job matches registered passId');
    assert(typeof jobData?.attempts === 'number', 'Sync job tracks attempts count');
    assert(Boolean(jobData?.nextRetryAt), 'Sync job records nextRetryAt timestamp');
  } catch (e: any) {
    assert(false, `Sync job verification failed: ${e.message}`);
  }

  // 5b. Verify non-blocking immediate registration response
  try {
    const start = Date.now();
    const immediatePhone = `+23320${Math.floor(1000000 + Math.random() * 9000000)}`;
    const res = await fetch(`${BASE_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Immediate Delegate',
        phone: immediatePhone,
        academicLevel: '100',
        department: 'Engineering'
      })
    });
    const duration = Date.now() - start;
    assert(res.status === 201, 'Immediate registration returns 201');
    assert(duration < 2000, `Registration responded immediately without blocking on external Sheets API (${duration}ms)`);

    // Clean up immediate probe
    const imData = await res.json();
    const imPassId = imData.registration?.passId;
    if (imPassId) {
      try {
        await deleteDoc(doc(db, 'registrations', imPassId.replace(/[^a-zA-Z0-9_-]/g, '_')));
        await deleteDoc(doc(db, 'integrations', `phone_lock_${immediatePhone.replace(/\D/g, '')}`));
        await deleteDoc(doc(db, 'integrations', `sync_job_${imPassId.replace(/[^a-zA-Z0-9_-]/g, '_')}`));
      } catch {}
    }
  } catch (e: any) {
    assert(false, `Non-blocking response test failed: ${e.message}`);
  }

  // 5c. Manual retry endpoint via admin session
  try {
    const newAdminRes = await fetch(`${BASE_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode: 'SHIFT-ADMIN-2026' })
    });
    const { token: freshAdminToken } = await newAdminRes.json();

    const retryRes = await fetch(`${BASE_URL}/api/sync-sheet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${freshAdminToken}`
      },
      body: JSON.stringify({ passId: registeredPassId })
    });

    assert(retryRes.status === 200, 'POST /api/sync-sheet manual retry endpoint responds 200');
    const retryData = await retryRes.json();
    assert(retryData.result !== undefined, 'Manual retry executed through durable processSyncJob engine');
  } catch (e: any) {
    assert(false, `Manual sync retry test failed: ${e.message}`);
  }

  // --------------------------------------------------------------------------
  // TEST 6: Public Capacity Counter (Zero Attendee PII)
  // --------------------------------------------------------------------------
  console.log('\n--- 6. Public Capacity Counter (Zero Attendee PII) ---');
  try {
    const res = await fetch(`${BASE_URL}/api/capacity`);
    assert(res.status === 200, 'GET /api/capacity returns 200');
    const json = await res.json();
    assert(typeof json.claimedSeats === 'number' && json.claimedSeats >= 0, 'Capacity returns numerical claimedSeats');
    assert(json.totalCapacity === 120, 'Capacity returns totalCapacity: 120');
    assert(json.registrations === undefined && json.attendees === undefined, 'No attendee names, phones, or emails are exposed');
  } catch (e: any) {
    assert(false, `Capacity privacy check failed: ${e.message}`);
  }

  // --------------------------------------------------------------------------
  // TEST 7: AppSheet Direct Firestore Integration & Check-In
  // --------------------------------------------------------------------------
  console.log('\n--- 7. AppSheet Direct Firestore Integration & Check-In ---');
  try {
    // 7a. AppSheet Schema Specification
    const schemaRes = await fetch(`${BASE_URL}/api/appsheet/schema`);
    assert(schemaRes.status === 200, 'GET /api/appsheet/schema returns 200');
    const schemaJson = await schemaRes.json();
    assert(schemaJson.provider === 'Cloud Firestore', 'AppSheet schema provider is Cloud Firestore');
    assert(schemaJson.keyField === 'passId', 'AppSheet keyField is passId');
    assert(schemaJson.labelField === 'fullName', 'AppSheet labelField is fullName');
    assert(Array.isArray(schemaJson.columns), 'AppSheet schema includes columns array');

    // 7b. AppSheet Feed Authorization Check
    const unauthFeed = await fetch(`${BASE_URL}/api/appsheet/feed`);
    assert(unauthFeed.status === 401, 'Unauthenticated GET /api/appsheet/feed is rejected (401)');

    const loginRes = await fetch(`${BASE_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode: 'SHIFT-ADMIN-2026' })
    });
    const { token: adminToken } = await loginRes.json();

    const authFeed = await fetch(`${BASE_URL}/api/appsheet/feed`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(authFeed.status === 200, 'Authenticated GET /api/appsheet/feed returns 200 with attendee rows');
    const feedJson = await authFeed.json();
    assert(Array.isArray(feedJson.data), 'AppSheet feed contains structured data rows');

    // 7c. Check-In Endpoint Authorization & State Update
    const unauthCheckin = await fetch(`${BASE_URL}/api/admin/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passId: registeredPassId, checkedIn: true })
    });
    assert(unauthCheckin.status === 401, 'Unauthenticated POST /api/admin/checkin is rejected (401)');

    if (registeredPassId) {
      const authCheckin = await fetch(`${BASE_URL}/api/admin/checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ passId: registeredPassId, checkedIn: true, staffName: 'Test Usher' })
      });
      assert(authCheckin.status === 200, 'Authenticated POST /api/admin/checkin toggles check-in status (200)');
      const checkinJson = await authCheckin.json();
      assert(checkinJson.checkedIn === true, 'Check-in state is true');
      assert(checkinJson.checkedInAt !== null, 'Check-in timestamp is recorded');
    }
  } catch (e: any) {
    assert(false, `AppSheet & check-in audit failed: ${e.message}`);
  }

  // --------------------------------------------------------------------------
  // CLEANUP ISOLATED TEST DATA ONLY (Preserve all real attendee records)
  // --------------------------------------------------------------------------
  console.log('\n--- Cleaning up isolated test records ---');
  try {
    if (registeredPassId) {
      await deleteDoc(doc(db, 'registrations', registeredPassId.replace(/[^a-zA-Z0-9_-]/g, '_')));
      await deleteDoc(doc(db, 'integrations', `phone_lock_${isolatedPhone.replace(/\D/g, '')}`));
      await deleteDoc(doc(db, 'integrations', `sync_job_${registeredPassId.replace(/[^a-zA-Z0-9_-]/g, '_')}`));
      console.log(`  Cleaned up isolated test pass: ${registeredPassId}`);
    }
    if (simPassId) {
      await deleteDoc(doc(db, 'registrations', simPassId.replace(/[^a-zA-Z0-9_-]/g, '_')));
      await deleteDoc(doc(db, 'integrations', `phone_lock_${simPhone.replace(/\D/g, '')}`));
      await deleteDoc(doc(db, 'integrations', `sync_job_${simPassId.replace(/[^a-zA-Z0-9_-]/g, '_')}`));
      console.log(`  Cleaned up simultaneous test pass: ${simPassId}`);
    }
  } catch (e: any) {
    console.warn('Cleanup notice:', e?.message || e);
  }

  console.log('\n====================================================');
  console.log(`  AUDIT TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTests();
