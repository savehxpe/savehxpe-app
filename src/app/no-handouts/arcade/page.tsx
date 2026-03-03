'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { doc, runTransaction, getDocs, collection, query, orderBy, limit, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Canvas, useFrame } from '@react-three/fiber';
import { Instances, Instance } from '@react-three/drei';
import * as THREE from 'three';
import SystemAlert from '@/components/SystemAlert';
import { useSystemStatus } from '@/hooks/useSystemStatus';
import html2canvas from 'html2canvas';
import { QRCodeSVG } from 'qrcode.react';

// --- CONSTANTS ---
const FALL_DURATION_MS = 2000;
const HIT_ZONE_Y = 85;
const HIT_TOLERANCE = 12;

// --- 3D CORRIDOR: Instanced Mesh for mobile performance ---
function InstancedCorridor({ isPro }: { isPro: boolean }) {
    const color = isPro ? '#aaaaaa' : '#00ffff'; // Monochrome for PRO, Cyan for STANDARD
    const instancesRef = useRef<THREE.InstancedMesh>(null);

    useFrame((state) => {
        if (instancesRef.current) {
            // Move corridor towards camera to simulate speed
            instancesRef.current.position.z = (state.clock.elapsedTime * (isPro ? 25 : 15)) % 10;
        }
    });

    return (
        <Instances ref={instancesRef} limit={100} range={100}>
            <boxGeometry args={[0.5, 20, 0.5]} />
            <meshBasicMaterial color={color} wireframe={true} />
            {Array.from({ length: 100 }).map((_, i) => (
                <Instance
                    key={i}
                    position={[
                        (i % 2 === 0 ? -6 : 6),
                        (Math.random() - 0.5) * 15,
                        -Math.floor(i / 2) * 5
                    ]}
                />
            ))}
        </Instances>
    );
}

type EngineTarget = {
    id: number; spawnTime: number; hit: boolean; missed: boolean; y: number;
};

type LeaderboardEntry = {
    id: string; displayName: string; engagementScore: number; xp: number; viralStreak: number;
};

