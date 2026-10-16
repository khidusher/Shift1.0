import React from 'react';

export const MarqueeBanner: React.FC = () => {
  const StarIcon = () => (
    <svg
      className="w-6 h-6 sm:w-7 sm:h-7 text-sky-400 fill-current shrink-0"
      viewBox="0 0 24 24"
    >
      <path d="M12 0L14 9L22 7L16 13L24 18L15 17L12 24L9 17L0 18L8 13L2 7L10 9L12 0Z" />
    </svg>
  );

  return (
    <div
      className="w-full bg-[#0B132B] py-5 border-y border-slate-800 overflow-hidden select-none relative z-20"
      data-purpose="marquee-divider"
    >
      <div className="animate-marquee-infinite items-center gap-8 text-white font-serif text-2xl sm:text-4xl lg:text-5xl font-bold tracking-wider uppercase italic whitespace-nowrap">
        {/* Stream Block 1 */}
        <span className="flex items-center gap-8 shrink-0">
          <span>SPEAKERS</span>
          <StarIcon />
          <span>SPEAKERS</span>
          <StarIcon />
          <span>SPEAKERS</span>
          <StarIcon />
          <span>SPEAKERS</span>
          <StarIcon />
          <span>SPEAKERS</span>
          <StarIcon />
          <span>SPEAKERS</span>
          <StarIcon />
        </span>

        {/* Stream Block 2 (Duplicate for Seamless Infinite Loop) */}
        <span className="flex items-center gap-8 shrink-0">
          <span>SPEAKERS</span>
          <StarIcon />
          <span>SPEAKERS</span>
          <StarIcon />
          <span>SPEAKERS</span>
          <StarIcon />
          <span>SPEAKERS</span>
          <StarIcon />
          <span>SPEAKERS</span>
          <StarIcon />
          <span>SPEAKERS</span>
          <StarIcon />
        </span>
      </div>
    </div>
  );
};
