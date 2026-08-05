"use client";

import { useMemo } from "react";

const COLORS = ["#D97706", "#F59E0B", "#0F766E", "#10b981", "#ef4444", "#3b82f6"];

/**
 * Simple confetti burst — 20 particles falling with rotation. Renders
 * nothing for users who prefer reduced motion.
 */
export function Confetti() {
  const particles = useMemo(
    () =>
      Array.from({ length: 20 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.3,
        duration: 1 + Math.random(),
        color: COLORS[i % COLORS.length],
        size: 6 + Math.random() * 6,
      })),
    []
  );

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(320px) rotate(720deg); opacity: 0; }
        }
        .confetti-piece {
          position: absolute;
          top: 20px;
          animation-name: confetti-fall;
          animation-timing-function: ease-in;
          animation-fill-mode: forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .confetti-piece { display: none; }
        }
      `}</style>
      {particles.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.6,
            backgroundColor: p.color,
            borderRadius: 2,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}