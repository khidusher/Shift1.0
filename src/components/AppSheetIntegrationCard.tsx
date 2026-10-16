import React, { useState } from 'react';
import { Smartphone, Copy, Check, ExternalLink, HelpCircle, Users, CheckCircle, FileSpreadsheet } from 'lucide-react';
import { RegistrationData } from '../types';
import { AppSheetGuideModal } from './AppSheetGuideModal';

interface AppSheetIntegrationCardProps {
  registrations: (RegistrationData & { id?: string })[];
  projectId?: string;
  databaseId?: string;
  spreadsheetUrl?: string;
}

export const AppSheetIntegrationCard: React.FC<AppSheetIntegrationCardProps> = ({
  registrations,
  projectId = 'gen-lang-client-0675065246',
  databaseId = 'ai-studio-shift10beyondthe-86984464-e212-4ed4-afe8-068adb5ee779',
  spreadsheetUrl
}) => {
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const checkedInCount = registrations.filter((r) => r.checkedIn).length;
  const totalCount = registrations.length;
  const checkedInPercent = totalCount > 0 ? Math.round((checkedInCount / totalCount) * 100) : 0;

  const copyConfig = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <>
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4 shadow-sm">
        {/* Header Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-white">Google AppSheet Mobile Hub</h4>
                <span className="text-[11px] text-emerald-400 font-medium">
                  Sheets Linked
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Offline-capable mobile attendee management &amp; QR ticket scanner for event ushers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsGuideOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Setup Guide</span>
            </button>

            <a
              href="https://www.appsheet.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>AppSheet.com</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          </div>
        </div>

        {/* 3 Focused Cards: Check-Ins, Data Source, and QR Scanner Configuration */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* 1. Check-In Progress */}
          <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                Live Attendance Check-Ins
              </span>
              <span className="text-emerald-400 font-mono text-[11px] font-semibold">{checkedInPercent}%</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-white font-mono tabular-nums">{checkedInCount}</span>
              <span className="text-xs text-slate-400">of {totalCount} delegates checked in</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${checkedInPercent}%` }}
              />
            </div>
          </div>

          {/* 2. Accurate Data Source: Google Sheets */}
          <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                Data Source (AppSheet)
              </span>
              {spreadsheetUrl && (
                <a
                  href={spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:text-emerald-300 text-[11px] font-semibold flex items-center gap-0.5"
                >
                  <span>Open</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>
            <div className="text-xs text-white font-medium">
              Google Sheets (Synced)
            </div>
            <div className="text-[11px] text-slate-400">
              Table: <span className="font-mono text-emerald-400 font-medium">SHIFT 1.0 Attendees</span>
            </div>
          </div>

          {/* 3. Key & Label Configuration for Scanner */}
          <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                AppSheet Table Schema
              </span>
              <button
                type="button"
                onClick={() => copyConfig('passId', 'key')}
                className="text-indigo-400 hover:text-indigo-300 text-[11px] font-mono flex items-center gap-0.5 cursor-pointer"
                title="Copy passId key"
              >
                {copiedKey === 'key' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedKey === 'key' ? 'Copied' : 'Key'}
              </button>
            </div>
            <div className="text-xs text-slate-200">
              Key: <span className="font-mono text-amber-400 font-semibold">passId</span> (QR code)
            </div>
            <div className="text-[11px] text-slate-400">
              Label: <span className="font-mono text-cyan-400 font-medium">fullName</span>
            </div>
          </div>
        </div>
      </div>

      <AppSheetGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        projectId={projectId}
        databaseId={databaseId}
      />
    </>
  );
};
