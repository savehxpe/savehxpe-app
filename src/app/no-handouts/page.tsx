'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { doc, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const BPM_CONST = 114;
const BEAT_MS = 526.32; // Precisely 60000 / 114
const FALL_DURATION_MS = BEAT_MS * 4; // 4 beats to reach bottom of the track
const HIT_ZONE_Y = 85; // Optimal hit zone at 85% down the track
const HIT_TOLERANCE = 12; // +/- 12% margin of error for rhythm hits

type Target = {
    id: number;
    spawnTime: number;
    hit: boolean;
    missed: boolean;
    y: number; // percentage 0-100 down the track
};

export default function NoHandouts() {
    const router = useRouter();
    const { userDoc, firebaseUser } = useAuth();

    const [gameState, setGameState] = useState<'SELECT' | 'PLAYING' | 'JACKPOT' | 'GAMEOVER'>('SELECT');

    // UI State mirrored from refs
    const [score, setScore] = useState(0);
    const [streak, setStreak] = useState(0);
    const [activeTargets, setActiveTargets] = useState<Target[]>([]);
    const [hitFlash, setHitFlash] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Engine Refs
    const requestRef = useRef<number>(0);
    const targetsRef = useRef<Target[]>([]);
    const lastSpawnTimeRef = useRef<number>(0);
    const gameStartTimeRef = useRef<number>(0);
    const streakRef = useRef<number>(0);
    const scoreRef = useRef<number>(0);
    const jackpotClaimedRef = useRef<boolean>(false);

    // Audio Refs
    const audioCtxRef = useRef<AudioContext | null>(null);
    const backgroundAudioRef = useRef<AudioBufferSourceNode | null>(null);

    // Cleanup Game Loop
    useEffect(() => {
        return () => {
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

                // Live sync Engagement Score equation
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
        if (gameState !== 'PLAYING') return;
        const now = Date.now();

        // Spawn every 2 beats
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

        // Update positions
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

        // Filter out very old hit targets
        targetsRef.current = targetsRef.current.filter(t => !(t.hit && now - t.spawnTime > FALL_DURATION_MS + 1000));

        setActiveTargets([...targetsRef.current]);

        // End Game condition (e.g. 60 seconds survival)
        if (now - gameStartTimeRef.current > 60000 && gameState === 'PLAYING') {
            if (backgroundAudioRef.current) {
                try { backgroundAudioRef.current.stop(); } catch (e) { }
            }
            setGameState('GAMEOVER');
            return;
        }

        requestRef.current = requestAnimationFrame(gameLoop);
    }, [gameState]);

    // Start engine when state turns PLAYING
    useEffect(() => {
        if (gameState === 'PLAYING') {
            requestRef.current = requestAnimationFrame(gameLoop);
        }
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [gameState, gameLoop]);

    const fireWeapon = useCallback(() => {
        if (gameState !== 'PLAYING') return;

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

                // Visual flash
                setHitFlash(true);
                setTimeout(() => setHitFlash(false), 100);

                if (streakRef.current >= 20 && !jackpotClaimedRef.current) {
                    setGameState('JACKPOT');
                    processJackpot();
                }
                break;
            }
        }

        if (!hitMade) {
            streakRef.current = 0;
            setStreak(0);
        }
    }, [gameState]);

    // Keyboard bindings for Desktop
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

    const handlePlay = async () => {
        if (!firebaseUser || !userDoc || isProcessing) return;

        if (userDoc.credits < 10) {
            setErrorMsg('Insufficient credits. 10 CR required to play CASH CALIBER.');
            return;
        }

        setIsProcessing(true);
        setErrorMsg(null);

        try {
            // 1. Force Audio Wake-up
            let audioCtx = audioCtxRef.current;
            if (!audioCtx) {
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                audioCtx = new AudioContextClass();
                audioCtxRef.current = audioCtx;
            }
            await audioCtx.resume();

            let audioBuffer: AudioBuffer | null = null;

            // 3. Asset Verification
            try {
                const { getDownloadURL, ref } = await import('firebase/storage');
                const { storage } = await import('@/lib/firebase');
                const url = await getDownloadURL(ref(storage, "vault/stems/HANDOUT_MASTER.wav"));
                const response = await fetch(url);

                if (!response.ok) {
                    throw new Error(`ASSET 404: HTTP ${response.status}`);
                }

                const arrayBuffer = await response.arrayBuffer();
                audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
            } catch (error) {
                console.error("AudioBuffer Error:", error);
                throw new Error("ASSET 404: HANDOUT_MASTER.wav missing or corrupted.");
            }

            // 2. The 10-Credit Purgatory Fix
            try {
                const userRef = doc(db, 'users', firebaseUser.uid);
                await runTransaction(db, async (transaction) => {
                    const docSnap = await transaction.get(userRef);
                    if (!docSnap.exists()) throw new Error("User does not exist");
                    const currentCredits = docSnap.data().credits || 0;
                    if (currentCredits < 10) throw new Error("Insufficient credits");
                    transaction.update(userRef, { credits: currentCredits - 10 });
                });
            } catch (error) {
                console.error("Ledger Sync DB Error:", error);
                throw new Error("LEDGER SYNC FAILED");
            }

            // Initialization
            setScore(0);
            setStreak(0);
            scoreRef.current = 0;
            streakRef.current = 0;
            jackpotClaimedRef.current = false;
            targetsRef.current = [];
            gameStartTimeRef.current = Date.now() + 1000; // 1s buffer
            lastSpawnTimeRef.current = gameStartTimeRef.current;

            // Start Audio
            if (audioBuffer && audioCtxRef.current) {
                if (backgroundAudioRef.current) {
                    try { backgroundAudioRef.current.stop(); } catch (e) { }
                }
                const source = audioCtxRef.current.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioCtxRef.current.destination);
                source.start(audioCtxRef.current.currentTime + 1); // 1s buffer for engine start
                backgroundAudioRef.current = source;
            }

            setGameState('PLAYING');

        } catch (error: any) {
            console.error('Error starting game:', error);
            setErrorMsg(error?.message || error?.toString() || 'Secure transaction failed due to network lag or insufficient funds.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="bg-black text-white font-display min-h-screen flex flex-col overflow-x-hidden selection:bg-white selection:text-black">
            <header className="w-full border-b border-white/20 px-6 py-4 flex justify-between items-center z-20 bg-black/80 backdrop-blur-sm sticky top-0">
                <div className="flex items-center gap-4 cursor-pointer" onClick={() => router.push('/dashboard')}>
                    <span className="material-symbols-outlined text-2xl">arrow_back</span>
                    <h1 className="font-display font-black text-xl tracking-widest uppercase">Outworld Arcade Hub</h1>
                </div>
                <div className="flex items-center gap-4 border border-white/20 px-4 py-2 bg-white/5">
                    <div className="flex flex-col items-end">
                        <span className="font-mono text-[10px] uppercase tracking-widest text-green-500 font-bold">Credits</span>
                        <div className="font-mono text-sm font-bold tracking-tight">{userDoc?.credits ?? 0} CR</div>
                    </div>
                </div>
            </header>

            <main className="flex-1 w-full flex flex-col items-center justify-center p-4 lg:p-8 relative z-10" onClick={gameState === 'PLAYING' ? fireWeapon : undefined}>

                {/* SELECTOR UI */}
                {gameState === 'SELECT' && (
                    <div className="w-full max-w-5xl">
                        <h2 className="text-3xl font-black uppercase tracking-widest mb-8 text-center border-b border-white/20 pb-4">Mission Selection</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                            {/* ACTIVE SLOT: CASH CALIBER */}
                            <div className="border border-white bg-black/80 p-6 flex flex-col relative group overflow-hidden shadow-[0_0_20px_rgba(255,255,255,0.05)] transition-all hover:border-white hover:shadow-[0_0_40px_rgba(255,255,255,0.2)]">
                                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-5 transition-opacity"></div>
                                <h3 className="text-2xl font-black tracking-widest uppercase mb-2">CASH CALIBER</h3>
                                <p className="font-mono text-xs text-white/50 mb-6 uppercase">The Rhythm Shooter [114 BPM]</p>

                                <div className="mt-auto space-y-4">
                                    <div className="flex justify-between font-mono text-xs border-b border-white/20 pb-2">
                                        <span className="text-slate-400 uppercase">Ante:</span>
                                        <span className="text-white font-bold">10 CR</span>
                                    </div>
                                    <div className="flex justify-between font-mono text-xs border-b border-white/20 pb-2">
                                        <span className="text-green-500 uppercase">Jackpot (20 Streak):</span>
                                        <span className="text-white font-bold">+25 CR | +200 XP</span>
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handlePlay(); }}
                                    disabled={isProcessing}
                                    className={`mt-8 w-full py-4 font-bold tracking-[0.2em] uppercase transition-all border ${isProcessing ? 'bg-white/50 text-black cursor-not-allowed border-white/50' : 'bg-white text-black hover:bg-black hover:text-white border-white'}`}
                                >
                                    {isProcessing ? 'PROCESSING...' : 'Insert Ante'}
                                </button>
                            </div>

                            {/* GATED SLOT 2 */}
                            <div className="border border-white/20 bg-black p-6 flex flex-col relative overflow-hidden h-[360px] blur-[2px] transition-all hover:blur-none hover:border-white/50">
                                <div className="absolute inset-0 scanline-bg opacity-30 pointer-events-none"></div>
                                <div className="absolute inset-0 flex items-center justify-center z-10">
                                    <span className="border border-red-500 text-red-500 bg-black/80 font-mono text-xs px-4 py-2 uppercase tracking-widest font-bold">TRANSMISSION PENDING...</span>
                                </div>
                                <div className="opacity-20 flex flex-col h-full pointer-events-none">
                                    <h3 className="text-2xl font-black tracking-widest uppercase mb-2">SYSTEM.BREACH</h3>
                                    <p className="font-mono text-xs mb-6 uppercase">Stealth Infiltration</p>
                                    <div className="mt-auto w-full h-12 bg-white/20"></div>
                                </div>
                            </div>

                            {/* GATED SLOT 3 */}
                            <div className="border border-white/20 bg-black p-6 flex flex-col relative overflow-hidden h-[360px] blur-[2px] transition-all hover:blur-none hover:border-white/50">
                                <div className="absolute inset-0 scanline-bg opacity-30 pointer-events-none"></div>
                                <div className="absolute inset-0 flex items-center justify-center z-10">
                                    <span className="border border-red-500 text-red-500 bg-black/80 font-mono text-xs px-4 py-2 uppercase tracking-widest font-bold">TRANSMISSION PENDING...</span>
                                </div>
                                <div className="opacity-20 flex flex-col h-full pointer-events-none">
                                    <h3 className="text-2xl font-black tracking-widest uppercase mb-2">VOID DRIFTER</h3>
                                    <p className="font-mono text-xs mb-6 uppercase">Hyper-Space Survival</p>
                                    <div className="mt-auto w-full h-12 bg-white/20"></div>
                                </div>
                            </div>

                        </div>
                    </div>
                )}

                {/* ACTIVE ENGINE */}
                {(gameState === 'PLAYING' || gameState === 'JACKPOT' || gameState === 'GAMEOVER') && (
                    <div className="relative w-full max-w-3xl aspect-[3/4] md:aspect-video border-2 border-white bg-black/90 overflow-hidden flex flex-col items-center">
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
                        <div className="absolute inset-0 flex items-center justify-center overflow-hidden z-10 perspective-[1000px]">
                            {/* Visual Background Metronome Pulse */}
                            <div className="absolute inset-0 bg-white animate-rhythm-pulse pointer-events-none"></div>

                            {/* The Track (Rotated into 2.5D) */}
                            <div className="w-[100px] md:w-[200px] h-[200%] absolute top-[-50%] border-x-2 border-white/20 transform rotateX-60 scale-y-150 origin-bottom flex justify-center" style={{ transform: 'rotateX(55deg) scaleY(1.5)' }}>
                                {/* Grid Lines */}
                                <div className="absolute inset-0 w-full h-full" style={{ backgroundImage: 'linear-gradient(to bottom, transparent 95%, rgba(255,255,255,0.1) 95%)', backgroundSize: '100% 50px' }}></div>

                                {/* Hit Zone Line */}
                                <div className={`absolute w-full h-8 border-y-2 flex items-center justify-center transition-colors ${hitFlash ? 'border-white bg-white/40 shadow-[0_0_20px_white]' : 'border-green-500/50 bg-green-500/10'}`} style={{ top: `${HIT_ZONE_Y}%` }}>
                                    <span className="font-mono text-[8px] text-green-500/80 uppercase tracking-widest">RHYTHM ZONE</span>
                                </div>

                                {/* Active Targets */}
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
                        {gameState === 'JACKPOT' && (
                            <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-500">
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
                                    onClick={(e) => { e.stopPropagation(); setGameState('SELECT'); }}
                                    className="px-8 py-4 bg-white text-black font-bold uppercase tracking-widest transition-all hover:bg-slate-200"
                                >
                                    RETURN TO COMMAND
                                </button>
                            </div>
                        )}

                        {/* GAMEOVER OVERLAY */}
                        {gameState === 'GAMEOVER' && (
                            <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
                                <h1 className="text-4xl md:text-6xl font-black uppercase text-white tracking-widest mb-2 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">MISSION EXPIRED</h1>
                                <p className="font-mono text-white/50 mb-8 uppercase tracking-widest text-xs">CONNECTION TERMINATED</p>

                                {/* Stats Table */}
                                <div className="w-full max-w-sm border border-white/20 bg-black mb-8">
                                    <div className="flex justify-between p-4 border-b border-white/10">
                                        <span className="font-mono text-slate-400 uppercase text-xs">FINAL SCORE</span>
                                        <span className="font-mono text-white font-bold">{score}</span>
                                    </div>
                                    <div className="flex justify-between p-4 border-b border-white/10">
                                        <span className="font-mono text-slate-400 uppercase text-xs">CREDITS EARNED</span>
                                        <span className="font-mono text-white font-bold">0</span>
                                    </div>
                                    <div className="flex justify-between p-4">
                                        <span className="font-mono text-slate-400 uppercase text-xs">XP GAINED</span>
                                        <span className="font-mono text-white font-bold">100</span>
                                    </div>
                                </div>

                                {/* XP FOMO Nudge */}
                                <div className="relative w-full max-w-sm mb-8 rounded-lg overflow-hidden group">
                                    <div className="absolute inset-0 bg-yellow-500/20 blur-md animate-pulse"></div>
                                    <div className="relative border border-yellow-500/50 bg-black/80 p-6 flex flex-col items-center text-center">
                                        <div className="text-yellow-500 flex items-center gap-2 mb-2">
                                            <span className="material-symbols-outlined text-sm">warning</span>
                                            <span className="font-mono text-[10px] font-bold tracking-widest">CITIZEN ALERT</span>
                                        </div>
                                        <p className="font-black text-white uppercase tracking-widest mb-2 text-lg drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]">
                                            YOU LOST OUT ON 50 XP.
                                        </p>
                                        <p className="font-mono text-[10px] text-slate-400 uppercase tracking-widest leading-relaxed">
                                            STANDARD TIER USERS RECEIVE A 1.5x MULTIPLIER ON ALL MISSIONS.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-col md:flex-row gap-4">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); router.push('/ascension'); }}
                                        className="px-8 py-4 bg-yellow-500 text-black font-bold uppercase tracking-widest transition-all hover:bg-yellow-400 hover:shadow-[0_0_20px_rgba(234,179,8,0.5)]"
                                    >
                                        ASCEND TO CLAIM MULTIPLIER
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (backgroundAudioRef.current) try { backgroundAudioRef.current.stop(); } catch (err) { }
                                            setGameState('SELECT');
                                        }}
                                        className="px-8 py-4 bg-transparent text-white font-bold uppercase tracking-widest border border-white/20 transition-all hover:bg-white hover:text-black"
                                    >
                                        Back To Hub
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Desktop Instruction */}
                        {gameState === 'PLAYING' && (
                            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-30 pointer-events-none text-center">
                                <span className="block md:hidden font-mono text-xs uppercase text-white/50 tracking-widest">TAP SCREEN TO FIRE</span>
                                <span className="hidden md:block font-mono text-xs uppercase text-white/50 tracking-widest">PRESS [SPACE] TO FIRE</span>
                            </div>
                        )}
                    </div>
                )}

                {/* ERROR MODAL */}
                {errorMsg && (
                    <div className="absolute inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-300">
                        <div className="border border-red-500 bg-black p-8 max-w-md w-full relative overflow-hidden shadow-[0_0_50px_rgba(239,68,68,0.2)]">
                            <div className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-pulse"></div>
                            <span className="material-symbols-outlined text-red-500 text-6xl mb-6">warning</span>
                            <h2 className="text-3xl font-black text-red-500 uppercase tracking-widest mb-4">Signal Interrupted</h2>
                            <div className="font-mono text-sm text-white/80 mb-8 border border-white/10 bg-white/5 p-4 uppercase">
                                {errorMsg}
                            </div>
                            <button
                                onClick={() => setErrorMsg(null)}
                                className="px-8 py-4 bg-red-500 text-black font-bold uppercase tracking-widest hover:bg-red-400 transition-colors w-full shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                            >
                                Acknowledge
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
