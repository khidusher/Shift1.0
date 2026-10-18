import React, { useState, useEffect } from 'react';
import { RegistrationData, ContactInquiry } from '../types';
import { CONFERENCE_INFO } from '../data/conferenceData';
import { motion, AnimatePresence } from 'motion/react';
import {
  subscribeToInquiries,
  fetchAdminInquiries,
  deleteInquiryFromFirestore,
  deleteRegistrationFromFirestore,
  logout,
  syncWithGoogleSheets,
  syncFromGoogleSheets,
  fetchSheetsConfig,
  signInWithGoogleForSheets,
  getGoogleOAuthToken,
  getAdminAuthToken,
  checkInAttendee
} from '../lib/firebase';
import { AppSheetIntegrationCard } from './AppSheetIntegrationCard';
import {
  syncRegistrationWithOAuthToken,
  syncBatchWithOAuthToken,
  DEFAULT_SPREADSHEET_ID
} from '../services/googleSheetsClient';
import { downloadDelegatesCSV } from '../services/googleWorkspace';
import {
  Users,
  MessageSquare,
  Search,
  Download,
  Trash2,
  Lock,
  Mail,
  Phone,
  ArrowLeft,
  Building,
  GraduationCap,
  BarChart3,
  CheckCircle2,
  Clock,
  Layers,
  ChevronRight,
  FileSpreadsheet,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  Check,
  Copy,
  X
} from 'lucide-react';

interface AdminConsoleProps {
  registrations: RegistrationData[];
  isLoadingRegistrations?: boolean;
  firestoreError?: string | null;
  onRefresh?: () => void;
  onClose: () => void;
  onViewTicket: (reg: RegistrationData) => void;
}

// Static list of recognized academic levels
interface AcademicLevelItem {
  id: string;
  label: string;
  title: string;
  description: string;
}

const STATIC_ACADEMIC_LEVELS: AcademicLevelItem[] = [
  { id: '100', label: 'Level 100', title: 'Freshmen', description: 'First Year Scholars' },
  { id: '200', label: 'Level 200', title: 'Sophomores', description: 'Second Year Scholars' },
  { id: '300', label: 'Level 300', title: 'Penultimate Year', description: 'Third Year Leaders' },
  { id: '400', label: 'Level 400', title: 'Final Year', description: 'Graduating Class of 2027' },
  { id: 'postgrad', label: 'Postgraduate', title: 'Masters & Alumni', description: 'Postgrad & Working Youth' }
];

// Static list of official UENR Academic Faculties & Departments
interface DepartmentItem {
  id: string;
  name: string;
  faculty: string;
  keywords: string[];
}

const STATIC_DEPARTMENTS: DepartmentItem[] = [
  {
    id: 'cs',
    name: 'Computer Science & Informatics',
    faculty: 'School of Sciences',
    keywords: ['computer', 'software', 'it', 'inf', 'cyber', 'data', 'programming']
  },
  {
    id: 'electrical',
    name: 'Electrical & Electronic Engineering',
    faculty: 'School of Engineering',
    keywords: ['electrical', 'electronic', 'power', 'telecom', 'eee']
  },
  {
    id: 'renewable',
    name: 'Renewable Energy Engineering',
    faculty: 'School of Engineering',
    keywords: ['renewable', 'energy', 'solar', 'wind']
  },
  {
    id: 'mechanical',
    name: 'Mechanical & Manufacturing Engineering',
    faculty: 'School of Engineering',
    keywords: ['mech', 'manufacturing', 'automotive']
  },
  {
    id: 'civil',
    name: 'Civil & Environmental Engineering',
    faculty: 'School of Engineering',
    keywords: ['civil', 'environment', 'water', 'sanitation', 'geomatic']
  },
  {
    id: 'math',
    name: 'Actuarial Science & Mathematics',
    faculty: 'School of Sciences',
    keywords: ['actuarial', 'math', 'statistics', 'stats', 'finance']
  },
  {
    id: 'health',
    name: 'Nursing & Healthcare Sciences',
    faculty: 'School of Sciences',
    keywords: ['nurs', 'health', 'med', 'pharm', 'public health']
  },
  {
    id: 'natres',
    name: 'Natural Resources & Agriculture',
    faculty: 'School of Natural Resources',
    keywords: ['natural', 'agriculture', 'forest', 'agric', 'fisheries', 'horticulture', 'climate']
  },
  {
    id: 'general',
    name: 'General Student / Other Disciplines',
    faculty: 'University-wide',
    keywords: []
  }
];

