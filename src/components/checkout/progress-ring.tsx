"use client";

import { useState, useEffect } from "react";

/**
 * Circular countdown ring (plan §6.2) — used while waiting for the M-Pesa
 * STK approval.
 */
export function ProgressRing({ totalSeconds }: { totalSeconds: number }) {
  const R = 26;
  const CIRC = 2 * Math.PI * R;
  const [remaining, setRemaining] = useState(totalSeconds);

  useEffect(() => {
    if (remaining <= 0) return;
    const t = setTimeout(() => setRemaining((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining]);

  const progress = Math.max(0, Math.min(1, remaining / totalSeconds));
  const offset = CIRC * (1 - progress);
  const mm = Math.floor(remaining / 60);
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <div className="relative flex h-16 w-16 items-center justify-center" aria-live="polite">
      <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
        <circle cx="32" cy="32" r={R} fill="none" stroke="#e5e5e5" strokeWidth="4" />
        <circle
          cx="32"
          cy="32"
          r={R}
          fill="none"
          stroke="#D97706"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
      </svg>
      <span className="absolute text-sm font-semibold tabular-nums">
        {mm}:{ss}
      </span>
    </div>
  );
}