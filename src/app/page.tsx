'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// --- Native Canvas 2D Rotating Core ---
function Canvas2DCore({ isLoaded }: { isLoaded: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const angleRef = useRef(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const baseRadius = Math.min(w, h) * 0.28;
    const speed = isLoaded ? 0.04 : 0.012;
    angleRef.current += speed;
    const angle = angleRef.current;

    // Scaling animation when loaded
    const scaleFactor = isLoaded ? Math.min(1.6, 1 + (angle - Math.PI) * 0.05) : 1;
    const radius = baseRadius * Math.max(1, scaleFactor);

    // --- Draw outer wireframe dodecahedron (projected 2D) ---
    const outerRadius = radius * 1.5;
    const outerSides = 12;
    ctx.save();
    ctx.strokeStyle = 'rgba(75, 85, 99, 0.4)';
    ctx.lineWidth = 1;
    ctx.translate(cx, cy);
    ctx.rotate(-angle * 0.6);
    ctx.beginPath();
    for (let i = 0; i <= outerSides; i++) {
      const a = (i / outerSides) * Math.PI * 2;
      const px = Math.cos(a) * outerRadius;
      const py = Math.sin(a) * outerRadius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();

    // Cross-connections for wireframe look
    for (let i = 0; i < outerSides; i += 2) {
      const a1 = (i / outerSides) * Math.PI * 2;
      const a2 = ((i + Math.floor(outerSides / 2)) / outerSides) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a1) * outerRadius, Math.sin(a1) * outerRadius);
      ctx.lineTo(Math.cos(a2) * outerRadius, Math.sin(a2) * outerRadius);
      ctx.stroke();
    }
    ctx.restore();

    // --- Draw inner solid octahedron (projected 2D as diamond) ---
    const innerSides = 8;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    // Fill
    ctx.fillStyle = isLoaded ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.7)';
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i <= innerSides; i++) {
      const a = (i / innerSides) * Math.PI * 2;
      const r = radius * (1 + 0.08 * Math.sin(a * 3 + angle * 2));
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner cross lines for depth
    for (let i = 0; i < innerSides; i += 2) {
      const a1 = (i / innerSides) * Math.PI * 2;
      const a2 = ((i + innerSides / 2) / innerSides) * Math.PI * 2;
      const r1 = radius * (1 + 0.08 * Math.sin(a1 * 3 + angle * 2));
      const r2 = radius * (1 + 0.08 * Math.sin(a2 * 3 + angle * 2));
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.moveTo(Math.cos(a1) * r1, Math.sin(a1) * r1);
      ctx.lineTo(Math.cos(a2) * r2, Math.sin(a2) * r2);
      ctx.stroke();
    }
    ctx.restore();

    // Glow effect
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, outerRadius * 1.2);
    gradient.addColorStop(0, isLoaded ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    animRef.current = requestAnimationFrame(draw);
  }, [isLoaded]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ width: '100%', height: '100%' }}
    />
  );
}

export default function SplashLoading() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const isLoaded = progress >= 100;

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          return 100;
        }
        return p + Math.floor(Math.random() * 20) + 2;
      });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      setTimeout(() => {
        router.push('/identity');
      }, 1200);
    }
  }, [isLoaded, router]);

  return (
    <div className="relative flex min-h-screen w-full flex-col group/design-root bg-[#000000] overflow-hidden selection:bg-white selection:text-black">
      {/* Background Ambience */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 flex items-center justify-center">
        <div className={`w-[300px] h-[300px] md:w-[600px] md:h-[600px] bg-white rounded-full absolute transition-all duration-1000 ${isLoaded ? 'opacity-20 blur-[150px] scale-150' : 'opacity-5 blur-[100px] animate-pulse-slow'}`}></div>
        <div className="w-full h-full absolute opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent"></div>
      </div>

      {/* Screen Glitch Effect */}
      {isLoaded && <div className="absolute inset-0 bg-white/10 z-50 animate-[flash_0.1s_ease-out_3]"></div>}

      <main className="flex flex-1 flex-col relative justify-center items-center px-4 py-12 lg:py-20 w-full z-10">
        <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-md gap-10">

          <div className="text-center space-y-4">
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter leading-none text-white animate-flicker">savehxpe</h1>
            <p className="text-slate-500 text-xs md:text-sm uppercase tracking-[0.4em] font-medium">Outworld System v2.0</p>
          </div>

          {/* Native Canvas 2D Core */}
          <div className="w-64 h-64 md:w-80 md:h-80 relative flex items-center justify-center">
            <Canvas2DCore isLoaded={isLoaded} />
          </div>

          <div className="w-full max-w-xs space-y-6">
            <div className="h-0.5 w-full bg-white/10 overflow-hidden relative">
              <div
                className="absolute top-0 left-0 h-full bg-white transition-all duration-200 ease-out"
                style={{ width: `${Math.min(progress, 100)}%` }}
              ></div>
            </div>

            <div className={`flex justify-between items-center text-[10px] font-mono uppercase tracking-widest transition-colors ${isLoaded ? 'text-white' : 'text-slate-500'}`}>
              <span className={!isLoaded ? "animate-pulse" : ""}>
                {isLoaded ? 'ASSETS INITIALIZED' : 'INITIALIZING ASSETS...'}
              </span>
              <span>{Math.min(progress, 100)}%</span>
            </div>
          </div>
        </div>
      </main>

      {/* Scanline overlay */}
      <div className="pointer-events-none absolute inset-0 z-40 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:100%_4px] opacity-20 MixBlendMode-overlay" style={{ mixBlendMode: 'overlay' }}></div>
      <style jsx global>{`
          @keyframes flash {
              0% { opacity: 0; }
              50% { opacity: 1; }
              100% { opacity: 0; }
          }
      `}</style>
    </div>
  );
}