export default function ArcadeMissionSector() {
    const router = useRouter();
    const { userDoc, firebaseUser } = useAuth();
    const { systemStatus } = useSystemStatus();

    // UI States
    const [gameState, setGameState] = useState<'DASHBOARD' | 'STITCH' | 'PLAYING' | 'JACKPOT' | 'GAMEOVER' | 'LEADERBOARD'>('DASHBOARD');
    const [mode, setMode] = useState<'STANDARD' | 'PRO'>('STANDARD');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [rewardModal, setRewardModal] = useState<boolean>(false);
    const [syncBonusModal, setSyncBonusModal] = useState<boolean>(false);
    const [isBroadcasting, setIsBroadcasting] = useState(false);
    const shareCardRef = useRef<HTMLDivElement>(null);

    // Engine States
    const [score, setScore] = useState(0);
    const [streak, setStreak] = useState(0);
    const [activeTargets, setActiveTargets] = useState<EngineTarget[]>([]);
    const [hitFlash, setHitFlash] = useState(false);
    const [telemetry, setTelemetry] = useState({ bpm: 120, latency: 16, engineActive: false, syncRate: "0%" });

    // Leaderboard
    const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);

    // History tracking for precision reward (Screen 5)
    // precision array tracks: [hits, total_spawned] for the last 3 games
    const precisionHistory = useRef<{ hits: number, total: number }[]>([]);

    // Refs for animation & logic
    const reqRef = useRef<number>(0);
    const targetsRef = useRef<EngineTarget[]>([]);
    const lastSpawnRef = useRef<number>(0);
    const gameStartRef = useRef<number>(0);
    const hitsRef = useRef<number>(0);
    const totalSpawnRef = useRef<number>(0);

    const BEAT_MS = mode === 'PRO' ? (60000 / 140) : (60000 / 120);

    // Fetch Leaderboard
    const fetchLeaderboard = async () => {
        try {
            const q = query(collection(db, 'users'), orderBy('engagementScore', 'desc'), limit(10));
            const snap = await getDocs(q);
            const data = snap.docs.map(d => ({
                id: d.id,
                displayName: d.data().displayName || 'UNKNOWN CITIZEN',
                engagementScore: d.data().engagementScore || 0,
                xp: d.data().xp?.total || 0,
                viralStreak: d.data().viralStreakMax || 0
            }));
            setLeaders(data);
        } catch (e) {
            console.error("Leaderboard error:", e);
        }
    };

    const processPrecisionReward = async () => {
        if (!firebaseUser) return;
        try {
            const userRef = doc(db, 'users', firebaseUser.uid);
            await runTransaction(db, async (txn) => {
                const docSnap = await txn.get(userRef);
                const creds = docSnap.data()?.credits || 0;
                txn.update(userRef, {
                    credits: creds + 15,
                    unlocked_assets: arrayUnion('PRECISION_PIONEER_BADGE')
                });
            });
            setRewardModal(true);
            setTimeout(() => setRewardModal(false), 5000); // clear after 5s
        } catch (e) {
            console.error("Precision reward error", e);
        }
    };

    const processRestoreBonus = async () => {
        if (!firebaseUser) return;
        const RESTORE_WINDOW = 60 * 60 * 1000;
        const lastRestored = systemStatus.last_restored_at;

        if (!lastRestored || (Date.now() - lastRestored) > RESTORE_WINDOW) return;
        if (userDoc?.last_sync_bonus_claimed === lastRestored) return;

        try {
            const userRef = doc(db, 'users', firebaseUser.uid);
            await runTransaction(db, async (txn) => {
                const docSnap = await txn.get(userRef);
                const data = docSnap.data();
                if (!data) return;

                if (data.last_sync_bonus_claimed === lastRestored) return;

                const newXp = (data.xp?.total || 0) + 100;
                const eScore = Math.floor(Math.log10(newXp + 1) * 20);

                txn.update(userRef, {
                    'xp.total': newXp,
                    engagementScore: eScore,
                    last_sync_bonus_claimed: lastRestored
                });
            });
            setSyncBonusModal(true);
            setTimeout(() => setSyncBonusModal(false), 5000);
        } catch (e) {
            console.error("Restore bonus error", e);
        }
    };

    const handleMiss = () => {
        setStreak(0);
        setTelemetry(prev => ({ ...prev, syncRate: "LOST" }));
    };

    const handleBroadcast = async () => {
        if (!shareCardRef.current) return;
        setIsBroadcasting(true);
        try {
            const canvas = await html2canvas(shareCardRef.current, { backgroundColor: '#000000', scale: 2 });
            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

            const response = await fetch(dataUrl);
            const blob = await response.blob();
            const file = new File([blob], 'outworld_stats.jpg', { type: 'image/jpeg' });

            if (navigator.share) {
                await navigator.share({
                    title: 'Node Commander Broadcast',
                    text: `My Final Score: ${score} in FIELD MODE. Join my network.`,
                    files: [file]
                });
            } else {
                const link = document.createElement('a');
                link.download = 'outworld_stats.jpg';
                link.href = dataUrl;
                link.click();
            }
        } catch (e) {
            console.error('Broadcast failed:', e);
        } finally {
            setIsBroadcasting(false);
        }
    };

    const gameLoop = useCallback(() => {
        if (gameState !== 'PLAYING') return;
        const now = Date.now();

        // Target Density logic: Pro Mode spawns slightly more frequently (1.3x density simulated by dropping wait time by 30%)
        const densityFactor = mode === 'PRO' ? 0.7 : 1;
        const spawnInterval = (BEAT_MS * 2) * densityFactor;

        if (now - lastSpawnRef.current > spawnInterval) {
            targetsRef.current.push({
                id: Math.random(),
                spawnTime: now,
                hit: false,
                missed: false,
                y: 0
            });
            totalSpawnRef.current += 1;
            lastSpawnRef.current = now;
        }

        let missedThisFrame = false;

        targetsRef.current.forEach(t => {
            if (!t.hit && !t.missed) {
                const elapsed = now - t.spawnTime;
                t.y = (elapsed / FALL_DURATION_MS) * 100;
                if (t.y > 100) {
                    t.missed = true;
                    missedThisFrame = true;
                }
            }
        });

        if (missedThisFrame) handleMiss();

        targetsRef.current = targetsRef.current.filter(t => t.y <= 120 && !(t.hit && now - t.spawnTime > FALL_DURATION_MS + 500));
        setActiveTargets([...targetsRef.current]);

        // Mock telemetry updates for STITCH dev view
        if (Math.random() > 0.9) {
            setTelemetry({
                bpm: mode === 'PRO' ? 140 : 120,
                latency: Math.floor(Math.random() * 5) + 14,
                engineActive: true,
                syncRate: Math.min(100, Math.max(0, (hitsRef.current / (totalSpawnRef.current || 1)) * 100)).toFixed(1) + "%"
            });
        }

        // 30s game timeout
        if (now - gameStartRef.current > 30000) {
            endGame();
            return;
        }

        reqRef.current = requestAnimationFrame(gameLoop);
    }, [gameState, mode, BEAT_MS]);

    const endGame = () => {
        setGameState('GAMEOVER');

        const accuracy = totalSpawnRef.current > 0 ? (hitsRef.current / totalSpawnRef.current) : 0;

        // Track precision history (Screen 5 logic)
        precisionHistory.current.push({ hits: hitsRef.current, total: totalSpawnRef.current });
        if (precisionHistory.current.length > 3) {
            precisionHistory.current.shift(); // keep only last 3
        }

        if (precisionHistory.current.length === 3) {
            const sumHits = precisionHistory.current.reduce((acc, curr) => acc + curr.hits, 0);
            const sumTot = precisionHistory.current.reduce((acc, curr) => acc + curr.total, 0);
            const overallAcc = sumTot > 0 ? (sumHits / sumTot) : 0;
            if (overallAcc >= 0.95) {
                processPrecisionReward();
                precisionHistory.current = []; // reset after reward
            }
        }

        processRestoreBonus();

        setTelemetry(prev => ({ ...prev, engineActive: false }));
    };

    useEffect(() => {
        if (gameState === 'PLAYING') {
            reqRef.current = requestAnimationFrame(gameLoop);
        }
        return () => cancelAnimationFrame(reqRef.current);
    }, [gameState, gameLoop]);

    const fireWeapon = useCallback(() => {
        if (gameState !== 'PLAYING') return;

        const active = targetsRef.current.filter(t => !t.hit && !t.missed);
        let hitMade = false;

        for (const t of active) {
            if (t.y >= HIT_ZONE_Y - HIT_TOLERANCE && t.y <= HIT_ZONE_Y + HIT_TOLERANCE) {
                t.hit = true;
                hitMade = true;
                hitsRef.current += 1;

                setScore(s => s + (mode === 'PRO' ? 15 : 10));
                setStreak(s => {
                    const nextStk = s + 1;
                    if ((mode === 'STANDARD' && nextStk === 20) || (mode === 'PRO' && nextStk === 25)) {
                        triggerJackpot();
                    }
                    return nextStk;
                });

                setHitFlash(true);
                setTimeout(() => setHitFlash(false), 80); // touch latency prioritized visuals
                break;
            }
        }

        if (!hitMade) handleMiss();
    }, [gameState, mode]);

    const triggerJackpot = async () => {
        if (!firebaseUser) return;
        setGameState('JACKPOT');

        try {
            const userRef = doc(db, 'users', firebaseUser.uid);
            await runTransaction(db, async (txn) => {
                const snap = await txn.get(userRef);
                const data = snap.data();
                if (!data) return;

                const curCreds = data.credits || 0;
                const curXp = data.xp?.total || 0;
                const curViral = data.viralStreakMax || 0;

                const xpGain = mode === 'PRO' ? 500 : 200;
                const crGain = mode === 'PRO' ? 50 : 25;

                const newXp = curXp + xpGain;
                const eScore = Math.floor(Math.log10(newXp + 1) * 20);

                txn.update(userRef, {
                    credits: curCreds + crGain,
                    'xp.total': newXp,
                    engagementScore: eScore,
                    viralStreakMax: Math.max(curViral, streak + 1)
                });
            });
        } catch (e) {
            console.error("Jackpot failed:", e);
        }
    };

    const handleStart = async (selectedMode: 'STANDARD' | 'PRO') => {
        if (!firebaseUser || !userDoc || isProcessing || systemStatus.maintenance_mode) return;

        const reqCR = selectedMode === 'STANDARD' ? 10 : 25;
        if (userDoc.credits < reqCR) {
            setErrorMsg(`INSUFFICIENT FUNDS. ${reqCR} CR REQUIRED.`);
            return;
        }

        setIsProcessing(true);
        setErrorMsg(null);

        try {
            const userRef = doc(db, 'users', firebaseUser.uid);
            await runTransaction(db, async (txn) => {
                const snap = await txn.get(userRef);
                const cr = snap.data()?.credits || 0;
                if (cr < reqCR) throw new Error("INSUFFICIENT CREDITS");
                txn.update(userRef, { credits: cr - reqCR });
            });

            // Initialize Game
            setMode(selectedMode);
            setScore(0);
            setStreak(0);
            hitsRef.current = 0;
            totalSpawnRef.current = 0;
            targetsRef.current = [];
            gameStartRef.current = Date.now();
            lastSpawnRef.current = gameStartRef.current;
            setGameState('PLAYING');
            setTelemetry({ bpm: selectedMode === 'PRO' ? 140 : 120, latency: 16, engineActive: true, syncRate: "100%" });

        } catch (e: any) {
            setErrorMsg(e.message || "SYNC ERROR");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className={`min-h-screen flex flex-col overflow-hidden selection:bg-white selection:text-black font-display ${mode === 'PRO' ? 'bg-[#050505]' : 'bg-black'}`}>
            <SystemAlert />
            {/* 3D Wireframe Scene */}
            <div className="absolute inset-0 z-0">
                <Canvas camera={{ position: [0, 2, 5], fov: 75 }}>
                    <ambientLight intensity={0.5} />
                    <InstancedCorridor isPro={mode === 'PRO'} />
                </Canvas>
            </div>

            <header className="w-full border-b border-white/20 px-6 py-4 flex justify-between items-center z-20 bg-black/80 backdrop-blur-md sticky top-0 relative">
                <div className="flex items-center gap-4 cursor-pointer" onClick={() => router.push('/dashboard')}>
                    <span className="material-symbols-outlined text-2xl text-white">arrow_back</span>
                    <h1 className="font-black text-xl tracking-widest uppercase text-white">Arcade Sector</h1>
                </div>
                <div className="flex items-center gap-4 border border-white/20 px-4 py-2 bg-white/5">
                    <div className="flex flex-col items-end">
                        <span className="font-mono text-[10px] uppercase tracking-widest text-green-500 font-bold">Reserves</span>
                        <div className="font-mono text-sm font-bold tracking-tight text-white">{userDoc?.credits ?? 0} CR</div>
                    </div>
                </div>
            </header>

            <main className="flex-1 w-full flex flex-col items-center justify-center p-4 relative z-10" onTouchStart={gameState === 'PLAYING' ? fireWeapon : undefined} onClick={gameState === 'PLAYING' ? fireWeapon : undefined}>

                {/* --- ERROR MODAL --- */}
                {errorMsg && (
                    <div className="absolute inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 text-center">
                        <div className="border border-red-500 bg-black p-8 max-w-md w-full relative shadow-[0_0_50px_rgba(239,68,68,0.2)]">
                            <h2 className="text-2xl font-black text-red-500 uppercase tracking-widest mb-4">ACCESS DENIED</h2>
                            <p className="font-mono text-white/80 mb-6 uppercase">{errorMsg}</p>
                            <button onClick={() => setErrorMsg(null)} className="px-8 py-3 bg-red-500 text-black font-bold uppercase w-full">ACKNOWLEDGE</button>
                        </div>
                    </div>
                )}

                {/* --- 95% PRECISION REWARD MODAL (Screen 5) --- */}
                {rewardModal && (
                    <div className="absolute top-20 right-4 z-50 border border-green-500 bg-black p-4 shadow-[0_0_20px_rgba(34,197,94,0.3)] animate-in slide-in-from-right duration-500">
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-green-500 text-3xl">verified</span>
                            <div className="text-left">
                                <h3 className="text-green-500 font-black tracking-widest uppercase text-sm">Precision Pioneer</h3>
                                <p className="font-mono text-[10px] text-white/80">95% Accuracy x3 Maintained. +15 CR Deposited.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- RE-SYNC BONUS MODAL --- */}
                {syncBonusModal && (
                    <div className="absolute top-36 right-4 z-50 border border-cyan-500 bg-black p-4 shadow-[0_0_20px_rgba(6,182,212,0.3)] animate-in slide-in-from-right duration-500">
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-cyan-400 text-3xl">wifi_protected_setup</span>
                            <div className="text-left">
                                <h3 className="text-cyan-400 font-black tracking-widest uppercase text-sm">RE-SYNC BONUS</h3>
                                <p className="font-mono text-[10px] text-white/80">System Back Online. +100 XP Granted.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- SCREEN 1 & 6: DASHBOARD ENTRY --- */}
                {gameState === 'DASHBOARD' && (
                    <div className="w-full max-w-4xl bg-black/80 backdrop-blur-lg border border-white/20 p-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
                        <div className="flex justify-between items-end border-b border-white/20 pb-4 mb-8 relative z-10">
                            <div>
                                <h2 className="text-4xl font-black uppercase tracking-widest text-white">The Vault</h2>
                                <p className="font-mono text-sm text-cyan-400 mt-1 uppercase">Gated Content & XP Dashboard</p>
                            </div>
                            <button onClick={() => { setGameState('LEADERBOARD'); fetchLeaderboard(); }} className="px-4 py-2 border border-white/20 hover:bg-white hover:text-black transition-colors font-mono text-xs uppercase text-white focus:outline-none">
                                View Leaderboard
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                            {/* STANDARD TIER */}
                            <div className="border border-cyan-500/50 bg-black/60 p-6 flex flex-col group hover:border-cyan-400 transition-all cursor-pointer" onClick={() => handleStart('STANDARD')}>
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-xl font-black tracking-widest text-cyan-400 uppercase">Cash Caliber</h3>
                                    <span className="font-mono text-[10px] bg-cyan-500/20 text-cyan-400 px-2 py-1">120 BPM</span>
                                </div>
                                <p className="font-mono text-xs text-white/50 mb-6 flex-1">Standard viral rhythm loop. Strike accuracy rewards engagement.</p>
                                <div className="flex justify-between font-mono text-xs border-t border-cyan-500/20 pt-4">
                                    <span className="text-white/60">ENTRY ANTE</span>
                                    <span className="text-white font-bold tracking-widest">10 CR</span>
                                </div>
                                <button disabled={isProcessing || systemStatus.maintenance_mode} className={`mt-4 w-full py-3 font-bold uppercase tracking-widest pt-3 transition-all ${systemStatus.maintenance_mode ? 'bg-slate-500 text-slate-300 cursor-not-allowed grayscale' : 'bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500 group-hover:text-black'}`}>
                                    {isProcessing ? 'HANDSHAKE...' : 'INITIATE'}
                                </button>
                            </div>

                            {/* PRO MODE (Screen 6) */}
                            <div className="border border-white/30 bg-[#111] p-6 flex flex-col group hover:border-white transition-all cursor-pointer" onClick={() => handleStart('PRO')}>
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-xl font-black tracking-widest text-white uppercase flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm">military_tech</span>
                                        Field Mode
                                    </h3>
                                    <span className="font-mono text-[10px] bg-white/10 text-white px-2 py-1 uppercase">140 BPM Overdrive</span>
                                </div>
                                <p className="font-mono text-xs text-white/50 mb-6 flex-1">Monochrome targeting. 30% higher node density. Lethal precision required.</p>
                                <div className="flex justify-between font-mono text-xs border-t border-white/20 pt-4">
                                    <span className="text-white/60">ENTRY ANTE</span>
                                    <span className="text-white font-bold tracking-widest">25 CR</span>
                                </div>
                                <button disabled={isProcessing || systemStatus.maintenance_mode} className={`mt-4 w-full py-3 font-bold uppercase tracking-widest transition-all ${systemStatus.maintenance_mode ? 'bg-slate-600 text-slate-300 cursor-not-allowed grayscale' : 'bg-white/10 text-white group-hover:bg-white group-hover:text-black'}`}>
                                    {isProcessing ? 'HANDSHAKE...' : 'BREACH PROTOCOL'}
                                </button>
                            </div>
                        </div>

                        {/* NAV TO STITCH DASHBOARD */}
                        <div className="mt-8 pt-4 border-t border-white/10 flex justify-end relative z-10">
                            <button onClick={() => setGameState('STITCH')} className="text-xs font-mono text-white/40 hover:text-white uppercase flex items-center gap-2 tracking-widest">
                                <span className="material-symbols-outlined text-[14px]">terminal</span>
                                Developer Telemetry
                            </button>
                        </div>
                    </div>
                )}

                {/* --- SCREEN 3: STITCH DASHBOARD (TELEMETRY) --- */}
                {gameState === 'STITCH' && (
                    <div className="w-full max-w-3xl border border-green-500/50 bg-black/90 backdrop-blur-md p-6 relative font-mono text-green-500 shadow-[0_0_30px_rgba(34,197,94,0.1)]">
                        <div className="flex justify-between items-center border-b border-green-500/50 pb-4 mb-6">
                            <h2 className="text-xl font-black uppercase tracking-widest flex items-center gap-2">
                                <span className="material-symbols-outlined">network_check</span>
                                Stitch Architecture Monitor
                            </h2>
                            <button onClick={() => setGameState('DASHBOARD')} className="bg-green-500/20 px-3 py-1 flex items-center hover:bg-green-500 hover:text-black uppercase text-xs">Return</button>
                        </div>

                        <div className="grid grid-cols-2 gap-6 mb-6">
                            <div className="p-4 border border-green-500/30 bg-green-500/5">
                                <div className="text-[10px] uppercase opacity-60 mb-1">Rhythm Sync (BPM)</div>
                                <div className="text-3xl font-bold">{telemetry.bpm}</div>
                            </div>
                            <div className="p-4 border border-green-500/30 bg-green-500/5">
                                <div className="text-[10px] uppercase opacity-60 mb-1">Input Latency (ms)</div>
                                <div className="text-3xl font-bold">{telemetry.latency}</div>
                            </div>
                            <div className="p-4 border border-green-500/30 bg-green-500/5">
                                <div className="text-[10px] uppercase opacity-60 mb-1">Engine Status</div>
                                <div className="text-xl uppercase font-bold">{telemetry.engineActive ? 'ONLINE' : 'STANDBY'}</div>
                            </div>
                            <div className="p-4 border border-green-500/30 bg-green-500/5">
                                <div className="text-[10px] uppercase opacity-60 mb-1">Current Sync Rate</div>
                                <div className="text-3xl font-bold">{telemetry.syncRate}</div>
                            </div>
                        </div>

                        <div className="bg-black/50 p-4 border border-green-500/20 text-xs text-green-500/70">
                            &gt; SYSTEM READY. Geometry maps dynamically fetched from preview_1299.png index.<br />
                            &gt; Touch latency optimized for 16ms hit tolerance.<br />
                            &gt; Atomic transactions strictly enforced.
                        </div>
                    </div>
                )}

                {/* --- SCREEN 4: LEADERBOARD --- */}
                {gameState === 'LEADERBOARD' && (
                    <div className="w-full max-w-3xl border border-white/20 bg-black/95 p-8 relative">
                        <div className="flex justify-between items-center border-b border-white/20 pb-4 mb-6">
                            <h2 className="text-2xl font-black uppercase tracking-widest text-white">Perfect Strike Leaderboard</h2>
                            <button onClick={() => setGameState('DASHBOARD')} className="px-3 py-1 border border-white/30 text-white font-mono text-xs hover:bg-white hover:text-black uppercase">Close</button>
                        </div>
                        <div className="font-mono text-xs text-white/50 mb-6 uppercase border border-white/10 p-2">
                            Ranking Algorithm: E = log10(XP_total + 1) * 20
                        </div>
                        <div className="space-y-2">
                            {leaders.length === 0 ? (
                                <div className="text-center font-mono py-8 text-white/50 uppercase">No Data Found</div>
                            ) : leaders.map((citizen, idx) => (
                                <div key={citizen.id} className="flex justify-between items-center p-3 border border-white/10 hover:border-cyan-500 bg-white/5 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <span className="font-mono text-white/40 w-4">{idx + 1}.</span>
                                        <span className="font-black tracking-widest uppercase text-white">{citizen.displayName}</span>
                                    </div>
                                    <div className="flex items-center gap-6 font-mono text-xs">
                                        <span className="text-cyan-400">Streak: {citizen.viralStreak}</span>
                                        <span className="text-green-400 font-bold bg-green-500/10 px-2 py-1">Score: {citizen.engagementScore}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- GAME ENGINE UI --- */}
                {gameState === 'PLAYING' && (
                    <div className="relative w-full max-w-3xl aspect-[3/4] md:aspect-video border-2 border-white/50 bg-black/40 overflow-hidden flex flex-col items-center backdrop-blur-sm pointer-events-none">
                        {/* HUD */}
                        <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start z-30">
                            <div className="flex flex-col">
                                <span className={`font-mono text-[10px] uppercase ${mode === 'PRO' ? 'text-white/50' : 'text-cyan-500'}`}>Score</span>
                                <span className={`font-black text-2xl font-display ${mode === 'PRO' ? 'text-white' : 'text-cyan-400'}`}>{score}</span>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="font-mono text-[10px] uppercase text-white/50">Streak</span>
                                <span className="font-black text-2xl font-display text-white">{streak}x</span>
                            </div>
                        </div>

                        {/* ENGINE TRACK */}
                        <div className="absolute inset-0 flex items-center justify-center overflow-hidden z-10 perspective-[1000px]">
                            <div className="w-[120px] md:w-[200px] h-[200%] absolute top-[-50%] border-x border-white/30 transform rotateX-60 scale-y-150 flex justify-center" style={{ transform: 'rotateX(55deg) scaleY(1.5)' }}>
                                {/* Track Grid */}
                                <div className="absolute inset-0 w-full h-full" style={{ backgroundImage: `linear-gradient(to bottom, transparent 95%, rgba(255,255,255,0.1) 95%)`, backgroundSize: '100% 40px' }}></div>

                                {/* HIT ZONE */}
                                <div className={`absolute w-full h-8 border-y-2 flex items-center justify-center transition-colors ${hitFlash ? 'border-white bg-white/60 shadow-[0_0_20px_white]' : 'border-white/30 bg-white/5'}`} style={{ top: `${HIT_ZONE_Y}%` }}></div>

                                {/* TARGETS */}
                                {activeTargets.map(t => (
                                    <div
                                        key={t.id}
                                        className={`absolute w-12 h-12 ml-[-24px] left-1/2 transform rotate-45 border-2 transition-all ${t.hit ? 'border-white bg-white opacity-0 scale-150' : (mode === 'PRO' ? 'border-white bg-white/20' : 'border-cyan-400 bg-cyan-400/20')}`}
                                        style={{ top: `${t.y}%`, transition: t.hit ? 'all 0.15s ease-out' : 'none' }}
                                    ></div>
                                ))}
                            </div>
                        </div>

                        {/* DESKTOP/MOBILE BINDING NOTIFICATION */}
                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-30 opacity-50 text-center pointer-events-none">
                            <span className="font-mono text-[10px] uppercase tracking-widest text-white">TAP / CLICK ANYWHERE TO FIRE</span>
                        </div>
                    </div>
                )}

                {/* --- JACKPOT CELEBRATION (SCREEN 7 / FIELD MODE) --- */}
                {gameState === 'JACKPOT' && (
                    <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-500">
                        <div className="border border-white p-12 bg-[#050505] shadow-[0_0_80px_rgba(255,255,255,0.1)] relative overflow-hidden">
                            <div className="absolute inset-0 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 animate-pulse"></div>

                            <span className="material-symbols-outlined text-white text-6xl mb-4">stars</span>
                            <h1 className="text-4xl md:text-5xl font-black uppercase text-white tracking-widest mb-2">BREACH SUCCESS</h1>
                            <p className="font-mono text-white/50 mb-8 uppercase tracking-widest text-xs">Viral Streak Payout Secured</p>

                            <div className="font-mono text-xl border border-white/20 bg-white/5 px-8 py-6 mb-8 text-white grid grid-cols-2 gap-4 divide-x divide-white/20">
                                <div><span className="block text-[10px] text-white/50 mb-1">LEDGER CREDIT</span>+{mode === 'PRO' ? 50 : 25} CR</div>
                                <div><span className="block text-[10px] text-white/50 mb-1">XP BOOST</span>+{mode === 'PRO' ? 500 : 200} XP</div>
                            </div>

                            <button onClick={() => setGameState('DASHBOARD')} className="w-full px-8 py-4 bg-white text-black font-bold uppercase tracking-widest hover:bg-slate-200 transition-colors">
                                RETURN TO COMMAND
                            </button>
                        </div>
                    </div>
                )}

                {/* --- GAMEOVER --- */}
                {gameState === 'GAMEOVER' && (
                    <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
                        <h1 className="text-4xl font-black uppercase text-white tracking-widest mb-2">MISSION EXPIRED</h1>
                        <p className="font-mono text-red-500 mb-8 uppercase tracking-widest text-xs">CONNECTION TERMINATED</p>

                        <div className="w-full max-w-sm border border-white/20 bg-black mb-8">
                            <div className="flex justify-between p-4 border-b border-white/10">
                                <span className="font-mono text-white/50 uppercase text-xs">FINAL SCORE</span>
                                <span className="font-mono text-white font-bold">{score}</span>
                            </div>
                            <div className="flex justify-between p-4 border-b border-white/10">
                                <span className="font-mono text-white/50 uppercase text-xs">MODE</span>
                                <span className="font-mono text-white font-bold">{mode}</span>
                            </div>
                        </div>

                        {/* OFF-SCREEN SHARE CARD TARGET */}
                        <div className="absolute top-[-9999px] left-[-9999px]">
                            <div ref={shareCardRef} className="w-[400px] h-[600px] bg-[#050505] p-8 border-4 border-white flex flex-col items-center justify-center text-center font-display" style={{ fontFamily: "Inter, monospace" }}>
                                <span className="material-symbols-outlined text-white text-5xl mb-4">terminal</span>
                                <h1 className="text-4xl font-black uppercase text-white tracking-widest mb-1">FIELD MODE</h1>
                                <p className="font-mono text-white/50 mb-8 uppercase tracking-widest text-xs border-b border-white/20 pb-4 w-full">Node Commander Broadcast</p>

                                <div className="w-full border border-white/30 bg-black mb-8 flex flex-col items-center p-4">
                                    <div className="flex justify-between w-full p-2 border-b border-white/10">
                                        <span className="font-mono text-white/50 uppercase text-[10px] tracking-widest">RANK</span>
                                        <span className={`font-mono font-bold uppercase text-[10px] tracking-widest ${userDoc?.tier?.current === 'STANDARD' ? 'text-yellow-500' : 'text-slate-400'}`}>
                                            {userDoc?.tier?.current === 'STANDARD' ? 'Gold Commander' : 'Grey Commander'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between w-full p-2 border-b border-white/10">
                                        <span className="font-mono text-white/50 uppercase text-[10px] tracking-widest">FINAL SCORE</span>
                                        <span className="font-mono text-white font-bold text-[10px] tracking-widest">{score}</span>
                                    </div>
                                    <div className="flex justify-between w-full p-2">
                                        <span className="font-mono text-white/50 uppercase text-[10px] tracking-widest">MODE</span>
                                        <span className="font-mono text-white font-bold text-[10px] tracking-widest">{mode}</span>
                                    </div>
                                </div>

                                <div className="bg-white p-3 shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                                    <QRCodeSVG value={`https://savehxpe.com/gateway?ref=${userDoc?.inviteCode || 'null'}`} size={120} />
                                </div>
                                <p className="font-mono text-[9px] text-white/40 mt-6 tracking-[0.3em] uppercase">SCAN TO JOIN SECURE NETWORK</p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-4 w-full max-w-sm">
                            <button onClick={handleBroadcast} disabled={isBroadcasting} className="w-full px-8 py-4 bg-white text-black font-bold uppercase tracking-widest hover:bg-slate-200 transition-all">
                                {isBroadcasting ? 'GENERATING SIGNAL...' : 'BROADCAST RESULTS'}
                            </button>

                            <button onClick={() => setGameState('DASHBOARD')} className="w-full px-8 py-4 bg-transparent border border-white/30 text-white font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all">
                                RETURN TO COMMAND
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
