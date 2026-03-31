'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Cpu, Banknote, History, Zap, Lock,
    Play, Pause, Radio, ChevronLeft, LogOut,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════════════
   TYPE DEFINITIONS
   ═══════════════════════════════════════════════════════════════════════════ */

interface LootEntry {
    id: string;
    type: string;
    text: string;
    color: string;
    shadow: string;
    weight: number;
    action: {
        credits?: number;
        xp?: number;
        item?: string;
        unlockAudio?: boolean;
    } | null;
}

type DialPhase = 'IDLE' | 'SPINNING' | 'RESOLVING' | 'RESOLVED';
type OverclockState = 'IDLE' | 'PROMPTED' | 'SPINNING' | 'RESOLVED';

interface VaultDialModuleProps {
    credits: number;
    /** Deduct the ante atomically. Calls back with success/failure. */
    onSpinStart: (startCallback: (success: boolean) => void) => void;
    /** Fire when a spin (or overclock) fully resolves. Includes final delta and cooldown. */
    onSpinComplete: (data: {
        credits: number;
        xp: number;
        item?: string;
        unlockAudio?: boolean;
        cooldownDuration: number;   // ms — 0 means no lock
        wasOverclock: boolean;
        overclockWin: boolean | null;
    }) => void;
    /** Exit back to lobby */
    onExit: () => void;
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════════════════ */

const ANTE_COST = 15;
const SPINS_PER_CYCLE = 5;
const STANDARD_LOCK_MS = 30 * 60 * 1000;       // 30 min
const OVERCLOCK_PENALTY_MS = 60 * 60 * 1000;   // 60 min (crash penalty)

const LOOT_TABLE: LootEntry[] = [
    { id: 'empty', type: 'BLANK', text: '[ EMPTY SPIN ]', color: 'text-gray-500', shadow: '', weight: 35, action: null },
    { id: 'tax', type: 'TAX', text: '[ SYSTEM TAX : -10 CR ]', color: 'text-red-500 animate-[pulse_0.5s_ease-in-out_infinite]', shadow: 'drop-shadow-[0_0_12px_rgba(239,68,68,0.9)]', weight: 15, action: { credits: -10 } },
    { id: 'payout', type: 'PAYOUT', text: '[ 20 CR PAYOUT ]', color: 'text-cyan-400', shadow: 'drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]', weight: 20, action: { credits: 20 } },
    { id: 'xp', type: 'XP', text: '[ +150 XP BOOST ]', color: 'text-cyan-400', shadow: 'drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]', weight: 15, action: { xp: 150 } },
    { id: 'merch', type: 'MERCH', text: '[ 15% MERCH CODE ]', color: 'text-cyan-400', shadow: 'drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]', weight: 8, action: { item: 'MERCH_CODE_15' } },
    { id: 'audio', type: 'AUDIO', text: '[ UNRELEASED AUDIO ]', color: 'text-cyan-400 animate-pulse', shadow: 'drop-shadow-[0_0_15px_rgba(34,211,238,0.9)]', weight: 5, action: { item: 'DECRYPTED_TRANSMISSION.WAV', unlockAudio: true } },
    { id: 'jackpot', type: 'JACKPOT', text: '[ THE JACKPOT : 100 CR ]', color: 'text-green-400 animate-pulse', shadow: 'drop-shadow-[0_0_20px_rgba(74,222,128,1)]', weight: 2, action: { credits: 100, xp: 500 } },
];

/* ═══════════════════════════════════════════════════════════════════════════
   AUDIO & HAPTICS
   ═══════════════════════════════════════════════════════════════════════════ */

const getAudioCtx = (): AudioContext | null => {
    try {
        return new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch { return null; }
};

const vibrate = (pattern: number | number[]) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(pattern);
};

/** Mechanical gear click — fires every ~40ms during spin */
const playClickSound = () => {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(45, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(10, ctx.currentTime + 0.02);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.02);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.02);
    vibrate(10);
};

/** Brutal low-frequency thud — fires on snap resolve */
const playHeavySnap = () => {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(10, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(1.0, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.3);
    vibrate([50, 50, 50]);
};

/** Overclock engage — aggressive rising saw */
const playOverclockEngage = () => {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(60, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.6, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.4);
    vibrate([20, 20, 20, 20]);
};

/** Overclock crash — descending noise blast */
const playOverclockCrash = () => {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.5);
    gain.gain.setValueAtTime(1.0, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.5);
    vibrate([100, 30, 100, 30, 100]);
};

/** Overclock win — triumphant ascending tone */
const playOverclockWin = () => {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.8, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.6);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.6);
    vibrate([30, 50, 30, 50, 80]);
};


/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT 1: DECRYPTED AUDIO PLAYER (FIELD MODE)
   ═══════════════════════════════════════════════════════════════════════════ */

