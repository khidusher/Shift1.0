import { google, sheets_v4 } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import { Firestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { RegistrationData } from '../types';

export const SHEET_HEADERS = [
  'Registration ID',
  'Event Name',
  'Full Name',
  'WhatsApp / Phone',
  'Email Address',
  'Academic Level',
  'Department / Faculty',
  'Registration Timestamp',
  'Auditorium Seat Status',
  'Sheets Sync Status',
  'Last Synchronized At',
  'Checked In',
  'Checked In At',
  'Checked In By'
];

export interface SyncResult {
  success: boolean;
  action?: 'inserted' | 'updated' | 'already_synced' | 'not_configured';
  error?: string;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
}

export const DEFAULT_SPREADSHEET_ID = '1n6u69LjJKeeMvLaxQjO_vpOEtHw1AFgx45Mvtt8kxMI';
export const RUNTIME_SERVICE_ACCOUNT_EMAIL =
  process.env.AUTHORIZED_SERVICE_ACCOUNT_EMAIL ||
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
  'ais-sandbox@ais-europe-west3-0bd4731ce0d44.iam.gserviceaccount.com';

/**
 * Resolves current Google Sheets configuration using Keyless Authentication (ADC)
 */
export function getGoogleSheetsConfig() {
  const spreadsheetId =
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID ||
    process.env.SPREADSHEET_ID ||
    DEFAULT_SPREADSHEET_ID;

  const serviceAccountEmail = RUNTIME_SERVICE_ACCOUNT_EMAIL;
  const isConfigured = Boolean(spreadsheetId && spreadsheetId.trim());

  return {
    spreadsheetId: spreadsheetId.trim(),
    serviceAccountEmail,
    authMethod: 'Application Default Credentials (Keyless / IAM Policy Compliant)',
    isConfigured,
    spreadsheetUrl: isConfigured ? `https://docs.google.com/spreadsheets/d/${spreadsheetId.trim()}/edit` : null
  };
}

let serverActiveOAuthToken: string | null = null;

export function setServerOAuthToken(token: string | null) {
  serverActiveOAuthToken = token;
}

export function getServerOAuthToken(): string | null {
  return serverActiveOAuthToken;
}

/**
 * Creates an authorized Google Sheets API client using:
 * 1. Active Google Workspace OAuth token (if provided/connected by administrator), or
 * 2. Keyless Application Default Credentials (ADC) provided by the Google Cloud runtime.
 */
function getSheetsClient(customToken?: string | null): sheets_v4.Sheets {
  const token = customToken || serverActiveOAuthToken;
  if (token && typeof token === 'string' && token.trim()) {
    const oauth2 = new google.auth.OAuth2();
    oauth2.setCredentials({ access_token: token.trim() });
    return google.sheets({ version: 'v4', auth: oauth2 });
  }

  // Fallback to keyless Application Default Credentials (ADC)
  const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  return google.sheets({ version: 'v4', auth });
}

/**
 * Ensures header row exists in the spreadsheet
 */
async function ensureHeaders(sheets: sheets_v4.Sheets, spreadsheetId: string): Promise<string> {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const firstSheetTitle = meta.data.sheets?.[0]?.properties?.title || 'Sheet1';

  // Check row 1
  const checkRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${firstSheetTitle}'!A1:N1`
  });

  const existingRow = checkRes.data.values?.[0];
  if (!existingRow || existingRow.length === 0 || existingRow[0] !== SHEET_HEADERS[0] || existingRow.length < SHEET_HEADERS.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${firstSheetTitle}'!A1:N1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [SHEET_HEADERS]
      }
    });
    console.info(`[Google Sheets] Initialized headers in sheet "${firstSheetTitle}"`);
  }

  return firstSheetTitle;
}

/**
 * Transforms RegistrationData into a spreadsheet row
 */
function buildRowValues(reg: RegistrationData, syncStatus = 'Synced'): string[] {
  return [
    reg.passId,
    'SHIFT 1.0 - Beyond the Degree',
    reg.fullName,
    reg.phone,
    reg.email || 'N/A',
    `Level ${reg.academicLevel}`,
    reg.department || 'General Student',
    reg.registeredAt || new Date().toISOString(),
    reg.ticketStatus || 'Confirmed Delegate (Free Admission)',
    syncStatus,
    new Date().toISOString(),
    reg.checkedIn ? 'TRUE' : 'FALSE',
    reg.checkedInAt || '',
    reg.checkedInBy || ''
  ];
}

/**
 * Idempotently syncs a single registration to Google Sheets with retry logic
 */
