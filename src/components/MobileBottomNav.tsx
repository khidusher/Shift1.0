import React from 'react';
import { NavTab } from '../types';
import { Home, UserCheck, HelpCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface MobileBottomNavProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  claimedSeats: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
  claimedSeats
}) => {
  const handleTab = (tab: NavTab) => {
    onSelectTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: boolean }[] = [
    { id: 'home', label: 'Home', icon: <Home className="w-5 h-5" /> },
    { id: 'register', label: 'Register', icon: <UserCheck className="w-5 h-5" />, badge: true },
    { id: 'contacts', label: 'Contacts', icon: <HelpCircle className="w-5 h-5" /> }
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0B132B]/95 backdrop-blur-md border-t border-slate-800 px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      data-purpose="mobile-bottom-dock"
    >
      <div className="flex justify-around items-center h-14 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleTab(item.id)}
              className={`flex flex-col items-center justify-center gap-1 min-w-[72px] h-12 relative transition-colors cursor-pointer ${
                isActive ? 'text-sky-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="mobileActiveNavPill"
                  className="absolute inset-1 bg-[#1E293B] border border-slate-700/80 rounded-xl -z-10"
                  transition={{ type: 'spring', stiffness: 750, damping: 35, mass: 0.5 }}
                />
              )}
              <div className="relative">
                {item.icon}
                {item.badge && (
                  <span className="absolute -top-1 -right-2 w-2 h-2 rounded-full bg-blue-500" />
                )}
              </div>
              <span className="text-[10px] tracking-wider uppercase font-semibold">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