const DecryptedAudioPlayer: React.FC<{ src?: string }> = ({ src }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [time, setTime] = useState('00:00 / 00:00');

    const fmt = (s: number) => {
        if (isNaN(s) || !isFinite(s)) return '00:00';
        return `${Math.floor(s / 60).toString().padStart(2, '0')}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
    };

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) audioRef.current.pause();
        else audioRef.current.play().catch(() => { });
        setIsPlaying(!isPlaying);
    };

    return (
        <div className="w-full bg-[#050505] border-t border-b border-[#222] p-4 shadow-[inset_0_0_30px_rgba(0,0,0,1),_0_0_20px_rgba(34,211,238,0.05)] relative overflow-hidden">
            {/* CRT scanline overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(34,211,238,0.1) 2px, rgba(0,0,0,1) 4px)' }} />
            <audio
                ref={audioRef}
                src={src || 'https://actions.google.com/sounds/v1/science_fiction/scifi_loop.ogg'}
                onTimeUpdate={() => {
                    if (!audioRef.current) return;
                    const { currentTime: c, duration: d } = audioRef.current;
                    setProgress((c / d) * 100);
                    setTime(`${fmt(c)} / ${fmt(d)}`);
                }}
                onLoadedMetadata={() => audioRef.current && setTime(`00:00 / ${fmt(audioRef.current.duration)}`)}
                onEnded={() => setIsPlaying(false)}
            />

            <div className="flex items-center gap-4 relative z-10">
                <button
                    onClick={togglePlay}
                    className="w-12 h-12 flex-shrink-0 rounded-full bg-gradient-to-b from-[#333] via-[#111] to-[#050505] border border-[#444] flex items-center justify-center text-cyan-400 shadow-[0_4px_10px_rgba(0,0,0,0.8),_inset_0_1px_1px_rgba(255,255,255,0.1)] active:scale-95 transition-all duration-100"
                >
                    {isPlaying ? <Pause className="fill-current w-5 h-5" /> : <Play className="fill-current w-5 h-5 ml-1" />}
                </button>

                <div className="flex-1">
                    <div className="flex justify-between items-end text-[10px] tracking-[0.15em] text-cyan-600 mb-2 font-bold">
                        <span className="flex items-center gap-1"><Radio className="w-3 h-3 animate-pulse" /> INT:DECRYPT</span>
                        <span className="text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]">{time}</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#0a0a0a] rounded-full overflow-hidden border border-[#222] shadow-[inset_0_1px_3px_rgba(0,0,0,1)]">
                        <div className="h-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)] transition-all duration-75 relative" style={{ width: `${progress}%` }}>
                            <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/50 blur-[1px]" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT 2: THE VAULT DIAL (with OVERCLOCK INTERCEPT)
   ═══════════════════════════════════════════════════════════════════════════ */

interface VaultDialProps {
    onSpinStart: () => Promise<boolean>;
    onSpinComplete: (result: LootEntry) => void;
    onOverclockTriggered: (originalResult: LootEntry) => void;
    overclockState: OverclockState;
    overclockDisplayText?: string;
    overclockDisplayColor?: string;
    overclockDisplayShadow?: string;
    isLocked: boolean;
    timeRemaining: string;
    lockLabel: string;
}

const VaultDial: React.FC<VaultDialProps> = ({
    onSpinStart, onSpinComplete, onOverclockTriggered,
    overclockState, overclockDisplayText, overclockDisplayColor, overclockDisplayShadow,
    isLocked, timeRemaining, lockLabel,
}) => {
    const [phase, setPhase] = useState<DialPhase>('IDLE');
    const [displayText, setDisplayText] = useState('[ HOLD TO SPIN : 15 CR ]');
    const [displayColor, setDisplayColor] = useState('text-cyan-500');
    const [displayShadow, setDisplayShadow] = useState('');
    const [ringRotation, setRingRotation] = useState(0);
    const [shake, setShake] = useState(false);

    const loopRef = useRef<number>(0);
    const phaseRef = useRef<DialPhase>('IDLE');
    const isHolding = useRef(false);
    const currentRotation = useRef(0);

    useEffect(() => { phaseRef.current = phase; }, [phase]);

    // ── Sync overclock resolution display back into the dial ──
    useEffect(() => {
        if (overclockState === 'RESOLVED' && overclockDisplayText) {
            setPhase('RESOLVED');
            setDisplayText(overclockDisplayText);
            setDisplayColor(overclockDisplayColor || 'text-cyan-400');
            setDisplayShadow(overclockDisplayShadow || '');
            setShake(true);
            setRingRotation(0);
            setTimeout(() => setShake(false), 400);
        }
    }, [overclockState, overclockDisplayText, overclockDisplayColor, overclockDisplayShadow]);

    // ── High-speed text scramble loop ──
    const executeFastSpin = (speed: number = 20) => {
        let lastTick = performance.now();
        const animateFast = (time: number) => {
            if (phaseRef.current !== 'SPINNING' && phaseRef.current !== 'RESOLVING') return;
            currentRotation.current = (currentRotation.current + speed) % 360;
            setRingRotation(currentRotation.current);
            if (time - lastTick > 40) {
                lastTick = time;
                const rnd = LOOT_TABLE[Math.floor(Math.random() * LOOT_TABLE.length)];
                setDisplayText(rnd.text);
                playClickSound();
            }
            loopRef.current = requestAnimationFrame(animateFast);
        };
        loopRef.current = requestAnimationFrame(animateFast);
    };

    // ── Anti-cheat violent snap resolve ──
    const executeViolentSnap = () => {
        setPhase('RESOLVING');

        // Roll outcome
        const rand = Math.random() * 100;
        let sum = 0;
        let winner = LOOT_TABLE[0];
        for (const item of LOOT_TABLE) {
            sum += item.weight;
            if (rand <= sum) { winner = item; break; }
        }

        const snapDelay = 1000 + Math.random() * 1500;

        setTimeout(() => {
            cancelAnimationFrame(loopRef.current);
            playHeavySnap();

            // ── OVERCLOCK INTERCEPT: credit payouts get intercepted ──
            if (winner.action && winner.action.credits && winner.action.credits > 0 && winner.id !== 'jackpot') {
                // Show the prize briefly, then trigger overclock prompt
                setPhase('RESOLVED');
                setDisplayText(winner.text);
                setDisplayColor(winner.color);
                setDisplayShadow(winner.shadow);
                setShake(true);
                setRingRotation(0);
                setTimeout(() => setShake(false), 400);

                // Delay the overclock prompt by 800ms so player sees their prize
                setTimeout(() => {
                    onOverclockTriggered(winner);
                }, 800);
                return;
            }

            // Standard non-interceptable resolve
            setPhase('RESOLVED');
            setDisplayText(winner.text);
            setDisplayColor(winner.color);
            setDisplayShadow(winner.shadow);
            setShake(true);
            setRingRotation(0);
            onSpinComplete(winner);
            setTimeout(() => setShake(false), 400);

            setTimeout(() => {
                if (!isHolding.current && phaseRef.current === 'RESOLVED') {
                    setPhase('IDLE');
                    setDisplayText('[ HOLD TO SPIN : 15 CR ]');
                    setDisplayColor('text-cyan-500');
                    setDisplayShadow('');
                }
            }, 3000);
        }, snapDelay);
    };

    // ── Public method: start an overclock spin (called by parent) ──
    const startOverclockSpin = useCallback(() => {
        setPhase('SPINNING');
        setDisplayColor('text-yellow-300 blur-[2px]');
        setDisplayShadow('');
        executeFastSpin(40); // 2x speed

        const snapDelay = 800 + Math.random() * 1200;
        setTimeout(() => {
            cancelAnimationFrame(loopRef.current);
            setPhase('RESOLVED');
        }, snapDelay);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Expose startOverclockSpin to parent via ref
    useEffect(() => {
        (window as any).__vaultDialOverclockSpin = startOverclockSpin;
        return () => { delete (window as any).__vaultDialOverclockSpin; };
    }, [startOverclockSpin]);

    const onPointerDown = async (e: React.PointerEvent) => {
        e.preventDefault();
        if ((phase !== 'IDLE' && phase !== 'RESOLVED') || isLocked || overclockState === 'PROMPTED') return;

        isHolding.current = true;
        const authorized = await onSpinStart();
        if (!isHolding.current) return;

        if (!authorized) {
            setShake(true);
            setTimeout(() => setShake(false), 300);
            isHolding.current = false;
            return;
        }

        setPhase('SPINNING');
        setDisplayColor('text-cyan-300 blur-[1px]');
        setDisplayShadow('');
        executeFastSpin();
    };

    const onPointerUp = (e: React.PointerEvent) => {
        e.preventDefault();
        isHolding.current = false;
        if (phaseRef.current === 'SPINNING' && overclockState !== 'SPINNING') {
            executeViolentSnap();
        }
    };

    useEffect(() => () => cancelAnimationFrame(loopRef.current), []);

    // ── Determine inner border color ──
    const isOverclockPrompted = overclockState === 'PROMPTED';
    const innerBorder = (isLocked && phase === 'IDLE')
        ? 'border-red-900/30'
        : isOverclockPrompted
            ? 'border-yellow-500/60 shadow-[inset_0_0_40px_rgba(234,179,8,0.08)]'
            : 'border-[#111]';

    const outerGlow = (phase === 'SPINNING' || phase === 'RESOLVING')
        ? 'opacity-100'
        : isOverclockPrompted
            ? 'opacity-100'
            : 'opacity-0';

    const outerGlowColor = isOverclockPrompted
        ? 'bg-[radial-gradient(circle_at_center,_rgba(234,179,8,0.18)_0%,_transparent_70%)]'
        : 'bg-[radial-gradient(circle_at_center,_rgba(34,211,238,0.15)_0%,_transparent_70%)]';

    return (
        <div className={`relative flex items-center justify-center w-full max-w-[360px] aspect-square mx-auto transition-transform duration-75 ${shake ? 'translate-x-3 translate-y-3' : ''}`}>
            <div
                className="relative w-[85%] h-[85%] rounded-full cursor-pointer touch-none z-20 group"
                onPointerDown={onPointerDown}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
                onContextMenu={(e) => e.preventDefault()}
            >
                {/* ── Outer mechanical ring ── */}
                <div
                    className={`absolute inset-0 rounded-full border-[12px] shadow-[0_0_30px_rgba(0,0,0,1),_inset_0_0_20px_rgba(0,0,0,1)] bg-gradient-to-br from-[#222] via-[#050505] to-[#1a1a1a] ${isOverclockPrompted ? 'border-yellow-900/60 animate-[pulse_1s_ease-in-out_infinite]' : 'border-[#111]'
                        }`}
                    style={{
                        transform: `rotate(${ringRotation}deg)`,
                        transition: phase === 'RESOLVED' ? 'transform 0.1s cubic-bezier(0.175, 0.885, 0.32, 1.275)' : 'none',
                    }}
                >
                    {[...Array(12)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute top-0 left-1/2 w-1 h-4 bg-[#0a0a0a] -ml-[2px] shadow-[0_1px_1px_rgba(255,255,255,0.05)]"
                            style={{ transform: `rotate(${i * 30}deg)`, transformOrigin: '50% 140px' }}
                        />
                    ))}
                </div>

                {/* ── Inner display circle ── */}
                <div className={`absolute inset-[16px] rounded-full bg-[#020202] border ${innerBorder} shadow-[inset_0_0_60px_rgba(0,0,0,1)] flex items-center justify-center overflow-hidden transition-colors duration-500`}>
                    {/* CRT overlay */}
                    <div className="absolute inset-0 pointer-events-none opacity-40 mix-blend-overlay" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(34,211,238,0.05) 2px, rgba(0,0,0,0.8) 4px)' }} />

                    <div className="relative px-6 text-center z-10 w-full">
                        {/* ── OVERCLOCK PROMPT: Two stacked buttons ── */}
                        {isOverclockPrompted ? (
                            <div className="flex flex-col gap-3 items-center w-full">
                                <span className="text-[11px] text-yellow-400 tracking-[0.15em] font-bold drop-shadow-[0_0_8px_rgba(234,179,8,0.6)] animate-pulse mb-1">
                                    OVERCLOCK INTERCEPTED
                                </span>
                                {/* These buttons are handled by the parent via data attributes */}
                                <button
                                    data-vault-action="secure"
                                    className="w-full py-2.5 px-4 text-[12px] font-black tracking-[0.15em] uppercase rounded-sm bg-gradient-to-b from-[#333] via-[#111] to-[#050505] border border-[#444] text-cyan-400 shadow-[0_4px_10px_rgba(0,0,0,0.8),_inset_0_1px_1px_rgba(255,255,255,0.1)] active:scale-95 transition-all duration-100 hover:border-cyan-500/50"
                                >
                                    [ SECURE FUNDS ]
                                </button>
                                <button
                                    data-vault-action="overclock"
                                    className="w-full py-2.5 px-4 text-[12px] font-black tracking-[0.15em] uppercase rounded-sm border border-red-500/40 text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-cyan-400 to-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3),_inset_0_0_15px_rgba(0,0,0,0.8)] active:scale-95 transition-all duration-100 hover:shadow-[0_0_30px_rgba(239,68,68,0.5)] relative overflow-hidden"
                                    style={{ textShadow: '0 0 8px rgba(239,68,68,0.5)' }}
                                >
                                    <span className="relative z-10">[ OVERCLOCK SYSTEM ]</span>
                                    {/* Glitch scan line */}
                                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-red-500/10 to-transparent animate-[scan_2s_linear_infinite] pointer-events-none" />
                                </button>
                            </div>
                        ) : (
                            <span
                                className={`
                  block text-[14px] sm:text-[16px] font-black tracking-[0.1em] uppercase leading-tight transition-all duration-100
                  ${(isLocked && phase === 'IDLE') ? 'text-red-900/60' : displayColor} ${(isLocked && phase === 'IDLE') ? '' : displayShadow}
                  ${phase === 'RESOLVED' ? 'scale-110' : 'scale-100'}
                  ${phase === 'IDLE' && !isLocked ? 'group-hover:text-cyan-400 group-hover:scale-105 group-active:scale-95' : ''}
                `}
                            >
                                {(isLocked && phase === 'IDLE') ? `[ ${lockLabel} : ${timeRemaining} ]` : displayText}
                            </span>
                        )}
                    </div>

                    {/* Inner glow ring */}
                    <div className={`absolute inset-0 pointer-events-none border-4 rounded-full transition-colors duration-300 ${(isLocked && phase === 'IDLE')
                            ? 'border-red-900/10 shadow-[inset_0_0_40px_rgba(153,27,27,0.05)]'
                            : isOverclockPrompted
                                ? 'border-yellow-500/20 shadow-[inset_0_0_40px_rgba(234,179,8,0.08)]'
                                : (phase === 'SPINNING' || phase === 'RESOLVING')
                                    ? 'border-cyan-500/20 shadow-[inset_0_0_40px_rgba(34,211,238,0.1)]'
                                    : 'border-transparent'
                        }`} />
                </div>
            </div>

            {/* Radial glow background */}
            <div className={`absolute inset-0 rounded-full transition-opacity duration-300 pointer-events-none z-10 ${outerGlow} ${outerGlowColor}`} />
        </div>
    );
};


