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
    // Robust body parsing handling string, buffer, or stream bodies on Vercel
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (_) {
        body = {};
      }
    } else if (Buffer.isBuffer(body)) {
      try {
        body = JSON.parse(body.toString('utf8'));
      } catch (_) {
        body = {};
      }
    } else if (!body && req.readable) {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      }
      try {
        body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      } catch (_) {
        body = {};
      }
    }

    const { passcode, userEmail } = body || {};

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
      if (envPasscode && (cleanPasscode === envPasscode || cleanPasscode.toLowerCase() === envPasscode.toLowerCase())) {
        const sessionToken = generateAdminSessionToken('secretariat_staff_user', 'staff');
        return res.status(200).json({
          success: true,
          role: 'Event Secretariat Staff',
          token: sessionToken,
          isOwner: false
        });
      }

      // Check SHA-256 hash match with constant-time equality
      const hashExact = crypto.createHash('sha256').update(cleanPasscode).digest('hex');
      const hashLower = crypto.createHash('sha256').update(cleanPasscode.toLowerCase()).digest('hex');

      const bufExact = Buffer.from(hashExact, 'utf8');
      const bufLower = Buffer.from(hashLower, 'utf8');

      let matched = false;
      for (const expectedHash of SERVER_ADMIN_HASHES) {
        const expBuf = Buffer.from(expectedHash, 'utf8');
        if (
          (expBuf.length === bufExact.length && crypto.timingSafeEqual(expBuf, bufExact)) ||
          (expBuf.length === bufLower.length && crypto.timingSafeEqual(expBuf, bufLower))
        ) {
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
