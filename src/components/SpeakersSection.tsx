import React, { useState } from 'react';
import { SPEAKERS } from '../data/conferenceData';
import { Speaker } from '../types';
import { ArrowUpRight, Filter, Building, BookOpen, LayoutGrid, List } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SpeakersSectionProps {
  onSelectSpeaker: (speaker: Speaker) => void;
  onRegisterClick: () => void;
}

type FilterCategory = 'all' | 'hosts' | 'governance' | 'industry' | 'enterprise';
type MobileViewMode = 'grid' | 'list';

export const SpeakersSection: React.FC<SpeakersSectionProps> = ({
  onSelectSpeaker,
  onRegisterClick
}) => {
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');
  const [mobileView, setMobileView] = useState<MobileViewMode>('grid');
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  const filterSpeakers = (category: FilterCategory): Speaker[] => {
    switch (category) {
      case 'hosts':
        return SPEAKERS.filter((s) =>
          ['proph-kofi-boakye-fosuhene', 'justice-kelvin-larnyoh'].includes(s.id)
        );
      case 'governance':
        return SPEAKERS.filter((s) =>
          ['col-robert-narh', 'dorcas-adisah-wumbee'].includes(s.id)
        );
      case 'industry':
        return SPEAKERS.filter((s) =>
          ['ing-fidel-nyarko', 'george-nutor'].includes(s.id)
        );
      case 'enterprise':
        return SPEAKERS.filter((s) =>
          ['dr-april-dobson', 'bernard-k-sackitey', 'musu-kiawu-sue'].includes(s.id)
        );
      default:
        return SPEAKERS;
    }
  };

  const displayList = filterSpeakers(activeFilter);

  const filterButtons: { id: FilterCategory; label: string; count: number }[] = [
    { id: 'all', label: 'All Mentors & Leaders', count: SPEAKERS.length },
    { id: 'hosts', label: 'Hosts & Conveners', count: 2 },
    { id: 'governance', label: 'Governance & Law', count: 2 },
    { id: 'industry', label: 'Engineering & Industry', count: 2 },
    { id: 'enterprise', label: 'Healthcare & Enterprise', count: 3 }
  ];

  return (
    <section
      className="py-16 sm:py-20 lg:py-28 bg-[#0B132B] relative"
      data-purpose="speakers-showcase"
      id="events"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
        {/* Speakers Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 sm:mb-8 gap-4">
          <div>
            <span className="text-sky-400 font-semibold tracking-wider text-xs uppercase block mb-1">
              Keynote Mentors &amp; Leaders
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-wide uppercase text-white font-serif">
              FEATURED SPEAKERS &amp; LINEUP
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
              Equipping university scholars through real-world insights from senior directors,
              military officers, consulting engineers, corporate counsel, and spiritual fathers.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            {/* Mobile View Toggle (Grid 2-Col vs Compact List) */}
            <div className="flex md:hidden items-center bg-[#1E293B] border border-slate-700 rounded-lg p-1">
              <button
                onClick={() => setMobileView('grid')}
                className={`p-1.5 rounded text-xs flex items-center gap-1 transition-colors ${
                  mobileView === 'grid'
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
                aria-label="2-Column Grid View"
                title="2-Column Compact Grid"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="text-[10px]">Grid</span>
              </button>
              <button
                onClick={() => setMobileView('list')}
                className={`p-1.5 rounded text-xs flex items-center gap-1 transition-colors ${
                  mobileView === 'list'
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
                aria-label="Compact List View"
                title="Compact List View"
              >
                <List className="w-3.5 h-3.5" />
                <span className="text-[10px]">List</span>
              </button>
            </div>

            <div className="text-xs font-semibold text-slate-400 bg-[#1E293B] border border-slate-700 px-3 py-1.5 rounded-lg">
              <span className="text-white font-bold">{SPEAKERS.length}</span> Mentors
            </div>
          </div>
        </div>

        {/* Category Filters with Morph Transition */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 sm:mb-8 scrollbar-none">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1 mr-1 hidden sm:block" />
          {filterButtons.map((btn) => {
            const isActive = activeFilter === btn.id;
            return (
              <button
                key={btn.id}
                onClick={() => setActiveFilter(btn.id)}
                className={`text-xs px-3.5 py-1.5 rounded-lg whitespace-nowrap transition-colors font-medium border cursor-pointer relative ${
                  isActive
                    ? 'border-blue-500 text-white font-semibold'
                    : 'border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 bg-[#1E293B]'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="speakerCategoryMorph"
                    className="absolute inset-0 bg-blue-600 rounded-lg -z-10"
                    transition={{ type: 'spring', stiffness: 750, damping: 35, mass: 0.5 }}
                  />
                )}
                <span className="relative z-10">
                  {btn.label} <span className="opacity-75 ml-1">({btn.count})</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Mobile View: Compact List Mode */}
        {mobileView === 'list' && (
          <div className="md:hidden space-y-3 mb-8">
            <AnimatePresence mode="popLayout">
              {displayList.map((speaker) => {
                const hasImgError = imgErrors[speaker.id];
                return (
                  <motion.div
                    key={speaker.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ type: 'spring', stiffness: 700, damping: 35, mass: 0.5 }}
                    onClick={() => onSelectSpeaker(speaker)}
                    className="flex items-center gap-3 p-3 rounded-xl bg-[#1E293B] border border-slate-700 hover:border-blue-500 active:scale-[0.99] transition-all cursor-pointer"
                  >
                    <div className="w-14 h-16 rounded-lg overflow-hidden bg-slate-900 shrink-0 border border-slate-700">
                      {!hasImgError ? (
                        <img
                          src={speaker.image}
                          alt={speaker.name}
                          onError={() =>
                            setImgErrors((prev) => ({ ...prev, [speaker.id]: true }))
                          }
                          className="w-full h-full object-cover object-top"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-800 text-sky-400 font-bold text-sm">
                          {speaker.name
                            .split(' ')
                            .filter((w) => !['Dr.', 'Ing.', 'Col.', 'Proph.', 'Gen.', 'Sec.', 'Esq.'].includes(w))
                            .slice(0, 2)
                            .map((w) => w[0])
                            .join('')}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-sky-400 block truncate">
                        {speaker.role}
                      </span>
                      <h3 className="text-sm font-bold text-white font-serif truncate">
                        {speaker.name}
                      </h3>
                      {speaker.company && (
                        <p className="text-[11px] text-slate-300 truncate mt-0.5">
                          {speaker.company}
                        </p>
                      )}
                    </div>

                    <div className="text-sky-400 shrink-0 p-1">
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Standard Grid Mode: 2-Columns on Mobile, 3-Columns on Laptop/Desktop */}
        <div
          className={`${
            mobileView === 'list' ? 'hidden md:grid' : 'grid'
          } grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6`}
        >
          <AnimatePresence mode="popLayout">
            {displayList.map((speaker) => {
              const hasImgError = imgErrors[speaker.id];

              return (
                <motion.div
                  key={speaker.id}
                  layout
                  layoutId={`speaker-card-${speaker.id}`}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  transition={{
                    layout: { type: 'spring', damping: 32, stiffness: 700, mass: 0.5 },
                    opacity: { duration: 0.12 }
                  }}
                  onClick={() => onSelectSpeaker(speaker)}
                  className="group flex flex-col rounded-xl sm:rounded-2xl overflow-hidden bg-[#1E293B] border border-slate-700 hover:border-blue-500 shadow-sm transition-colors cursor-pointer"
                  data-purpose="speaker-card"
                >
                  {/* Photo Container */}
                  <div className="aspect-[4/5] sm:aspect-[4/5] w-full overflow-hidden bg-slate-900 relative">
                    {!hasImgError ? (
                      <motion.img
                        layoutId={`speaker-img-${speaker.id}`}
                        src={speaker.image}
                        alt={speaker.name}
                        onError={() =>
                          setImgErrors((prev) => ({ ...prev, [speaker.id]: true }))
                        }
                        className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-slate-400 p-4 text-center">
                        <span className="text-2xl sm:text-3xl font-bold font-serif text-sky-400 mb-1 sm:mb-2">
                          {speaker.name
                            .split(' ')
                            .filter((w) => !['Dr.', 'Ing.', 'Col.', 'Proph.', 'Gen.', 'Sec.', 'Esq.'].includes(w))
                            .slice(0, 2)
                            .map((w) => w[0])
                            .join('')}
                        </span>
                        <span className="text-[10px] sm:text-xs text-slate-300 font-medium line-clamp-1">
                          {speaker.name}
                        </span>
                      </div>
                    )}

                    {/* Corner Badge */}
                    <div className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-[#0B132B]/95 border border-slate-700 px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-sky-400 backdrop-blur-sm max-w-[90%] truncate z-10">
                      {speaker.role.split('&')[0].trim()}
                    </div>
                  </div>

                  {/* Solid Flat Details Panel: compact padding on mobile */}
                  <div className="p-3 sm:p-5 bg-[#1E293B] border-t border-slate-700 flex flex-col justify-between flex-1">
                    <div>
                      <h3 className="text-xs sm:text-lg font-bold text-white font-serif group-hover:text-sky-300 transition-colors line-clamp-2 leading-tight">
                        {speaker.name}
                      </h3>

                      {speaker.company && (
                        <p className="text-[10px] sm:text-xs text-slate-300 mt-1 flex items-center gap-1 font-medium">
                          <Building className="w-3 h-3 text-sky-400 shrink-0 hidden sm:inline" />
                          <span className="truncate">{speaker.company}</span>
                        </p>
                      )}

                      {/* Keynote Preview: shown on desktop/tablet, compact on mobile */}
                      <div className="hidden sm:block mt-3 text-xs text-slate-300 line-clamp-2 italic bg-[#0F172A] p-2.5 rounded-lg border border-slate-800">
                        <span className="font-semibold text-slate-200 not-italic mr-1 inline-flex items-center gap-1">
                          <BookOpen className="w-3 h-3 text-sky-400 inline" /> Keynote:
                        </span>
                        "{speaker.topic}"
                      </div>
                    </div>

                    <div className="mt-2.5 sm:mt-4 pt-2 sm:pt-3 border-t border-slate-700/60 flex items-center justify-between text-[11px] sm:text-xs text-sky-400 font-semibold group-hover:text-white transition-colors">
                      <span className="hidden sm:inline">View Biography &amp; Takeaways</span>
                      <span className="sm:hidden">Bio &amp; Details</span>
                      <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Bottom Fast-Track Note */}
        <div className="mt-10 sm:mt-12 p-4 sm:p-6 rounded-2xl bg-[#1E293B] border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <p className="text-xs sm:text-sm font-semibold text-white">
              Interact Directly with Keynote Mentors During Breakout Circles
            </p>
            <p className="text-[11px] sm:text-xs text-slate-300">
              Each session includes 20 minutes of live Q&amp;A and 1-on-1 career guidance for registered delegates.
            </p>
          </div>
          <button
            onClick={onRegisterClick}
            className="w-full sm:w-auto px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 border border-blue-500 transition-colors shrink-0 shadow-sm cursor-pointer"
          >
            Claim Your Spot
          </button>
        </div>
      </div>
    </section>
  );
};
