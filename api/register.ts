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

    const { fullName, phone, email, academicLevel, department, passId: incomingPassId } = body || {};

    const cleanedName = typeof fullName === 'string' ? fullName.trim() : '';
    const cleanedPhone = typeof phone === 'string' ? phone.trim() : '';
    const cleanedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const cleanedDept = typeof department === 'string' ? department.trim() : 'General Student';

    if (!cleanedName || cleanedName.length < 2) {
      return res.status(400).json({ error: 'Full name is required (minimum 2 characters).' });
    }

    const rawDigits = cleanedPhone.replace(/\D/g, '');
    if (rawDigits.length < 7) {
      return res.status(400).json({ error: 'Valid phone number is required (at least 7 digits).' });
    }

    if (cleanedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanedEmail)) {
      return res.status(400).json({ error: 'Invalid email format.' });
    }

    const validLevels = ['100', '200', '300', '400', 'postgrad'];
    const chosenLevel = validLevels.includes(String(academicLevel)) ? String(academicLevel) : '300';

    // Generate unique canonical pass ID if not provided
    const passId =
      incomingPassId && typeof incomingPassId === 'string' && incomingPassId.startsWith('SHFT-')
        ? incomingPassId
        : `SHFT-${Math.floor(1000 + Math.random() * 9000)}-UENR`;

    const nowIso = new Date().toISOString();
    const registration = {
      id: passId.replace(/[^a-zA-Z0-9_-]/g, '_'),
      passId,
      fullName: cleanedName,
      phone: cleanedPhone,
      email: cleanedEmail || undefined,
      academicLevel: chosenLevel,
      department: cleanedDept,
      registeredAt: nowIso,
      ticketStatus: 'Confirmed Delegate',
      sheetsSyncStatus: 'pending'
    };

    return res.status(200).json({
      success: true,
      message: 'Registration validated successfully.',
      registration
    });
  } catch (err: any) {
    console.error('[Vercel Register API] Error:', err);
    return res.status(500).json({ error: 'Registration processing failed.' });
  }
}
