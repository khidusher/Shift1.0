export type NavTab = 'home' | 'register' | 'contacts' | 'admin';

export interface Speaker {
  id: string;
  name: string;
  role: string;
  company?: string;
  image: string;
  topic: string;
  bio: string;
  keyTakeaways: string[];
}

export interface ScheduleItem {
  id: string;
  time: string;
  title: string;
  speaker?: string;
  location: string;
  category: 'Keynote' | 'Panel' | 'Breakout' | 'Networking' | 'Ceremony';
  description: string;
}

export interface RegistrationData {
  id?: string;
  userId?: string;
  fullName: string;
  phone: string;
  email?: string;
  academicLevel: '100' | '200' | '300' | '400' | 'postgrad';
  department: string;
  passId: string;
  registeredAt: string;
  ticketStatus?: 'Confirmed Delegate' | 'Pending Verification';
  sheetsSyncStatus?: 'synced' | 'pending' | 'failed' | 'not_configured' | 'processing';
  sheetsSyncError?: string;
  sheetsSyncedAt?: string;
  sheetsSyncAttempts?: number;
  sheetsNextRetryAt?: number;
  checkedIn?: boolean;
  checkedInAt?: string;
  checkedInBy?: string;
  updatedAt?: string;
}

export interface ContactInquiry {
  fullName: string;
  email: string;
  phone?: string;
  topic: 'attendee' | 'partnership' | 'speaker' | 'general';
  message: string;
}

export interface IntegrationConfig {
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  formId?: string;
  formUrl?: string;
  formEditUrl?: string;
  lastSyncedAt?: string;
  totalSyncedRows?: number;
}

export interface EventExecutive {
  id?: string;
  email: string;
  name?: string;
  role: 'Event Director' | 'Executive Secretariat' | 'Registration Lead' | 'Committee Member';
  addedAt?: string;
  isPrimary?: boolean;
}

declare global {
  const __APP_ADMIN_PASSCODE_HASH__: string | undefined;
}

