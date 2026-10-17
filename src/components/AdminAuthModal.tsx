import React, { useState } from 'react';
import { loginAdminWithServer, PRIMARY_EXECUTIVE_EMAIL } from '../lib/firebase';
import { Lock, Eye, EyeOff, X, ArrowRight, ShieldCheck, AlertCircle, Loader2, KeyRound } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanPasscode = passcode.trim();
    if (!cleanPasscode) {
      setError('Please enter the event admin passcode.');
      return;
    }

    setLoading(true);

    try {
      const result = await loginAdminWithServer(cleanPasscode);
      if (result.success) {
        setPasscode('');
        onSuccess();
      } else {
        setError(result.error || 'Invalid passcode. Authorization denied.');
      }
    } catch (err: any) {
      setError(err?.message || 'Verification service unavailable. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setIsGoogleLoading(true);
    try {
      const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
      const { auth } = await import('../lib/firebase');
      const provider = new GoogleAuthProvider();
      const res = await signInWithPopup(auth, provider);
      const email = res.user?.email?.toLowerCase();

      if (email === PRIMARY_EXECUTIVE_EMAIL.toLowerCase()) {
        const loginRes = await loginAdminWithServer(undefined, email);
        if (loginRes.success) {
          onSuccess();
          return;
        }
      } else {
        setError(`Access denied. Google account ${email || 'unknown'} is not authorized. Organizer account (${PRIMARY_EXECUTIVE_EMAIL}) required.`);
      }
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
        setError(err.message || 'Google Sign-In failed.');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 10 }}
            transition={{ type: 'spring', damping: 32, stiffness: 700, mass: 0.5 }}
            className="bg-[#1E293B] border border-slate-700 rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative text-left my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-slate-800 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close authentication modal"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Shield Icon Header */}
            <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-sky-400 mb-4">
              <Lock className="w-5 h-5 text-sky-400" />
            </div>

            <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-serif">
              Secretariat Portal
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Restricted to authorized event organizers and secretariat staff. Enter your official passcode or sign in below.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <span className="leading-relaxed">{error}</span>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Administrative Passcode
                  </label>
                  <button
                    type="button"
                    onClick={() => setPasscode('shift-admin-2026')}
                    className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors cursor-pointer"
                    title="Click to fill default event passcode"
                  >
                    <KeyRound className="w-3 h-3" />
                    <span>Use default: shift-admin-2026</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPasscode ? 'text' : 'password'}
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="e.g. shift-admin-2026"
                    autoFocus
                    className="w-full px-4 py-3 bg-[#0B132B] border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 pr-11 font-mono tracking-wider"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasscode(!showPasscode)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
                    aria-label={showPasscode ? 'Hide passcode' : 'Show passcode'}
                  >
                    {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Default passcode: <code className="text-sky-300 bg-slate-900 px-1.5 py-0.5 rounded font-mono">shift-admin-2026</code> (or your custom <code className="text-slate-300">ADMIN_PASSCODE</code>)
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || isGoogleLoading}
                className="w-full py-3.5 px-6 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 border border-blue-500 shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Unlock Secretariat Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="relative my-5 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700" />
              </div>
              <span className="relative px-3 bg-[#1E293B] text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                Or Organizer Login
              </span>
            </div>

            <button
              type="button"
              disabled={loading || isGoogleLoading}
              onClick={handleGoogleSignIn}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isGoogleLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Signing in with Google...</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
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
                  <span>Sign In with Organizer Google Account</span>
                </>
              )}
            </button>

            <div className="mt-5 pt-4 border-t border-slate-700 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Vercel &amp; Cloud Verified
              </span>
              <span className="text-slate-500 text-[10px]">
                SHIFT 1.0 Secretariat
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
