'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { doc, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import VaultRainModule from '@/components/VaultRainModule';

export default function NoHandouts() {
    const router = useRouter();
    const { userDoc, firebaseUser } = useAuth();

    const [gameState, setGameState] = useState<'LOBBY' | 'DIAGNOSTIC' | 'PLAYING' | 'GAME_OVER'>('LOBBY');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handlePlay = async () => {
        console.log("[NO-HANDOUTS IGNITION]: handlePlay triggered.");

        if (!firebaseUser) {
            const msg = "NO AUTH: Firebase user is null. Are you signed in?";
            console.error(`[IGNITION FAIL]: ${msg}`);
            setErrorMsg(msg);
            window.alert(`[IGNITION ERROR]: ${msg}`);
            return;
        }
        if (!userDoc) {
            const msg = "NO USER DOC: Firestore document is null. Profile may not exist.";
            console.error(`[IGNITION FAIL]: ${msg}`);
            setErrorMsg(msg);
            window.alert(`[IGNITION ERROR]: ${msg}`);
            return;
        }
        if (gameState === 'DIAGNOSTIC') {
            console.warn("[IGNITION]: Already in DIAGNOSTIC state, ignoring.");
            return;
        }

        if ((userDoc.credits ?? 0) < 10) {
            setErrorMsg('INSUFFICIENT FUNDS: ASCEND OR REFILL LEDGER');
            setGameState('LOBBY');
            return;
        }

        setGameState('PLAYING');
        setErrorMsg(null);
    };

    // ── Firebase Transaction Hooks (The Casino Loop) ──

    /** HOOK 1: The Ante — Deduct 10 CR via atomic runTransaction */
    const handleGameStart = (startCallback: (success: boolean) => void) => {
        if (!firebaseUser || !userDoc) {
            startCallback(false);
            return;
        }

        const userRef = doc(db, 'users', firebaseUser.uid);
        runTransaction(db, async (transaction) => {
            const docSnap = await transaction.get(userRef);
            if (!docSnap.exists()) throw new Error("User document does not exist in Firestore");
            const currentCredits = docSnap.data().credits || 0;
            if (currentCredits < 10) throw new Error("Insufficient credits (race condition)");
            transaction.update(userRef, { credits: currentCredits - 10 });
        })
            .then(() => {
                console.log("[TRANSACTION]: 10 CR ante deducted successfully.");
                startCallback(true);
            })
            .catch((err) => {
                console.error("[TRANSACTION FAIL]:", err);
                setErrorMsg(err instanceof Error ? err.message : String(err));
                startCallback(false);
            });
    };

    /** HOOK 2: Viral Streak Jackpot — Push +25 CR, +200 XP via runTransaction */
    const handleViralStreak = (data: { credits: number; xp: number }) => {
        if (!firebaseUser) return;

        const userRef = doc(db, 'users', firebaseUser.uid);
        runTransaction(db, async (transaction) => {
            const docSnap = await transaction.get(userRef);
            if (!docSnap.exists()) return;
            const docData = docSnap.data();
            const curCreds = docData.credits || 0;
            const curXp = docData.xp?.total || 0;
            const curViral = docData.viralStreakMax || 0;

            const newXp = curXp + data.xp;
            const eScore = Math.floor(Math.log10(newXp + 1) * 20);

            transaction.update(userRef, {
                credits: curCreds + data.credits,
                'xp.total': newXp,
                engagementScore: eScore,
                viralStreakMax: Math.max(curViral, 20),
            });
        }).catch((err) => console.error("[VIRAL STREAK TRANSACTION FAIL]:", err));
    };

    /** HOOK 3: Game Over — Calculate E = log10(XP + 1) × 20, push telemetry */
    const handleGameOver = (data: { score: number; xp: number; engagement: string; viralReached: boolean }) => {
        if (!firebaseUser) return;

        const userRef = doc(db, 'users', firebaseUser.uid);
        runTransaction(db, async (transaction) => {
            const docSnap = await transaction.get(userRef);
            if (!docSnap.exists()) return;
            const docData = docSnap.data();
            const curXp = docData.xp?.total || 0;

            const newXp = curXp + data.xp;
            const eScore = Math.floor(Math.log10(newXp + 1) * 20);

            transaction.update(userRef, {
                'xp.total': newXp,
                engagementScore: eScore,
            });
        }).catch((err) => console.error("[GAME OVER TRANSACTION FAIL]:", err));
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

            <main className="flex-1 w-full flex flex-col items-center justify-center p-4 lg:p-8 relative z-10">

                {/* ═══ LOBBY: MISSION SELECTION UI ═══ */}
                {(gameState === 'LOBBY' || gameState === 'DIAGNOSTIC') && (
                    <div className="w-full max-w-5xl">
                        <h2 className="text-3xl font-black uppercase tracking-widest mb-8 text-center border-b border-white/20 pb-4">Mission Selection</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                            {/* ─── CARD 1: VAULT RAIN (ACTIVE) ─── */}
                            <div className="border border-cyan-500/60 bg-black/80 p-6 flex flex-col relative group overflow-hidden shadow-[0_0_20px_rgba(0,255,255,0.08)] transition-all hover:border-cyan-400 hover:shadow-[0_0_40px_rgba(0,255,255,0.2)]">
                                <div className="absolute inset-0 bg-cyan-500 opacity-0 group-hover:opacity-5 transition-opacity"></div>
                                <h3 className="text-2xl font-black tracking-widest uppercase mb-2" style={{ color: '#00FFFF', textShadow: '2px 2px 0px #005555' }}>
                                    VAULT RAIN
                                </h3>
                                <p className="font-mono text-xs text-white/50 mb-6 uppercase">High Speed Catcher [16-BIT]</p>

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
                                    disabled={gameState === 'DIAGNOSTIC'}
                                    className={`mt-8 w-full py-4 font-bold tracking-[0.2em] uppercase transition-all border ${gameState === 'DIAGNOSTIC' ? 'bg-white/50 text-black cursor-not-allowed border-white/50' : 'bg-[#0a1628] text-cyan-400 border-cyan-500/50 hover:bg-cyan-500 hover:text-black hover:border-cyan-400'}`}
                                >
                                    {gameState === 'DIAGNOSTIC' ? 'VERIFYING LEDGER...' : 'DROP IN'}
                                </button>
                            </div>

                            {/* ─── CARD 2: SYSTEM.BREACH (LOCKED) ─── */}
                            <div className="border border-white/10 bg-black p-6 flex flex-col relative overflow-hidden min-h-[360px]">
                                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40 pointer-events-none z-0" />
                                <div className="opacity-20 flex flex-col h-full pointer-events-none">
                                    <h3 className="text-2xl font-black tracking-widest uppercase mb-2">SYSTEM.BREACH</h3>
                                    <p className="font-mono text-xs mb-6 uppercase">Stealth Infiltration</p>
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center z-10">
                                    <span className="border border-red-500/60 text-red-500/80 bg-black/90 font-mono text-[11px] px-5 py-2.5 uppercase tracking-[0.2em] font-bold">
                                        Transmission Pending...
                                    </span>
                                </div>
                                <div className="mt-auto relative z-0 opacity-10 pointer-events-none">
                                    <div className="w-full h-11 bg-white/20 rounded-sm" />
                                </div>
                            </div>

                            {/* ─── CARD 3: VOID DRIFTER (LOCKED) ─── */}
                            <div className="border border-white/10 bg-black p-6 flex flex-col relative overflow-hidden min-h-[360px]">
                                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40 pointer-events-none z-0" />
                                <div className="opacity-20 flex flex-col h-full pointer-events-none">
                                    <h3 className="text-2xl font-black tracking-widest uppercase mb-2">VOID DRIFTER</h3>
                                    <p className="font-mono text-xs mb-6 uppercase">Hyper-Space Survival</p>
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center z-10">
                                    <span className="border border-red-500/60 text-red-500/80 bg-black/90 font-mono text-[11px] px-5 py-2.5 uppercase tracking-[0.2em] font-bold">
                                        Transmission Pending...
                                    </span>
                                </div>
                                <div className="mt-auto relative z-0 opacity-10 pointer-events-none">
                                    <div className="w-full h-11 bg-white/20 rounded-sm" />
                                </div>
                            </div>

                        </div>
                    </div>
                )}

                {/* ═══ THE ENGINE — Vault Rain Canvas ═══ */}
                {gameState === 'PLAYING' && (
                    <VaultRainModule
                        credits={userDoc?.credits ?? 0}
                        onGameStart={handleGameStart}
                        onViralStreak={handleViralStreak}
                        onGameOver={handleGameOver}
                        onExit={() => setGameState('LOBBY')}
                    />
                )}

                {/* ═══ ERROR MODAL ═══ */}
                {errorMsg && (
                    <div className="absolute inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 text-center">
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

            {/* ═══ BRAND SEAL FOOTER ═══ */}
            {gameState !== 'PLAYING' && (
                <footer className="w-full text-center py-6 relative z-20 border-t border-white/5 bg-black/80 backdrop-blur-sm">
                    <p className="text-slate-500 text-[10px] font-normal leading-normal uppercase tracking-[0.4em]">© 2026 OUTWORLD LLC.</p>
                </footer>
            )}
        </div>
    );
}
