import crypto from 'crypto';

// Authorized SHA-256 hashes for secretariat passcode access
const SERVER_ADMIN_HASHES: string[] = [
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
  'fe7f9ed9a08e56b67449a52545a086309a695cc7e995e99deed30d73c41dc273'
];

const SOLE_OWNER_EMAIL = 'arnoldodjidja01@gmail.com';
const SERVER_SESSION_SECRET = process.env.SESSION_SECRET || 'shift1_secretariat_production_session_signing_key_secure_2026';

function generateAdminSessionToken(subject: string, role: 'owner' | 'staff' = 'staff'): string {
  const payload = {
    sub: subject,
    role,
    iat: Date.now(),
    exp: Date.now() + 8 * 60 * 60 * 1000 // 8 hours
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', SERVER_SESSION_SECRET).update(data).digest('base64url');
  return `${data}.${signature}`;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { passcode, userEmail } = req.body || {};

    // 1. Check Owner Email match
    if (userEmail && typeof userEmail === 'string') {
      const cleanEmail = userEmail.trim().toLowerCase();
      if (cleanEmail === SOLE_OWNER_EMAIL.toLowerCase()) {
        const sessionToken = generateAdminSessionToken(cleanEmail, 'owner');
        return res.status(200).json({
          success: true,
          role: 'Sole Event Administrator & Owner',
          email: cleanEmail,
          token: sessionToken,
          isOwner: true
        });
      }
    }

    // 2. Check Passcode using cryptographic hash comparison
    if (passcode && typeof passcode === 'string') {
      const cleanPasscode = passcode.trim();

      // Check dynamic environment variable override
      const envPasscode = (process.env.ADMIN_PASSCODE || process.env.VITE_ADMIN_PASSCODE || process.env.ADMIN_PASSWORD || '').trim();
      if (envPasscode && cleanPasscode === envPasscode) {
        const sessionToken = generateAdminSessionToken('secretariat_staff_user', 'staff');
        return res.status(200).json({
          success: true,
          role: 'Event Secretariat Staff',
          token: sessionToken,
          isOwner: false
        });
      }

      // Check SHA-256 hash match with constant-time equality
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
        return res.status(200).json({
          success: true,
          role: 'Event Secretariat Staff',
          token: sessionToken,
          isOwner: false
        });
      }
    }

    return res.status(401).json({
      error: 'Invalid administrator credentials. Access denied.'
    });
  } catch (err: any) {
    console.error('[Vercel Login API] Error:', err);
    return res.status(500).json({ error: 'Server authentication failed.' });
  }
}
