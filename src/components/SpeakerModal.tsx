import React, { useState, useEffect } from 'react';
import { Speaker } from '../types';
import { X, ArrowUpRight, CheckCircle2, Building, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SpeakerModalProps {
  speaker: Speaker | null;
  onClose: () => void;
  onRegisterClick: () => void;
}

export const SpeakerModal: React.FC<SpeakerModalProps> = ({ speaker, onClose, onRegisterClick }) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [speaker]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (speaker) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [speaker]);

  return (
    <AnimatePresence>
      {speaker && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            layoutId={`speaker-card-${speaker.id}`}
            initial={{ scale: 0.96, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 10 }}
            transition={{ type: 'spring', damping: 32, stiffness: 700, mass: 0.5 }}
            className="bg-[#1E293B] border border-slate-700 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl relative my-auto max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 z-30 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-800/90 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header: Responsive layout */}
            <div className="bg-[#162032] p-4 sm:p-7 border-b border-slate-700 shrink-0">
              <div className="flex flex-col sm:grid sm:grid-cols-12 gap-4 sm:gap-6 items-center">
                {/* Speaker Photo */}
                <div className="w-full max-w-[220px] sm:max-w-none sm:col-span-5 aspect-[4/5] sm:aspect-[3/4] rounded-2xl overflow-hidden border border-slate-700 shadow-xl relative group bg-slate-800 shrink-0">
                  {!imgError ? (
                    <motion.img
                      layoutId={`speaker-img-${speaker.id}`}
                      src={speaker.image}
                      alt={speaker.name}
                      onError={() => setImgError(true)}
                      className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl sm:text-4xl font-serif text-sky-400 font-bold">
                      {speaker.name
                        .split(' ')
                        .filter((w) => !['Dr.', 'Ing.', 'Col.', 'Proph.', 'Gen.', 'Sec.', 'Esq.'].includes(w))
                        .slice(0, 2)
                        .map((w) => w[0])
                        .join('')}
                    </div>
                  )}
                </div>

                {/* Speaker Info */}
                <div className="w-full sm:col-span-7 space-y-2 sm:space-y-3 text-center sm:text-left">
                  <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-sky-400 bg-slate-800 border border-slate-700 px-3 py-1 rounded-full inline-block truncate max-w-full">
                    {speaker.role}
                  </span>
                  <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-tight font-serif leading-tight">
                    {speaker.name}
                  </h3>
                  {speaker.company && (
                    <p className="text-xs sm:text-sm text-slate-300 flex items-center justify-center sm:justify-start gap-1.5 font-medium">
                      <Building className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <span>{speaker.company}</span>
                    </p>
                  )}

                  {/* Keynote Topic Badge */}
                  <div className="p-3 sm:p-3.5 rounded-xl bg-[#0B132B] border border-slate-700 text-xs text-slate-200 mt-2 text-left">
                    <span className="font-semibold text-sky-400 block mb-0.5">Keynote Session:</span>
                    “{speaker.topic}”
                  </div>
                </div>
              </div>
            </div>

            {/* Content Body: Scrollable */}
            <div className="p-4 sm:p-8 space-y-5 sm:space-y-6 overflow-y-auto">
              <div>
                <h4 className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-slate-300 mb-1.5 sm:mb-2">
                  Mentor Background &amp; Mission
                </h4>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-normal">
                  {speaker.bio}
                </p>
              </div>

              <div>
                <h4 className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-slate-300 mb-2 sm:mb-3">
                  What You Will Learn from This Session
                </h4>
                <ul className="space-y-2 sm:space-y-2.5">
                  {speaker.keyTakeaways.map((takeaway, idx) => (
                    <li key={idx} className="flex items-start gap-2 sm:gap-2.5 text-xs sm:text-sm text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{takeaway}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Action Row */}
            <div className="p-4 sm:p-6 border-t border-slate-700 bg-[#162032] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <span className="text-[11px] sm:text-xs text-slate-400 font-medium text-center sm:text-left">
                Live at UENR Main Auditorium • Nov 28
              </span>
              <button
                onClick={() => {
                  onClose();
                  onRegisterClick();
                }}
                className="w-full sm:w-auto py-2.5 sm:py-3 px-5 sm:px-6 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 border border-blue-500 shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Reserve Seat For This Session</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
