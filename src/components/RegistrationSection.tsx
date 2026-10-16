import React, { useState } from 'react';
import { RegistrationData } from '../types';
import { CONFERENCE_INFO, INCLUDED_PERKS } from '../data/conferenceData';
import { saveRegistrationToFirestore } from '../lib/firebase';
import {
  Ticket,
  Calendar,
  Clock,
  MapPin,
  Award,
  Users,
  MessageSquare,
  CheckCircle2,
  BookOpen,
  UserCheck,
  User,
  Phone,
  Mail,
  GraduationCap,
  ArrowRight,
  ShieldCheck,
  Info,
  Loader2,
  AlertCircle,
  Database,
  FileSpreadsheet
} from 'lucide-react';

interface RegistrationSectionProps {
  claimedSeats: number;
  onRegisterSuccess: (regData: RegistrationData) => void;
}

export const RegistrationSection: React.FC<RegistrationSectionProps> = ({
  claimedSeats,
  onRegisterSuccess
}) => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [academicLevel, setAcademicLevel] = useState<'100' | '200' | '300' | '400' | 'postgrad'>('300');
  const [department, setDepartment] = useState('');

  // Submission Progress Feedback States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStep, setSubmitStep] = useState<
    'idle' | 'validating' | 'saving_firestore' | 'success' | 'error'
  >('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [syncStatusNotice, setSyncStatusNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmedPassId, setConfirmedPassId] = useState<string | null>(null);

  const totalSeats = CONFERENCE_INFO.totalCapacity;
  const remainingSeats = Math.max(0, totalSeats - claimedSeats);
  const capacityPercent = Math.min(100, Math.round((claimedSeats / totalSeats) * 100));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Guard against duplicate submissions from rapid clicks or concurrent events
    if (isSubmitting) {
      return;
    }

    setErrorMessage('');
    setSyncStatusNotice(null);
    setConfirmedPassId(null);

    const trimmedName = fullName.trim();
    const trimmedPhone = phone.trim();
    const trimmedEmail = email.trim();

    // 1. Validation phase
    if (!trimmedName || trimmedName.length < 2) {
      setErrorMessage('Please enter your full name (minimum 2 characters).');
      setSubmitStep('error');
      return;
    }

    if (!trimmedPhone || trimmedPhone.replace(/\D/g, '').length < 7) {
      setErrorMessage('Please enter a valid WhatsApp or phone number (at least 7 digits) for SMS pass delivery.');
      setSubmitStep('error');
      return;
    }

    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMessage('Please provide a valid email address or leave it blank.');
      setSubmitStep('error');
      return;
    }

    // Set immediate loading state
    setIsSubmitting(true);
    setSubmitStep('validating');
    setStatusMessage('Validating registration details...');

    try {
      // Step 2: Cloud Firestore Reservation
      setSubmitStep('saving_firestore');
      setStatusMessage('Reserving your delegate seat in Cloud Firestore...');

      const randomId = Math.floor(1000 + Math.random() * 9000);
      const tempPassId = `SHFT-${randomId}-UENR`;

      const newRegistration: RegistrationData = {
        fullName: trimmedName,
        phone: trimmedPhone,
        email: trimmedEmail || undefined,
        academicLevel,
        department: department.trim() || 'General Student',
        passId: tempPassId,
        registeredAt: new Date().toISOString(),
        ticketStatus: 'Confirmed Delegate',
        sheetsSyncStatus: 'pending'
      };

      // Persist to Cloud Firestore and synchronize to Google Sheets
      const result = await saveRegistrationToFirestore(newRegistration);
      const finalReg = result?.registration || newRegistration;

      // Step 3: Registration confirmed in primary authoritative database (Cloud Firestore)
      setSubmitStep('success');
      setConfirmedPassId(finalReg.passId);

      if (result?.duplicateIgnored) {
        setStatusMessage('Existing registration found! Your pass was securely retrieved from Cloud Firestore.');
        setSyncStatusNotice('Existing registration verified in Cloud Firestore.');
      } else {
        setStatusMessage('Registration successfully saved to Cloud Firestore! Official seat locked in.');
        if (result?.sheetsSyncStatus === 'synced') {
          setSyncStatusNotice('Synchronized to Google Sheets attendance database.');
        } else {
          setSyncStatusNotice('Google Sheets background synchronization scheduled.');
        }
      }

      // Allow attendee to view the confirmed success banner briefly before opening the modal
      setTimeout(() => {
        setIsSubmitting(false);
        onRegisterSuccess(finalReg);
      }, 750);
    } catch (err: any) {
      console.error('[Registration] Submission error:', err);
      setSubmitStep('error');
      setErrorMessage(
        err?.message || 'Database registration could not be saved. Please verify your connection and try again.'
      );
      // Restore submit button immediately on error so user can correct and retry
      setIsSubmitting(false);
    }
  };

  const getPerkIcon = (title: string) => {
    switch (title) {
      case 'Keynote Mentorship':
        return <Award className="w-3.5 h-3.5 text-cyan-400" />;
      case 'Interactive Breakouts':
        return <Users className="w-3.5 h-3.5 text-cyan-400" />;
      case 'Networking Mixer':
        return <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />;
      case 'Certificate of Attendance':
        return <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />;
      case 'Career Toolkit PDFs':
        return <BookOpen className="w-3.5 h-3.5 text-cyan-400" />;
      default:
        return <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />;
    }
  };

  return (
    <section className="relative py-12 lg:py-20 overflow-hidden text-slate-100 bg-[#0B132B]" id="register">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Eyebrow & Master Title */}
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto mb-12 lg:mb-16">
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#1E293B] border border-slate-700 mb-6 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            <span className="text-[11px] sm:text-xs font-semibold tracking-wider uppercase text-sky-400">
              SHIFT 1.0 ATTENDEE REGISTRATION • NOV 28, 2026 • UENR CAMPUS
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.15] mb-5 font-serif">
            Secure Your Seat for{' '}
            <span className="text-sky-400">
              SHIFT 1.0
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg lg:text-xl text-slate-300 leading-relaxed max-w-2xl font-normal">
            Join mentors, student leaders, and kingdom professionals as we explore career, faith, and purposeful leadership. Free registration courtesy of{' '}
            <span className="text-white font-semibold">WES</span> &amp;{' '}
            <span className="text-sky-400 font-semibold">UENR SCC</span>.
          </p>
        </div>

        {/* Main Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* LEFT COLUMN: Event Perks, Date/Time & Live Capacity Tracker */}
          <div className="lg:col-span-5 flex flex-col space-y-6">
            {/* Live Capacity Card */}
            <div className="rounded-2xl p-6 sm:p-7 bg-[#1E293B] border border-slate-700 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                  <Ticket className="w-4 h-4 text-sky-400" />
                  Seat Availability
                </span>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-emerald-400">
                  {capacityPercent}% Full
                </span>
              </div>

              <p className="text-xl sm:text-2xl font-bold text-white mb-1 font-serif">
                {claimedSeats} / {totalSeats} Attendees Confirmed
              </p>
              <p className="text-xs text-slate-400 mb-4">
                Auditorium seating is allocated on a first-come, first-verified basis.
              </p>

              {/* Capacity Bar */}
              <div className="w-full h-3 rounded-full bg-slate-800 p-0.5 border border-slate-700 overflow-hidden relative">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-1000"
                  style={{ width: `${capacityPercent}%` }}
                />
              </div>

              <div className="mt-2.5 flex justify-between text-[11px] font-medium text-slate-400">
                <span>Auditorium Admission: Free</span>
                <span className="text-sky-400 font-semibold">{remainingSeats} seats remaining</span>
              </div>
            </div>

            {/* Venue & Time Brief Card */}
            <div className="rounded-2xl p-6 sm:p-7 bg-[#1E293B] border border-slate-700 shadow-sm space-y-5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-sky-400" />
                Gathering Schedule &amp; Location
              </h2>

              <div className="space-y-4">
                {/* Date/Time */}
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-sky-400">
                    <Clock className="w-5 h-5 text-sky-400" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Date &amp; Time</p>
                    <p className="text-base font-bold text-white">{CONFERENCE_INFO.dateFormatted}</p>
                    <p className="text-sm text-sky-400 font-medium">
                      2:00 PM GMT • Doors open at {CONFERENCE_INFO.doorsOpen}
                    </p>
                  </div>
                </div>

                {/* Venue */}
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-sky-400">
                    <MapPin className="w-5 h-5 text-sky-400" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Venue Location</p>
                    <p className="text-base font-bold text-white">{CONFERENCE_INFO.venue}</p>
                    <p className="text-sm text-slate-300">{CONFERENCE_INFO.venueFull}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* What's Included Free Card */}
            <div className="rounded-2xl p-6 sm:p-7 bg-[#1E293B] border border-slate-700 shadow-sm space-y-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Everything Included Free</p>
              <div className="flex flex-wrap gap-2">
                {INCLUDED_PERKS.map((perk, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 border border-slate-700 text-slate-200"
                  >
                    {getPerkIcon(perk.title)}
                    {perk.title}
                  </span>
                ))}
              </div>

              {/* Motivational Quote Capsule */}
              <div className="pt-3 border-t border-slate-700">
                <p className="text-xs italic text-slate-300 border-l-2 border-blue-500 pl-3">
                  “{CONFERENCE_INFO.coreQuote}”
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Attendee Registration Form */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl p-7 sm:p-10 bg-[#1E293B] border border-slate-700 shadow-sm relative">
              {/* Header */}
              <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-700">
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2 font-serif">
                    <span>Attendee Registration</span>
                    <UserCheck className="w-5 h-5 text-sky-400" />
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1">
                    Takes less than 60 seconds. Instant SMS &amp; digital pass issued upon submit.
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className="text-[10px] font-semibold tracking-wider uppercase text-white bg-blue-600 border border-blue-500 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    Official Registration
                  </span>
                </div>
              </div>

              {/* Visible Live Registration Progress & Status Feedbacks */}
              {isSubmitting && (
                <div
                  role="status"
                  aria-live="polite"
                  className="p-4 mb-6 rounded-xl bg-blue-950/70 border border-blue-500/50 text-xs text-blue-100 flex items-start gap-3 shadow-md"
                >
                  <Loader2 className="w-5 h-5 text-sky-400 animate-spin shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-white text-sm">
                      Submitting your registration…
                    </p>
                    <p className="text-sky-300">{statusMessage}</p>
                    <div className="pt-1 flex items-center gap-3 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Database className="w-3.5 h-3.5 text-sky-400" />
                        Cloud Firestore Primary
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                        Sheets Sync Queue
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Success Notification Banner */}
              {submitStep === 'success' && !isSubmitting && (
                <div
                  role="status"
                  aria-live="polite"
                  className="p-4 mb-6 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-xs text-emerald-100 flex items-start gap-3 shadow-md"
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-white text-sm">
                      {statusMessage}
                    </p>
                    {confirmedPassId && (
                      <p className="text-emerald-300 font-mono font-semibold">
                        Pass ID: {confirmedPassId}
                      </p>
                    )}
                    {syncStatusNotice && (
                      <p className="text-[11px] text-emerald-400/90 pt-0.5">
                        {syncStatusNotice}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Error Notification Banner */}
              {errorMessage && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="p-4 mb-6 rounded-xl bg-red-950/80 border border-red-700/60 text-xs text-red-200 flex items-start gap-3 shadow-md"
                >
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-white">Registration Unsuccessful</p>
                    <p className="text-red-300 leading-relaxed">{errorMessage}</p>
                    <p className="text-[11px] text-slate-400 pt-1">
                      Please check the entered information above and click the button to try again.
                    </p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6" aria-busy={isSubmitting}>
                {/* Full Name Field */}
                <div className="space-y-2">
                  <label htmlFor="fullName" className="block text-xs font-bold uppercase tracking-wider text-slate-200">
                    Full Name <span className="text-sky-400">*</span>
                  </label>
                  <div className="relative rounded-xl overflow-hidden group">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-sky-400 transition-colors">
                      <User className="w-4 h-4" />
                    </span>
                    <input
                      id="fullName"
                      type="text"
                      required
                      disabled={isSubmitting}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Samuel Kwadwo Mensah"
                      className="w-full pl-11 pr-4 py-3 bg-[#0B132B] border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* WhatsApp / Phone Number with Ghana +233 prefix */}
                <div className="space-y-2">
                  <label htmlFor="phone" className="block text-xs font-bold uppercase tracking-wider text-slate-200">
                    WhatsApp / Phone Number <span className="text-sky-400">*</span>
                  </label>
                  <div className="flex gap-2">
                    <div className="flex items-center gap-1.5 px-3 bg-slate-800 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 shrink-0 select-none">
                      <span>🇬🇭</span>
                      <span>+233</span>
                    </div>
                    <div className="relative w-full rounded-xl overflow-hidden group">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-sky-400 transition-colors">
                        <Phone className="w-4 h-4" />
                      </span>
                      <input
                        id="phone"
                        type="tel"
                        required
                        disabled={isSubmitting}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. 024 123 4567 or 50 123 4567"
                        className="w-full pl-11 pr-4 py-3 bg-[#0B132B] border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    Used to dispatch your fast-track auditorium entrance code.
                  </p>
                </div>

                {/* Email Address (Optional for PDF toolkit) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-slate-200">
                      Email Address
                    </label>
                    <span className="text-[11px] text-slate-400 font-medium">(Optional for PDF toolkit)</span>
                  </div>
                  <div className="relative rounded-xl overflow-hidden group">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-sky-400 transition-colors">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      id="email"
                      type="email"
                      disabled={isSubmitting}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. samuel.mensah@st.uenr.edu.gh"
                      className="w-full pl-11 pr-4 py-3 bg-[#0B132B] border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Current Level / Academic Standing (Segmented Cards) */}
                <div className="space-y-2.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-200">
                    Current Level / Academic Standing <span className="text-sky-400">*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {[
                      { level: '100', label: 'Level 100', sub: 'Freshman' },
                      { level: '200', label: 'Level 200', sub: 'Sophomore' },
                      { level: '300', label: 'Level 300', sub: 'Penultimate' },
                      { level: '400', label: 'Level 400', sub: 'Final Year' },
                      {
                        level: 'postgrad',
                        label: 'Postgrad / Alumni / Professional',
                        sub: 'Masters, PhD or Working Youth',
                        span: true
                      }
                    ].map((item) => (
                      <button
                        key={item.level}
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => setAcademicLevel(item.level as any)}
                        className={`text-left px-3.5 py-3 rounded-xl border transition-colors focus:outline-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                          item.span ? 'col-span-2 sm:col-span-2' : ''
                        } ${
                          academicLevel === item.level
                            ? 'border-blue-500 bg-blue-600/20 text-white'
                            : 'border-slate-700 bg-[#0B132B] hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <p
                          className={`text-xs font-bold ${
                            academicLevel === item.level ? 'text-white' : 'text-slate-200'
                          }`}
                        >
                          {item.label}
                        </p>
                        <p
                          className={`text-[11px] ${
                            academicLevel === item.level ? 'text-sky-300' : 'text-slate-400'
                          }`}
                        >
                          {item.sub}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Department / Course of Study */}
                <div className="space-y-2">
                  <label htmlFor="department" className="block text-xs font-bold uppercase tracking-wider text-slate-200">
                    Department / Field of Study
                  </label>
                  <div className="relative rounded-xl overflow-hidden group">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-sky-400 transition-colors">
                      <GraduationCap className="w-4 h-4" />
                    </span>
                    <input
                      id="department"
                      type="text"
                      disabled={isSubmitting}
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="e.g. Computer Science, Renewable Energy, Nursing..."
                      className="w-full pl-11 pr-4 py-3 bg-[#0B132B] border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Submit Button with Instant Disabled State and Clear Progress Text */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 px-6 rounded-xl font-bold text-sm tracking-wide uppercase text-white bg-blue-600 hover:bg-blue-700 border border-blue-500 shadow-sm transition-colors flex items-center justify-center gap-3 cursor-pointer group disabled:opacity-75 disabled:cursor-not-allowed disabled:pointer-events-none"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>
                          {submitStep === 'saving_firestore'
                            ? 'Reserving Seat in Firestore…'
                            : 'Submitting Your Registration…'}
                        </span>
                      </>
                    ) : (
                      <>
                        <span>Complete Registration</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </div>

                {/* Trust / Reassurance Subtext */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                    100% Free Admission • No Hidden Fees
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Instant Digital Pass &amp; Download Issued
                  </span>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
