export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const passId = (req.query?.passId || req.url?.split('/').pop()?.split('?')[0] || '').trim();

  if (!passId || !passId.startsWith('SHFT-')) {
    return res.status(400).json({
      valid: false,
      error: 'Invalid or missing SHIFT pass ID format. Example: SHFT-XXXX-UENR'
    });
  }

  return res.status(200).json({
    valid: true,
    passId,
    ticket: {
      passId,
      ticketStatus: 'Confirmed Delegate',
      venue: 'UENR Main Auditorium',
      date: 'Saturday, Nov 28, 2026',
      doorsOpen: '1:15 PM GMT',
      time: '2:00 PM – 6:00 PM GMT'
    }
  });
}
