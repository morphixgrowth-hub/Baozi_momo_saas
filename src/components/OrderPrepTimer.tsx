import React, { useState, useEffect } from 'react';
import { Clock, Timer, AlertTriangle, Flame } from 'lucide-react';

interface OrderPrepTimerProps {
  createdAt?: string;
  targetMinutes?: number;
  className?: string;
}

export const OrderPrepTimer: React.FC<OrderPrepTimerProps> = ({
  createdAt,
  targetMinutes = 15,
  className = '',
}) => {
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    // Tick every second to ensure the visual timer updates live
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Compute elapsed time
  const placedTimeMs = createdAt ? new Date(createdAt).getTime() : now;
  // Guard against future or invalid date
  const validPlacedTime = isNaN(placedTimeMs) ? now : placedTimeMs;
  const elapsedMs = Math.max(0, now - validPlacedTime);
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const elapsedMinutes = Math.floor(totalSeconds / 60);
  const elapsedSeconds = totalSeconds % 60;

  // Format placed time for display (e.g., "10:42 AM")
  const placedTimeFormatted = !isNaN(placedTimeMs)
    ? new Date(placedTimeMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Recently';

  // SLA percentage for visual progress bar (capped at 100% for bar, but timer continues)
  const progressPercent = Math.min(100, Math.round((totalSeconds / (targetMinutes * 60)) * 100));

  // Determine kitchen urgency styling
  const isUrgent = elapsedMinutes >= 18;
  const isWarning = elapsedMinutes >= 10 && elapsedMinutes < 18;
  const isOnTrack = elapsedMinutes < 10;

  return (
    <div
      className={`rounded-xl p-3 my-2.5 border transition-all shadow-xs ${
        isUrgent
          ? 'bg-rose-50/90 border-rose-300 text-rose-950'
          : isWarning
          ? 'bg-amber-50/90 border-amber-300 text-amber-950'
          : 'bg-amber-50/50 border-amber-200 text-slate-800'
      } ${className}`}
    >
      {/* Top Row: Visual Timer & Elapsed Minutes */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-mono">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              isUrgent
                ? 'bg-rose-600 animate-ping'
                : isWarning
                ? 'bg-amber-500 animate-pulse'
                : 'bg-emerald-500 animate-pulse'
            }`}
          />
          <Timer
            className={`w-4 h-4 ${
              isUrgent ? 'text-rose-600' : isWarning ? 'text-amber-600' : 'text-amber-500'
            }`}
          />
          <span className="text-xs font-bold tracking-tight text-slate-900">
            {elapsedMinutes} {elapsedMinutes === 1 ? 'minute' : 'minutes'} elapsed
          </span>
        </div>

        {/* Live Digital Clock Seconds Badge */}
        <span
          className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border shadow-2xs ${
            isUrgent
              ? 'bg-rose-100 border-rose-300 text-rose-800'
              : isWarning
              ? 'bg-amber-100 border-amber-300 text-amber-900'
              : 'bg-white border-amber-200 text-slate-900'
          }`}
          title="Live Prep Duration"
        >
          {String(elapsedMinutes).padStart(2, '0')}:{String(elapsedSeconds).padStart(2, '0')}
        </span>
      </div>

      {/* Progress Bar Showing Elapsed Time Relative to Kitchen Target SLA */}
      <div className="mt-2 space-y-1">
        <div className="h-1.5 w-full bg-slate-200/90 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 rounded-full ${
              isUrgent
                ? 'bg-rose-500'
                : isWarning
                ? 'bg-amber-500'
                : 'bg-amber-400'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Subtext: Placed At + Urgency Tag */}
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-0.5">
          <span className="flex items-center gap-1">
            <Clock className="w-2.5 h-2.5 text-slate-400" />
            <span>Placed {placedTimeFormatted}</span>
          </span>
          <span
            className={`font-semibold ${
              isUrgent
                ? 'text-rose-700 flex items-center gap-1 font-bold'
                : isWarning
                ? 'text-amber-800'
                : 'text-slate-600'
            }`}
          >
            {isUrgent && <AlertTriangle className="w-2.5 h-2.5" />}
            {isUrgent ? 'Delayed (>18m)' : isWarning ? 'In Cooking' : `Target: ${targetMinutes}m`}
          </span>
        </div>
      </div>
    </div>
  );
};
