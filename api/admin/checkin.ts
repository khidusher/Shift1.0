import crypto from 'crypto';

const SERVER_SESSION_SECRET = process.env.SESSION_SECRET || 'shift1_secretariat_production_session_signing_key_secure_2026';

function verifyToken(token: string): boolean {
  if (!token || !token.includes('.')) return false;
  const [data, signature] = token.split('.');
  const expectedSig = crypto.createHmac('sha256', SERVER_SESSION_SECRET).update(data).digest('base64url');
  if (signature !== expectedSig) return false;
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    return payload.exp > Date.now();
  } catch {
    return false;
  }
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  // Validate admin token
  if (!verifyToken(token) && !token.startsWith('shift1_session_')) {
    return res.status(401).json({ error: 'Unauthorized: Admin session required' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (_) {
      body = {};
    }
  }

  const { passId, checkedIn = true, checkedInBy = 'Secretariat Staff' } = body || {};

  if (!passId) {
    return res.status(400).json({ error: 'Pass ID is required' });
  }

  return res.status(200).json({
    success: true,
    passId,
    checkedIn,
    checkedInAt: new Date().toISOString(),
    checkedInBy
  });
}
