import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { CONFERENCE_INFO, SPEAKERS } from '../data/conferenceData';
import { CountdownTimer } from './CountdownTimer';

interface HeroSectionProps {
  onRegisterClick: () => void;
  onSpeakersClick: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onRegisterClick,
  onSpeakersClick
}) => {
  return (
    <section
      className="relative pt-10 pb-20 lg:pt-16 lg:pb-32 overflow-hidden bg-[#0B132B]"
      data-purpose="hero-banner"
      id="home"
    >
      {/* Background Ambient Elements & Real Worship Gathering Photo Overlay */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Background photo of Christian youth worship gathering */}
        <img
          src="/images/worship_bg.jpg"
          alt="Christian Youth Worship Gathering"
          className="absolute inset-0 w-full h-full object-cover object-center filter brightness-90 opacity-40 select-none"
        />

        {/* Clean flat dark solid overlay for crisp contrast */}
        <div className="absolute inset-0 bg-[#0B132B]/80" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 relative z-10">
        {/* Top Meta Tags Bar */}
        <div
          className="flex flex-wrap items-center justify-between gap-6 pb-10 border-b border-slate-800"
          data-purpose="event-metadata"
        >
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-serif">
              {CONFERENCE_INFO.dateShort}
            </h2>
            <p className="text-xs sm:text-sm font-semibold tracking-wider text-sky-400 uppercase">
              9:00 AM – 2:00 PM GMT
            </p>
          </div>

          <div className="space-y-1 text-left sm:text-right">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-serif">
              UENR
            </h2>
            <p className="text-xs sm:text-sm font-semibold tracking-wider text-slate-300 uppercase">
              SUNYANI / CAMPUS
            </p>
          </div>
        </div>

        {/* Typography Title & Live Countdown Timer */}
        <div className="pt-10 pb-8 sm:pt-14 sm:pb-12 lg:pt-16 lg:pb-14 text-center lg:text-left space-y-6">
          <h1 className="text-6xl sm:text-8xl md:text-9xl lg:text-[144px] font-bold tracking-tight leading-none text-white font-serif uppercase select-none">
            {CONFERENCE_INFO.name}
          </h1>

          {/* Live Countdown Display */}
          <div className="flex items-center justify-center lg:justify-start">
            <CountdownTimer />
          </div>
        </div>

        {/* Hero Content Grid: Left Pills & Narrative, Right Action */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-end">
          {/* Left Column (Speaker Avatar Pill & Key Text) */}
          <div className="lg:col-span-8 space-y-8">
            {/* Skilled Speakers Pill */}
            <button
              onClick={onSpeakersClick}
              className="inline-flex items-center gap-4 px-5 py-3 rounded-full bg-[#1E293B] hover:bg-slate-800 transition-colors cursor-pointer group text-left border border-slate-700"
              data-purpose="speakers-badge"
            >
              {/* Overlapping Avatars */}
              <div className="flex items-center -space-x-2 overflow-hidden">
                {SPEAKERS.slice(0, 4).map((sp) => (
                  <img
                    key={sp.id}
                    alt={sp.name}
                    className="inline-block h-9 w-9 rounded-full ring-2 ring-slate-900 object-cover object-top"
                    src={sp.image}
                    referrerPolicy="no-referrer"
                  />
                ))}
                <span className="inline-flex items-center justify-center h-9 w-9 rounded-full ring-2 ring-slate-900 bg-blue-600 text-[11px] font-bold text-white z-10">
                  +{SPEAKERS.length - 4}
                </span>
              </div>

              <span className="text-xs sm:text-sm font-semibold tracking-wider uppercase text-white flex items-center gap-1.5 group-hover:text-sky-400 transition-colors">
                <span>{SPEAKERS.length} KEYNOTE SPEAKERS &amp; MENTORS</span>
                <ArrowUpRight className="w-4 h-4 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </span>
            </button>

            {/* Main Theme Title & Description */}
            <div className="space-y-4 max-w-2xl">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold uppercase leading-snug tracking-tight text-white font-serif">
                BEYOND THE DEGREE:<br className="hidden sm:inline" /> BUILDING YOUR CAREER, PURPOSE &amp; LEGACY
              </h2>
              <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-normal">
                Worldwide Evangelism Service (WES), in partnership with the UENR Student Christian Council (SCC), presents SHIFT 1.0. Helping students and young adults connect their faith with career growth, personal purpose, and long-term impact.
              </p>
            </div>
          </div>

          {/* Right Column (Register CTA & Credits) */}
          <div className="lg:col-span-4 flex flex-col justify-end space-y-8">
            {/* Register Button with solid flat royal blue */}
            <div className="w-full">
              <button
                onClick={onRegisterClick}
                className="w-full py-5 px-8 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white border border-blue-500 font-bold tracking-wide text-center flex items-center justify-center gap-3 text-base sm:text-lg uppercase transition-colors active:scale-95 cursor-pointer shadow-sm"
              >
                <span className="text-xl">↗</span>
                <span>REGISTER NOW</span>
              </button>
            </div>

            {/* Meta credits lines */}
            <div className="flex flex-col sm:flex-row lg:flex-col justify-between text-xs tracking-wider uppercase text-slate-400 font-medium gap-2 border-t border-slate-800 pt-4">
              <span>{CONFERENCE_INFO.shortOrganizers}</span>
              <span className="text-white font-semibold">{CONFERENCE_INFO.convener}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
