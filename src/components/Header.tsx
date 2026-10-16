import React, { useState } from 'react';
import { NavTab } from '../types';
import { Menu, X, ArrowUpRight, Calendar, UserCheck, HelpCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface HeaderProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  claimedSeats: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  claimedSeats
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (tab: NavTab) => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-[#0B132B]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <button
          onClick={() => handleNavClick('home')}
          className="flex items-center gap-3 group text-left focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg py-1 px-1 transition-transform active:scale-95"
          aria-label="SHIFT 1.0 Home"
        >
          {/* Solid Emblem */}
          <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
            S
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-white font-serif group-hover:text-sky-400 transition-colors">
              SHIFT
            </span>
            <span className="text-[10px] font-semibold text-sky-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
              1.0
            </span>
          </div>
        </button>

        {/* Desktop Navigation Links (Strictly HOME, REGISTER, CONTACTS) */}
        <nav aria-label="Main Navigation" className="hidden md:flex items-center space-x-8 lg:space-x-10">
          <button
            onClick={() => handleNavClick('home')}
            className={`text-xs lg:text-sm font-semibold tracking-wider uppercase transition-colors relative py-1 ${
              activeTab === 'home' ? 'text-sky-400' : 'text-slate-300 hover:text-sky-400'
            }`}
          >
            HOME
            {activeTab === 'home' && (
              <motion.span
                layoutId="activeHeaderNavMorph"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full"
                transition={{ type: 'spring', stiffness: 750, damping: 35, mass: 0.5 }}
              />
            )}
          </button>

          <button
            onClick={() => handleNavClick('register')}
            className={`text-xs lg:text-sm font-semibold tracking-wider uppercase transition-colors relative py-1 ${
              activeTab === 'register' ? 'text-sky-400' : 'text-slate-300 hover:text-sky-400'
            }`}
          >
            REGISTER
            {activeTab === 'register' && (
              <motion.span
                layoutId="activeHeaderNavMorph"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full"
                transition={{ type: 'spring', stiffness: 750, damping: 35, mass: 0.5 }}
              />
            )}
          </button>

          <button
            onClick={() => handleNavClick('contacts')}
            className={`text-xs lg:text-sm font-semibold tracking-wider uppercase transition-colors relative py-1 flex items-center gap-1.5 ${
              activeTab === 'contacts' ? 'text-sky-400' : 'text-slate-300 hover:text-sky-400'
            }`}
          >
            {activeTab === 'contacts' && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            )}
            CONTACTS
            {activeTab === 'contacts' && (
              <motion.span
                layoutId="activeHeaderNavMorph"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full"
                transition={{ type: 'spring', stiffness: 750, damping: 35, mass: 0.5 }}
              />
            )}
          </button>
        </nav>

        {/* Right CTA Button & Mobile Menu Trigger */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <button
            onClick={() => handleNavClick('register')}
            className="inline-flex items-center justify-center gap-1.5 px-4 sm:px-6 py-2 sm:py-2.5 rounded-full text-xs font-bold tracking-wider uppercase text-white bg-blue-600 hover:bg-blue-700 border border-blue-500 shadow-sm transition-colors active:scale-95 cursor-pointer"
          >
            <span>REGISTER</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-[#0B132B] px-6 py-6 space-y-4">
          <div className="flex flex-col space-y-2">
            <button
              onClick={() => handleNavClick('home')}
              className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold tracking-wider uppercase transition-colors text-left ${
                activeTab === 'home' ? 'bg-slate-800 text-sky-400 border border-slate-700' : 'text-slate-300 hover:bg-slate-800/50'
              }`}
            >
              <span>HOME</span>
              <span className="text-xs text-slate-400 font-medium">01</span>
            </button>

            <button
              onClick={() => handleNavClick('register')}
              className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold tracking-wider uppercase transition-colors text-left ${
                activeTab === 'register' ? 'bg-slate-800 text-sky-400 border border-slate-700' : 'text-slate-300 hover:bg-slate-800/50'
              }`}
            >
              <span className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-sky-400" />
                REGISTER
              </span>
              <span className="text-xs text-emerald-400 font-semibold">{500 - claimedSeats} seats left</span>
            </button>

            <button
              onClick={() => handleNavClick('contacts')}
              className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold tracking-wider uppercase transition-colors text-left ${
                activeTab === 'contacts' ? 'bg-slate-800 text-sky-400 border border-slate-700' : 'text-slate-300 hover:bg-slate-800/50'
              }`}
            >
              <span className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-sky-400" />
                CONTACTS
              </span>
              <span className="text-xs text-slate-400 font-medium">03</span>
            </button>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>NOV 28, 2026 • UENR</span>
            <span className="text-sky-400 font-medium">WES × UENR SCC</span>
          </div>
        </div>
      )}
    </header>
  );
};
