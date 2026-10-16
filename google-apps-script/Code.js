/**
 * ============================================================================
 * SHIFT 1.0 Google Apps Script Bridge for AppSheet & Google Sheets
 * ============================================================================
 * 
 * Instructions:
 * 1. Open your target Google Spreadsheet.
 * 2. Click Extensions > Apps Script.
 * 3. Replace all contents of Code.gs with this file.
 * 4. In Project Settings (gear icon) > Script Properties, add:
 *    - Key: BRIDGE_SECRET       Value: (Your strong shared secret string)
 *    - Key: SHEET_TAB_NAME      Value: Delegates (or your preferred tab name)
 * 5. Click Deploy > New deployment.
 *    - Type: Web app
 *    - Description: SHIFT 1.0 AppSheet Bridge
 *    - Execute as: Me (your Google account)
 *    - Who has access: Anyone (allows authenticated webhook requests with secret)
 * 6. Copy the Web App URL (ends with /exec).
 * 7. Set APPS_SCRIPT_WEBAPP_URL and APPS_SCRIPT_SECRET in your server environment.
 */

var HEADERS = [
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

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    // Acquire lock for up to 30 seconds to guarantee atomic row operations
    lock.waitLock(30000);

    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ success: false, error: 'Empty or missing request payload' }, 400);
    }

    var data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return jsonResponse({ success: false, error: 'Malformed JSON payload' }, 400);
    }

    // 1. Validate Secret from Script Properties
    var scriptProperties = PropertiesService.getScriptProperties();
    var expectedSecret = scriptProperties.getProperty('BRIDGE_SECRET');

    if (!expectedSecret || expectedSecret.trim() === '') {
      return jsonResponse({ success: false, error: 'Server misconfiguration: BRIDGE_SECRET not configured in Script Properties' }, 500);
    }

    var incomingSecret = data.secret || (e.parameter && e.parameter.secret);
    if (!incomingSecret || incomingSecret !== expectedSecret) {
      return jsonResponse({ success: false, error: 'Unauthorized: Invalid bridge secret' }, 401);
    }

    var action = data.action || 'upsertAttendee';
    if (action !== 'upsertAttendee') {
      return jsonResponse({ success: false, error: 'Unsupported action: ' + action }, 400);
    }

    var attendee = data.attendee;
    if (!attendee || !attendee.passId) {
      return jsonResponse({ success: false, error: 'Missing attendee or passId' }, 400);
    }

    // 2. Open Target Sheet
    var tabName = scriptProperties.getProperty('SHEET_TAB_NAME') || 'Delegates';
    var sheet = getOrCreateSheet(tabName);

    // 3. Find existing row by passId in Column A
    var passId = String(attendee.passId).trim();
    var lastRow = sheet.getLastRow();
    var targetRowIndex = -1;

    if (lastRow > 1) {
      var idValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (var i = 0; i < idValues.length; i++) {
        if (idValues[i][0] && String(idValues[i][0]).trim() === passId) {
          targetRowIndex = i + 2; // 1-based row index accounting for header
          break;
        }
      }
    }

    var nowIso = new Date().toISOString();
    var rowValues = [
      passId,
      'SHIFT 1.0 - Beyond the Degree',
      attendee.fullName || '',
      attendee.phone || '',
      attendee.email || 'N/A',
      attendee.academicLevel ? 'Level ' + attendee.academicLevel : 'Undergraduate',
      attendee.department || 'General Student',
      attendee.registeredAt || nowIso,
      attendee.ticketStatus || 'Confirmed Delegate',
      'Synced',
      nowIso,
      attendee.checkedIn ? 'TRUE' : 'FALSE',
      attendee.checkedInAt || '',
      attendee.checkedInBy || ''
    ];

    var resultAction = 'updated';
    if (targetRowIndex > 0) {
      // Idempotently update existing row
      sheet.getRange(targetRowIndex, 1, 1, HEADERS.length).setValues([rowValues]);
      resultAction = 'updated';
    } else {
      // Append new row
      sheet.appendRow(rowValues);
      resultAction = 'inserted';
    }

    return jsonResponse({
      success: true,
      action: resultAction,
      passId: passId,
      updatedAt: nowIso
    }, 200);

  } catch (err) {
    return jsonResponse({ success: false, error: err.message || 'Apps Script execution error' }, 500);
  } finally {
    try {
      lock.releaseLock();
    } catch (lockErr) {}
  }
}

function doGet(e) {
  return jsonResponse({
    status: 'online',
    service: 'SHIFT 1.0 Apps Script Bridge',
    timestamp: new Date().toISOString()
  }, 200);
}

function getOrCreateSheet(tabName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(tabName);
  if (!sheet) {
    sheet = ss.insertSheet(tabName);
  }

  // Ensure header row exists
  if (sheet.getLastRow() === 0 || sheet.getRange(1, 1).getValue() !== HEADERS[0]) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#1E293B').setFontColor('#FFFFFF');
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function jsonResponse(obj, statusCode) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Automatically synchronizes attendance changes made directly in Google Sheets back to Cloud Firestore
 * Trigger: Add an installable "On edit" trigger for this function in Apps Script Triggers (Clock icon)
 */
function onEditTrigger(e) {
  try {
    if (!e || !e.range) return;
    var sheet = e.range.getSheet();
    var scriptProperties = PropertiesService.getScriptProperties();
    var tabName = scriptProperties.getProperty('SHEET_TAB_NAME') || 'Delegates';
    if (sheet.getName() !== tabName) return;

    var row = e.range.getRow();
    var col = e.range.getColumn();

    // Column 12 is 'Checked In'
    if (col === 12 && row > 1) {
      var passId = String(sheet.getRange(row, 1).getValue()).trim();
      var rawVal = String(e.value || sheet.getRange(row, 12).getValue()).trim().toUpperCase();
      var isCheckedIn = (rawVal === 'TRUE' || rawVal === 'YES' || rawVal === '1');
      var secret = scriptProperties.getProperty('WEBHOOK_SECRET') || scriptProperties.getProperty('BRIDGE_SECRET');
      var serverUrl = scriptProperties.getProperty('SHIFT_SERVER_URL') || 'https://ais-dev-57kkchk3p5c7bzupztdxel-18646219787.europe-west3.run.app';

      if (passId && serverUrl && secret) {
        var payload = {
          passId: passId,
          checkedIn: isCheckedIn,
          timestamp: new Date().toISOString(),
          staffName: 'Google Sheets Automatic Sync'
        };

        UrlFetchApp.fetch(serverUrl.replace(/\/+$/, '') + '/api/webhook/checkin', {
          method: 'post',
          contentType: 'application/json',
          headers: {
            'x-webhook-secret': secret
          },
          payload: JSON.stringify(payload),
          muteHttpExceptions: true
        });
      }
    }
  } catch (err) {
    Logger.log('onEditTrigger notice: ' + err);
  }
}
