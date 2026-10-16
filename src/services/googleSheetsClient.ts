import { RegistrationData } from '../types';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

export const DEFAULT_SPREADSHEET_ID = '1n6u69LjJKeeMvLaxQjO_vpOEtHw1AFgx45Mvtt8kxMI';

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

/**
 * Builds standard row values for an attendee registration
 */
export function buildRowValues(reg: RegistrationData): string[] {
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
    'Synced',
    new Date().toISOString(),
    reg.checkedIn ? 'TRUE' : 'FALSE',
    reg.checkedInAt || '',
    reg.checkedInBy || ''
  ];
}

const sheetTitleCache = new Map<string, string>();

/**
 * Ensures header row exists in the first sheet of the target spreadsheet
 */
export async function ensureSheetHeadersClient(
  accessToken: string,
  spreadsheetId = DEFAULT_SPREADSHEET_ID
): Promise<string> {
  const cached = sheetTitleCache.get(spreadsheetId);
  if (cached) return cached;

  // 1. Get spreadsheet metadata to find first sheet name
  const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!metaRes.ok) {
    const err = await metaRes.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Failed to read spreadsheet (${metaRes.status})`);
  }

  const metaData = await metaRes.json();
  const sheetTitle = metaData.sheets?.[0]?.properties?.title || 'Sheet1';
  sheetTitleCache.set(spreadsheetId, sheetTitle);

  // 2. Check if headers exist in row 1
  const checkRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(sheetTitle)}'!A1:N1`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  const checkData = await checkRes.json();
  const existingHeaders = checkData.values?.[0];

  if (!existingHeaders || existingHeaders.length === 0 || existingHeaders[0] !== SHEET_HEADERS[0] || existingHeaders.length < SHEET_HEADERS.length) {
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(sheetTitle)}'!A1:N1?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: [SHEET_HEADERS]
        })
      }
    );
    console.info(`[Google Sheets Client] Initialized headers in sheet "${sheetTitle}"`);
  }

  return sheetTitle;
}

/**
 * Idempotently synchronizes a single registration to Google Sheets using the user's OAuth access token
 */
export async function syncRegistrationWithOAuthToken(
  reg: RegistrationData,
  accessToken: string,
  spreadsheetId = DEFAULT_SPREADSHEET_ID
): Promise<{ success: boolean; action?: 'inserted' | 'updated'; error?: string }> {
  try {
    const sheetTitle = await ensureSheetHeadersClient(accessToken, spreadsheetId);

    // Read column A to prevent duplicate rows
    const colARes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(sheetTitle)}'!A:A`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    if (!colARes.ok) {
      const err = await colARes.json().catch(() => ({}));
      throw new Error(err?.error?.message || 'Failed to read column A from spreadsheet');
    }

    const colAData = await colARes.json();
    const rows = colAData.values || [];

    let foundRowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i] && rows[i][0] && rows[i][0].toString().trim() === reg.passId.trim()) {
        foundRowIndex = i + 1; // 1-based row number
        break;
      }
    }

    const rowValues = buildRowValues(reg);

    if (foundRowIndex > 0) {
      // Idempotently update existing row
      const updateRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(sheetTitle)}'!A${foundRowIndex}:N${foundRowIndex}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            values: [rowValues]
          })
        }
      );

      if (!updateRes.ok) {
        const err = await updateRes.json().catch(() => ({}));
        throw new Error(err?.error?.message || `Failed to update row ${foundRowIndex}`);
      }

      // Update Firestore sync status
      const docId = reg.passId.replace(/[^a-zA-Z0-9_-]/g, '_');
      await setDoc(
        doc(db, 'registrations', docId),
        {
          sheetsSyncStatus: 'synced',
          sheetsSyncedAt: new Date().toISOString(),
          sheetsSyncError: null
        },
        { merge: true }
      );

      return { success: true, action: 'updated' };
    } else {
      // Append new row
      const appendRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(sheetTitle)}'!A:N:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            values: [rowValues]
          })
        }
      );

      if (!appendRes.ok) {
        const err = await appendRes.json().catch(() => ({}));
        throw new Error(err?.error?.message || 'Failed to append row to spreadsheet');
      }

      // Update Firestore sync status
      const docId = reg.passId.replace(/[^a-zA-Z0-9_-]/g, '_');
      await setDoc(
        doc(db, 'registrations', docId),
        {
          sheetsSyncStatus: 'synced',
          sheetsSyncedAt: new Date().toISOString(),
          sheetsSyncError: null
        },
        { merge: true }
      );

      return { success: true, action: 'inserted' };
    }
  } catch (err: any) {
    const errorMsg = err?.message || 'Failed to synchronize with Google Sheets';
    console.warn(`[Google Sheets Client] Sync notice for ${reg.passId}:`, errorMsg);
    // Record error in Firestore so admin knows
    try {
      const docId = reg.passId.replace(/[^a-zA-Z0-9_-]/g, '_');
      await setDoc(
        doc(db, 'registrations', docId),
        {
          sheetsSyncStatus: 'failed',
          sheetsSyncError: errorMsg
        },
        { merge: true }
      );
    } catch {}

    return {
      success: false,
      error: errorMsg
    };
  }
}

