import React from 'react';
import { NavTab } from '../types';
import { CONFERENCE_INFO } from '../data/conferenceData';
import { Lock } from 'lucide-react';

interface SiteFooterProps {
  onSelectTab: (tab: NavTab) => void;
  onOpenAdmin: () => void;
}

export const SiteFooter: React.FC<SiteFooterProps> = ({ onSelectTab, onOpenAdmin }) => {
  const handleNav = (tab: NavTab) => {
    onSelectTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer
      className="w-full bg-[#0F172A] border-t border-slate-800 py-14 relative z-20 pb-24 md:pb-14"
      data-purpose="footer"
      id="contacts-footer"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-col items-center justify-center space-y-7 text-center">
        {/* Brand & Navigation in Footer */}
        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
          <button
            onClick={() => handleNav('home')}
            className="text-xs sm:text-sm font-semibold tracking-wider text-slate-300 hover:text-sky-400 uppercase transition-colors cursor-pointer"
          >
            HOME
          </button>
          <button
            onClick={() => handleNav('register')}
            className="text-xs sm:text-sm font-semibold tracking-wider text-slate-300 hover:text-sky-400 uppercase transition-colors cursor-pointer"
          >
            REGISTER
          </button>
          <button
            onClick={() => handleNav('contacts')}
            className="text-xs sm:text-sm font-semibold tracking-wider text-slate-300 hover:text-sky-400 uppercase transition-colors cursor-pointer"
          >
            CONTACTS
          </button>
        </div>

        {/* Divider */}
        <div className="w-24 h-px bg-slate-700" />

        {/* Conveners statement */}
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wider text-sky-400 font-semibold">
            {CONFERENCE_INFO.shortOrganizers} • {CONFERENCE_INFO.convener}
          </p>
          <p className="text-xs text-slate-400 max-w-xl mx-auto">
            {CONFERENCE_INFO.venueFull} • Saturday, Nov 28, 2026
          </p>
        </div>

        {/* Copyright Notice & Discreet Secretariat Link */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-xs text-slate-500 max-w-xl">
          <p className="font-medium tracking-wide">
            © 2026 Worldwide Evangelism Service (WES) x UENR SCC. All rights reserved.
          </p>
          <span className="hidden sm:inline text-slate-700">·</span>
          <button
            onClick={onOpenAdmin}
            className="text-[11px] text-slate-600 hover:text-slate-400 font-medium transition-colors cursor-pointer flex items-center gap-1.5 focus:outline-none"
            aria-label="Secretariat Portal"
            title="Authorized Executive Staff Access"
          >
            <Lock className="w-3 h-3 opacity-60" />
            <span>Secretariat Access</span>
          </button>
        </div>
      </div>
    </footer>
  );
};
