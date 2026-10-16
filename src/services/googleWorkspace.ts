import { RegistrationData } from '../types';
import { syncWithGoogleSheets, fetchSheetsConfig } from '../lib/firebase';

export interface GoogleSheetResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  updatedRows: number;
}

/**
 * Standalone CSV Exporter for delegate records
 * Generates an Excel & Google Sheets compatible CSV string directly in-browser
 */
export function exportDelegatesToCSV(registrations: RegistrationData[]): string {
  const headers = [
    'Pass ID',
    'Full Name',
    'WhatsApp / Phone',
    'Email Address',
    'Academic Level',
    'Department / Field',
    'Registration Date',
    'Auditorium Seat Status',
    'Google Sheets Sync Status'
  ];

  const rows = registrations.map((r) => [
    `"${r.passId}"`,
    `"${(r.fullName || '').replace(/"/g, '""')}"`,
    `"${(r.phone || '').replace(/"/g, '""')}"`,
    `"${(r.email || 'N/A').replace(/"/g, '""')}"`,
    `"Level ${r.academicLevel}"`,
    `"${(r.department || 'General Student').replace(/"/g, '""')}"`,
    `"${new Date(r.registeredAt).toLocaleString()}"`,
    `"Confirmed Delegate (Free Admission)"`,
    `"${r.sheetsSyncStatus || 'pending'}"`
  ]);

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
}

/**
 * Downloads the delegate attendee roster as a .CSV file
 */
export function downloadDelegatesCSV(
  registrations: RegistrationData[],
  fileName = `SHIFT_1_0_Delegates_Roster_${new Date().toISOString().slice(0, 10)}.csv`
): void {
  const csvContent = '\uFEFF' + exportDelegatesToCSV(registrations);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Triggers server-side synchronization of a registration to Google Sheets
 */
export async function appendRegistrationToSheet(passId: string): Promise<boolean> {
  try {
    const res = await syncWithGoogleSheets(passId);
    return Boolean(res.success);
  } catch (err) {
    console.warn('[Google Sheets] Append sync notice:', err);
    return false;
  }
}

/**
 * Syncs all pending registrations to the configured Google Sheet via server API
 */
export async function syncAllToExistingSpreadsheet(): Promise<{
  success: boolean;
  syncedCount?: number;
  failedCount?: number;
  errors?: string[];
}> {
  return await syncWithGoogleSheets();
}

/**
 * Retrieves Google Sheets configuration and setup guide
 */
export async function getSheetsIntegrationStatus() {
  try {
    return await fetchSheetsConfig();
  } catch (err: any) {
    return {
      configured: false,
      error: err.message
    };
  }
}
