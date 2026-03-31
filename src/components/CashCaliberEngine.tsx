'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════════════ */

interface Target {
    id: number;
    x: number;
    y: number;
    radius: number;
    spawnTime: number;
    lifetime: number;
    hit: boolean;
    missed: boolean;
    pulsePhase: number;
}

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    color: string;
    text?: string;
    size: number;
}

interface Props {
    credits: number;
    onGameStart: (cb: (ok: boolean) => void) => void;
    onViralStreak: (data: { credits: number; xp: number }) => void;
    onGameOver: (data: { score: number; xp: number; engagement: string; viralReached: boolean; creditBonus: number }) => void;
    onExit: () => void;
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════════════════ */

const isDev = process.env.NODE_ENV === 'development';
const BPM = 114;
const BEAT_MS = 60000 / BPM;
const SPAWN_INTERVAL = BEAT_MS * 2;
const TARGET_LIFETIME = 2200;
const GAME_DURATION = 30000;
const VIRAL_STREAK = 20;
const GRID_SPACING = 48;
const CROSSHAIR_COLOR = '#00FFFF';
const BPM_ANGULAR_FREQ = (BPM / 60) * Math.PI * 2;

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

export default function CashCaliberEngine({ credits, onGameStart, onViralStreak, onGameOver, onExit }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animRef = useRef<number>(0);
    const containerRef = useRef<HTMLDivElement>(null);

    const phase = useRef<'IDLE' | 'PLAYING' | 'OVER'>('IDLE');
    const scoreRef = useRef(0);
    const streakRef = useRef(0);
    const maxStreakRef = useRef(0);
    const targetsRef = useRef<Target[]>([]);
    const particlesRef = useRef<Particle[]>([]);
    const lastSpawnRef = useRef(0);
    const startTimeRef = useRef(0);
    const mouseRef = useRef({ x: 0, y: 0 });
    const gridOffsetRef = useRef(0);
    const shakeRef = useRef({ x: 0, y: 0, decay: 0 });
    const viralTriggered = useRef(false);
    const nextTargetId = useRef(0);

    const [displayScore, setDisplayScore] = useState(0);
    const [displayStreak, setDisplayStreak] = useState(0);
    const [displayCredits, setDisplayCredits] = useState(credits);
    const [gamePhase, setGamePhase] = useState<'IDLE' | 'PLAYING' | 'OVER'>('IDLE');
    const [finalScore, setFinalScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(30);

    /* ─── Helpers ─── */

    const spawnTarget = useCallback((w: number, h: number) => {
        const margin = 80;
        targetsRef.current.push({
            id: nextTargetId.current++,
            x: margin + Math.random() * (w - margin * 2),
            y: margin + Math.random() * (h - margin * 2),
            radius: 22 + Math.random() * 14,
            spawnTime: Date.now(),
            lifetime: TARGET_LIFETIME,
            hit: false,
            missed: false,
            pulsePhase: Math.random() * Math.PI * 2,
        });
    }, []);

    const spawnParticles = useCallback((x: number, y: number, count: number, scoreText?: string) => {
        // Floating score popup — drifts upward, no gravity
        if (scoreText) {
            particlesRef.current.push({
                x, y: y - 10,
                vx: (Math.random() - 0.5) * 0.5,
                vy: -2.5,
                life: 1,
                maxLife: 1,
                color: scoreText === 'CRITICAL' ? '#FF00FF' : CROSSHAIR_COLOR,
                text: scoreText,
                size: scoreText === 'CRITICAL' ? 18 : 16,
            });
        }

        // Burst particles
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
            const speed = 2 + Math.random() * 5;
            particlesRef.current.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                maxLife: 1,
                color: i % 3 === 0 ? '#00FF66' : CROSSHAIR_COLOR,
                size: 3 + Math.random() * 4,
            });
        }
    }, []);

    const triggerShake = useCallback((intensity: number) => {
        shakeRef.current = {
            x: (Math.random() - 0.5) * intensity,
            y: (Math.random() - 0.5) * intensity,
            decay: 1,
        };
    }, []);

    /* ─── Drawing Helpers ─── */

    const drawGrid = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
        gridOffsetRef.current = (gridOffsetRef.current + 0.4) % GRID_SPACING;
        ctx.strokeStyle = 'rgba(0,255,255,0.1)';
        ctx.lineWidth = 1;
        for (let x = -GRID_SPACING + gridOffsetRef.current; x < w + GRID_SPACING; x += GRID_SPACING) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        for (let y = -GRID_SPACING + gridOffsetRef.current; y < h + GRID_SPACING; y += GRID_SPACING) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }
    };

    const drawScanlines = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
        ctx.fillStyle = 'rgba(0,0,0,0.06)';
        for (let y = 0; y < h; y += 3) {
            ctx.fillRect(0, y, w, 1);
        }
    };

    const drawTarget = (ctx: CanvasRenderingContext2D, t: Target, now: number) => {
        const elapsed = now - t.spawnTime;
        const lifeRatio = 1 - elapsed / t.lifetime;
        if (lifeRatio <= 0) return;

        // BPM-synced pulse
        const scale = 1 + Math.sin(now / 1000 * BPM_ANGULAR_FREQ + t.pulsePhase) * 0.1;
        const r = t.radius * scale;
        const alpha = Math.min(1, lifeRatio * 2);

        ctx.save();
        ctx.translate(t.x, t.y);

        // Outer neon glow
        ctx.shadowColor = CROSSHAIR_COLOR;
        ctx.shadowBlur = 25 + Math.sin(now / 1000 * BPM_ANGULAR_FREQ + t.pulsePhase) * 15;

        // Diamond shape
        ctx.strokeStyle = `rgba(0,255,255,${alpha * 0.95})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(r, 0);
        ctx.lineTo(0, r);
        ctx.lineTo(-r, 0);
        ctx.closePath();
        ctx.stroke();

        // Inner neon fill
        ctx.fillStyle = `rgba(0,255,255,${alpha * 0.12})`;
        ctx.fill();

        // Inner diamond (smaller, brighter)
        const ri = r * 0.5;
        ctx.strokeStyle = `rgba(0,255,255,${alpha * 0.5})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -ri);
        ctx.lineTo(ri, 0);
        ctx.lineTo(0, ri);
        ctx.lineTo(-ri, 0);
        ctx.closePath();
        ctx.stroke();

        // Lifetime ring (shrinking arc)
        ctx.shadowBlur = 0;
        ctx.strokeStyle = `rgba(0,255,255,${alpha * 0.3})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, r + 10, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * lifeRatio);
        ctx.stroke();

        ctx.restore();
    };

    const drawCrosshair = (ctx: CanvasRenderingContext2D, mx: number, my: number) => {
        const size = 18;
        const gap = 6;
        ctx.save();
        ctx.strokeStyle = CROSSHAIR_COLOR;
        ctx.shadowColor = CROSSHAIR_COLOR;
        ctx.shadowBlur = 12;
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        ctx.moveTo(mx - size, my); ctx.lineTo(mx - gap, my);
        ctx.moveTo(mx + gap, my); ctx.lineTo(mx + size, my);
        ctx.moveTo(mx, my - size); ctx.lineTo(mx, my - gap);
        ctx.moveTo(mx, my + gap); ctx.lineTo(mx, my + size);
        ctx.stroke();

        ctx.fillStyle = CROSSHAIR_COLOR;
        ctx.beginPath();
        ctx.arc(mx, my, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 6;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(mx, my, size + 4, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    };

    const drawParticles = (ctx: CanvasRenderingContext2D) => {
        particlesRef.current.forEach(p => {
            const alpha = p.life;
            ctx.save();
            ctx.globalAlpha = alpha;
            if (p.text) {
                ctx.font = `bold ${p.size}px monospace`;
                ctx.fillStyle = p.color;
                ctx.shadowColor = p.color;
                ctx.shadowBlur = 12;
                ctx.textAlign = 'center';
                ctx.fillText(p.text, p.x, p.y);
            } else {
                ctx.fillStyle = p.color;
                ctx.shadowColor = p.color;
                ctx.shadowBlur = 6;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        });
    };

    const drawHUD = (ctx: CanvasRenderingContext2D, w: number) => {
        ctx.save();
        ctx.shadowBlur = 0;
        ctx.font = 'bold 11px monospace';
        ctx.fillStyle = 'rgba(0,255,255,0.7)';
        ctx.textAlign = 'left';
        ctx.fillText(`SCORE: ${scoreRef.current}`, 16, 28);
        ctx.fillText(`STREAK: ${streakRef.current}x`, 16, 46);
        ctx.textAlign = 'right';
        ctx.fillText(`CREDITS: ${displayCredits} CR`, w - 16, 28);
        const elapsed = Date.now() - startTimeRef.current;
        const remaining = Math.max(0, Math.ceil((GAME_DURATION - elapsed) / 1000));
        ctx.fillText(`TIME: ${remaining}s`, w - 16, 46);
        ctx.fillStyle = 'rgba(0,255,255,0.15)';
        ctx.fillRect(0, 0, w, 56);
        ctx.restore();
    };

    /* ─── Main Loop ─── */

    const gameLoop = useCallback(() => {
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

        const now = Date.now();

        // Screen shake
        if (shakeRef.current.decay > 0) {
            ctx.translate(shakeRef.current.x * shakeRef.current.decay, shakeRef.current.y * shakeRef.current.decay);
            shakeRef.current.decay *= 0.85;
            if (shakeRef.current.decay < 0.01) shakeRef.current.decay = 0;
        }

        // Background
        ctx.fillStyle = '#000000';
        ctx.fillRect(-20, -20, w + 40, h + 40);

        // Scrolling cyan grid
        drawGrid(ctx, w, h);

        if (phase.current === 'PLAYING') {
            // Spawn on beat
            if (now - lastSpawnRef.current > SPAWN_INTERVAL) {
                spawnTarget(w, h);
                lastSpawnRef.current = now;
            }

            // Expire missed targets
            targetsRef.current.forEach(t => {
                if (!t.hit && !t.missed && now - t.spawnTime > t.lifetime) {
                    t.missed = true;
                    streakRef.current = 0;
                    triggerShake(14);
                }
            });

            // Purge old
            targetsRef.current = targetsRef.current.filter(t => {
                if (t.hit) return now - t.spawnTime < t.lifetime + 400;
                if (t.missed) return now - t.spawnTime < t.lifetime + 200;
                return true;
            });

            // Draw targets
            targetsRef.current.forEach(t => {
                if (!t.hit) drawTarget(ctx, t, now);
            });

            // Crosshair
            drawCrosshair(ctx, mouseRef.current.x, mouseRef.current.y);

            // Update & draw particles (score popups drift up, burst particles fall)
            particlesRef.current.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                if (!p.text) p.vy += 0.08; // gravity only on burst particles
                p.life -= 0.025;
            });
            particlesRef.current = particlesRef.current.filter(p => p.life > 0);
            drawParticles(ctx);

            // HUD
            drawHUD(ctx, w);

            // Periodic React state sync
            if (Math.random() > 0.92) {
                setDisplayScore(scoreRef.current);
                setDisplayStreak(streakRef.current);
                const elapsed = now - startTimeRef.current;
                setTimeLeft(Math.max(0, Math.ceil((GAME_DURATION - elapsed) / 1000)));
            }

            // Game over check
            if (now - startTimeRef.current > GAME_DURATION) {
                phase.current = 'OVER';
                setGamePhase('OVER');
                setFinalScore(scoreRef.current);
                setDisplayScore(scoreRef.current);
                setDisplayStreak(streakRef.current);

                onGameOver({
                    score: scoreRef.current,
                    xp: Math.floor(scoreRef.current * 1.5),
                    engagement: 'FIELD_MODE',
                    viralReached: viralTriggered.current,
                    creditBonus: viralTriggered.current ? 25 : 0,
                });
            }
        }

        // Scanlines (always)
        drawScanlines(ctx, w, h);

        // Idle crosshair
        if (phase.current === 'IDLE') {
            drawCrosshair(ctx, mouseRef.current.x, mouseRef.current.y);
        }

        animRef.current = requestAnimationFrame(gameLoop);
    }, [spawnTarget, triggerShake, onGameOver, displayCredits]);

    /* ─── Mouse / Touch ─── */

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = () => canvas.getBoundingClientRect();

        const onMove = (e: MouseEvent) => {
            const r = rect();
            mouseRef.current = { x: e.clientX - r.left, y: e.clientY - r.top };
        };
        const onTouch = (e: TouchEvent) => {
            const r = rect();
            const t = e.touches[0];
            if (t) mouseRef.current = { x: t.clientX - r.left, y: t.clientY - r.top };
        };

        canvas.addEventListener('mousemove', onMove);
        canvas.addEventListener('touchmove', onTouch, { passive: true });
        return () => {
            canvas.removeEventListener('mousemove', onMove);
            canvas.removeEventListener('touchmove', onTouch);
        };
    }, []);

    /* ─── Click / Tap = Fire ─── */

    const handleFire = useCallback((clientX: number, clientY: number) => {
        if (phase.current !== 'PLAYING') return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const r = canvas.getBoundingClientRect();
        const mx = clientX - r.left;
        const my = clientY - r.top;
        mouseRef.current = { x: mx, y: my };

        let hitMade = false;
        for (const t of targetsRef.current) {
            if (t.hit || t.missed) continue;
            const dx = mx - t.x;
            const dy = my - t.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < t.radius + 16) {
                t.hit = true;
                hitMade = true;
                scoreRef.current += 10;
                streakRef.current += 1;
                if (streakRef.current > maxStreakRef.current) maxStreakRef.current = streakRef.current;

                // Score popup: CRITICAL at 5+ streak, +10 otherwise
                const popupText = streakRef.current >= 5 ? 'CRITICAL' : '+10';
                spawnParticles(t.x, t.y, 14, popupText);

                // Viral check
                if (streakRef.current >= VIRAL_STREAK && !viralTriggered.current) {
                    viralTriggered.current = true;
                    onViralStreak({ credits: 25, xp: 200 });
                }
                break;
            }
        }

        if (!hitMade) {
            streakRef.current = 0;
            triggerShake(12);
        }

        setDisplayScore(scoreRef.current);
        setDisplayStreak(streakRef.current);
    }, [spawnParticles, triggerShake, onViralStreak]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const onClick = (e: MouseEvent) => handleFire(e.clientX, e.clientY);
        const onTouchEnd = (e: TouchEvent) => {
            const t = e.changedTouches[0];
            if (t) handleFire(t.clientX, t.clientY);
        };
        canvas.addEventListener('click', onClick);
        canvas.addEventListener('touchend', onTouchEnd);
        return () => {
            canvas.removeEventListener('click', onClick);
            canvas.removeEventListener('touchend', onTouchEnd);
        };
    }, [handleFire]);

    /* ─── Start Loop ─── */

    useEffect(() => {
        animRef.current = requestAnimationFrame(gameLoop);
        return () => cancelAnimationFrame(animRef.current);
    }, [gameLoop]);

    /* ─── Start / Restart ─── */

    const startPlaying = useCallback(() => {
        phase.current = 'PLAYING';
        scoreRef.current = 0;
        streakRef.current = 0;
        maxStreakRef.current = 0;
        viralTriggered.current = false;
        targetsRef.current = [];
        particlesRef.current = [];
        startTimeRef.current = Date.now();
        lastSpawnRef.current = Date.now();
        setDisplayScore(0);
        setDisplayStreak(0);
        setTimeLeft(30);
        setGamePhase('PLAYING');
    }, []);

    const handleIgnition = () => {
        if (isDev) {
            console.log('[DEV] Bypassing onGameStart — launching immediately');
            startPlaying();
            return;
        }

        onGameStart((ok) => {
            if (!ok) return;
            startPlaying();
        });
    };

    const handleRedeploy = () => {
        startPlaying();
    };

    /* ═══════════════════════════════════════════════════════════════════════════
       RENDER
       ═══════════════════════════════════════════════════════════════════════════ */

    return (
        <div ref={containerRef} className="w-full max-w-4xl mx-auto flex flex-col items-center gap-6 relative" style={{ cursor: 'none' }}>

            {/* ── Canvas ── */}
            <div className="relative w-full aspect-[16/10] border border-cyan-900/60 overflow-hidden bg-black shadow-[0_0_60px_rgba(0,255,255,0.06)]">
                <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full"
                    style={{ width: '100%', height: '100%' }}
                />

                {/* ── IDLE Overlay ── */}
                {gamePhase === 'IDLE' && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
                        <h2
                            className="font-mono font-black text-3xl md:text-5xl tracking-[0.35em] uppercase mb-2"
                            style={{ color: CROSSHAIR_COLOR, textShadow: `0 0 30px ${CROSSHAIR_COLOR}` }}
                        >
                            FIELD MODE
                        </h2>
                        <p className="font-mono text-[11px] text-cyan-400/60 uppercase tracking-[0.2em] mb-10">
                            114 BPM &bull; 30s Round &bull; Neon Diamonds
                        </p>
                        <button
                            onClick={handleIgnition}
                            className="px-10 py-4 font-mono font-bold text-sm tracking-[0.3em] uppercase border-2 border-cyan-500 text-cyan-400 bg-black/80 hover:bg-cyan-500 hover:text-black transition-all duration-200 shadow-[0_0_30px_rgba(0,255,255,0.15)]"
                            style={{ cursor: 'pointer' }}
                        >
                            INITIATE SEQUENCE
                        </button>
                        <p className="font-mono text-[10px] text-white/30 mt-6 uppercase tracking-[0.15em]">
                            Ante: 10 CR &bull; Jackpot at {VIRAL_STREAK} Streak
                        </p>
                    </div>
                )}

                {/* ── GAME OVER Overlay ── */}
                {gamePhase === 'OVER' && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md">
                        <h2
                            className="font-mono font-black text-3xl md:text-4xl tracking-[0.3em] uppercase mb-1"
                            style={{ color: '#FF3333', textShadow: '0 0 20px rgba(255,50,50,0.5)' }}
                        >
                            SIGNAL LOST
                        </h2>
                        <p className="font-mono text-[10px] text-red-400/60 uppercase tracking-[0.2em] mb-8">
                            Connection Terminated
                        </p>

                        <div className="w-full max-w-xs border border-white/15 bg-black/60 mb-8 font-mono text-xs">
                            <div className="flex justify-between p-3 border-b border-white/10">
                                <span className="text-white/40 uppercase tracking-widest">Final Score</span>
                                <span className="text-white font-bold">{finalScore}</span>
                            </div>
                            <div className="flex justify-between p-3 border-b border-white/10">
                                <span className="text-white/40 uppercase tracking-widest">Max Streak</span>
                                <span className="text-cyan-400 font-bold">{maxStreakRef.current}x</span>
                            </div>
                            <div className="flex justify-between p-3">
                                <span className="text-white/40 uppercase tracking-widest">Viral Bonus</span>
                                <span className={viralTriggered.current ? 'text-green-400 font-bold' : 'text-white/30'}>
                                    {viralTriggered.current ? '+25 CR' : '\u2014'}
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={handleRedeploy}
                                className="px-8 py-3 font-mono font-bold text-xs tracking-[0.25em] uppercase border border-cyan-500 text-cyan-400 bg-black hover:bg-cyan-500 hover:text-black transition-all"
                                style={{ cursor: 'pointer' }}
                            >
                                RE-DEPLOY
                            </button>
                            <button
                                onClick={onExit}
                                className="px-8 py-3 font-mono font-bold text-xs tracking-[0.25em] uppercase border border-white/20 text-white/50 bg-black hover:bg-white hover:text-black transition-all"
                                style={{ cursor: 'pointer' }}
                            >
                                EXIT
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Bottom Status Bar ── */}
            {gamePhase === 'PLAYING' && (
                <div className="w-full flex justify-between items-center font-mono text-[10px] text-cyan-500/50 uppercase tracking-[0.2em] px-1">
                    <span>BPM: {BPM}</span>
                    <span>FIELD MODE ACTIVE</span>
                    <span>{timeLeft}s REMAINING</span>
                </div>
            )}

            {/* ── Exit (non-playing) ── */}
            {gamePhase === 'IDLE' && (
                <button
                    onClick={onExit}
                    className="font-mono text-[10px] text-white/30 uppercase tracking-[0.2em] hover:text-white/70 transition-colors mt-2"
                    style={{ cursor: 'pointer' }}
                >
                    &larr; Return to Arcade Hub
                </button>
            )}
        </div>
    );
}
