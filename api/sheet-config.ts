export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '';
  const isConfigured = Boolean(spreadsheetId && spreadsheetId.length > 5);

  return res.status(200).json({
    configured: isConfigured,
    spreadsheetId,
    spreadsheetUrl: isConfigured ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}` : null,
    headers: [
      'Pass ID',
      'Full Name',
      'Phone Number',
      'Email',
      'Academic Level',
      'Department / Programme',
      'Registration Timestamp (GMT)',
      'Ticket Status',
      'Check-in Status'
    ]
  });
}