export async function syncRegistrationToGoogleSheets(
  reg: RegistrationData,
  maxRetries = 2
): Promise<SyncResult> {
  const config = getGoogleSheetsConfig();

  if (!config.isConfigured) {
    return {
      success: false,
      action: 'not_configured',
      error:
        'GOOGLE_SHEETS_SPREADSHEET_ID is not configured in the environment. Registration remains safely persisted in Cloud Firestore.'
    };
  }

  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt <= maxRetries) {
    try {
      const sheets = getSheetsClient();
      const sheetTitle = await ensureHeaders(sheets, config.spreadsheetId);

      // Read Column A (Registration IDs) to avoid duplicate rows
      const colARes = await sheets.spreadsheets.values.get({
        spreadsheetId: config.spreadsheetId,
        range: `'${sheetTitle}'!A:A`
      });

      const rows = colARes.data.values || [];
      let foundIndex = -1;

      for (let i = 1; i < rows.length; i++) {
        if (rows[i] && rows[i][0] && rows[i][0].toString().trim() === reg.passId.trim()) {
          foundIndex = i + 1; // 1-based row number
          break;
        }
      }

      const rowValues = buildRowValues(reg, 'Synced');

      if (foundIndex > 0) {
        // Idempotent Update existing row
        await sheets.spreadsheets.values.update({
          spreadsheetId: config.spreadsheetId,
          range: `'${sheetTitle}'!A${foundIndex}:N${foundIndex}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [rowValues]
          }
        });

        console.info(`[Google Sheets] Idempotently updated row ${foundIndex} for ${reg.passId}`);
        return {
          success: true,
          action: 'updated',
          spreadsheetId: config.spreadsheetId,
          spreadsheetUrl: config.spreadsheetUrl || undefined
        };
      } else {
        // Append new row
        await sheets.spreadsheets.values.append({
          spreadsheetId: config.spreadsheetId,
          range: `'${sheetTitle}'!A:N`,
          valueInputOption: 'USER_ENTERED',
          insertDataOption: 'INSERT_ROWS',
          requestBody: {
            values: [rowValues]
          }
        });

        console.info(`[Google Sheets] Appended new row for ${reg.passId}`);
        return {
          success: true,
          action: 'inserted',
          spreadsheetId: config.spreadsheetId,
          spreadsheetUrl: config.spreadsheetUrl || undefined
        };
      }
    } catch (err: any) {
      lastError = err;
      const statusCode = err?.response?.status || err?.code;

      // Fail fast on non-retryable 403 / 404 errors
      if (statusCode === 404) {
        const errorMsg = `Google Sheet not found (404). Check GOOGLE_SHEETS_SPREADSHEET_ID: "${config.spreadsheetId}".`;
        console.warn(`[Google Sheets] ${errorMsg}`);
        return {
          success: false,
          error: errorMsg,
          spreadsheetId: config.spreadsheetId
        };
      }

      if (statusCode === 403) {
        const rawMsg = err?.message || '';
        if (rawMsg.includes('Google Sheets API has not been used') || rawMsg.includes('SERVICE_DISABLED') || rawMsg.includes('accessNotConfigured')) {
          const apiMsg = 'Google Sheets API is not enabled in Google Cloud project 18646219787. Please enable it at https://console.developers.google.com/apis/api/sheets.googleapis.com/overview?project=18646219787 or use "Connect Google" OAuth in the Secretariat Console.';
          console.warn(`[Google Sheets] ${apiMsg}`);
          return {
            success: false,
            error: apiMsg,
            spreadsheetId: config.spreadsheetId
          };
        }

        const emailMsg = config.serviceAccountEmail ? ` (${config.serviceAccountEmail})` : '';
        const errorMsg = `Permission denied (403). Ensure spreadsheet "${config.spreadsheetId}" is shared with Editor access to ${emailMsg}.`;
        console.warn(`[Google Sheets] ${errorMsg}`);
        return {
          success: false,
          error: errorMsg,
          spreadsheetId: config.spreadsheetId
        };
      }

      attempt++;
      if (attempt <= maxRetries) {
        const backoffMs = attempt * 800;
        console.warn(`[Google Sheets] Sync attempt ${attempt} failed: ${err.message}. Retrying in ${backoffMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }

  const finalMsg = lastError?.message || 'Unknown Google Sheets synchronization error';
  return {
    success: false,
    error: finalMsg,
    spreadsheetId: config.spreadsheetId
  };
}

/**
 * Bidirectional Reverse Synchronization:
 * Reads attendee check-in and attendance records from Google Sheets
 * (which may be updated offline or online by AppSheet or event staff)
 * and reconciles them into Cloud Firestore.
 */
export async function syncFromGoogleSheetsToServer(
  db: Firestore,
  customToken?: string | null
): Promise<{
  success: boolean;
  totalRows: number;
  reconciledCount: number;
  errors: string[];
}> {
  const config = getGoogleSheetsConfig();
  if (!config.isConfigured) {
    return {
      success: false,
      totalRows: 0,
      reconciledCount: 0,
      errors: ['Google Sheets is not configured in environment.']
    };
  }

  const activeToken = customToken || getServerOAuthToken();
  if (!activeToken) {
    return {
      success: false,
      totalRows: 0,
      reconciledCount: 0,
      errors: [
        'Google Workspace connection required. Please click "Connect Google" in the Secretariat Console to synchronize attendance.'
      ]
    };
  }

  try {
    const sheets = getSheetsClient(activeToken);
    const sheetTitle = await ensureHeaders(sheets, config.spreadsheetId);

    // Read all rows across columns A:N
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: config.spreadsheetId,
      range: `'${sheetTitle}'!A:N`
    });

    const allRows = res.data.values || [];
    if (allRows.length <= 1) {
      return { success: true, totalRows: 0, reconciledCount: 0, errors: [] };
    }

    // Dynamic header index discovery
    const headerRow = allRows[0].map((h: any) => String(h || '').trim());
    const passIdColIdx = headerRow.findIndex((h: string) => /registration id|pass id/i.test(h));
    const checkedInColIdx = headerRow.findIndex((h: string) => /^checked in$|^attendance$/i.test(h));
    const checkedInAtColIdx = headerRow.findIndex((h: string) => /checked in at/i.test(h));
    const checkedInByColIdx = headerRow.findIndex((h: string) => /checked in by/i.test(h));

    const idIdx = passIdColIdx >= 0 ? passIdColIdx : 0;
    const inIdx = checkedInColIdx >= 0 ? checkedInColIdx : 11;
    const inAtIdx = checkedInAtColIdx >= 0 ? checkedInAtColIdx : 12;
    const inByIdx = checkedInByColIdx >= 0 ? checkedInByColIdx : 13;

    // Fetch existing Firestore registrations to map and reconcile
    const regsCol = collection(db, 'registrations');
    const firestoreDocsSnap = await getDocs(regsCol);
    const firestoreMap = new Map<string, { ref: any; data: RegistrationData }>();

    for (const docSnap of firestoreDocsSnap.docs) {
      const data = docSnap.data() as RegistrationData;
      if (data.passId) {
        firestoreMap.set(data.passId.trim(), { ref: docSnap.ref, data });
      }
      firestoreMap.set(docSnap.id.trim(), { ref: docSnap.ref, data });
    }

    let reconciledCount = 0;
    const errors: string[] = [];

    for (let i = 1; i < allRows.length; i++) {
      const row = allRows[i];
      if (!row || !row[idIdx]) continue;
      const passId = String(row[idIdx]).trim();
      const existing = firestoreMap.get(passId);
      if (!existing) continue;

      const rawCheckedIn = row[inIdx] ? String(row[inIdx]).trim().toUpperCase() : '';
      const sheetIsCheckedIn =
        rawCheckedIn === 'TRUE' ||
        rawCheckedIn === 'YES' ||
        rawCheckedIn === '1' ||
        rawCheckedIn === 'CHECKED IN';
      const currentCheckedIn = Boolean(existing.data.checkedIn);

      // Reconcile if sheet attendance differs from Firestore
      if (sheetIsCheckedIn !== currentCheckedIn) {
        // Conflict Protection: Never let a stale spreadsheet FALSE undo a verified on-site check-in
        if (sheetIsCheckedIn === false && currentCheckedIn === true) {
          console.info(`[Reverse Sync] Preserved on-site check-in for ${passId} (ignoring stale FALSE from Sheet)`);
          continue;
        }

        const nowIso = new Date().toISOString();
        const rawInAt = row[inAtIdx] ? String(row[inAtIdx]).trim() : '';
        const rawInBy = row[inByIdx] ? String(row[inByIdx]).trim() : '';

        const patch = {
          checkedIn: sheetIsCheckedIn,
          checkedInAt: sheetIsCheckedIn ? (rawInAt || nowIso) : null,
          checkedInBy: sheetIsCheckedIn ? (rawInBy || 'AppSheet (Google Sheets)') : null,
          updatedAt: nowIso
        };

        try {
          await updateDoc(existing.ref, patch);
          reconciledCount++;
          console.info(
            `[Reverse Sync] Reconciled pass ${passId} from Sheet: checkedIn=${sheetIsCheckedIn}`
          );
        } catch (err: any) {
          errors.push(`Failed to update ${passId}: ${err?.message || err}`);
        }
      }
    }

    return {
      success: true,
      totalRows: allRows.length - 1,
      reconciledCount,
      errors
    };
  } catch (err: any) {
    const rawMsg = err?.message || '';
    if (
      rawMsg.includes('Google Sheets API has not been used') ||
      rawMsg.includes('SERVICE_DISABLED') ||
      rawMsg.includes('accessNotConfigured')
    ) {
      const hint =
        'Google Sheets API authorization required. Please click "Connect Google" in the Secretariat Console to synchronize attendance.';
      console.info(`[Reverse Sync] ${hint}`);
      return {
        success: false,
        totalRows: 0,
        reconciledCount: 0,
        errors: [hint]
      };
    }

    console.warn('[Reverse Sync] Notice:', rawMsg);
    return {
      success: false,
      totalRows: 0,
      reconciledCount: 0,
      errors: [rawMsg || 'Failed to read Google Sheets']
    };
  }
}

