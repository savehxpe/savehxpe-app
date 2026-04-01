'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES & CONSTANTS
   ═══════════════════════════════════════════════════════════════════════════ */

interface Props {
    credits: number;
    onSpinStart: (cb: (ok: boolean) => void) => void;
    onPayout: (data: { credits: number; xp: number }) => void;
    onExit: () => void;
}

interface MultiplierEntry {
    label: string;
    value: number;
    weight: number;
    color: string;
    glow: string;
}

const ANTE = 15;
const SPIN_DURATION = 2000;

const MULTIPLIERS: MultiplierEntry[] = [
    { label: '0x CRASH',   value: 0,   weight: 60, color: '#FF3333', glow: 'rgba(255,51,51,0.6)' },
    { label: '1.5x',       value: 1.5, weight: 25, color: '#00FFFF', glow: 'rgba(0,255,255,0.6)' },
    { label: '2x',         value: 2,   weight: 10, color: '#FF00FF', glow: 'rgba(255,0,255,0.8)' },
    { label: '5x JACKPOT', value: 5,   weight: 5,  color: '#FFD700', glow: 'rgba(255,215,0,0.9)' },
];

type Phase = 'IDLE' | 'HOLDING' | 'SPINNING' | 'RESULT';

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

export default function VoidRoulette({ credits, onSpinStart, onPayout, onExit }: Props) {
    const [phase, setPhase] = useState<Phase>('IDLE');
    const [displayCredits, setDisplayCredits] = useState(credits);
    const [scramblerText, setScramblerText] = useState('---');
    const [scramblerColor, setScramblerColor] = useState('#00FFFF');
    const [result, setResult] = useState<MultiplierEntry | null>(null);
    const [showCritical, setShowCritical] = useState(false);
    const [holdProgress, setHoldProgress] = useState(0);

    const holdStart = useRef<number>(0);
    const holdAnimRef = useRef<number>(0);
    const spinAnimRef = useRef<number>(0);
    const anteDeducted = useRef(false);

    useEffect(() => { setDisplayCredits(credits); }, [credits]);

    /* ─── RNG Roll ─── */
    const roll = useCallback((): MultiplierEntry => {
        const rand = Math.random() * 100;
        let sum = 0;
        for (const m of MULTIPLIERS) {
            sum += m.weight;
            if (rand <= sum) return m;
        }
        return MULTIPLIERS[0];
    }, []);

    /* ─── Scrambler animation ─── */
    const runScrambler = useCallback((durationMs: number, onDone: (winner: MultiplierEntry) => void) => {
        const start = Date.now();
        const winner = roll();

        const animate = () => {
            const elapsed = Date.now() - start;
            const progress = Math.min(elapsed / durationMs, 1);

            // Slow down over time: interval goes from 40ms to 200ms
            const interval = 40 + progress * 160;
            const rnd = MULTIPLIERS[Math.floor(Math.random() * MULTIPLIERS.length)];

            setScramblerText(rnd.label);
            setScramblerColor(rnd.color);

            if (progress < 1) {
                spinAnimRef.current = window.setTimeout(() => {
                    requestAnimationFrame(animate);
                }, interval) as unknown as number;
            } else {
                // Land on winner
                setScramblerText(winner.label);
                setScramblerColor(winner.color);
                onDone(winner);
            }
        };

        requestAnimationFrame(animate);
    }, [roll]);

    /* ─── Hold button logic ─── */
    const onPointerDown = () => {
        if (phase !== 'IDLE') return;
        if (displayCredits < ANTE) return;

        anteDeducted.current = false;
        holdStart.current = Date.now();
        setPhase('HOLDING');
        setResult(null);
        setShowCritical(false);
        setHoldProgress(0);

        // Animate hold progress bar
        const animateHold = () => {
            const elapsed = Date.now() - holdStart.current;
            const p = Math.min(elapsed / 800, 1); // 800ms to fill
            setHoldProgress(p);

            // Deduct ante at 400ms hold threshold
            if (elapsed > 400 && !anteDeducted.current) {
                anteDeducted.current = true;
                onSpinStart((ok) => {
                    if (!ok) {
                        setPhase('IDLE');
                        setHoldProgress(0);
                        setScramblerText('INSUFFICIENT');
                        setScramblerColor('#FF3333');
                        setTimeout(() => setScramblerText('---'), 1500);
                    }
                });
            }

            // Scramble text while holding
            if (elapsed % 80 < 20) {
                const rnd = MULTIPLIERS[Math.floor(Math.random() * MULTIPLIERS.length)];
                setScramblerText(rnd.label);
                setScramblerColor(rnd.color);
            }

            holdAnimRef.current = requestAnimationFrame(animateHold);
        };
        holdAnimRef.current = requestAnimationFrame(animateHold);
    };

    const onPointerUp = () => {
        cancelAnimationFrame(holdAnimRef.current);

        if (phase !== 'HOLDING') return;

        const held = Date.now() - holdStart.current;

        // Must hold at least 400ms (ante threshold)
        if (held < 400 || !anteDeducted.current) {
            setPhase('IDLE');
            setHoldProgress(0);
            setScramblerText('---');
            setScramblerColor('#00FFFF');
            return;
        }

        // Commit to spin
        setPhase('SPINNING');
        setHoldProgress(1);
        setDisplayCredits(prev => prev - ANTE);

        runScrambler(SPIN_DURATION, (winner) => {
            setResult(winner);
            setPhase('RESULT');
            setHoldProgress(0);

            const payout = Math.floor(ANTE * winner.value);

            if (winner.value >= 2) {
                setShowCritical(true);
                setTimeout(() => setShowCritical(false), 3000);
            }

            if (payout > 0) {
                setDisplayCredits(prev => prev + payout);
                onPayout({ credits: payout, xp: Math.floor(payout * 2) });
            } else {
                onPayout({ credits: 0, xp: 0 });
            }
        });
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            cancelAnimationFrame(holdAnimRef.current);
            clearTimeout(spinAnimRef.current);
        };
    }, []);

    /* ─── Payout display ─── */
    const payoutText = result
        ? result.value === 0
            ? 'VOID — 0 CR'
            : `+${Math.floor(ANTE * result.value)} CR`
        : null;

    /* ═══════════════════════════════════════════════════════════════════════════
       RENDER
       ═══════════════════════════════════════════════════════════════════════════ */

    return (
        <div className="game-viewport w-full max-w-lg mx-auto flex flex-col items-center gap-8 font-mono select-none relative">

            {/* ── CRITICAL WIN popup ── */}
            {showCritical && (
                <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center">
                    <div
                        className="text-center animate-[criticalPop_3s_ease-out_forwards]"
                        style={{ filter: 'drop-shadow(0 0 40px rgba(255,0,255,0.8))' }}
                    >
                        <div className="text-5xl md:text-7xl font-black tracking-[0.3em] uppercase"
                            style={{ color: '#FF00FF', textShadow: '0 0 30px rgba(255,0,255,0.6), 0 0 60px rgba(255,0,255,0.3)' }}>
                            CRITICAL WIN
                        </div>
                        <div className="text-2xl md:text-3xl font-bold mt-2 tracking-[0.2em]"
                            style={{ color: '#00FFFF', textShadow: '0 0 20px rgba(0,255,255,0.5)' }}>
                            {payoutText}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Header ── */}
            <div className="w-full text-center">
                <h2 className="text-3xl md:text-4xl font-black tracking-[0.3em] uppercase"
                    style={{ color: '#00FFFF', textShadow: '0 0 25px rgba(0,255,255,0.4)' }}>
                    VOID ROULETTE
                </h2>
                <p className="text-[11px] text-cyan-400/50 uppercase tracking-[0.2em] mt-1">
                    Hold-to-Override &bull; Multiplier RNG
                </p>
            </div>

            {/* ── Credits HUD ── */}
            <div className="flex gap-6 text-sm">
                <div className="border border-cyan-900/50 bg-black px-5 py-2 flex items-center gap-2">
                    <span className="text-cyan-600 text-[10px] tracking-widest">CR</span>
                    <span className="text-white font-bold text-lg">{displayCredits}</span>
                </div>
                <div className="border border-cyan-900/50 bg-black px-5 py-2 flex items-center gap-2">
                    <span className="text-cyan-600 text-[10px] tracking-widest">ANTE</span>
                    <span className="text-red-400 font-bold text-lg">{ANTE}</span>
                </div>
            </div>

            {/* ── The Scrambler Display ── */}
            <div className="relative w-full border border-cyan-900/60 bg-black overflow-hidden"
                style={{ boxShadow: `0 0 40px ${phase === 'SPINNING' ? 'rgba(0,255,255,0.1)' : 'rgba(0,0,0,0.3)'}` }}>

                {/* Scanlines */}
                <div className="absolute inset-0 pointer-events-none opacity-30"
                    style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,255,0.04) 2px, rgba(0,0,0,0.6) 4px)' }} />

                {/* Scrambler content */}
                <div className="relative z-10 py-16 md:py-20 flex flex-col items-center justify-center">
                    <div
                        className="text-4xl md:text-6xl font-black tracking-[0.15em] uppercase transition-all duration-100"
                        style={{
                            color: scramblerColor,
                            textShadow: `0 0 20px ${scramblerColor}, 0 0 40px ${scramblerColor}40`,
                            filter: phase === 'SPINNING' ? 'blur(0.5px)' : 'none',
                        }}
                    >
                        {scramblerText}
                    </div>

                    {/* Payout line */}
                    {phase === 'RESULT' && result && (
                        <div className="mt-4 text-lg font-bold tracking-[0.2em]"
                            style={{
                                color: result.value === 0 ? '#FF3333' : '#00FF66',
                                textShadow: result.value === 0
                                    ? '0 0 10px rgba(255,51,51,0.5)'
                                    : '0 0 10px rgba(0,255,102,0.5)',
                            }}>
                            {payoutText}
                        </div>
                    )}
                </div>

                {/* Probability strip */}
                <div className="absolute bottom-0 left-0 w-full flex h-1">
                    {MULTIPLIERS.map((m, i) => (
                        <div key={i} style={{ width: `${m.weight}%`, backgroundColor: m.color, opacity: 0.4 }} />
                    ))}
                </div>
            </div>

            {/* ── Hold Progress Bar ── */}
            <div className="w-full h-1.5 bg-cyan-900/20 overflow-hidden">
                <div
                    className="h-full transition-all duration-75"
                    style={{
                        width: `${holdProgress * 100}%`,
                        backgroundColor: holdProgress >= 0.5 ? '#00FFFF' : '#00FFFF80',
                        boxShadow: holdProgress >= 0.5 ? '0 0 10px rgba(0,255,255,0.5)' : 'none',
                    }}
                />
            </div>

            {/* ── The Button ── */}
            <button
                onPointerDown={onPointerDown}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
                onContextMenu={(e) => e.preventDefault()}
                disabled={phase === 'SPINNING'}
                className={`w-full py-5 font-mono font-black text-sm tracking-[0.3em] uppercase border-2 transition-all duration-200 touch-none ${
                    phase === 'SPINNING'
                        ? 'border-cyan-900/30 text-cyan-900/40 bg-black cursor-not-allowed'
                        : phase === 'HOLDING'
                            ? 'border-cyan-400 text-black bg-cyan-400 shadow-[0_0_40px_rgba(0,255,255,0.3)] scale-[0.98]'
                            : phase === 'RESULT' && result && result.value === 0
                                ? 'border-red-500/50 text-red-400 bg-black hover:bg-red-500/10'
                                : 'border-cyan-500/60 text-cyan-400 bg-black hover:bg-cyan-500/10 hover:shadow-[0_0_30px_rgba(0,255,255,0.15)]'
                }`}
                style={{ cursor: phase === 'SPINNING' ? 'not-allowed' : 'pointer' }}
            >
                {phase === 'HOLDING'
                    ? 'OVERRIDING...'
                    : phase === 'SPINNING'
                        ? 'RESOLVING...'
                        : phase === 'RESULT'
                            ? 'HOLD TO OVERRIDE'
                            : 'HOLD TO OVERRIDE'}
            </button>

            {/* ── Odds Table ── */}
            <div className="w-full grid grid-cols-4 gap-2 text-center">
                {MULTIPLIERS.map((m, i) => (
                    <div key={i} className="border border-cyan-900/30 bg-black/50 py-2 px-1">
                        <div className="text-[10px] font-bold tracking-wider" style={{ color: m.color }}>
                            {m.label}
                        </div>
                        <div className="text-[9px] text-white/30 mt-0.5">{m.weight}%</div>
                    </div>
                ))}
            </div>

            {/* ── Exit ── */}
            <button
                onClick={onExit}
                className="font-mono text-[10px] text-white/30 uppercase tracking-[0.2em] hover:text-white/70 transition-colors"
                style={{ cursor: 'pointer' }}
            >
                &larr; Return to Arcade Hub
            </button>

            {/* ── Keyframes ── */}
            <style>{`
                @keyframes criticalPop {
                    0% { opacity: 0; transform: scale(0.5); }
                    15% { opacity: 1; transform: scale(1.1); }
                    30% { transform: scale(1); }
                    80% { opacity: 1; transform: scale(1); }
                    100% { opacity: 0; transform: scale(1.05) translateY(-20px); }
                }
            `}</style>
        </div>
    );
}
