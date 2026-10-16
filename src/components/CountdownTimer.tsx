import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface CountdownTimerProps {
  targetDate?: string;
  className?: string;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  // Default to November 28, 2026, 14:00:00 GMT (2:00 PM GMT)
  targetDate = '2026-11-28T14:00:00Z',
  className = ''
}) => {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isPast: boolean;
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isPast: false
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const target = new Date(targetDate).getTime();
      const now = Date.now();
      if (isNaN(target)) {
        return {
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isPast: false
        };
      }
      const difference = target - now;

      if (difference <= 0) {
        return {
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isPast: true
        };
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      return {
        days,
        hours,
        minutes,
        seconds,
        isPast: false
      };
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  if (timeLeft.isPast) {
    return (
      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sky-400 text-xs font-semibold uppercase tracking-wider ${className}`}>
        <span className="w-2 h-2 rounded-full bg-sky-400" />
        <span>SHIFT 1.0 IS LIVE TODAY AT UENR</span>
      </div>
    );
  }

  const formatNumber = (num: number) => num.toString().padStart(2, '0');

  return (
    <div
      className={`inline-flex flex-col sm:flex-row items-center gap-3 sm:gap-4 p-2 sm:p-2.5 rounded-xl bg-[#1E293B] border border-slate-700 shadow-sm ${className}`}
      data-purpose="live-countdown-timer"
      aria-label="Countdown to November 28"
    >
      {/* Label Indicator */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-sky-400 text-[11px] font-semibold tracking-wider uppercase shrink-0">
        <Clock className="w-3.5 h-3.5 text-sky-400 shrink-0" />
        <span>GATHERING COUNTDOWN</span>
      </div>

      {/* Digits Container */}
      <div className="flex items-center gap-2 sm:gap-3 text-white px-2">
        {/* Days */}
        <div className="flex flex-col items-center min-w-[46px] sm:min-w-[52px]">
          <span className="text-xl sm:text-2xl font-bold font-sans tabular-nums tracking-tight text-white">
            {formatNumber(timeLeft.days)}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
            Days
          </span>
        </div>

        <span className="text-sm sm:text-base font-bold text-slate-500 -mt-3">:</span>

        {/* Hours */}
        <div className="flex flex-col items-center min-w-[46px] sm:min-w-[52px]">
          <span className="text-xl sm:text-2xl font-bold font-sans tabular-nums tracking-tight text-white">
            {formatNumber(timeLeft.hours)}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
            Hours
          </span>
        </div>

        <span className="text-sm sm:text-base font-bold text-slate-500 -mt-3">:</span>

        {/* Minutes */}
        <div className="flex flex-col items-center min-w-[46px] sm:min-w-[52px]">
          <span className="text-xl sm:text-2xl font-bold font-sans tabular-nums tracking-tight text-white">
            {formatNumber(timeLeft.minutes)}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
            Mins
          </span>
        </div>

        <span className="text-sm sm:text-base font-bold text-slate-500 -mt-3 hidden xs:inline">:</span>

        {/* Seconds */}
        <div className="hidden xs:flex flex-col items-center min-w-[46px] sm:min-w-[52px]">
          <span className="text-xl sm:text-2xl font-bold font-sans tabular-nums tracking-tight text-sky-400">
            {formatNumber(timeLeft.seconds)}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
            Secs
          </span>
        </div>
      </div>
    </div>
  );
};
