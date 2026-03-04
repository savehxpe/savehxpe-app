'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { doc, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

const BPM_CONST = 114;
const BEAT_MS = 526.32; // Precisely 60000 / 114
const FALL_DURATION_MS = BEAT_MS * 4; // 4 beats to reach bottom of the track
const HIT_ZONE_Y = 85;
const HIT_TOLERANCE = 12;

const CASH_RAIN_DROPS = Array.from({ length: 60 }).map(() => ({
    left: Math.random() * 100,
    duration: 1 + Math.random() * 2,
    delay: Math.random() * 2
}));

type Target = {
    id: number;
    spawnTime: number;
    hit: boolean;
    missed: boolean;
    y: number;
};

type EngineProps = {
    audioSrc: string;
    audioContext: AudioContext;
    onExit: () => void;
};

export default function CashCaliberEngine({ audioSrc, audioContext, onExit }: EngineProps) {
    const { userDoc, firebaseUser } = useAuth();
    const router = useRouter();

    const [engineState, setEngineState] = useState<'LOADING' | 'PLAYING' | 'JACKPOT' | 'GAME_OVER'>('LOADING');
    const [score, setScore] = useState(0);
    const [streak, setStreak] = useState(0);
    const [activeTargets, setActiveTargets] = useState<Target[]>([]);
    const [hitFlash, setHitFlash] = useState(false);

    // New visual states for 16-bit retro
    const [beatFrame, setBeatFrame] = useState(0);
    const [gunRecoil, setGunRecoil] = useState(false);
    const [comboGlitch, setComboGlitch] = useState(false);

    const [engineError, setEngineError] = useState<string | null>(null);

    const requestRef = useRef<number>(0);
    const targetsRef = useRef<Target[]>([]);
    const lastSpawnTimeRef = useRef<number>(0);
    const gameStartTimeRef = useRef<number>(0);
    const streakRef = useRef<number>(0);
    const scoreRef = useRef<number>(0);
    const jackpotClaimedRef = useRef<boolean>(false);
    const lastBeatRef = useRef<number>(0);

    const backgroundAudioRef = useRef<AudioBufferSourceNode | null>(null);

    // Audio Loading & Initialization
    useEffect(() => {
        let isMounted = true;
        const initEngine = async () => {
            try {
                console.log("[ENGINE]: Fetching audio from:", audioSrc);
                const response = await fetch(audioSrc);
                if (!response.ok) throw new Error(`Audio fetch failed: HTTP ${response.status} ${response.statusText}`);

                const arrayBuffer = await response.arrayBuffer();
                console.log("[ENGINE]: Audio fetched, decoding...", arrayBuffer.byteLength, "bytes");

                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                console.log("[ENGINE]: Audio decoded successfully. Duration:", audioBuffer.duration, "s");

                if (!isMounted) return;

                const source = audioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioContext.destination);

                scoreRef.current = 0;
                streakRef.current = 0;
                jackpotClaimedRef.current = false;
                targetsRef.current = [];
                lastBeatRef.current = 0;
                setBeatFrame(0);
                gameStartTimeRef.current = Date.now() + 1000;
                lastSpawnTimeRef.current = gameStartTimeRef.current;

                await audioContext.resume();
                source.start(audioContext.currentTime + 1);
                backgroundAudioRef.current = source;

                console.log("[ENGINE]: Audio started. Engine state -> PLAYING.");
                setEngineState('PLAYING');
            } catch (err: any) {
                const msg = err?.message || err?.toString() || 'Unknown engine error';
                console.error("[ENGINE FATAL]: Failed to initialize:", msg, err);
                setEngineError(msg);

                // FALLBACK: Start the game anyway WITHOUT audio so we can test the canvas
                if (isMounted) {
                    console.warn("[ENGINE FALLBACK]: Starting game without audio.");
                    scoreRef.current = 0;
                    streakRef.current = 0;
                    jackpotClaimedRef.current = false;
                    targetsRef.current = [];
                    lastBeatRef.current = 0;
                    setBeatFrame(0);
                    gameStartTimeRef.current = Date.now() + 1000;
                    lastSpawnTimeRef.current = gameStartTimeRef.current;
                    setEngineState('PLAYING');
                }
            }
        };

        if (engineState === 'LOADING') {
            initEngine();
        }

        return () => {
            isMounted = false;
            if (backgroundAudioRef.current) {
                try { backgroundAudioRef.current.stop(); } catch (e) { }
            }
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, []);

    const processJackpot = async () => {
        if (!firebaseUser || jackpotClaimedRef.current) return;
        jackpotClaimedRef.current = true;

        try {
            const userRef = doc(db, 'users', firebaseUser.uid);
            await runTransaction(db, async (transaction) => {
                const docSnap = await transaction.get(userRef);
                if (!docSnap.exists()) throw "User does not exist";

                const data = docSnap.data();
                const currentCredits = data.credits || 0;
                const currentXp = data.xp?.total || 0;
                const newXp = currentXp + 200;
                const newEngagement = Math.floor(Math.log10(newXp + 1) * 20);

                transaction.update(userRef, {
                    credits: currentCredits + 25,
                    'xp.total': newXp,
                    engagementScore: newEngagement
                });
            });
        } catch (e) {
            console.error("Jackpot drops failed:", e);
        }
    };

    const gameLoop = useCallback(() => {
        if (engineState !== 'PLAYING') return;
        const now = Date.now();

        // Subtly sync the environment exactly every 526ms
        const currentBeat = Math.floor((now - gameStartTimeRef.current) / BEAT_MS);
        if (currentBeat > lastBeatRef.current) {
            lastBeatRef.current = currentBeat;
            setBeatFrame(currentBeat % 4);
        }

        if (now - lastSpawnTimeRef.current > BEAT_MS * 2) {
            targetsRef.current.push({
                id: Math.random(),
                spawnTime: now,
                hit: false,
                missed: false,
                y: 0
            });
            lastSpawnTimeRef.current = now;
        }

        let hasMissed = false;

        targetsRef.current.forEach(t => {
            if (!t.hit && !t.missed) {
                const elapsed = now - t.spawnTime;
                t.y = (elapsed / FALL_DURATION_MS) * 100;

                if (t.y > 100) {
                    t.missed = true;
                    hasMissed = true;
                }
            }
        });

        if (hasMissed) {
            streakRef.current = 0;
            setStreak(0);
            setComboGlitch(true);
            setTimeout(() => setComboGlitch(false), 200);
            targetsRef.current = targetsRef.current.filter(t => !t.missed);
        }

        targetsRef.current = targetsRef.current.filter(t => !(t.hit && now - t.spawnTime > FALL_DURATION_MS + 1000));
        setActiveTargets([...targetsRef.current]);

        if (now - gameStartTimeRef.current > 60000) {
            if (backgroundAudioRef.current) {
                try { backgroundAudioRef.current.stop(); } catch (err) { }
            }
            setEngineState('GAME_OVER');
            return;
        }
    }, [engineState]);

    useEffect(() => {
        if (engineState !== 'PLAYING') return;
        const tick = () => {
            gameLoop();
            requestRef.current = requestAnimationFrame(tick);
        };
        requestRef.current = requestAnimationFrame(tick);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [engineState, gameLoop]);

    const fireWeapon = useCallback(() => {
        if (engineState !== 'PLAYING') return;

        setGunRecoil(true);
        setTimeout(() => setGunRecoil(false), 100);

        const active = targetsRef.current.filter(t => !t.hit && !t.missed);
        let hitMade = false;

        for (const t of active) {
            if (t.y >= HIT_ZONE_Y - HIT_TOLERANCE && t.y <= HIT_ZONE_Y + HIT_TOLERANCE) {
                t.hit = true;
                hitMade = true;

                setHitFlash(true);
                setTimeout(() => setHitFlash(false), 100);
                break;
            }
        }

        if (hitMade) {
            scoreRef.current += 10;
            setScore(scoreRef.current);
            streakRef.current += 1;
            setStreak(streakRef.current);

            if (streakRef.current === 20 && !jackpotClaimedRef.current) {
                jackpotClaimedRef.current = true;
                setEngineState('JACKPOT');
                processJackpot();
            }
        } else {
            streakRef.current = 0;
            setStreak(0);
        }
    }, [engineState, processJackpot]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                e.preventDefault();
                fireWeapon();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [fireWeapon]);

    if (engineState === 'LOADING') {
        return (
            <div className="relative w-full max-w-3xl aspect-[3/4] md:aspect-video border-2 border-white bg-black/90 flex flex-col items-center justify-center p-8 text-center animate-pulse">
                <span className="material-symbols-outlined text-white text-6xl mb-4 animate-spin">sync</span>
                <h2 className="text-2xl font-black uppercase text-white tracking-widest mb-2">Mounting Assets</h2>
                <p className="font-mono text-sm uppercase text-white/50 tracking-widest">Constructing active combat environment...</p>
            </div>
        );
    }

    return (
        <div className="relative w-full max-w-5xl aspect-[16/9] border-2 border-white bg-black/90 overflow-hidden flex flex-col items-center select-none" onClick={fireWeapon}>
            {/* CRT SCANLINE OVERLAY */}
            <div className="absolute inset-0 pointer-events-none z-50 mix-blend-overlay opacity-30 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))]" style={{ backgroundSize: '100% 4px, 3px 100%' }}></div>
            <div className="absolute inset-0 pointer-events-none z-50 shadow-[inset_0_0_150px_rgba(0,0,0,1)]"></div>

            <style>{`
                 @keyframes fall {
                     0% { transform: translateY(-100px) rotate(0deg); }
                     100% { transform: translateY(1000px) rotate(360deg); }
                 }
             `}</style>

            {/* ENGINE ERROR BANNER (visible fallback) */}
            {engineError && (
                <div className="absolute top-0 left-0 right-0 z-[60] bg-red-900/90 border-b-2 border-red-500 px-4 py-2 flex items-center gap-3 pointer-events-none">
                    <span className="material-symbols-outlined text-red-400 text-lg">warning</span>
                    <span className="font-mono text-[10px] text-red-300 uppercase tracking-widest truncate">AUDIO FALLBACK: {engineError}</span>
                </div>
            )}

            {/* PULSING ENVIRONMENT CONTENT */}
            <div className={`absolute inset-0 transition-all duration-[50ms] pointer-events-none ${beatFrame % 2 === 0 ? 'scale-[1.01] brightness-110' : 'scale-100 brightness-100'} bg-[#0a0a1a]`}>
                {/* Background Details */}
                <div className="absolute left-[8%] top-[35%] font-mono text-cyan-400 text-4xl font-bold opacity-60 drop-shadow-[0_0_12px_#22d3ee] border-4 border-cyan-400/50 px-4 py-2 transform -skew-y-3">LOUNGE</div>
                <div className="absolute right-[8%] top-[35%] font-mono text-pink-500 text-3xl font-bold opacity-40 drop-shadow-[0_0_10px_#ec4899] border-4 border-pink-500/30 px-3 py-1 transform skew-y-3 blur-[1px]">XXX</div>

                {/* Brickwall Lines */}
                <div className="absolute inset-0 bg-[linear-gradient(transparent_49%,rgba(255,255,255,0.02)_50%)] bg-[length:100%_20px]"></div>

                {/* Wet Floor Reflection */}
                <div className="absolute bottom-0 w-full h-[45%] bg-gradient-to-t from-[#0d1645] via-[#080d24] to-transparent z-0 overflow-hidden">
                    <div className="absolute inset-0 bg-[linear-gradient(transparent_49%,rgba(34,211,238,0.1)_50%)] bg-[length:100%_4px] transform perspective-[500px] rotateX-[70deg] scale-150 transform-origin-bottom"></div>
                </div>

                {/* Left Dancer on Pole */}
                <div className="absolute left-[20%] bottom-[15%] z-10">
                    <div className="absolute bottom-0 w-[4px] h-[75vh] bg-[#334155] border-x border-[#1e293b] left-1/2 -translate-x-1/2 shadow-[0_0_20px_rgba(34,211,238,0.3)] content-['']"></div>
                    <div className={`relative flex flex-col items-center justify-center transition-transform duration-[50ms] ${beatFrame % 2 === 0 ? '-translate-y-2' : ''} ${beatFrame === 1 ? 'skew-x-2' : beatFrame === 3 ? '-skew-x-2' : ''}`}>
                        <svg width="150" height="350" viewBox="0 0 100 200" className="drop-shadow-[0_0_15px_#22d3ee] filter">
                            <path d="M 50 15 C 55 15, 60 20, 58 28 C 55 35, 45 40, 48 50 C 50 60, 65 65, 60 85 C 58 100, 45 120, 42 160 C 40 170, 45 180, 55 180" fill="black" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M 48 50 C 35 60, 25 75, 30 90" fill="none" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" />
                            <path d="M 55 35 C 75 30, 85 45, 80 65" fill="none" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" />
                        </svg>
                    </div>
                </div>

                {/* Right Dancer on Pole */}
                <div className="absolute right-[20%] bottom-[15%] z-10">
                    <div className="absolute bottom-0 w-[4px] h-[75vh] bg-[#334155] border-x border-[#1e293b] left-1/2 -translate-x-1/2 shadow-[0_0_20px_rgba(34,211,238,0.3)] content-['']"></div>
                    <div className={`relative flex flex-col items-center justify-center transition-transform duration-[50ms] scale-x-[-1] ${beatFrame % 2 === 0 ? '-translate-y-2' : ''} ${beatFrame === 1 ? '-skew-x-2' : beatFrame === 3 ? 'skew-x-2' : ''}`}>
                        <svg width="150" height="350" viewBox="0 0 100 200" className="drop-shadow-[0_0_15px_#22d3ee] filter">
                            <path d="M 50 15 C 55 15, 60 20, 58 28 C 55 35, 45 40, 48 50 C 50 60, 65 65, 60 85 C 58 100, 45 120, 42 160 C 40 170, 45 180, 55 180" fill="black" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M 48 50 C 35 60, 25 75, 30 90" fill="none" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" />
                            <path d="M 55 35 C 75 30, 85 45, 80 65" fill="none" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* UPPER HUD */}
            <div className="absolute top-8 left-8 right-8 flex justify-between items-start z-40 pointer-events-none">
                <div className="w-1/3">
                    <span className="font-mono text-xl md:text-3xl font-bold text-cyan-400 drop-shadow-[0_0_10px_#22d3ee]">SCORE: {score.toString().padStart(4, '0')}</span>
                </div>

                <div className="w-1/3 flex flex-col items-center pt-2">
                    <span className="font-mono text-2xl md:text-4xl font-bold text-yellow-400 drop-shadow-[0_0_10px_#facc15] tracking-widest leading-none mb-2">STREAK: {streak}/20</span>
                    <div className={`w-full max-w-sm h-6 border-4 border-yellow-400/80 p-[2px] flex gap-[2px] ${comboGlitch ? 'opacity-50 blur-[2px] -translate-x-2 translate-y-1' : ''}`}>
                        {Array.from({ length: 20 }).map((_, i) => (
                            <div key={i} className={`h-full flex-1 ${i < streak ? 'bg-yellow-400 shadow-[0_0_5px_#facc15]' : 'bg-transparent'}`}></div>
                        ))}
                    </div>
                </div>

                <div className="w-1/3 flex flex-col items-end">
                    <span className="font-mono text-xl md:text-3xl font-bold text-white drop-shadow-[0_0_8px_white] mb-1">P1</span>
                    <span className="font-mono text-xl md:text-3xl font-bold text-white drop-shadow-[0_0_8px_white]">CREDITS: {userDoc?.credits || 0}</span>
                </div>
            </div>

            {/* LOWER STATS HUD */}
            <div className="absolute bottom-8 right-8 z-40 pointer-events-none flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full transition-all duration-75 ${engineState === 'PLAYING' && beatFrame % 2 === 0 ? 'bg-[#4ade80] shadow-[0_0_20px_#4ade80] scale-110 brightness-150' : engineState === 'PLAYING' ? 'bg-[#4ade80]/60' : 'bg-red-500'}`}></span>
                <span className="font-mono text-2xl md:text-3xl font-bold text-[#4ade80] drop-shadow-[0_0_10px_#4ade80]">SYNC: OK</span>
            </div>

            {/* BOTTOM CENTER HUD */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-40 pointer-events-none flex flex-col items-center">
                <span className="font-mono text-lg md:text-2xl font-bold text-white drop-shadow-[0_0_8px_white] tracking-widest">LEVEL 01</span>
                <span className="font-mono text-lg md:text-2xl font-bold text-white drop-shadow-[0_0_8px_white] tracking-widest">HANDOUT TRACK (114 BPM)</span>
            </div>

            {/* ISOMETRIC ENGINE VIEW */}
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden z-20 perspective-[1000px] pointer-events-none">
                <div className="w-[100px] md:w-[200px] h-[200%] absolute top-[-50%] border-x-2 border-white/10 transform rotateX-60 scale-y-150 origin-bottom flex justify-center" style={{ transform: 'rotateX(55deg) scaleY(1.5)' }}>
                    <div className="absolute inset-0 w-full h-full" style={{ backgroundImage: 'linear-gradient(to bottom, transparent 95%, rgba(255,255,255,0.05) 95%)', backgroundSize: '100% 50px' }}></div>

                    <div className={`absolute w-full h-8 border-y-2 flex items-center justify-center transition-colors ${hitFlash ? 'border-white bg-white/40 shadow-[0_0_20px_white]' : 'border-cyan-500/50 bg-cyan-500/10'}`} style={{ top: `${HIT_ZONE_Y}%` }}>
                        <span className="font-mono text-[8px] text-cyan-400/80 uppercase tracking-widest">RHYTHM ZONE</span>
                    </div>

                    {activeTargets.map(t => (
                        <div
                            key={t.id}
                            className={`absolute transform transition-all ease-out`}
                            style={{
                                top: `${t.y}%`,
                                left: `50%`,
                                marginLeft: `calc(-1.5rem)`, /* half of w-12 */
                                transform: t.hit
                                    ? `translate(${t.id > 0.5 ? '-250px' : '250px'}, -150px) scale(0.5) rotate(${t.id > 0.5 ? '-120deg' : '120deg'})`
                                    : 'scale(1)',
                                opacity: t.hit ? 0 : 1,
                                transitionDuration: t.hit ? '600ms' : '0ms'
                            }}
                        >
                            {t.hit ? (
                                /* 8-bit Glowing Cash Bill Sprite */
                                <div className="w-20 h-10 bg-[#166534] border-[3px] border-[#4ade80] relative shadow-[0_0_25px_#22c55e] transform -skew-x-12">
                                    <div className="absolute inset-1 border-[2px] border-[#4ade80] flex items-center justify-center bg-[#15803d]/50">
                                        <span className="text-xl text-[#4ade80] font-bold font-mono drop-shadow-[0_0_10px_#4ade80]">$</span>
                                    </div>
                                </div>
                            ) : (
                                /* Normal Target (Invisible as gameplay expects hits to spawn bills, but keep for layout) */
                                <div className="opacity-0 w-12 h-12"></div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* FIRST PERSON WEAPON (Money Gun) */}
            <div className="absolute bottom-[-5%] left-1/2 transform -translate-x-1/2 z-30 pointer-events-none scale-125 origin-bottom">
                <div className={`transition-transform duration-[50ms] ease-out flex flex-col items-center ${gunRecoil ? 'translate-y-6 scale-[0.98] rotate-1' : 'translate-y-0 scale-100 rotate-0'}`}>
                    <div className="relative w-32 h-64 bg-[#1e293b] border-4 border-cyan-400/80 shadow-[0_0_30px_rgba(34,211,238,0.3)] transform perspective-[1000px] rotateX-[30deg]">
                        {/* Glowing "MONEY" Decal */}
                        <div className="absolute top-1/2 left-0 transform -translate-y-1/2 -rotate-90 -translate-x-[40px] origin-center font-mono text-3xl font-black italic tracking-widest text-[#22d3ee] drop-shadow-[0_0_15px_#22d3ee]">
                            MONEY
                        </div>
                        {/* Gun Detail Lines */}
                        <div className="absolute top-0 w-full h-8 border-b-4 border-cyan-400/60 bg-[#0f172a] flex justify-center items-center">
                            <div className="w-6 h-2 rounded bg-cyan-300 shadow-[0_0_15px_#67e8f9]"></div>
                        </div>
                        <div className="absolute top-12 left-2 right-2 h-1 bg-[#334155]"></div>
                        <div className="absolute top-16 left-2 right-2 h-1 bg-[#334155]"></div>
                        <div className="absolute top-20 left-2 right-2 h-1 bg-[#334155]"></div>
                        <div className="absolute bottom-0 w-full h-1/3 bg-black/60 border-t-4 border-cyan-400/40"></div>
                    </div>
                </div>
            </div>

            {/* JACKPOT OVERLAY */}
            {engineState === 'JACKPOT' && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-500 pointer-events-auto cursor-auto overflow-hidden text-white border-4 border-yellow-400 shadow-[inset_0_0_50px_#facc15]" onClick={(e) => e.stopPropagation()}>
                    {/* Golden Cash Rain */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                        {CASH_RAIN_DROPS.map((drop, i) => (
                            <div
                                key={i}
                                className="absolute w-4 h-8 bg-yellow-400 border-2 border-yellow-200"
                                style={{
                                    left: `${drop.left}%`,
                                    top: `-10%`,
                                    animation: `fall ${drop.duration}s linear infinite`,
                                    animationDelay: `${drop.delay}s`
                                }}
                            ></div>
                        ))}
                    </div>

                    <span className="material-symbols-outlined text-yellow-400 text-7xl mb-4 animate-bounce relative z-10 shadow-[0_0_30px_#facc15]">diamond</span>
                    <h1 className="text-5xl md:text-7xl font-black font-display uppercase text-yellow-400 tracking-widest mb-4 relative z-10 drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]">JACKPOT!</h1>
                    <p className="font-mono text-white/90 mb-8 uppercase tracking-widest text-sm max-w-md leading-relaxed relative z-10">
                        You locked onto the frequency perfectly.<br />
                        The payout has been wired directly to your ledger.
                    </p>
                    <div className="font-mono text-xl border border-yellow-500/50 bg-yellow-500/20 px-8 py-5 mb-8 text-yellow-300 relative z-10 shadow-[0_0_20px_#ca8a04] animate-pulse">
                        +25 CR | +200 XP
                    </div>
                    <button
                        onClick={onExit}
                        className="px-10 py-5 bg-white text-black font-bold uppercase tracking-widest transition-all hover:bg-slate-200 relative z-10"
                    >
                        RETURN TO COMMAND
                    </button>
                </div>
            )}

            {/* GAMEOVER OVERLAY */}
            {engineState === 'GAME_OVER' && (
                <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500 relative pointer-events-auto cursor-auto" onClick={(e) => e.stopPropagation()}>
                    <h1 className="text-4xl md:text-6xl font-black uppercase text-white tracking-widest mb-2 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">MISSION EXPIRED</h1>
                    <p className="font-mono text-white/50 mb-8 uppercase tracking-widest text-xs">CONNECTION TERMINATED</p>

                    <div className="w-full max-w-sm border border-white/20 bg-black mb-8">
                        <div className="flex justify-between p-4 border-b border-white/10">
                            <span className="font-mono text-slate-400 uppercase text-xs">FINAL SCORE</span>
                            <span className="font-mono text-white font-bold">{score}</span>
                        </div>
                        <div className="flex justify-between p-4 border-b border-white/10">
                            <span className="font-mono text-slate-400 uppercase text-xs">CREDITS EARNED</span>
                            <span className="font-mono text-white font-bold">0</span>
                        </div>
                        <div className="flex justify-between p-4 border-b border-white/10">
                            <span className="font-mono text-slate-400 uppercase text-xs">BASE XP AWARDED</span>
                            <span className="font-mono text-white font-bold">+100 XP</span>
                        </div>
                        <div className="flex justify-between p-4 items-center">
                            <span className="font-mono text-slate-400 uppercase text-xs">XP UNCLAIMED</span>
                            <span className="font-mono text-yellow-600 font-bold blur-[1px] select-none">+50 XP</span>
                        </div>
                    </div>

                    <div className="relative w-full max-w-sm mb-8 rounded-lg overflow-hidden group">
                        <div className="absolute inset-0 bg-yellow-500/20 blur-md animate-pulse"></div>
                        <div className="relative border border-yellow-500/50 bg-black/80 p-6 flex flex-col items-center text-center">
                            <div className="text-yellow-500 flex items-center gap-2 mb-2">
                                <span className="material-symbols-outlined text-sm">warning</span>
                                <span className="font-mono text-[10px] font-bold tracking-widest">CITIZEN ALERT: YOU ARE OPERATING ON A LIMITED FREQUENCY.</span>
                            </div>
                            <p className="font-mono text-[10px] text-slate-400 uppercase tracking-widest leading-relaxed">
                                By remaining on the Free Tier, you just forfeited 50 XP.<br />
                                Standard Tier Citizens receive a 1.5x Multiplier on every mission.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 max-w-sm w-full">
                        <button
                            onClick={() => router.push('/ascension')}
                            className="w-full px-8 py-4 bg-white text-black font-bold uppercase tracking-widest transition-all hover:bg-slate-200"
                        >
                            ASCEND TO STANDARD TIER (1.5x XP)
                        </button>
                        <button
                            onClick={onExit}
                            className="w-full px-8 py-4 bg-transparent text-white font-bold uppercase tracking-widest border border-white/20 transition-all hover:bg-white hover:text-black"
                        >
                            RETURN TO COMMAND CENTER
                        </button>
                    </div>
                </div>
            )}

            {/* Desktop Instruction */}
            {engineState === 'PLAYING' && (
                <div className="absolute bottom-[20%] left-1/2 transform -translate-x-1/2 z-30 pointer-events-none text-center mix-blend-overlay opacity-50">
                    <span className="block md:hidden font-mono text-sm font-bold uppercase text-white tracking-widest drop-shadow-md">TAP SCREEN TO FIRE</span>
                    <span className="hidden md:block font-mono text-sm font-bold uppercase text-white tracking-widest drop-shadow-md">PRESS [SPACE] TO FIRE</span>
                </div>
            )}
        </div>
    );
}
