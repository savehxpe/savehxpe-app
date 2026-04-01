'use client';
import { useState, useEffect } from 'react';

export default function ScarcityTimer() {
  // 48 hour countdown in seconds
  const [timeLeft, setTimeLeft] = useState(48 * 60 * 60);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative border border-red-500/50 bg-black p-5 mb-8 shadow-[0_0_15px_rgba(255,0,0,0.15)] overflow-hidden">
      {/* Background Glitch Line */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-red-500/30 animate-pulse"></div>

      <div className="flex justify-between items-center mb-3">
        <h3 className="text-red-500 font-mono font-bold tracking-widest text-xs md:text-sm">
          [ ENCRYPTED ] HANDOUT REMIX STEMS
        </h3>
        <span className="text-red-400 font-mono text-xs animate-pulse bg-red-900/30 px-2 py-1">
          WARNING
        </span>
      </div>

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mt-4">
        <div className="text-cyan-400 font-mono text-lg md:text-xl tracking-[0.1em]">
          50% BUNDLE DISCOUNT EXPIRES IN: <span className="text-white font-bold">{formatTime(timeLeft)}</span>
        </div>

        <button className="mt-5 lg:mt-0 w-full lg:w-auto px-8 py-3 bg-cyan-900/20 border border-cyan-400 text-cyan-400 font-mono text-sm tracking-wider hover:bg-cyan-400 hover:text-black hover:shadow-[0_0_20px_rgba(0,255,255,0.4)] transition-all duration-300">
          UNLOCK ARCHIVE — 100 CR
        </button>
      </div>
    </div>
  );
}