/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT 3: MAIN MODULE (STATE MACHINE + FIREBASE HOOK BRIDGE)
   ═══════════════════════════════════════════════════════════════════════════ */

const VaultDialModule: React.FC<VaultDialModuleProps> = ({
    credits,
    onSpinStart,
    onSpinComplete,
    onExit,
}) => {
    const [localCredits, setLocalCredits] = useState(credits);
    const [xp, setXp] = useState(0);
    const [inventory, setInventory] = useState<string[]>([]);
    const [unlockedAudio, setUnlockedAudio] = useState(false);

    // ── Spin economy ──
    const [spinsRemaining, setSpinsRemaining] = useState(SPINS_PER_CYCLE);
    const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
    const [timeRemaining, setTimeRemaining] = useState('');
    const [isLocked, setIsLocked] = useState(false);
    const [lockLabel, setLockLabel] = useState('SYSTEM LOCK');

    // ── Overclock state ──
    const [overclockState, setOverclockState] = useState<OverclockState>('IDLE');
    const [pendingResult, setPendingResult] = useState<LootEntry | null>(null);
    const [overclockDisplayText, setOverclockDisplayText] = useState('');
    const [overclockDisplayColor, setOverclockDisplayColor] = useState('');
    const [overclockDisplayShadow, setOverclockDisplayShadow] = useState('');

    // ── Screen flash ──
    const [screenFlash, setScreenFlash] = useState<'none' | 'red' | 'green'>('none');

    // ── Status & Log ──
    const [statusMsg, setStatusMsg] = useState('VAULT SECURE. AWAITING INPUT.');
    const [statusColor, setStatusColor] = useState('text-cyan-500');
    const [log, setLog] = useState<string[]>(['[SYS] CONNECTED TO FIELD NETWORK.']);

    const addLog = (msg: string) => setLog(prev => [msg, ...prev].slice(0, 4));

    // Keep local credits in sync with parent prop
    useEffect(() => { setLocalCredits(credits); }, [credits]);

    // ── Live cooldown timer ──
    useEffect(() => {
        if (!cooldownUntil) { setIsLocked(false); return; }

        const interval = setInterval(() => {
            const now = Date.now();
            if (now >= cooldownUntil) {
                setCooldownUntil(null);
                setSpinsRemaining(SPINS_PER_CYCLE);
                setIsLocked(false);
                setLockLabel('SYSTEM LOCK');
                setStatusMsg('LOCK LIFTED. VAULT SECURE.');
                setStatusColor('text-cyan-500');
            } else {
                setIsLocked(true);
                const diff = Math.ceil((cooldownUntil - now) / 1000);
                const m = Math.floor(diff / 60).toString().padStart(2, '0');
                const s = (diff % 60).toString().padStart(2, '0');
                setTimeRemaining(`${m}:${s}`);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [cooldownUntil]);

    // ── Flash effect auto-clear ──
    useEffect(() => {
        if (screenFlash !== 'none') {
            const t = setTimeout(() => setScreenFlash('none'), 400);
            return () => clearTimeout(t);
        }
    }, [screenFlash]);

    /* ─── SPIN START: deduct ante via Firebase ─── */
    const handleSpinStart = async (): Promise<boolean> => {
        if (isLocked) {
            setStatusMsg('VAULT LOCKED. AWAIT COOLDOWN.');
            setStatusColor('text-red-500');
            return false;
        }

        if (localCredits < ANTE_COST) {
            setStatusMsg('ERROR: INSUFFICIENT FUNDS.');
            setStatusColor('text-red-500');
            addLog('[ERR] TRANSACTION REJECTED.');
            return false;
        }

        if (unlockedAudio) setUnlockedAudio(false);

        // Fire the Firebase transaction hook (async callback pattern)
        return new Promise<boolean>((resolve) => {
            onSpinStart((success) => {
                if (success) {
                    setLocalCredits(prev => prev - ANTE_COST);
                    setStatusMsg('DIAL ENGAGED. ANALYZING...');
                    setStatusColor('text-cyan-400/70');
                    addLog(`[SYS] ANTE DEDUCTED: -${ANTE_COST} CR`);
                } else {
                    setStatusMsg('ERROR: TRANSACTION FAILED.');
                    setStatusColor('text-red-500');
                    addLog('[ERR] FIREBASE TRANSACTION REJECTED.');
                }
                resolve(success);
            });
        });
    };

    /* ─── Calculate cooldown & apply spin decrement ─── */
    const applyCooldownAndSpinDecrement = (forcedCooldown?: number): number => {
        const newSpins = spinsRemaining - 1;
        let cooldownMs = 0;

        if (forcedCooldown) {
            setSpinsRemaining(0);
            cooldownMs = forcedCooldown;
            setCooldownUntil(Date.now() + cooldownMs);
            return cooldownMs;
        }

        if (newSpins <= 0) {
            setSpinsRemaining(0);
            cooldownMs = STANDARD_LOCK_MS;
            setCooldownUntil(Date.now() + cooldownMs);
            addLog(`[SYS] MAXIMUM SPINS REACHED. INITIATING LOCKOUT.`);
        } else {
            setSpinsRemaining(newSpins);
            addLog(`[SYS] ${newSpins} SPINS REMAINING BEFORE LOCKOUT.`);
        }

        return cooldownMs;
    };

    /* ─── STANDARD SPIN COMPLETE (non-intercepted prizes) ─── */
    const handleStandardComplete = (result: LootEntry) => {
        if (!result.action) {
            setStatusMsg('EMPTY SPIN. NO PAYOUT.');
            setStatusColor('text-gray-500');
            addLog('[DATA] EMPTY FRAGMENT.');
            const cooldownMs = applyCooldownAndSpinDecrement();
            onSpinComplete({
                credits: 0, xp: 0,
                cooldownDuration: cooldownMs, wasOverclock: false, overclockWin: null,
            });
            return;
        }

        const parts: string[] = [];
        let creditsDelta = 0;
        let xpDelta = 0;
        let itemGained: string | undefined;
        let audioUnlocked = false;

        if (result.action.credits !== undefined) {
            creditsDelta = result.action.credits;
            setLocalCredits(prev => Math.max(0, prev + creditsDelta));
            if (creditsDelta > 0) { parts.push(`+${creditsDelta} CR`); addLog(`[WIN] SECURED: +${creditsDelta} CR`); }
            else { parts.push(`${creditsDelta} CR TAX`); addLog(`[PENALTY] TAX LEVIED: ${creditsDelta} CR`); }
        }
        if (result.action.xp !== undefined) {
            xpDelta = result.action.xp;
            setXp(prev => prev + xpDelta);
            parts.push(`+${xpDelta} XP`);
            addLog(`[NODE] XP HARVESTED: +${xpDelta} XP`);
        }
        if (result.action.item !== undefined) {
            itemGained = result.action.item;
            setInventory(prev => [...new Set([...prev, itemGained!])]);
            parts.push('FILE UNLOCKED');
            addLog(`[LOOT] ACQUIRED: ${itemGained}`);
        }
        if (result.action.unlockAudio) {
            audioUnlocked = true;
            setUnlockedAudio(true);
            parts.push('TRANSMISSION DECRYPTED');
            addLog('[AUDIO] SECURE CHANNEL OPENED');
        }

        const cooldownMs = applyCooldownAndSpinDecrement();
        if (cooldownMs > 0) parts.push('SYSTEM LOCKED');

        setStatusMsg(`>>> ${parts.join(' | ')} <<<`);
        if (result.id === 'tax') setStatusColor('text-red-500');
        else if (result.id === 'jackpot') setStatusColor('text-green-400');
        else setStatusColor('text-cyan-400');

        onSpinComplete({
            credits: creditsDelta, xp: xpDelta,
            item: itemGained, unlockAudio: audioUnlocked,
            cooldownDuration: cooldownMs, wasOverclock: false, overclockWin: null,
        });
    };

    /* ─── OVERCLOCK INTERCEPT: credit payout detected ─── */
    const handleOverclockTriggered = (originalResult: LootEntry) => {
        setPendingResult(originalResult);
        setOverclockState('PROMPTED');
        setStatusMsg(`>>> ${originalResult.text} — OVERCLOCK AVAILABLE <<<`);
        setStatusColor('text-yellow-400');
        addLog('[SYS] OVERCLOCK INTERCEPT DETECTED. CHOOSE WISELY.');
    };

    /* ─── SECURE FUNDS: take the prize as-is ─── */
    const handleSecure = () => {
        if (!pendingResult || overclockState !== 'PROMPTED') return;

        setOverclockState('IDLE');
        const result = pendingResult;
        setPendingResult(null);

        // Apply standard payout
        handleStandardComplete(result);
    };

    /* ─── OVERCLOCK: 50/50 double-or-nothing ─── */
    const handleOverclock = () => {
        if (!pendingResult || overclockState !== 'PROMPTED') return;

        const originalPrize = pendingResult;
        setOverclockState('SPINNING');
        playOverclockEngage();

        setStatusMsg('>>> OVERCLOCK ENGAGED — STAND BY <<<');
        setStatusColor('text-yellow-300 animate-pulse');
        addLog('[OVERCLOCK] SYSTEM OVERRIDE INITIATED.');

        // Trigger the dial's overclock spin via the window bridge
        if ((window as any).__vaultDialOverclockSpin) {
            (window as any).__vaultDialOverclockSpin();
        }

        // Strict 50/50 resolution after random delay
        const resolveDelay = 1200 + Math.random() * 1800;
        setTimeout(() => {
            const win = Math.random() < 0.5;

            if (win) {
                // ── OVERCLOCK WIN: doubled credits ──
                const doubled = (originalPrize.action?.credits || 0) * 2;
                playOverclockWin();
                setScreenFlash('green');

                setOverclockDisplayText(`[ OVERRIDE SUCCESS : +${doubled} CR ]`);
                setOverclockDisplayColor('text-green-400 animate-pulse');
                setOverclockDisplayShadow('drop-shadow-[0_0_25px_rgba(74,222,128,1)]');
                setOverclockState('RESOLVED');

                setLocalCredits(prev => prev + doubled);
                setXp(prev => prev + 50); // bonus XP for winning overclock
                setStatusMsg(`>>> OVERRIDE SUCCESS: +${doubled} CR | +50 XP <<<`);
                setStatusColor('text-green-400');
                addLog(`[OVERCLOCK WIN] PAYOUT DOUBLED: +${doubled} CR`);

                const cooldownMs = applyCooldownAndSpinDecrement();
                onSpinComplete({
                    credits: doubled, xp: 50,
                    cooldownDuration: cooldownMs, wasOverclock: true, overclockWin: true,
                });
            } else {
                // ── OVERCLOCK CRASH: lose everything + extended lockout ──
                playOverclockCrash();
                setScreenFlash('red');

                setOverclockDisplayText('[ SYSTEM CRITICAL : 0 CR ]');
                setOverclockDisplayColor('text-red-500 animate-[pulse_0.3s_ease-in-out_infinite]');
                setOverclockDisplayShadow('drop-shadow-[0_0_25px_rgba(239,68,68,1)]');
                setOverclockState('RESOLVED');

                setLockLabel('HARDWARE LOCKOUT');
                setStatusMsg('>>> SYSTEM CRITICAL — HARDWARE LOCKOUT <<<');
                setStatusColor('text-red-500');
                addLog('[OVERCLOCK CRASH] PRIZE VOIDED. EXTENDED LOCKOUT.');

                const cooldownMs = applyCooldownAndSpinDecrement(OVERCLOCK_PENALTY_MS);
                onSpinComplete({
                    credits: 0, xp: 0,
                    cooldownDuration: cooldownMs, wasOverclock: true, overclockWin: false,
                });
            }

            setPendingResult(null);

            // Reset overclock state after display
            setTimeout(() => {
                setOverclockState('IDLE');
            }, 4000);

        }, resolveDelay);
    };

    // ── Delegate overclock button clicks from inside the dial ──
    const handleDialClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        const btn = target.closest('[data-vault-action]');
        if (!btn) return;
        const action = btn.getAttribute('data-vault-action');
        if (action === 'secure') handleSecure();
        if (action === 'overclock') handleOverclock();
    };

    return (
        <div
            className="min-h-screen bg-[#050505] text-cyan-400 font-mono select-none flex flex-col items-center justify-between pt-6 pb-12 overflow-hidden relative"
            onClick={handleDialClick}
        >
            {/* ── Screen Flash Overlay ── */}
            <div className={`fixed inset-0 pointer-events-none z-[200] transition-opacity duration-200 ${screenFlash === 'red' ? 'opacity-40 bg-red-600' : screenFlash === 'green' ? 'opacity-30 bg-green-500' : 'opacity-0'
                }`} />

            {/* ── Deep Environment VFX ── */}
            <div className="absolute inset-0 pointer-events-none z-0 bg-[radial-gradient(ellipse_at_center,_transparent_10%,_#050505_90%)]" />
            <div className="absolute inset-0 pointer-events-none z-0 opacity-20 mix-blend-overlay" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(34,211,238,0.03) 2px, rgba(0,0,0,0.8) 4px)' }} />

            {/* ── CSS Keyframes ── */}
            <style>{`
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
      `}</style>

            {/* ═══ HUD HEADER ═══ */}
            <header className="w-full max-w-md px-6 z-10 flex-shrink-0">
                <div className="flex justify-between items-end border-b border-cyan-900 pb-2 mb-4">
                    <div className="flex items-center gap-3">
                        <button onClick={onExit} className="text-cyan-700 hover:text-cyan-400 active:scale-95 transition-all pb-1">
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-black tracking-[0.2em] drop-shadow-[0_0_10px_rgba(34,211,238,0.4)]">
                                VAULT DIAL
                            </h1>
                            <p className="text-[10px] text-cyan-700 tracking-widest flex items-center gap-1 mt-1">
                                <Lock className="w-3 h-3" /> FIELD MODE SECURE
                            </p>
                        </div>
                    </div>
                    <Zap className="w-6 h-6 text-cyan-700" />
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm font-bold">
                    <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-3 rounded-sm flex items-center justify-between shadow-[inset_0_0_15px_rgba(0,0,0,1)]">
                        <span className="text-cyan-800 text-[10px] tracking-widest">CR</span>
                        <span className="text-lg text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.3)] flex items-center gap-2">
                            <Banknote className="w-4 h-4" /> {localCredits}
                        </span>
                    </div>
                    <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-3 rounded-sm flex items-center justify-between shadow-[inset_0_0_15px_rgba(0,0,0,1)]">
                        <span className="text-cyan-800 text-[10px] tracking-widest">XP</span>
                        <span className="text-lg flex items-center gap-2">
                            <Cpu className="w-4 h-4" /> {xp}
                        </span>
                    </div>
                </div>

                <div className={`mt-6 text-center h-4 text-[11px] font-black tracking-[0.1em] ${statusColor} transition-colors duration-300`}>
                    {statusMsg}
                </div>
            </header>

            {/* ═══ MAIN DIAL + HIDDEN AUDIO ═══ */}
            <main className="flex-1 w-full relative min-h-[450px] flex flex-col items-center justify-center overflow-visible">
                <div className={`w-full transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${unlockedAudio ? '-translate-y-12' : 'translate-y-0'}`}>
                    <VaultDial
                        onSpinStart={handleSpinStart}
                        onSpinComplete={handleStandardComplete}
                        onOverclockTriggered={handleOverclockTriggered}
                        overclockState={overclockState}
                        overclockDisplayText={overclockDisplayText}
                        overclockDisplayColor={overclockDisplayColor}
                        overclockDisplayShadow={overclockDisplayShadow}
                        isLocked={isLocked}
                        timeRemaining={timeRemaining}
                        lockLabel={lockLabel}
                    />

                    {isLocked ? (
                        <div className="flex justify-center mt-8 z-10 relative">
                            <button
                                onClick={onExit}
                                className="px-6 py-3 border border-red-900/50 bg-red-900/10 text-red-500 text-xs tracking-[0.2em] font-bold rounded-sm hover:bg-red-900/20 active:scale-95 transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(153,27,27,0.2)]"
                            >
                                <LogOut className="w-4 h-4" /> RETURN TO LOBBY
                            </button>
                        </div>
                    ) : (
                        <p className={`text-center mt-8 text-[10px] tracking-[0.2em] font-bold z-10 transition-colors duration-500 ${unlockedAudio ? 'text-cyan-900/50' : 'text-cyan-800'}`}>
                            PHYSICAL INTERACTION REQUIRED ({spinsRemaining} REMAINING)
                        </p>
                    )}
                </div>

                {/* ── Decrypted Audio Player ── */}
                <div className={`absolute bottom-6 w-full px-4 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${unlockedAudio ? 'opacity-100 translate-y-0 pointer-events-auto scale-100 delay-100' : 'opacity-0 translate-y-8 pointer-events-none scale-95'
                    }`}>
                    <DecryptedAudioPlayer />
                </div>
            </main>

            {/* ═══ SYSTEM LOG FOOTER ═══ */}
            <footer className="w-full max-w-md px-6 z-10 flex-shrink-0 mt-4">
                {inventory.length > 0 && (
                    <div className="mb-4 bg-cyan-900/10 border border-cyan-800/50 p-3 rounded-sm text-[10px] tracking-widest text-cyan-400 flex flex-col gap-2">
                        <span className="font-bold text-cyan-600 border-b border-cyan-900/50 pb-1">SECURE STORAGE:</span>
                        {inventory.map((item, i) => (
                            <span key={i} className="flex items-center gap-2 text-green-400 drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]">
                                <Lock className="w-3 h-3" /> {item}
                            </span>
                        ))}
                    </div>
                )}
                <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-sm p-3 h-28 overflow-hidden flex flex-col justify-end relative shadow-[inset_0_0_20px_rgba(0,0,0,1)]">
                    <div className="absolute top-2 left-2 flex items-center gap-1 text-cyan-800 text-[9px] tracking-[0.2em]">
                        <History className="w-3 h-3" /> TERM_LOG
                    </div>
                    <ul className="text-[10px] text-cyan-600 space-y-1 tracking-wider flex flex-col-reverse">
                        {log.map((entry, i) => (
                            <li key={i} className={i === 0 ? 'text-cyan-400 font-bold' : 'opacity-40'}>
                                {entry}
                            </li>
                        ))}
                    </ul>
                </div>
            </footer>
        </div>
    );
};

export default VaultDialModule;
