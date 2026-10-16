import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, Smartphone, Database, CheckCircle, ShieldCheck, QrCode } from 'lucide-react';

interface AppSheetGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  databaseId: string;
}

export const AppSheetGuideModal: React.FC<AppSheetGuideModalProps> = ({
  isOpen,
  onClose,
  projectId,
  databaseId
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<number>(1);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const steps = [
    {
      step: 1,
      title: 'Choose Connection Method',
      desc: 'Connect AppSheet using the auto-synced event data sheet, CSV export, or live API feed.'
    },
    {
      step: 2,
      title: 'Import Event Attendee Data',
      desc: 'Select the SHIFT 1.0 data source in AppSheet to auto-generate your mobile app.'
    },
    {
      step: 3,
      title: 'Configure Columns & QR Scanner',
      desc: 'Set passId as Key with Barcode/QR scanning and enable 1-tap check-ins.'
    },
    {
      step: 4,
      title: 'Mobile App & Offline Deployment',
      desc: 'Distribute to secretariat staff phones for offline venue operations.'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Google AppSheet Setup Guide</h3>
              <p className="text-xs text-slate-400">Offline-capable event secretariat check-in & QR scanner for mobile staff</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Navigation Bar */}
        <div className="grid grid-cols-4 border-b border-slate-800 bg-slate-900/40 text-xs">
          {steps.map((s) => (
            <button
              key={s.step}
              onClick={() => setActiveStep(s.step)}
              className={`p-3 text-left border-b-2 transition-colors flex items-center gap-2 ${
                activeStep === s.step
                  ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                activeStep === s.step ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'
              }`}>
                {s.step}
              </span>
              <span className="truncate hidden sm:inline">{s.title.split('&')[0]}</span>
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          {activeStep === 1 && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-2">
                <h4 className="font-semibold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center">1</span>
                  Sign in to Google AppSheet
                </h4>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Go to <a href="https://www.appsheet.com" target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline inline-flex items-center gap-0.5">appsheet.com <ExternalLink className="w-3 h-3" /></a> and sign in with your Google Account.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-3">
                <h4 className="font-semibold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center">2</span>
                  Select Your Connection Method
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-700/60 space-y-1.5">
                    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500 text-slate-950">
                      Recommended
                    </span>
                    <h5 className="font-semibold text-white">Method A: Google Sheets Sync</h5>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      SHIFT 1.0 continuously mirrors all Firestore registrations into your event Google Spreadsheet. In AppSheet, click <strong>Create New App &rarr; Start with existing data &rarr; Google Sheets</strong> and pick your SHIFT 1.0 Sheet. AppSheet generates your mobile app instantly!
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-800/70 border border-slate-700/80 space-y-1.5">
                    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-700 text-slate-300">
                      Alternative
                    </span>
                    <h5 className="font-semibold text-white">Method B: Direct CSV Export</h5>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      Click <strong>Download CSV</strong> on the Secretariat console to download the formatted attendee roster. In AppSheet, choose <strong>Create New App &rarr; Upload CSV</strong> to immediately generate the offline scanner.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-800/50 text-xs text-cyan-300">
                  <ShieldCheck className="w-4 h-4 inline mr-1.5 text-cyan-400" />
                  <strong>Zero Console Permissions Needed:</strong> AppSheet connects seamlessly without requiring Google Cloud Console IAM permissions, service accounts, or manual Cloud Firestore API enablement.
                </div>
              </div>
            </div>
          )}

          {activeStep === 2 && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300 space-y-2">
                <h5 className="font-semibold text-white">How to connect in AppSheet:</h5>
                <ol className="list-decimal pl-4 space-y-1.5 text-slate-300">
                  <li>In AppSheet, click <strong>Create</strong> &rarr; <strong>App</strong> &rarr; <strong>Start with existing data</strong>.</li>
                  <li>Name your app <strong>SHIFT 1.0 Secretariat</strong> and select <strong>Event Planning</strong>.</li>
                  <li>Choose <strong>Google Sheets</strong> and select your synced <strong>SHIFT 1.0 Attendee Roster</strong> (or upload the exported CSV).</li>
                  <li>AppSheet automatically detects the columns and builds your offline attendee list!</li>
                </ol>
              </div>

              <div className="space-y-3">
                <div className="text-xs font-semibold text-slate-300">Backend Cloud Firestore Source Parameters:</div>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Google Cloud Project ID</span>
                    <button
                      onClick={() => copyToClipboard(projectId, 'proj')}
                      className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-mono text-[11px]"
                    >
                      {copiedKey === 'proj' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedKey === 'proj' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className="font-mono text-white text-xs select-all bg-slate-900 p-2 rounded border border-slate-800">
                    {projectId}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Firestore Database ID</span>
                    <button
                      onClick={() => copyToClipboard(databaseId, 'db')}
                      className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-mono text-[11px]"
                    >
                      {copiedKey === 'db' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedKey === 'db' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className="font-mono text-white text-xs select-all bg-slate-900 p-2 rounded border border-slate-800">
                    {databaseId}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Target Collection / Sheet Name</span>
                    <button
                      onClick={() => copyToClipboard('registrations', 'col')}
                      className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-mono text-[11px]"
                    >
                      {copiedKey === 'col' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedKey === 'col' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className="font-mono text-emerald-400 text-xs select-all bg-slate-900 p-2 rounded border border-slate-800">
                    registrations
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeStep === 3 && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300">
                In AppSheet under <strong>Data</strong> &rarr; <strong>Columns</strong> for <code className="text-emerald-400">registrations</code>, configure these column settings:
              </p>

              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                      <th className="p-2.5 font-medium">Column</th>
                      <th className="p-2.5 font-medium">Type</th>
                      <th className="p-2.5 font-medium">Key / Label</th>
                      <th className="p-2.5 font-medium">Special Setting</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                    <tr className="hover:bg-slate-800/30">
                      <td className="p-2.5 text-white font-semibold">passId</td>
                      <td className="p-2.5 text-emerald-400">Text</td>
                      <td className="p-2.5"><span className="text-amber-400 font-bold">Key [x]</span></td>
                      <td className="p-2.5 font-sans text-slate-400">Enable Barcode Scanning</td>
                    </tr>
                    <tr className="hover:bg-slate-800/30">
                      <td className="p-2.5 text-white font-semibold">fullName</td>
                      <td className="p-2.5 text-cyan-400">Name</td>
                      <td className="p-2.5"><span className="text-cyan-400 font-bold">Label [x]</span></td>
                      <td className="p-2.5 font-sans text-slate-400">Header in mobile view</td>
                    </tr>
                    <tr className="hover:bg-slate-800/30">
                      <td className="p-2.5 text-white font-semibold">checkedIn</td>
                      <td className="p-2.5 text-purple-400">Yes/No</td>
                      <td className="p-2.5 text-slate-500">—</td>
                      <td className="p-2.5 font-sans text-emerald-400 font-medium">Check QuickEdit [x]</td>
                    </tr>
                    <tr className="hover:bg-slate-800/30">
                      <td className="p-2.5 text-white font-semibold">academicLevel</td>
                      <td className="p-2.5 text-indigo-400">Enum</td>
                      <td className="p-2.5 text-slate-500">—</td>
                      <td className="p-2.5 font-sans text-slate-400">100, 200, 300, 400, postgrad</td>
                    </tr>
                    <tr className="hover:bg-slate-800/30">
                      <td className="p-2.5 text-white font-semibold">department</td>
                      <td className="p-2.5 text-slate-300">Text</td>
                      <td className="p-2.5 text-slate-500">—</td>
                      <td className="p-2.5 font-sans text-slate-400">Department / Program</td>
                    </tr>
                    <tr className="hover:bg-slate-800/30">
                      <td className="p-2.5 text-white font-semibold">phone</td>
                      <td className="p-2.5 text-emerald-400">Phone</td>
                      <td className="p-2.5 text-slate-500">—</td>
                      <td className="p-2.5 font-sans text-slate-400">Enables 1-tap call/SMS</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300 flex items-start gap-2">
                <QrCode className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Tip for Venue Ushers:</strong> Setting <code className="text-emerald-400">checkedIn</code> to <strong>QuickEdit</strong> lets staff toggle attendance directly in table and card list views without opening full edit forms.
                </span>
              </div>
            </div>
          )}

          {activeStep === 4 && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-2">
                <h4 className="font-semibold text-white flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  Install the Mobile App
                </h4>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Have event staff install the free <strong>AppSheet</strong> app from the iOS App Store or Google Play Store.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-2">
                <h4 className="font-semibold text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-cyan-400" />
                  Enable Offline Sync
                </h4>
                <p className="text-slate-300 text-xs leading-relaxed">
                  In AppSheet under <strong>Settings</strong> &rarr; <strong>Offline</strong>, verify that <strong>Store content for offline use</strong> and <strong>The app can start offline</strong> are turned ON.
                </p>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Staff can now check in attendees in basements or auditoriums with zero cellular connectivity. When signal returns, AppSheet automatically syncs records back to Cloud Firestore in the background!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2">
            {activeStep > 1 && (
              <button
                onClick={() => setActiveStep(activeStep - 1)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium transition-colors"
              >
                Previous
              </button>
            )}
            {activeStep < 4 ? (
              <button
                onClick={() => setActiveStep(activeStep + 1)}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs text-white font-semibold transition-colors"
              >
                Next Step
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs text-white font-semibold transition-colors"
              >
                Done
              </button>
            )}
          </div>

          <a
            href="https://www.appsheet.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 font-medium"
          >
            Launch AppSheet <ExternalLink className="w-3 h-3" />
          </a>
        </div>

      </div>
    </div>
  );
};
