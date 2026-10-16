import React, { useRef, useState } from 'react';
import { RegistrationData } from '../types';
import { CONFERENCE_INFO } from '../data/conferenceData';
import {
  CheckCircle2,
  Download,
  Calendar,
  Share2,
  X,
  MapPin,
  Clock,
  Printer,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  generateAndDownloadTicketPdf,
  generateAndDownloadTicketImage
} from '../utils/ticketPdfGenerator';

interface DigitalTicketModalProps {
  registration: RegistrationData | null;
  onClose: () => void;
}

export const DigitalTicketModal: React.FC<DigitalTicketModalProps> = ({ registration, onClose }) => {
  const ticketRef = useRef<HTMLDivElement>(null);

  const [copied, setCopied] = useState(false);
  const [downloadState, setDownloadState] = useState<
    'idle' | 'generating_pdf' | 'generating_image' | 'success_pdf' | 'success_image' | 'error'
  >('idle');
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadedFilename, setDownloadedFilename] = useState<string>('');

  const handleDownloadPdf = async () => {
    if (!registration) return;
    setDownloadState('generating_pdf');
    setDownloadError(null);

    try {
      const res = await generateAndDownloadTicketPdf(registration);
      if (res.success) {
        setDownloadedFilename(res.filename);
        setDownloadState('success_pdf');
        setTimeout(() => {
          setDownloadState((prev) => (prev === 'success_pdf' ? 'idle' : prev));
        }, 4000);
      } else {
        setDownloadState('error');
        setDownloadError(res.error || 'Failed to download PDF pass.');
      }
    } catch (err: any) {
      console.error('[Pass Download] PDF Error:', err);
      setDownloadState('error');
      setDownloadError(err?.message || 'Failed to download PDF pass.');
    }
  };

  const handleDownloadImage = async () => {
    if (!registration) return;
    setDownloadState('generating_image');
    setDownloadError(null);

    try {
      const res = await generateAndDownloadTicketImage(registration);
      if (res.success) {
        setDownloadedFilename(res.filename);
        setDownloadState('success_image');
        setTimeout(() => {
          setDownloadState((prev) => (prev === 'success_image' ? 'idle' : prev));
        }, 4000);
      } else {
        setDownloadState('error');
        setDownloadError(res.error || 'Failed to generate image pass.');
      }
    } catch (err: any) {
      console.error('[Pass Download] Image Error:', err);
      setDownloadState('error');
      setDownloadError(err?.message || 'Failed to generate image pass.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleAddToCalendar = () => {
    if (!registration) return;
    const title = encodeURIComponent(`${CONFERENCE_INFO.name} - ${CONFERENCE_INFO.theme}`);
    const details = encodeURIComponent(
      `Worldwide Evangelism Service (WES) x UENR SCC present SHIFT 1.0.\nYour Pass ID: ${registration.passId}\nVenue: ${CONFERENCE_INFO.venueFull}`
    );
    const location = encodeURIComponent(CONFERENCE_INFO.venueFull);
    const startTime = '20261128T140000Z';
    const endTime = '20261128T180000Z';
    const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startTime}/${endTime}&details=${details}&location=${location}`;
    const link = document.createElement('a');
    link.href = gCalUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.click();
  };

  const handleShare = () => {
    if (!registration) return;
    if (navigator.share) {
      navigator
        .share({
          title: 'SHIFT 1.0 Conference Pass',
          text: `I just secured my free seat for SHIFT 1.0 at UENR! My Pass ID is ${registration.passId}. Join me!`,
          url: window.location.href
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(
        `I just secured my free seat for SHIFT 1.0 at UENR! Pass ID: ${registration.passId}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <AnimatePresence>
      {registration && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: 'spring', damping: 32, stiffness: 700, mass: 0.5 }}
            ref={ticketRef}
            className="bg-[#1E293B] border border-slate-700 rounded-2xl max-w-lg w-full p-5 sm:p-7 shadow-2xl text-center relative overflow-hidden my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-slate-800 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close pass modal"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Confirmed Icon */}
            <div className="w-13 h-13 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-3 text-emerald-400">
              <CheckCircle2 className="w-7 h-7 text-emerald-400" />
            </div>

            <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-1 font-serif">
              Seat Confirmed!
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 mb-4">
              Welcome to SHIFT 1.0, <span className="text-sky-400 font-bold">{registration.fullName}</span>! Your official seat is reserved in Cloud Firestore for Saturday, Nov 28 at UENR.
            </p>

            {/* Printable / Savable Digital Ticket Badge */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#0B132B] border border-slate-700 text-left space-y-3 mb-5 relative overflow-hidden shadow-inner">
              <div className="flex items-center justify-between pb-3 border-b border-slate-700/80">
                <div>
                  <span className="text-[10px] font-semibold tracking-wider text-sky-400 uppercase">
                    OFFICIAL DELEGATE PASS
                  </span>
                  <h4 className="text-base font-bold text-white font-serif">SHIFT 1.0 (UENR)</h4>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold border border-emerald-500/40 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  VERIFIED
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-medium block">DELEGATE NAME:</span>
                  <span className="text-white font-sans font-semibold truncate block">{registration.fullName}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-medium block">PASS ID:</span>
                  <span className="text-sky-400 font-mono font-semibold tracking-wide block">{registration.passId}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-medium block">LEVEL &amp; DEPT:</span>
                  <span className="text-slate-200 truncate block">
                    Level {String(registration.academicLevel || '300').toUpperCase()} • {registration.department || 'Undergraduate'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-medium block">SEAT TIER:</span>
                  <span className="text-emerald-300 font-medium block">Auditorium Main (Reserved)</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-300">
                <span className="flex items-center gap-1 font-medium">
                  <Clock className="w-3.5 h-3.5 text-sky-400" />
                  2:00 PM GMT (Doors 1:15 PM)
                </span>
                <span className="flex items-center gap-1 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-sky-400" />
                  UENR Main Auditorium
                </span>
              </div>

              {/* Barcode visual decoration */}
              <div className="pt-2 flex flex-col items-center gap-1 opacity-80">
                <div className="h-6 w-full flex items-center justify-between gap-0.5">
                  {[4, 2, 6, 3, 1, 5, 2, 4, 7, 2, 5, 1, 3, 6, 2, 4, 8, 2, 4, 3, 5, 2, 6, 1, 4, 5, 2, 7, 3, 2, 5, 1, 4].map(
                    (w, i) => (
                      <div
                        key={i}
                        className="bg-slate-300 h-full"
                        style={{ width: `${w}px` }}
                      />
                    )
                  )}
                </div>
                <span className="text-[10px] tracking-wider text-slate-400 font-mono">
                  *{registration.passId}*
                </span>
              </div>
            </div>

            {/* Download Status Notification Banners */}
            {downloadState === 'success_pdf' && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-600/50 text-xs text-emerald-200 flex items-center justify-between gap-2 text-left">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    <strong>Pass Downloaded!</strong> ({downloadedFilename}) Check your downloads folder.
                  </span>
                </div>
              </div>
            )}

            {downloadState === 'success_image' && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-600/50 text-xs text-emerald-200 flex items-center justify-between gap-2 text-left">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    <strong>Image Saved!</strong> ({downloadedFilename}) Saved to device gallery.
                  </span>
                </div>
              </div>
            )}

            {downloadState === 'error' && (
              <div className="mb-4 p-3 rounded-xl bg-red-950/80 border border-red-700/60 text-xs text-red-200 flex items-center justify-between gap-2 text-left">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{downloadError || 'Pass download encountered an issue.'}</span>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="px-2 py-1 rounded bg-red-800 text-[11px] font-semibold text-white hover:bg-red-700 cursor-pointer"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2.5">
              {/* PRIMARY ACTION: Download PDF Pass */}
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={downloadState === 'generating_pdf' || downloadState === 'generating_image'}
                className="w-full py-3.5 px-6 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 border border-blue-500 shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {downloadState === 'generating_pdf' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating Official Pass (PDF)...</span>
                  </>
                ) : downloadState === 'success_pdf' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>Download Complete! Click to Re-download</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 text-white" />
                    <span>Download Official Pass (PDF)</span>
                  </>
                )}
              </button>

              {/* SECONDARY ACTION ROW: Save Image & Print */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleDownloadImage}
                  disabled={downloadState === 'generating_pdf' || downloadState === 'generating_image'}
                  className="py-2.5 px-3 rounded-xl font-semibold text-xs text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Download as PNG image for phone gallery or mobile wallet"
                >
                  {downloadState === 'generating_image' ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
                      <span>Save as Image</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="py-2.5 px-3 rounded-xl font-semibold text-xs text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Open browser print dialog"
                >
                  <Printer className="w-3.5 h-3.5 text-sky-400" />
                  <span>Print Ticket</span>
                </button>
              </div>

              {/* CALENDAR & SHARE ROW */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleAddToCalendar}
                  className="py-2.5 px-3 rounded-xl font-semibold text-xs text-slate-200 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5 text-sky-400" />
                  <span>Add to Calendar</span>
                </button>

                <button
                  type="button"
                  onClick={handleShare}
                  className="py-2.5 px-3 rounded-xl font-semibold text-xs text-slate-200 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 text-sky-400" />
                  <span>{copied ? 'Pass ID Copied!' : 'Share Pass'}</span>
                </button>
              </div>

              {/* SEPARATE DISMISS / DONE BUTTON */}
              <div className="pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs tracking-wider uppercase text-slate-300 hover:text-white hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-colors cursor-pointer"
                >
                  Close Pass Window
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
