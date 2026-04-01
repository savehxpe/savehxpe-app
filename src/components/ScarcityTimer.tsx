'use client';
import { useState, useEffect } from 'react';

export default function ScarcityTimer() {
  const targetDate = new Date('2026-04-20T00:00:00').getTime();

  const calculateTimeLeft = () => {
    const now = Date.now();
    const diff = Math.max(0, Math.floor((targetDate - now) / 1000));
    return diff;
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return { d, h, m, s };
  };

  const pad = (n: number) => n.toString().padStart(2, '0');

  const isExpired = timeLeft === 0;
  const { d, h, m, s } = formatTime(timeLeft);

  if (isExpired) {
    return (
      <div className="border border-white/20 bg-black p-10 mb-8 flex flex-col items-center justify-center">
        <span className="font-mono text-xs tracking-[0.3em] text-white/50 mb-4">
          [ UPCOMING RELEASE ]
        </span>
        <span className="font-mono text-2xl md:text-3xl tracking-[0.2em] text-white font-bold">
          [ ACCESS GRANTED ]
        </span>
        <span className="font-mono text-[10px] tracking-[0.25em] text-white/40 mt-6 text-center">
          EXCLUSIVE ARCHIVE ACCESS: AUTHENTICATED USERS ONLY
        </span>
      </div>
    );
  }

  return (
    <div className="border border-white/20 bg-black p-8 md:p-10 mb-8 flex flex-col items-center justify-center">
      <span className="font-mono text-xs tracking-[0.3em] text-white/50 mb-6">
        [ UPCOMING RELEASE ]
      </span>

      <div className="flex items-center gap-3 md:gap-5">
        {[
          { value: pad(d), label: 'DAYS' },
          { value: pad(h), label: 'HRS' },
          { value: pad(m), label: 'MIN' },
          { value: pad(s), label: 'SEC' },
        ].map((unit, i) => (
          <div key={unit.label} className="flex items-center gap-3 md:gap-5">
            <div className="flex flex-col items-center">
              <span className="font-mono text-3xl md:text-5xl font-bold tracking-[0.15em] text-white tabular-nums">
                {unit.value}
              </span>
              <span className="font-mono text-[9px] md:text-[10px] tracking-[0.3em] text-white/30 mt-2">
                {unit.label}
              </span>
            </div>
            {i < 3 && (
              <span className="font-mono text-2xl md:text-4xl text-white/20 -mt-4">:</span>
            )}
          </div>
        ))}
      </div>

      <span className="font-mono text-[10px] tracking-[0.25em] text-white/40 mt-8 text-center">
        EXCLUSIVE ARCHIVE ACCESS: AUTHENTICATED USERS ONLY
      </span>
    </div>
  );
}