export const AdminConsole: React.FC<AdminConsoleProps> = ({
  registrations,
  isLoadingRegistrations = false,
  firestoreError = null,
  onRefresh,
  onClose,
  onViewTicket
}) => {
  const [activeTab, setActiveTab] = useState<'registrations' | 'inquiries'>('registrations');
  const [inquiries, setInquiries] = useState<(ContactInquiry & { id: string; createdAt: string })[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [topicFilter, setTopicFilter] = useState<string>('all');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Google Sheets state
  const [sheetsConfig, setSheetsConfig] = useState<any>(null);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncingPassId, setSyncingPassId] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<{
    type: 'success' | 'error' | 'info' | 'domain_auth_required';
    message: string;
    domain?: string;
  } | null>(null);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [googleUserEmail, setGoogleUserEmail] = useState<string | null>(null);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  const [isPullingFromSheets, setIsPullingFromSheets] = useState(false);

  // Load sheets configuration on mount
  useEffect(() => {
    fetchSheetsConfig()
      .then((cfg) => setSheetsConfig(cfg))
      .catch((e) => console.warn('Could not fetch sheets config:', e));
  }, []);

  const handleConnectGoogle = async () => {
    setIsConnectingGoogle(true);
    setSyncNotice(null);
    try {
      const res = await signInWithGoogleForSheets();
      setGoogleUserEmail(res.user.email || 'Authorized');

      // Forward active OAuth token to backend server to unlock automatic background sync
      const adminToken = getAdminAuthToken();
      if (adminToken && res.accessToken) {
        try {
          await fetch('/api/sheet-token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${adminToken}`
            },
            body: JSON.stringify({ accessToken: res.accessToken })
          });
        } catch (tokenSyncErr) {
          console.warn('[Admin Console] Token sync to server notice:', tokenSyncErr);
        }
      }

      setSyncNotice({
        type: 'success',
        message: `Connected Google Account (${res.user.email}). Google Sheets background synchronization is now authorized!`
      });
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
        const isAuthOrDomainIssue =
          err?.code === 'auth/unauthorized-domain' ||
          err?.code === 'auth/internal-error' ||
          err?.code === 'auth/configuration-not-found' ||
          err?.code === 'auth/operation-not-allowed' ||
          err?.message?.includes('unauthorized-domain') ||
          err?.message?.includes('internal-error');

        if (isAuthOrDomainIssue) {
          const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'shift-wes.vercel.app';
          setSyncNotice({
            type: 'domain_auth_required',
            domain: currentHost,
            message: `Domain "${currentHost}" requires authorization in Firebase Console.`
          });
        } else {
          setSyncNotice({
            type: 'error',
            message: err.message || 'Google Sign-In could not be completed.'
          });
        }
      }
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  const handleSyncAllToSheets = async () => {
    setIsSyncingAll(true);
    setSyncNotice(null);

    // 1. Try server-side durable synchronization first (Zero popup required)
    try {
      const res = await syncWithGoogleSheets();
      if (res && res.success) {
        setSyncNotice({
          type: 'success',
          message: `Successfully synchronized ${res.syncedCount || registrations.length} registration(s) to Google Sheets!`
        });
        if (onRefresh) onRefresh();
        setIsSyncingAll(false);
        return;
      }
    } catch (serverErr: any) {
      console.info('[Sync All] Server sync notice:', serverErr?.message || serverErr);
    }

    // 2. If client already has cached OAuth token, synchronize directly
    const cachedToken = getGoogleOAuthToken();
    if (cachedToken) {
      try {
        const targetId = sheetsConfig?.spreadsheetId || DEFAULT_SPREADSHEET_ID;
        const res = await syncBatchWithOAuthToken(registrations, cachedToken, targetId);
        if (res.syncedCount > 0) {
          setSyncNotice({
            type: 'success',
            message: `Successfully synchronized ${res.syncedCount} delegate(s) directly to Google Sheets!`
          });
          if (onRefresh) onRefresh();
          setIsSyncingAll(false);
          return;
        }
      } catch (tokenErr) {
        console.warn('[Sync All] Token sync notice:', tokenErr);
      }
    }

    // 3. Fallback: Automatically export CSV and prompt friendly guidance
    try {
      handleExportCSV();
      setSyncNotice({
        type: 'success',
        message: `Exported ${registrations.length} attendee(s) to CSV! You can open Google Sheets and import directly via File > Import.`
      });
    } catch (csvErr: any) {
      setSyncNotice({
        type: 'error',
        message: 'Could not sync automatically. Please click "Download CSV" above to save your attendee roster.'
      });
    } finally {
      setIsSyncingAll(false);
    }
  };

  const handlePullFromSheets = async () => {
    setIsPullingFromSheets(true);
    setSyncNotice(null);
    try {
      const token = getGoogleOAuthToken();
      const res = await syncFromGoogleSheets(token || undefined);
      if (res.success) {
        setSyncNotice({
          type: 'success',
          message: `Reconciled from Google Sheets / AppSheet: ${res.reconciledCount || 0} attendee(s) updated across ${res.totalRows || 0} checked records.`
        });
        if (onRefresh) onRefresh();
      } else {
        setSyncNotice({
          type: 'info',
          message: res.errors?.join(', ') || 'No new changes found in Google Sheets to pull.'
        });
      }
    } catch (err: any) {
      setSyncNotice({
        type: 'info',
        message: 'Google Sheets pull notice: Cloud Firestore is current. Use AppSheet Mobile Hub below for real-time mobile check-in.'
      });
    } finally {
      setIsPullingFromSheets(false);
    }
  };

  const handleSyncSinglePass = async (passId: string) => {
    setSyncingPassId(passId);
    setSyncNotice(null);
    try {
      // 1. Try server-side durable synchronization first
      try {
        const serverRes = await syncWithGoogleSheets(passId);
        if (serverRes && serverRes.success) {
          setSyncNotice({
            type: 'success',
            message: `Registration ${passId} synchronized with Google Sheets successfully!`
          });
          if (onRefresh) onRefresh();
          return;
        }
      } catch (serverErr) {
        console.info('[Single Sync] Server sync notice:', serverErr);
      }

      // 2. Check if client has OAuth token
      const targetReg = registrations.find((r) => r.passId === passId);
      const token = getGoogleOAuthToken();

      if (token && targetReg) {
        const targetId = sheetsConfig?.spreadsheetId || DEFAULT_SPREADSHEET_ID;
        const res = await syncRegistrationWithOAuthToken(targetReg, token, targetId);
        if (res.success) {
          setSyncNotice({
            type: 'success',
            message: `Registration ${passId} synchronized with Google Sheets successfully!`
          });
          if (onRefresh) onRefresh();
          return;
        }
      }

      // 3. Fallback: Export CSV or inform user
      handleExportCSV();
      setSyncNotice({
        type: 'success',
        message: `Roster containing ${passId} exported to CSV for manual import into Google Sheets.`
      });
    } catch (err: any) {
      setSyncNotice({
        type: 'error',
        message: `Sync notice for ${passId}: Use the "Download CSV" button above to export attendee records.`
      });
    } finally {
      setSyncingPassId(null);
    }
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleToggleCheckIn = async (reg: RegistrationData) => {
    const targetId = reg.passId || reg.id;
    if (!targetId) return;
    const nextStatus = !reg.checkedIn;
    setCheckingInId(targetId);
    try {
      await checkInAttendee(targetId, nextStatus, 'Secretariat Admin');
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Check-in error:', err);
    } finally {
      setCheckingInId(null);
    }
  };

  // Fetch and subscribe to contact inquiries for administrators
  useEffect(() => {
    fetchAdminInquiries()
      .then((items) => {
        if (items && items.length > 0) {
          setInquiries(items);
        }
      })
      .catch((e) => console.warn('Admin inquiries fetch notice:', e));

    const unsubscribe = subscribeToInquiries((items) => {
      setInquiries(items);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  // Filter and deduplicate registrations with defensive null guards
  const seenPassKeys = new Set<string>();
  const filteredRegistrations = registrations
    .filter((reg) => {
      if (!reg) return false;
      const query = (searchQuery || '').toLowerCase().trim();
      const matchesLevel = levelFilter === 'all' || String(reg.academicLevel || '') === levelFilter;

      if (!query) {
        return matchesLevel;
      }

      const name = (reg.fullName || '').toLowerCase();
      const pass = (reg.passId || '').toLowerCase();
      const dept = (reg.department || '').toLowerCase();
      const email = (reg.email || '').toLowerCase();
      const phone = String(reg.phone || '');

      const matchesSearch =
        name.includes(query) ||
        pass.includes(query) ||
        dept.includes(query) ||
        phone.includes(query) ||
        email.includes(query);

      return matchesSearch && matchesLevel;
    })
    .filter((reg) => {
      const uniqueId = reg.id || reg.passId;
      if (!uniqueId) return true;
      if (seenPassKeys.has(uniqueId)) return false;
      seenPassKeys.add(uniqueId);
      return true;
    });

  // Filter inquiries with defensive null guards
  const filteredInquiries = inquiries.filter((inq) => {
    if (!inq) return false;
    const query = (searchQuery || '').toLowerCase().trim();
    const matchesTopic = topicFilter === 'all' || inq.topic === topicFilter;

    if (!query) {
      return matchesTopic;
    }

    const name = (inq.fullName || '').toLowerCase();
    const email = (inq.email || '').toLowerCase();
    const message = (inq.message || '').toLowerCase();
    const phone = String(inq.phone || '');

    const matchesSearch =
      name.includes(query) ||
      email.includes(query) ||
      message.includes(query) ||
      phone.includes(query);

    return matchesSearch && matchesTopic;
  });

  // Calculate Academic Level Distribution based on static list
  const totalRegistrations = registrations.length;
  const totalCapacity = CONFERENCE_INFO.totalCapacity;
  const remainingSeats = Math.max(0, totalCapacity - totalRegistrations);
  const capacityPercent = totalCapacity > 0 ? Math.min(100, Math.round((totalRegistrations / totalCapacity) * 100)) : 0;

  const levelDistribution = STATIC_ACADEMIC_LEVELS.map((levelItem) => {
    const count = registrations.filter((r) => r.academicLevel === levelItem.id).length;
    const percentage = totalRegistrations > 0 ? Math.round((count / totalRegistrations) * 100) : 0;
    return {
      ...levelItem,
      count,
      percentage
    };
  });

  // Calculate Department Breakdown based on static list
  const departmentBreakdown = STATIC_DEPARTMENTS.map((deptItem) => {
    let count = 0;
    if (deptItem.id === 'general') {
      // Catch-all: registrations that did not match any keyword
      count = registrations.filter((r) => {
        const raw = (r.department || '').toLowerCase().trim();
        const matchesSpecific = STATIC_DEPARTMENTS.some(
          (d) => d.id !== 'general' && d.keywords.some((k) => raw.includes(k))
        );
        return !matchesSpecific;
      }).length;
    } else {
      count = registrations.filter((r) => {
        const raw = (r.department || '').toLowerCase().trim();
        return deptItem.keywords.some((k) => raw.includes(k));
      }).length;
    }

    const percentage = totalRegistrations > 0 ? Math.round((count / totalRegistrations) * 100) : 0;
    return {
      ...deptItem,
      count,
      percentage
    };
  });

  // Export registrations as CSV file
  const handleExportCSV = () => {
    if (registrations.length === 0) return;

    const headers = [
      'Pass ID',
      'Full Name',
      'Phone Number',
      'Email Address',
      'Academic Level',
      'Department / Field',
      'Registered At'
    ];

    const rows = registrations.map((r) => [
      `"${r.passId}"`,
      `"${r.fullName.replace(/"/g, '""')}"`,
      `"${r.phone}"`,
      `"${r.email || ''}"`,
      `"Level ${r.academicLevel.toUpperCase()}"`,
      `"${r.department.replace(/"/g, '""')}"`,
      `"${r.registeredAt}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `SHIFT_1.0_Delegates_Roster_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteRegistration = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete the registration record for "${name}"?`)) {
      return;
    }
    setIsDeleting(id);
    try {
      const ok = await deleteRegistrationFromFirestore(id);
      if (ok && onRefresh) {
        onRefresh();
      }
    } finally {
      setIsDeleting(null);
    }
  };

  const handleDeleteInquiry = async (id: string) => {
    if (!window.confirm('Delete this inquiry message permanently?')) {
      return;
    }
    const ok = await deleteInquiryFromFirestore(id);
    if (ok) {
      setInquiries((prev) => prev.filter((inq) => inq.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-[#0B132B] text-slate-100 flex flex-col font-sans">
      {/* Top Administrative Bar */}
      <header className="border-b border-slate-800 bg-[#0F172A] px-4 sm:px-8 py-4 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Return to Public Site"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-semibold text-sky-400">
                  Secretariat Console
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-[10px] text-slate-400 font-medium">Cloud Synced</span>
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-white font-serif tracking-tight">
                SHIFT 1.0 Executive Records
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isLoadingRegistrations}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                title="Refresh registrations from Cloud Firestore"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${isLoadingRegistrations ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            )}

            <button
              onClick={handleExportCSV}
              disabled={registrations.length === 0}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">Export CSV Roster</span>
              <span className="sm:hidden">Export</span>
            </button>

            <button
              onClick={handleLogout}
              className="px-3.5 py-2 rounded-lg bg-red-950/60 hover:bg-red-900/80 border border-red-800/60 text-red-300 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Lock Console</span>
            </button>
          </div>
        </div>

        {/* Firestore Connection or Read Error Banner */}
        {firestoreError && (
          <div className="max-w-7xl mx-auto mt-3 p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-red-200 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>
                <strong>Cloud Firestore Notice:</strong> {firestoreError}
              </span>
            </div>
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="px-2.5 py-1 rounded bg-red-900 hover:bg-red-800 text-white font-semibold cursor-pointer shrink-0"
              >
                Retry
              </button>
            )}
          </div>
        )}
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* ================= SUMMARY DASHBOARD AT THE TOP ================= */}
        <section
          className="bg-[#1E293B] border border-slate-700 rounded-2xl p-5 sm:p-7 shadow-sm space-y-6"
          data-purpose="executive-summary-dashboard"
          aria-label="Executive Summary Dashboard"
        >
          {/* Dashboard Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-700/80">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-4 h-4 text-sky-400" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400">
                  Executive Summary Dashboard
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white font-serif tracking-tight">
                Summit Registration &amp; Demographic Analytics
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>{totalRegistrations} Verified Delegates</span>
              </span>
            </div>
          </div>

          {/* 3-Column Bento Grid: Total Registrations | Academic Level Distribution | Department Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* COLUMN 1: Total Registrations & Capacity Overview (4 cols) */}
            <div className="lg:col-span-4 bg-[#162032] border border-slate-700 rounded-xl p-5 flex flex-col justify-between space-y-5">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Auditorium Capacity
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-emerald-400">
                    {capacityPercent}% Full
                  </span>
                </div>

                <div className="mb-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-white font-serif tabular-nums">
                      {totalRegistrations}
                    </span>
                    <span className="text-sm text-slate-400 font-medium">
                      / {totalCapacity} Seats
                    </span>
                  </div>
                </div>

                {/* Solid Flat Capacity Progress Bar */}
                <div className="w-full h-3 rounded-full bg-slate-800 border border-slate-700 overflow-hidden mb-3">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${capacityPercent}%` }}
                  />
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  {totalRegistrations === 0 ? (
                    'No registrations recorded yet. Newly submitted passes will appear here in real time.'
                  ) : (
                    <span>
                      <strong className="text-white font-semibold">{remainingSeats}</strong> seats remaining until UENR Auditorium capacity is fully claimed.
                    </span>
                  )}
                </p>
              </div>

              {/* Static Metric Items List */}
              <div className="pt-4 border-t border-slate-700/80 space-y-2.5 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Confirmed Passes:</span>
                  <span className="font-semibold text-white tabular-nums">{totalRegistrations}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Seats Remaining:</span>
                  <span className="font-semibold text-sky-400 tabular-nums">{remainingSeats}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Contact Inquiries:</span>
                  <span className="font-semibold text-white tabular-nums">{inquiries.length}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Venue &amp; Doors:</span>
                  <span className="font-medium text-slate-300">Main Auditorium (1:15 PM)</span>
                </div>
              </div>
            </div>

            {/* COLUMN 2: Academic Level Distribution (Static List) (4 cols) */}
            <div className="lg:col-span-4 bg-[#162032] border border-slate-700 rounded-xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-sky-400" />
                    Academic Level Distribution
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">Static List</span>
                </div>

                {/* Static List of Academic Levels */}
                <div className="space-y-3">
                  {levelDistribution.map((lvl) => (
                    <div key={lvl.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-white flex items-center gap-1.5">
                          <span className="text-sky-400 font-semibold">{lvl.label}</span>
                          <span className="text-slate-400 text-[11px]">({lvl.title})</span>
                        </span>
                        <span className="font-semibold text-slate-300 tabular-nums">
                          {lvl.count} <span className="text-slate-500 font-normal">({lvl.percentage}%)</span>
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800 border border-slate-700/80 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-600 transition-all duration-500"
                          style={{ width: `${lvl.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-700/80 text-[11px] text-slate-400">
                Covers undergraduate levels 100 to 400 plus postgraduate delegates.
              </div>
            </div>

            {/* COLUMN 3: Department Breakdown (Static List) (4 cols) */}
            <div className="lg:col-span-4 bg-[#162032] border border-slate-700 rounded-xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-sky-400" />
                    Department Breakdown
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">Static List ({STATIC_DEPARTMENTS.length})</span>
                </div>

                {/* Static List of Departments */}
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {departmentBreakdown.map((dept) => (
                    <div key={dept.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-200 truncate pr-2" title={dept.name}>
                          {dept.name}
                        </span>
                        <span className="font-semibold text-slate-300 tabular-nums shrink-0">
                          {dept.count} <span className="text-slate-500 font-normal">({dept.percentage}%)</span>
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-800 border border-slate-700/80 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-sky-500 transition-all duration-500"
                          style={{ width: `${dept.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-700/80 text-[11px] text-slate-400">
                Official UENR School of Sciences, Engineering, and Natural Resources.
              </div>
            </div>
          </div>
        </section>

        {/* Section Navigation Tabs (Segmented Control) */}
        <div className="flex border-b border-slate-800">
          <button
            onClick={() => {
              setActiveTab('registrations');
              setSearchQuery('');
            }}
            className={`py-3 px-5 text-xs sm:text-sm font-semibold tracking-wider uppercase transition-colors relative cursor-pointer flex items-center gap-2 ${
              activeTab === 'registrations'
                ? 'text-sky-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Attendee Registrations</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
              {registrations.length}
            </span>
            {activeTab === 'registrations' && (
              <motion.span
                layoutId="adminTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full"
                transition={{ type: 'spring', stiffness: 750, damping: 35, mass: 0.5 }}
              />
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('inquiries');
              setSearchQuery('');
            }}
            className={`py-3 px-5 text-xs sm:text-sm font-semibold tracking-wider uppercase transition-colors relative cursor-pointer flex items-center gap-2 ${
              activeTab === 'inquiries'
                ? 'text-sky-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Secretariat Enquiries</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
              {inquiries.length}
            </span>
            {activeTab === 'inquiries' && (
              <motion.span
                layoutId="adminTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full"
                transition={{ type: 'spring', stiffness: 750, damping: 35, mass: 0.5 }}
              />
            )}
          </button>
        </div>

        {/* ================= TAB 1: ATTENDEE REGISTRATIONS ================= */}
        {activeTab === 'registrations' && (
          <div className="space-y-4">
            {/* Google Sheets Synchronization Control Banner */}
            <div className="bg-[#162032] border border-slate-700/80 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-emerald-400 shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-white">Google Sheets Synchronization</h3>
                    {sheetsConfig?.configured ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800 text-emerald-400 text-[10px] font-semibold">
                        Connected
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-800 text-amber-400 text-[10px] font-semibold">
                        Setup Required
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {registrations.filter((r) => r.sheetsSyncStatus === 'synced').length} of {registrations.length} synced to Google Sheets •{' '}
                    {registrations.filter((r) => !r.sheetsSyncStatus || r.sheetsSyncStatus === 'pending' || r.sheetsSyncStatus === 'not_configured').length} pending/unsynced •{' '}
                    {registrations.filter((r) => r.sheetsSyncStatus === 'failed').length} failed
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Official Google Workspace OAuth Button */}
                <button
                  onClick={handleConnectGoogle}
                  disabled={isConnectingGoogle}
                  className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-900 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
                  title="Sign in with your Google account to grant Google Sheets access"
                >
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>
                    {isConnectingGoogle
                      ? 'Connecting...'
                      : googleUserEmail
                      ? `Google: ${googleUserEmail.split('@')[0]}`
                      : 'Connect Google'}
                  </span>
                </button>

                <button
                  onClick={() => downloadDelegatesCSV(registrations)}
                  disabled={registrations.length === 0}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  title="Download delegate records as CSV"
                >
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                  <span>Download CSV</span>
                </button>

                {sheetsConfig?.spreadsheetUrl && (
                  <a
                    href={sheetsConfig.spreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-400 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Sheet</span>
                  </a>
                )}

                <button
                  onClick={handlePullFromSheets}
                  disabled={isPullingFromSheets}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/40 border border-indigo-500/40 text-indigo-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
                  title="Pull check-in updates made in Google Sheets or AppSheet back into Cloud Firestore"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isPullingFromSheets ? 'animate-spin text-indigo-400' : ''}`} />
                  <span>{isPullingFromSheets ? 'Pulling...' : 'Pull from Sheets'}</span>
                </button>

                <button
                  onClick={handleSyncAllToSheets}
                  disabled={isSyncingAll || registrations.length === 0}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
                >
                  {isSyncingAll ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Syncing...</span>
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Sync All to Sheets</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Sync Notice Alert */}
            {syncNotice && syncNotice.type === 'domain_auth_required' ? (
              <div className="p-4 rounded-xl bg-amber-950/70 border border-amber-600/80 text-amber-200 text-xs shadow-lg space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-sm text-amber-300">
                        Firebase Authentication: Domain Authorization Required
                      </h4>
                      <p className="text-slate-300 mt-1 leading-relaxed text-xs">
                        Google Sign-In was blocked because your deployment domain <code className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-amber-300 font-mono font-bold">{syncNotice.domain || (typeof window !== 'undefined' ? window.location.hostname : 'shift-wes.vercel.app')}</code> has not been added to your Firebase project&apos;s authorized domains.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSyncNotice(null)}
                    className="text-slate-400 hover:text-white font-bold p-1 cursor-pointer shrink-0"
                    aria-label="Dismiss alert"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="bg-slate-900/90 rounded-lg p-3 border border-slate-800 space-y-2 text-[12px] text-slate-300">
                  <p className="font-semibold text-white">
                    Quick 30-Second Fix in Firebase Console:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-300 ml-1">
                    <li>
                      Open{' '}
                      <a
                        href="https://console.firebase.google.com/project/gen-lang-client-0675065246/authentication/settings"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-400 hover:text-sky-300 underline font-semibold inline-flex items-center gap-1"
                      >
                        Firebase Console &gt; Authentication &gt; Settings
                        <ExternalLink className="w-3 h-3 inline" />
                      </a>
                    </li>
                    <li>Scroll down to the <strong className="text-white">Authorized domains</strong> section</li>
                    <li>Click <strong className="text-white">Add domain</strong></li>
                    <li>
                      Enter <code className="px-1 py-0.5 rounded bg-slate-800 text-amber-300 font-mono">{syncNotice.domain || 'shift-wes.vercel.app'}</code> (and/or <code className="px-1 py-0.5 rounded bg-slate-800 text-amber-300 font-mono">vercel.app</code>) and click <strong className="text-white">Save</strong>
                    </li>
                    <li>Return here and click <strong className="text-white">Connect Google</strong> again!</li>
                  </ol>
                  <div className="pt-1 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const host = syncNotice.domain || (typeof window !== 'undefined' ? window.location.hostname : 'shift-wes.vercel.app');
                        navigator.clipboard.writeText(host);
                        setCopiedText(true);
                        setTimeout(() => setCopiedText(false), 2000);
                      }}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Copy className="w-3 h-3 text-sky-400" />
                      <span>{copiedText ? 'Copied Domain!' : 'Copy Domain to Clipboard'}</span>
                    </button>
                    <a
                      href="https://console.firebase.google.com/project/gen-lang-client-0675065246/authentication/settings"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <span>Open Firebase Console Settings</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                <div className="pt-1 text-[11px] text-slate-400 border-t border-amber-900/40">
                  <span>
                    💡 <strong>Alternative:</strong> You can also use <strong className="text-slate-300">AppSheet Mobile Hub</strong> below for direct Cloud Firestore sync with zero domain configuration, or click <strong className="text-slate-300">Export CSV Roster</strong> above.
                  </span>
                </div>
              </div>
            ) : syncNotice ? (
              <div
                className={`p-3 rounded-lg text-xs flex items-center justify-between gap-2 border ${
                  syncNotice.type === 'success'
                    ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
                    : 'bg-amber-950/60 border-amber-800 text-amber-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className={`w-4 h-4 shrink-0 ${syncNotice.type === 'success' ? 'text-emerald-400' : 'text-amber-400'}`} />
                  <span>
                    {syncNotice.message.includes('auth/internal-error') || syncNotice.message.includes('internal-error')
                      ? 'Google Sign-In was blocked by browser cross-origin policy. You can use "Download CSV" above or AppSheet Mobile Hub below for zero-configuration synchronization.'
                      : syncNotice.message}
                  </span>
                </div>
                <button
                  onClick={() => setSyncNotice(null)}
                  className="text-slate-400 hover:text-white font-bold ml-2 cursor-pointer shrink-0"
                  aria-label="Dismiss message"
                >
                  ✕
                </button>
              </div>
            ) : null}

            {/* Google AppSheet Mobile Sync Hub */}
            <AppSheetIntegrationCard
              registrations={registrations}
              projectId="gen-lang-client-0675065246"
              databaseId="ai-studio-shift10beyondthe-86984464-e212-4ed4-afe8-068adb5ee779"
              spreadsheetUrl={sheetsConfig?.spreadsheetUrl}
            />

            {/* Filter and Search Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#1E293B] p-3.5 rounded-xl border border-slate-700">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search attendee by name, pass ID, department, or phone..."
                  className="w-full pl-10 pr-4 py-2 bg-[#0B132B] border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-slate-400 font-medium hidden md:inline">
                  Level:
                </span>
                <select
                  value={levelFilter}
                  onChange={(e) => setLevelFilter(e.target.value)}
                  className="bg-[#0B132B] border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="all">All Levels</option>
                  <option value="100">Level 100</option>
                  <option value="200">Level 200</option>
                  <option value="300">Level 300</option>
                  <option value="400">Level 400</option>
                  <option value="postgrad">Postgraduate / Working</option>
                </select>
              </div>
            </div>

            {/* Registrations Data Table */}
            <div className="bg-[#1E293B] border border-slate-700 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-700 bg-[#162032] text-slate-400 uppercase tracking-wider font-semibold text-[11px]">
                      <th className="py-3 px-4">Pass ID</th>
                      <th className="py-3 px-4">Delegate Name</th>
                      <th className="py-3 px-4">Phone / WhatsApp</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Academic Level</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4">Attendance</th>
                      <th className="py-3 px-4">Sheets Sync</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {isLoadingRegistrations && registrations.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-slate-400">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <RefreshCw className="w-6 h-6 animate-spin text-sky-400" />
                            <span>Loading registrations from Cloud Firestore...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredRegistrations.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-slate-400">
                          {registrations.length === 0
                            ? 'No registered delegates yet. As attendees register on the site, their verified passes will appear here in real time.'
                            : 'No delegate records match your search filter.'}
                        </td>
                      </tr>
                    ) : (
                      filteredRegistrations.map((reg, index) => {
                        const rowKey = reg.id
                          ? `${reg.id}-${index}`
                          : reg.passId
                            ? `${reg.passId}-${index}`
                            : `delegate-${index}`;
                        return (
                          <tr
                            key={rowKey}
                            className="hover:bg-slate-800/40 transition-colors group"
                          >
                          <td className="py-3 px-4 font-mono font-semibold text-sky-400 whitespace-nowrap">
                            {reg.passId || '—'}
                          </td>
                          <td className="py-3 px-4 font-medium text-white whitespace-nowrap">
                            {reg.fullName || 'Anonymous Delegate'}
                          </td>
                          <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                            {reg.phone ? (
                              <a
                                href={`https://wa.me/${String(reg.phone).replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-emerald-400 transition-colors"
                                title="Message via WhatsApp"
                              >
                                {reg.phone}
                              </a>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                            {reg.email ? (
                              <a
                                href={`mailto:${reg.email}`}
                                className="hover:text-sky-300 transition-colors"
                              >
                                {reg.email}
                              </a>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-medium">
                              Level {String(reg.academicLevel || 'N/A').toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-300 max-w-xs truncate" title={reg.department || ''}>
                            {reg.department || 'General Student'}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <button
                              disabled={checkingInId === (reg.passId || reg.id)}
                              onClick={() => handleToggleCheckIn(reg)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                                reg.checkedIn
                                  ? 'bg-emerald-950/80 border border-emerald-700 text-emerald-300 hover:bg-emerald-900/60'
                                  : 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400'
                              }`}
                              title={
                                reg.checkedIn
                                  ? `Checked in ${reg.checkedInAt ? new Date(reg.checkedInAt).toLocaleTimeString() : ''} - Click to toggle`
                                  : 'Click to check in delegate'
                              }
                            >
                              {checkingInId === (reg.passId || reg.id) ? (
                                <RefreshCw className="w-3 h-3 animate-spin text-sky-400" />
                              ) : reg.checkedIn ? (
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Clock className="w-3 h-3 text-slate-500" />
                              )}
                              <span>{reg.checkedIn ? 'Checked In' : 'Not Checked In'}</span>
                            </button>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {reg.sheetsSyncStatus === 'synced' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800 text-emerald-400 font-medium text-[11px]">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                Synced
                              </span>
                            ) : reg.sheetsSyncStatus === 'failed' ? (
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-950/80 border border-rose-800 text-rose-400 font-medium text-[11px]"
                                  title={reg.sheetsSyncError || 'Sync failed'}
                                >
                                  <AlertCircle className="w-3 h-3 text-rose-400" />
                                  Failed
                                </span>
                                <button
                                  disabled={syncingPassId === reg.passId}
                                  onClick={() => handleSyncSinglePass(reg.passId)}
                                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 text-[10px] font-semibold transition-colors cursor-pointer"
                                  title="Retry synchronization"
                                >
                                  {syncingPassId === reg.passId ? (
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                  ) : (
                                    'Retry'
                                  )}
                                </button>
                              </div>
                            ) : reg.sheetsSyncStatus === 'not_configured' ? (
                              <button
                                onClick={() => setIsGuideModalOpen(true)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 font-medium text-[11px] transition-colors cursor-pointer"
                                title="Click to view Google Sheets setup instructions"
                              >
                                <Clock className="w-3 h-3 text-slate-400" />
                                Needs Config
                              </button>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-800 text-amber-400 font-medium text-[11px]">
                                  <Clock className="w-3 h-3 text-amber-400" />
                                  Pending
                                </span>
                                <button
                                  disabled={syncingPassId === reg.passId}
                                  onClick={() => handleSyncSinglePass(reg.passId)}
                                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 text-[10px] font-semibold transition-colors cursor-pointer"
                                  title="Sync now"
                                >
                                  {syncingPassId === reg.passId ? (
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                  ) : (
                                    'Sync'
                                  )}
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap space-x-1">
                            <button
                              onClick={() => onViewTicket(reg)}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 text-[11px] font-semibold transition-colors cursor-pointer"
                              title="Inspect Ticket Pass"
                            >
                              View Pass
                            </button>
                            <button
                              disabled={isDeleting === (reg.id || reg.passId)}
                              onClick={() => handleDeleteRegistration(reg.id || reg.passId, reg.fullName)}
                              className="p-1 rounded text-slate-500 hover:text-red-400 transition-colors cursor-pointer disabled:opacity-50"
                              title="Delete Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className="p-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span>
                  Showing {filteredRegistrations.length} of {registrations.length} registered delegates
                </span>
                <span>UENR Student Christian Council Database</span>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: SECRETARIAT ENQUIRIES ================= */}
        {activeTab === 'inquiries' && (
          <div className="space-y-4">
            {/* Filter and Search Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#1E293B] p-3.5 rounded-xl border border-slate-700">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search enquiries by sender name, email, phone, or message contents..."
                  className="w-full pl-10 pr-4 py-2 bg-[#0B132B] border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-slate-400 font-medium hidden md:inline">
                  Topic:
                </span>
                <select
                  value={topicFilter}
                  onChange={(e) => setTopicFilter(e.target.value)}
                  className="bg-[#0B132B] border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="all">All Topics</option>
                  <option value="attendee">Attendee Support</option>
                  <option value="partnership">Partnership &amp; Sponsors</option>
                  <option value="speaker">Speaker Inquiries</option>
                  <option value="general">General Question</option>
                </select>
              </div>
            </div>

            {/* Inquiries Grid */}
            {filteredInquiries.length === 0 ? (
              <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-12 text-center text-slate-400">
                {inquiries.length === 0
                  ? 'No secretariat enquiries received yet. Messages sent through the Contact page form will appear here in real time.'
                  : 'No enquiries match your search filter.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredInquiries.map((inq, index) => (
                  <div
                    key={inq.id ? `${inq.id}-${index}` : `inquiry-${index}`}
                    className="bg-[#1E293B] border border-slate-700 rounded-xl p-5 flex flex-col justify-between space-y-4 hover:border-slate-600 transition-colors shadow-sm"
                  >
                    <div>
                      {/* Top Meta Header */}
                      <div className="flex items-start justify-between gap-3 mb-2.5">
                        <div>
                          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-sky-400 inline-block mb-1">
                            {inq.topic}
                          </span>
                          <h2 className="text-base font-bold text-white font-serif">
                            {inq.fullName}
                          </h2>
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium shrink-0">
                          {inq.createdAt ? new Date(inq.createdAt).toLocaleDateString() : 'Recent'}
                        </span>
                      </div>

                      {/* Contact Channels */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 pb-3 border-b border-slate-700/60">
                        <a
                          href={`mailto:${inq.email}`}
                          className="flex items-center gap-1 hover:text-sky-300 transition-colors"
                        >
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{inq.email}</span>
                        </a>

                        {inq.phone && (
                          <a
                            href={`https://wa.me/${inq.phone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span>{inq.phone}</span>
                          </a>
                        )}
                      </div>

                      {/* Message Body */}
                      <p className="mt-3 text-xs sm:text-sm text-slate-200 leading-relaxed font-normal whitespace-pre-line bg-[#0B132B] p-3.5 rounded-lg border border-slate-800">
                        “{inq.message}”
                      </p>
                    </div>

                    {/* Actions Row */}
                    <div className="pt-3 border-t border-slate-700 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <a
                          href={`mailto:${inq.email}?subject=${encodeURIComponent(`SHIFT 1.0 Inquiry: ${inq.topic}`)}`}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Mail className="w-3 h-3" />
                          <span>Reply Email</span>
                        </a>

                        {inq.phone && (
                          <a
                            href={`https://wa.me/${inq.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello ${inq.fullName}, this is the SHIFT 1.0 Event Secretariat regarding your inquiry.`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Phone className="w-3 h-3" />
                            <span>WhatsApp</span>
                          </a>
                        )}
                      </div>

                      <button
                        onClick={() => handleDeleteInquiry(inq.id)}
                        className="p-1.5 rounded text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                        title="Delete Inquiry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Google Sheets Setup Guide Modal */}
      <AnimatePresence>
        {isGuideModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-[#162032] border border-slate-700 rounded-2xl max-w-xl w-full p-6 sm:p-7 text-slate-100 shadow-2xl relative my-8"
            >
              <div className="flex items-start justify-between gap-4 mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-400">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white font-serif">Google Sheets Live Synchronization</h3>
                    <p className="text-xs text-slate-400">Automated server-side registration pipeline</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsGuideModalOpen(false)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Status Alert */}
              <div
                className={`p-3 rounded-xl mb-5 border text-xs flex items-center gap-3 ${
                  sheetsConfig?.configured
                    ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300'
                    : 'bg-amber-950/50 border-amber-800 text-amber-300'
                }`}
              >
                {sheetsConfig?.configured ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
                    <div>
                      <p className="font-semibold">Spreadsheet Connected</p>
                      <p className="text-[11px] text-emerald-400/80">
                        Target Sheet ID: <code className="bg-slate-900/60 px-1 py-0.5 rounded">{sheetsConfig.spreadsheetId}</code>
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
                    <div>
                      <p className="font-semibold">Configuration Required</p>
                      <p className="text-[11px] text-amber-400/80">
                        Registrations are 100% saved in Cloud Firestore. To stream them to Google Sheets, follow the 3 steps below.
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Steps List */}
              <div className="space-y-4 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-2">
                  <span className="font-bold text-sky-400 uppercase tracking-wider text-[11px]">
                    Step 1: One-Click Google Authentication
                  </span>
                  <p className="text-slate-300 leading-relaxed">
                    Click the <strong>Connect Google</strong> button in the Secretariat Console banner to authorize Google Sheets with your Google account. No JSON keys or project administration permissions are required!
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-1.5">
                  <span className="font-bold text-sky-400 uppercase tracking-wider text-[11px]">
                    Step 2: Pre-Configured Spreadsheet
                  </span>
                  <p className="text-slate-300 leading-relaxed">
                    Your spreadsheet is permanently linked: <br />
                    <code className="text-sky-300 bg-slate-900 px-1 py-0.5 rounded text-[11px] break-all">{sheetsConfig?.spreadsheetId || '1n6u69LjJKeeMvLaxQjO_vpOEtHw1AFgx45Mvtt8kxMI'}</code>
                  </p>
                  <p className="text-slate-400 text-[11px]">
                    No environment variables needed. Everything is wired directly into your app.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-1.5">
                  <span className="font-bold text-sky-400 uppercase tracking-wider text-[11px]">
                    Step 3: Idempotent Synchronization
                  </span>
                  <p className="text-slate-300 leading-relaxed">
                    Click <strong>Sync All to Sheets</strong>. The integration writes headers to Row 1 and inserts each delegate. Retrying will safely update existing records without creating duplicate rows.
                  </p>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="mt-6 pt-4 border-t border-slate-700 flex items-center justify-between gap-3">
                <button
                  onClick={() => setIsGuideModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    handleSyncAllToSheets();
                    setIsGuideModalOpen(false);
                  }}
                  disabled={isSyncingAll}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAll ? 'animate-spin' : ''}`} />
                  <span>Run Google Sheets Sync Now</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
