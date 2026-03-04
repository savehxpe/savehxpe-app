'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { doc, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

const BPM_CONST = 114;
const BEAT_MS = 526.32; // Precisely 60000 / 114
const FALL_DURATION_MS = BEAT_MS * 4; // 4 beats to reach bottom of the track
const HIT_ZONE_Y = 85;
const HIT_TOLERANCE = 12;

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

    const requestRef = useRef<number>(0);
    const targetsRef = useRef<Target[]>([]);
    const lastSpawnTimeRef = useRef<number>(0);
    const gameStartTimeRef = useRef<number>(0);
    const streakRef = useRef<number>(0);
    const scoreRef = useRef<number>(0);
    const jackpotClaimedRef = useRef<boolean>(false);

    const backgroundAudioRef = useRef<AudioBufferSourceNode | null>(null);

    // Audio Loading & Initialization
    useEffect(() => {
        let isMounted = true;
        const initEngine = async () => {
            try {
                const response = await fetch(audioSrc);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

                if (!isMounted) return;

                const source = audioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioContext.destination);

                scoreRef.current = 0;
                streakRef.current = 0;
                jackpotClaimedRef.current = false;
                targetsRef.current = [];
                gameStartTimeRef.current = Date.now() + 1000;
                lastSpawnTimeRef.current = gameStartTimeRef.current;

                await audioContext.resume();
                source.start(audioContext.currentTime + 1);
                backgroundAudioRef.current = source;

                setEngineState('PLAYING');
            } catch (err) {
                console.error("Engine failed to initialize audio:", err);
                onExit();
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
            targetsRef.current = targetsRef.current.filter(t => !t.missed);
        }

        targetsRef.current = targetsRef.current.filter(t => !(t.hit && now - t.spawnTime > FALL_DURATION_MS + 1000));
        setActiveTargets([...targetsRef.current]);

        if (now - gameStartTimeRef.current > 60000) {
            if (backgroundAudioRef.current) {
                try { backgroundAudioRef.current.stop(); } catch (e) { }
            }
            setEngineState('GAME_OVER');
            return;
        }

        requestRef.current = requestAnimationFrame(gameLoop);
    }, [engineState]);

    useEffect(() => {
        if (engineState === 'PLAYING') {
            requestRef.current = requestAnimationFrame(gameLoop);
        }
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [engineState, gameLoop]);

    const fireWeapon = useCallback(() => {
        if (engineState !== 'PLAYING') return;

        const active = targetsRef.current.filter(t => !t.hit && !t.missed);
        let hitMade = false;

        for (const t of active) {
            if (t.y >= HIT_ZONE_Y - HIT_TOLERANCE && t.y <= HIT_ZONE_Y + HIT_TOLERANCE) {
                t.hit = true;
                hitMade = true;

                scoreRef.current += 10;
                streakRef.current += 1;

                setScore(scoreRef.current);
                setStreak(streakRef.current);

                setHitFlash(true);
                setTimeout(() => setHitFlash(false), 100);

                if (streakRef.current >= 20 && !jackpotClaimedRef.current) {
                    setEngineState('JACKPOT');
                    processJackpot();
                }
                break;
            }
        }

        if (!hitMade) {
            streakRef.current = 0;
            setStreak(0);
        }
    }, [engineState]);

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
        <div className="relative w-full max-w-3xl aspect-[3/4] md:aspect-video border-2 border-white bg-black/90 overflow-hidden flex flex-col items-center" onClick={fireWeapon}>

            {/* HUD */}
            <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-30 pointer-events-none">
                <div className="flex flex-col">
                    <span className="font-mono text-[10px] uppercase text-white/50">Score</span>
                    <span className="font-black text-2xl md:text-4xl font-display">{score}</span>
                </div>
                <div className="flex flex-col items-end">
                    <span className="font-mono text-[10px] uppercase text-green-500">Streak</span>
                    <span className={`font-black text-2xl md:text-4xl font-display ${streak >= 10 ? 'text-green-400' : 'text-white'}`}>{streak}x</span>
                </div>
            </div>

            {/* ISOMETRIC ENGINE VIEW */}
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden z-10 perspective-[1000px] pointer-events-none">
                <div className="absolute inset-0 bg-white animate-rhythm-pulse"></div>

                <div className="w-[100px] md:w-[200px] h-[200%] absolute top-[-50%] border-x-2 border-white/20 transform rotateX-60 scale-y-150 origin-bottom flex justify-center" style={{ transform: 'rotateX(55deg) scaleY(1.5)' }}>
                    <div className="absolute inset-0 w-full h-full" style={{ backgroundImage: 'linear-gradient(to bottom, transparent 95%, rgba(255,255,255,0.1) 95%)', backgroundSize: '100% 50px' }}></div>

                    <div className={`absolute w-full h-8 border-y-2 flex items-center justify-center transition-colors ${hitFlash ? 'border-white bg-white/40 shadow-[0_0_20px_white]' : 'border-green-500/50 bg-green-500/10'}`} style={{ top: `${HIT_ZONE_Y}%` }}>
                        <span className="font-mono text-[8px] text-green-500/80 uppercase tracking-widest">RHYTHM ZONE</span>
                    </div>

                    {activeTargets.map(t => (
                        <div
                            key={t.id}
                            className={`absolute w-12 h-12 md:w-20 md:h-20 ml-[-24px] md:ml-[-40px] left-1/2 transform rotate-45 border-2 transition-opacity ${t.hit ? 'border-white bg-white/80 scale-150 opacity-0' : 'border-red-500 bg-black/80'}`}
                            style={{
                                top: `${t.y}%`,
                                transition: t.hit ? 'all 0.2s ease-out' : 'none'
                            }}
                        >
                            <div className="absolute inset-2 border border-red-500/50"></div>
                        </div>
                    ))}
                </div>
            </div>

            {/* JACKPOT OVERLAY */}
            {engineState === 'JACKPOT' && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-500 relative pointer-events-auto cursor-auto" onClick={(e) => e.stopPropagation()}>
                    <span className="material-symbols-outlined text-green-400 text-6xl mb-4 animate-bounce">diamond</span>
                    <h1 className="text-4xl md:text-6xl font-black uppercase text-green-400 tracking-widest mb-4">VIRAL STREAK!</h1>
                    <p className="font-mono text-white/80 mb-8 uppercase tracking-widest text-sm max-w-md line-relaxed">
                        You locked onto the frequency perfectly.<br />
                        The payout has been wired directly to your ledger.
                    </p>
                    <div className="font-mono text-xl border border-green-500/50 bg-green-500/10 px-6 py-4 mb-8 text-green-400">
                        +25 CREDITS | +200 XP
                    </div>
                    <button
                        onClick={onExit}
                        className="px-8 py-4 bg-white text-black font-bold uppercase tracking-widest transition-all hover:bg-slate-200"
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
                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-30 pointer-events-none text-center">
                    <span className="block md:hidden font-mono text-xs uppercase text-white/50 tracking-widest">TAP SCREEN TO FIRE</span>
                    <span className="hidden md:block font-mono text-xs uppercase text-white/50 tracking-widest">PRESS [SPACE] TO FIRE</span>
                </div>
            )}
        </div>
    );
}
