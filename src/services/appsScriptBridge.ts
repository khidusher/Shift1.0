import { RegistrationData } from '../types';

export interface AppsScriptSyncResult {
  success: boolean;
  action?: 'inserted' | 'updated' | 'not_configured';
  error?: string;
  passId?: string;
}

/**
 * Resolves current Google Apps Script Bridge configuration
 */
export function getAppsScriptBridgeConfig() {
  const webappUrl =
    process.env.APPS_SCRIPT_WEBAPP_URL ||
    process.env.APPS_SCRIPT_URL ||
    '';
  const bridgeSecret =
    process.env.APPS_SCRIPT_SECRET ||
    process.env.WEBHOOK_SECRET ||
    '';

  return {
    webappUrl: webappUrl.trim(),
    bridgeSecret: bridgeSecret.trim(),
    isConfigured: Boolean(webappUrl.trim())
  };
}

/**
 * Idempotently exports/upserts an attendee registration to Google Sheets via the Apps Script Web App Bridge
 */
export async function exportRegistrationToAppsScript(
  reg: RegistrationData,
  maxRetries = 2
): Promise<AppsScriptSyncResult> {
  const config = getAppsScriptBridgeConfig();

  if (!config.isConfigured) {
    return {
      success: false,
      action: 'not_configured',
      error: 'APPS_SCRIPT_WEBAPP_URL is not configured.'
    };
  }

  const payload = {
    action: 'upsertAttendee',
    secret: config.bridgeSecret,
    attendee: {
      passId: reg.passId,
      fullName: reg.fullName,
      phone: reg.phone,
      email: reg.email || '',
      academicLevel: reg.academicLevel,
      department: reg.department || 'General Student',
      ticketStatus: reg.ticketStatus || 'Confirmed Delegate',
      checkedIn: Boolean(reg.checkedIn),
      checkedInAt: reg.checkedInAt || '',
      checkedInBy: reg.checkedInBy || '',
      registeredAt: reg.registeredAt || new Date().toISOString(),
      updatedAt: reg.updatedAt || new Date().toISOString()
    }
  };

  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt <= maxRetries) {
    try {
      const response = await fetch(config.webappUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        redirect: 'follow'
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`Apps Script responded with HTTP ${response.status}: ${errorText.slice(0, 150)}`);
      }

      const result = await response.json().catch(() => ({ success: true, action: 'updated' }));
      if (result.success) {
        console.info(`[Apps Script Bridge] Upserted ${reg.passId} (${result.action || 'synced'})`);
        return {
          success: true,
          action: result.action || 'updated',
          passId: reg.passId
        };
      } else {
        throw new Error(result.error || 'Apps Script returned failure status');
      }
    } catch (err: any) {
      lastError = err;
      attempt++;
      if (attempt <= maxRetries) {
        const backoffMs = attempt * 1000;
        console.warn(`[Apps Script Bridge] Attempt ${attempt} failed for ${reg.passId}: ${err?.message}. Retrying in ${backoffMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }

  const errorMsg = lastError?.message || 'Apps Script export failed';
  console.warn(`[Apps Script Bridge] Export permanently failed for ${reg.passId}: ${errorMsg}`);
  return {
    success: false,
    error: errorMsg,
    passId: reg.passId
  };
}
