import React, { useState } from 'react';
import { CONFERENCE_INFO, FAQS } from '../data/conferenceData';
import { saveInquiryToFirestore } from '../lib/firebase';
import {
  Mail,
  MapPin,
  Phone,
  Calendar,
  Send,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Clock,
  Loader2,
  AlertCircle
} from 'lucide-react';

export const ContactsSection: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [topic, setTopic] = useState<'attendee' | 'partnership' | 'speaker' | 'general'>('attendee');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedToast, setSubmittedToast] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!fullName.trim() || !email.trim() || !message.trim()) {
      setFormError('Please fill out all required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      await saveInquiryToFirestore({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        topic,
        message: message.trim()
      });

      setIsSubmitting(false);
      setSubmittedToast(true);
      setFullName('');
      setEmail('');
      setPhone('');
      setMessage('');
      setTimeout(() => {
        setSubmittedToast(false);
      }, 5000);
    } catch {
      setIsSubmitting(false);
      setSubmittedToast(true);
    }
  };

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <section className="py-12 lg:py-20 relative overflow-hidden bg-[#0B132B]" id="contacts">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
        {/* Hero Title Section */}
        <div className="text-center max-w-3xl mx-auto mb-14" data-purpose="hero-intro">
          {/* Event pill badge */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#1E293B] border border-slate-700 text-sky-400 text-[11px] font-semibold tracking-wider uppercase mb-6 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            SHIFT 1.0 CONTACT &amp; SUPPORT • NOV 28, 2026 • UENR CAMPUS
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-tight font-serif">
            Get in Touch with the <br className="hidden sm:inline" />
            <span className="text-sky-400">
              SHIFT 1.0
            </span>{' '}
            Team
          </h1>

          {/* Supporting Subtitle */}
          <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl mx-auto font-normal">
            Have questions about registration, speaking, sponsorship, or campus logistics? Our WES and UENR SCC team is here to assist you.
          </p>
        </div>

        {/* Dual Flat Cards Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch max-w-6xl mx-auto w-full mb-16">
          {/* ================= CARD 1: CONTACT INFO (LEFT) ================= */}
          <section
            className="lg:col-span-5 bg-[#1E293B] border border-slate-700 rounded-2xl p-6 sm:p-8 flex flex-col justify-between group shadow-sm"
            data-purpose="contact-info-panel"
          >
            <div>
              {/* Helpdesk banner image */}
              <div className="w-full h-44 sm:h-52 rounded-xl overflow-hidden mb-6 relative border border-slate-700 bg-slate-900">
                <img
                  src="/images/helpdesk_team.jpg"
                  alt="SHIFT 1.0 Help Desk Support Team"
                  className="w-full h-full object-cover object-center brightness-95 group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B132B]/70 via-transparent to-transparent" />
                <div className="absolute top-2.5 left-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/90 border border-slate-700 text-[10px] font-bold text-sky-400 uppercase backdrop-blur-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Support Desk Online
                </div>
              </div>

              {/* Section Badge */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] uppercase font-semibold tracking-wider text-sky-400 bg-slate-800 border border-slate-700 px-3 py-1 rounded-full">
                  Direct Channels
                </span>
                <span className="text-[11px] text-slate-400 font-medium">Official Helpdesk</span>
              </div>

              {/* Card Title & Description */}
              <h2 className="text-2xl font-bold text-white tracking-tight font-serif">
                We're Here to Help
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
                Reach out to discuss partnership opportunities, student delegate queries, or venue access for the upcoming summit.
              </p>

              {/* Divider */}
              <div className="w-full h-px bg-slate-700 my-6" />

              {/* Contact Channels List */}
              <ul className="space-y-5" data-purpose="contact-channels-list">
                {/* Item 1: Email */}
                <li className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-sky-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[11px] uppercase font-semibold tracking-wider text-slate-400">
                      Electronic Mail
                    </span>
                    <a
                      href={`mailto:${CONFERENCE_INFO.officialEmail}`}
                      className="text-xs sm:text-sm font-medium text-white hover:text-sky-300 transition-colors block break-all"
                    >
                      {CONFERENCE_INFO.officialEmail}
                    </a>
                    <a
                      href={`mailto:${CONFERENCE_INFO.supportEmail}`}
                      className="text-xs text-slate-400 hover:text-sky-300 transition-colors block"
                    >
                      {CONFERENCE_INFO.supportEmail}
                    </a>
                  </div>
                </li>

                {/* Item 2: Venue */}
                <li className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-sky-400">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-[11px] uppercase font-semibold tracking-wider text-slate-400">
                      Venue &amp; Secretariat
                    </span>
                    <p className="text-xs sm:text-sm font-medium text-white">{CONFERENCE_INFO.venue}</p>
                    <p className="text-xs text-slate-400 leading-snug">
                      University of Energy and Natural Resources<br />
                      Sunyani, Bono Region, Ghana
                    </p>
                  </div>
                </li>

                {/* Item 3: Phone/WhatsApp */}
                <li className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-sky-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-[11px] uppercase font-semibold tracking-wider text-slate-400">
                      WhatsApp &amp; Helpline
                    </span>
                    <a
                      href="https://wa.me/233241234567"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs sm:text-sm font-medium text-white hover:text-sky-300 transition-colors block"
                    >
                      {CONFERENCE_INFO.whatsappPrimary}
                    </a>
                    <a
                      href="tel:+233509876543"
                      className="text-xs text-slate-400 hover:text-sky-300 transition-colors block"
                    >
                      {CONFERENCE_INFO.whatsappSecondary}
                    </a>
                  </div>
                </li>

                {/* Item 4: Schedule */}
                <li className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-sky-400">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-[11px] uppercase font-semibold tracking-wider text-slate-400">
                      Event Date &amp; Time
                    </span>
                    <p className="text-xs sm:text-sm font-medium text-white">{CONFERENCE_INFO.dateFormatted}</p>
                    <p className="text-xs text-sky-400 font-medium">
                      2:00 PM GMT • Doors open at {CONFERENCE_INFO.doorsOpen}
                    </p>
                  </div>
                </li>
              </ul>
            </div>

            {/* Organizer Attribution Box */}
            <div className="mt-8 pt-6 border-t border-slate-700" data-purpose="organizer-footer-badge">
              <div className="p-3.5 rounded-xl bg-[#0B132B] border border-slate-700">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Convened By</p>
                <p className="text-xs font-semibold text-slate-200 mt-0.5">{CONFERENCE_INFO.organizers}</p>
                <p className="text-[11px] text-sky-400 mt-1 flex items-center gap-1.5 font-medium">
                  <span>{CONFERENCE_INFO.convener}</span>
                </p>
              </div>
            </div>
          </section>

          {/* ================= CARD 2: CONTACT FORM (RIGHT) ================= */}
          <section
            className="lg:col-span-7 bg-[#1E293B] border border-slate-700 rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-sm"
            data-purpose="contact-form-panel"
          >
            <div>
              {/* Form Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-sky-400 bg-slate-800 border border-slate-700 px-3 py-1 rounded-full">
                    Instant Inquiry
                  </span>
                  <h2 className="text-2xl font-bold text-white tracking-tight mt-2.5 font-serif">
                    Send a Message
                  </h2>
                </div>
                <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium bg-slate-800 border border-slate-700 px-3 py-1 rounded-full self-start sm:self-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Replies in 2–4 hours
                </span>
              </div>

              {submittedToast && (
                <div className="mb-4 p-4 rounded-xl bg-emerald-950/80 border border-emerald-700/60 text-emerald-200 text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>
                    Thank you, your message has been received by the SHIFT 1.0 Conference Secretariat! We will respond shortly via email or WhatsApp.
                  </span>
                </div>
              )}

              {formError && (
                <div className="mb-4 p-3 rounded-xl bg-red-950/80 border border-red-700/60 text-red-200 text-xs flex items-center gap-2 animate-in fade-in duration-200">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Submission Form */}
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5" data-purpose="inquiry-form">
                {/* Full Name */}
                <div>
                  <label htmlFor="inquiry-name" className="block text-xs uppercase tracking-wider font-semibold text-slate-300 mb-2">
                    Full Name <span className="text-sky-400">*</span>
                  </label>
                  <input
                    id="inquiry-name"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Samuel Kwadwo Mensah"
                    className="w-full bg-[#0B132B] border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white placeholder-slate-500 text-sm rounded-xl px-4 py-3 transition-colors outline-none"
                  />
                </div>

                {/* Email Address */}
                <div>
                  <label htmlFor="inquiry-email" className="block text-xs uppercase tracking-wider font-semibold text-slate-300 mb-2">
                    Email Address <span className="text-sky-400">*</span>
                  </label>
                  <input
                    id="inquiry-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. samuel.mensah@st.uenr.edu.gh"
                    className="w-full bg-[#0B132B] border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white placeholder-slate-500 text-sm rounded-xl px-4 py-3 transition-colors outline-none"
                  />
                </div>

                {/* Phone / WhatsApp */}
                <div>
                  <label htmlFor="inquiry-phone" className="block text-xs uppercase tracking-wider font-semibold text-slate-300 mb-2">
                    Phone / WhatsApp Number <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <div className="flex rounded-xl overflow-hidden border border-slate-700 focus-within:border-blue-500 transition-colors">
                    <div className="bg-slate-800 px-3.5 py-3 border-r border-slate-700 flex items-center gap-1.5 text-xs text-slate-200 font-semibold shrink-0">
                      <span>🇬🇭</span>
                      <span>+233</span>
                    </div>
                    <input
                      id="inquiry-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 024 123 4567 or 50 123 4567"
                      className="w-full bg-[#0B132B] border-0 text-white placeholder-slate-500 text-sm px-4 py-3 outline-none"
                    />
                  </div>
                </div>

                {/* Inquiry Topic Selectors */}
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-slate-300 mb-2.5">
                    Inquiry Topic <span className="text-sky-400">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                    {[
                      { id: 'attendee', label: 'Attendee Support' },
                      { id: 'partnership', label: 'Partnership & Sponsors' },
                      { id: 'speaker', label: 'Speaker Inquiries' },
                      { id: 'general', label: 'General Question' }
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTopic(t.id as any)}
                        className={`text-center text-xs font-medium py-2.5 px-3 rounded-lg border transition-colors cursor-pointer ${
                          topic === t.id
                            ? 'border-blue-500 bg-blue-600/20 text-white'
                            : 'border-slate-700 bg-[#0B132B] text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message Area */}
                <div>
                  <label htmlFor="inquiry-message" className="block text-xs uppercase tracking-wider font-semibold text-slate-300 mb-2">
                    Message <span className="text-sky-400">*</span>
                  </label>
                  <textarea
                    id="inquiry-message"
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your message or inquiry here..."
                    className="w-full bg-[#0B132B] border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white placeholder-slate-500 text-sm rounded-xl p-3.5 transition-colors resize-none outline-none"
                  />
                </div>

                {/* Submit Button with solid royal blue */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-2 py-4 px-6 rounded-xl text-sm font-bold tracking-wide uppercase text-white bg-blue-600 hover:bg-blue-700 border border-blue-500 shadow-sm transition-colors flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-75"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Transmitting Message...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Message</span>
                      <Send className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>

                {/* Reassurance Badges */}
                <div className="flex flex-wrap items-center justify-center gap-5 pt-2 text-[11px] text-slate-400 font-medium">
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Direct to Event Secretariat
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Fast Response Guaranteed
                  </span>
                </div>
              </form>
            </div>
          </section>
        </div>

        {/* FAQs Section */}
        <div className="max-w-4xl mx-auto mt-12">
          <div className="text-center mb-8">
            <span className="text-xs uppercase font-semibold tracking-wider text-sky-400 block mb-1">
              Delegate Information
            </span>
            <h3 className="text-2xl sm:text-3xl font-bold text-white font-serif">
              Frequently Asked Questions
            </h3>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-slate-700 bg-[#1E293B] overflow-hidden transition-colors"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-4 sm:p-5 flex items-center justify-between text-left gap-4 hover:bg-slate-800/50 cursor-pointer"
                >
                  <span className="text-sm font-bold text-white flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-sky-400 shrink-0" />
                    {faq.q}
                  </span>
                  {openFaq === idx ? (
                    <ChevronUp className="w-4 h-4 text-sky-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>

                {openFaq === idx && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-700/60 bg-[#162032]">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