/**
 * High-performance batch synchronization:
 * Executes 1 single read for column A, 1 batchUpdate for existing rows, and 1 append for new rows.
 * Uses only 2 reads and at most 2 writes total, staying well within Google Sheets API quota (60 requests/min).
 */
export async function syncBatchWithOAuthToken(
  registrations: RegistrationData[],
  accessToken: string,
  spreadsheetId = DEFAULT_SPREADSHEET_ID
): Promise<{ success: boolean; syncedCount: number; failedCount: number; errors: string[] }> {
  if (!registrations || registrations.length === 0) {
    return { success: true, syncedCount: 0, failedCount: 0, errors: [] };
  }

  const errors: string[] = [];
  try {
    const sheetTitle = await ensureSheetHeadersClient(accessToken, spreadsheetId);

    // Single Read: Read all existing Pass IDs in Column A once
    const colARes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(sheetTitle)}'!A:A`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    if (!colARes.ok) {
      const err = await colARes.json().catch(() => ({}));
      const msg = err?.error?.message || `Failed to read spreadsheet (HTTP ${colARes.status})`;
      console.warn('[Google Sheets Client] Batch read notice:', msg);
      return { success: false, syncedCount: 0, failedCount: registrations.length, errors: [msg] };
    }

    const colAData = await colARes.json();
    const rows = colAData.values || [];
    const existingIndexMap = new Map<string, number>();

    for (let i = 1; i < rows.length; i++) {
      if (rows[i] && rows[i][0]) {
        existingIndexMap.set(String(rows[i][0]).trim(), i + 1);
      }
    }

    const updateBatchData: { range: string; values: string[][] }[] = [];
    const newRowsToAppend: string[][] = [];
    const nowIso = new Date().toISOString();

    for (const reg of registrations) {
      const passId = reg.passId?.trim();
      if (!passId) continue;
      const rowIndex = existingIndexMap.get(passId);
      const rowValues = buildRowValues(reg);

      if (rowIndex && rowIndex > 0) {
        updateBatchData.push({
          range: `'${sheetTitle}'!A${rowIndex}:N${rowIndex}`,
          values: [rowValues]
        });
      } else {
        newRowsToAppend.push(rowValues);
      }
    }

    let syncedCount = 0;

    // Single Write 1: Bulk update all existing rows in one batch request
    if (updateBatchData.length > 0) {
      const batchRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            valueInputOption: 'USER_ENTERED',
            data: updateBatchData
          })
        }
      );

      if (!batchRes.ok) {
        const err = await batchRes.json().catch(() => ({}));
        const errMsg = err?.error?.message || `Failed to update existing rows (HTTP ${batchRes.status})`;
        console.warn('[Google Sheets Client] Batch update notice:', errMsg);
        errors.push(errMsg);
      } else {
        syncedCount += updateBatchData.length;
      }
    }

    // Single Write 2: Bulk append all new rows in one request
    if (newRowsToAppend.length > 0) {
      const appendRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(sheetTitle)}'!A:N:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            values: newRowsToAppend
          })
        }
      );

      if (!appendRes.ok) {
        const err = await appendRes.json().catch(() => ({}));
        const errMsg = err?.error?.message || `Failed to append new rows (HTTP ${appendRes.status})`;
        console.warn('[Google Sheets Client] Batch append notice:', errMsg);
        errors.push(errMsg);
      } else {
        syncedCount += newRowsToAppend.length;
      }
    }

    // Update Firestore sync status in background without blocking UI
    Promise.allSettled(
      registrations.map((reg) => {
        const docId = reg.passId.replace(/[^a-zA-Z0-9_-]/g, '_');
        return setDoc(
          doc(db, 'registrations', docId),
          {
            sheetsSyncStatus: 'synced',
            sheetsSyncedAt: nowIso,
            sheetsSyncError: null
          },
          { merge: true }
        );
      })
    ).catch(() => {});

    return {
      success: errors.length === 0,
      syncedCount,
      failedCount: registrations.length - syncedCount,
      errors
    };
  } catch (err: any) {
    const rawMsg = err?.message || 'Google Sheets synchronization error';
    console.warn('[Google Sheets Client] Batch sync notice:', rawMsg);
    return {
      success: false,
      syncedCount: 0,
      failedCount: registrations.length,
      errors: [rawMsg]
    };
  }
}
