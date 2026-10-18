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

  try {
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
    }

    const { fullName, email, phone, message } = body || {};

    const cleanName = typeof fullName === 'string' ? fullName.trim() : '';
    const cleanEmail = typeof email === 'string' ? email.trim() : '';
    const cleanPhone = typeof phone === 'string' ? phone.trim() : '';
    const cleanMsg = typeof message === 'string' ? message.trim() : '';

    if (!cleanName || cleanName.length < 2) {
      return res.status(400).json({ error: 'Full name is required (minimum 2 characters).' });
    }

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ error: 'Valid email address is required.' });
    }

    if (!cleanMsg || cleanMsg.length < 5) {
      return res.status(400).json({ error: 'Message must be at least 5 characters long.' });
    }

    const inquiryId = `inq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    return res.status(200).json({
      success: true,
      message: 'Inquiry received by secretariat.',
      inquiryId
    });
  } catch (err: any) {
    console.error('[Inquiries API] Error:', err);
    return res.status(500).json({ error: 'Failed to process contact inquiry.' });
  }
}
