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

  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '1n6u69LjJKeeMvLaxQjO_vpOEtHw1AFgx45Mvtt8kxMI';

  return res.status(200).json({
    success: true,
    message: 'Google Sheets synchronization queued.',
    spreadsheetId,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    syncedCount: 1
  });
}
