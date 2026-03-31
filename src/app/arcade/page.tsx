'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { doc, runTransaction, setDoc, serverTimestamp, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import VaultRainModule from '@/components/VaultRainModule';
import VaultDialModule from '@/components/VaultDialModule';
import CashCaliberEngine from '@/components/CashCaliberEngine';

const isDev = process.env.NODE_ENV === 'development';
type GameMode = 'LOBBY' | 'DIAGNOSTIC' | 'VAULT_RAIN' | 'VAULT_DIAL' | 'CASH_CALIBER' | 'GAME_OVER';

export default function ArcadePage() {
    const router = useRouter();
    const { userDoc, firebaseUser } = useAuth();

    const [gameState, setGameState] = useState<GameMode>('LOBBY');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    /* ═══════════════════════════════════════════════════════════════════════
       IGNITION CHECKS (shared by all missions)
       ═══════════════════════════════════════════════════════════════════════ */

    const runPreflight = (minCredits: number): boolean => {
        console.log("[ARCADE IGNITION]: Preflight triggered.");

        if (!firebaseUser) {
            if (isDev) {
                console.warn('[DEV] No firebaseUser — bypassing auth check with mockUID dev-user-001');
                return true;
            }
            console.error('[IGNITION FAIL]: NO AUTH: Firebase user is null.');
            setErrorMsg('NO AUTH: Firebase user is null. Are you signed in?');
            return false;
        }
        if (!userDoc) {
            if (isDev) {
                console.warn('[DEV] No userDoc — bypassing Firestore check');
                return true;
            }
            console.error('[IGNITION FAIL]: NO USER DOC: Firestore document is null.');
            setErrorMsg('NO USER DOC: Firestore document is null. Profile may not exist.');
            return false;
        }
        if (gameState === 'DIAGNOSTIC') {
            console.warn("[IGNITION]: Already in DIAGNOSTIC state, ignoring.");
            return false;
        }
        if ((userDoc.credits ?? 0) < minCredits) {
            if (isDev) {
                console.warn(`[DEV] Insufficient credits (${userDoc.credits ?? 0} < ${minCredits}) — bypassing`);
                return true;
            }
            setErrorMsg(`INSUFFICIENT FUNDS: NEED ${minCredits} CR — ASCEND OR REFILL LEDGER`);
            setGameState('LOBBY');
            return false;
        }
        return true;
    };

    const handlePlayVaultRain = () => {
        if (!runPreflight(10)) return;
        setGameState('VAULT_RAIN');
        setErrorMsg(null);
    };

    const handlePlayVaultDial = () => {
        if (!runPreflight(15)) return;
        setGameState('VAULT_DIAL');
        setErrorMsg(null);
    };

    const handlePlayCashCaliber = () => {
        if (!runPreflight(10)) return;
        setGameState('CASH_CALIBER');
        setErrorMsg(null);
    };

    /* ═══════════════════════════════════════════════════════════════════════
       FIREBASE TRANSACTION HOOKS — VAULT RAIN (Casino Loop)
       ═══════════════════════════════════════════════════════════════════════ */

    /** HOOK 1: The Ante — Deduct 10 CR via atomic runTransaction */
    const handleGameStart = (startCallback: (success: boolean) => void) => {
        if (!firebaseUser || !userDoc) {
            if (isDev) {
                console.warn('[DEV] No auth — skipping Firestore credit deduction, starting game directly');
                startCallback(true);
                return;
            }
            startCallback(false);
            return;
        }

        const uid = firebaseUser.uid;
        if (isDev && uid.startsWith('dev-user')) {
            console.log('[DEV] mockUID detected — bypassing Firestore transaction');
            startCallback(true);
            return;
        }

        const userRef = doc(db, 'users', uid);
        runTransaction(db, async (transaction) => {
            const docSnap = await transaction.get(userRef);
            if (!docSnap.exists()) {
                // Auto-provision new player profile
                await setDoc(userRef, { credits: 50, xp: 0, joinedAt: serverTimestamp() });
                console.log("[TRANSACTION]: New player profile created with 50 CR.");
                return; // skip deduction on first game — they start with 50
            }
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

    /** HOOK 2: Viral Streak Jackpot — Push { credits: 25, xp: 200 } */
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

    /** HOOK 3: Game Over — single atomic increment for XP + credit bonus */
    const handleGameOver = (data: { score: number; xp: number; engagement: string; viralReached: boolean; creditBonus: number }) => {
        if (!firebaseUser) return;

        const userRef = doc(db, 'users', firebaseUser.uid);
        const updates: Record<string, any> = {
            'xp.total': increment(data.xp),
        };
        if (data.creditBonus > 0) {
            updates.credits = increment(data.creditBonus);
        }
        updateDoc(userRef, updates)
            .then(() => console.log(`[GAME OVER]: Saved — XP:+${data.xp}, CR:+${data.creditBonus}`))
            .catch((err) => console.error("[GAME OVER WRITE FAIL]:", err));
    };

    /* ═══════════════════════════════════════════════════════════════════════
       FIREBASE TRANSACTION HOOKS — VAULT DIAL (Spin Economy)
       ═══════════════════════════════════════════════════════════════════════ */

    /** DIAL HOOK 1: Ante — Deduct 15 CR via atomic runTransaction */
    const handleDialSpinStart = (startCallback: (success: boolean) => void) => {
        if (!firebaseUser || !userDoc) {
            startCallback(false);
            return;
        }

        const userRef = doc(db, 'users', firebaseUser.uid);
        runTransaction(db, async (transaction) => {
            const docSnap = await transaction.get(userRef);
            if (!docSnap.exists()) throw new Error("User document does not exist in Firestore");
            const currentCredits = docSnap.data().credits || 0;
            if (currentCredits < 15) throw new Error("Insufficient credits for Vault Dial (race condition)");
            transaction.update(userRef, { credits: currentCredits - 15 });
        })
            .then(() => {
                console.log("[DIAL TRANSACTION]: 15 CR ante deducted successfully.");
                startCallback(true);
            })
            .catch((err) => {
                console.error("[DIAL TRANSACTION FAIL]:", err);
                setErrorMsg(err instanceof Error ? err.message : String(err));
                startCallback(false);
            });
    };

    /** DIAL HOOK 2: Spin Complete — Apply credits/XP delta + cooldown sync */
    const handleDialSpinComplete = (data: {
        credits: number;
        xp: number;
        item?: string;
        unlockAudio?: boolean;
        cooldownDuration: number;
        wasOverclock: boolean;
        overclockWin: boolean | null;
    }) => {
        if (!firebaseUser) return;

        const userRef = doc(db, 'users', firebaseUser.uid);
        runTransaction(db, async (transaction) => {
            const docSnap = await transaction.get(userRef);
            if (!docSnap.exists()) return;
            const docData = docSnap.data();
            const curCreds = docData.credits || 0;
            const curXp = docData.xp?.total || 0;

            const newCredits = Math.max(0, curCreds + data.credits);
            const newXp = curXp + data.xp;
            const eScore = Math.floor(Math.log10(newXp + 1) * 20);

            const updatePayload: Record<string, any> = {
                credits: newCredits,
                'xp.total': newXp,
                engagementScore: eScore,
            };

            // Sync cooldown duration to backend for cross-device enforcement
            if (data.cooldownDuration > 0) {
                updatePayload['vaultDial.lockUntil'] = Date.now() + data.cooldownDuration;
                updatePayload['vaultDial.lockType'] = data.wasOverclock && !data.overclockWin
                    ? 'HARDWARE_LOCKOUT'
                    : 'STANDARD_LOCK';
            }

            // Track overclock history
            if (data.wasOverclock) {
                const history = docData.vaultDial?.overclockHistory || [];
                history.push({
                    timestamp: Date.now(),
                    win: data.overclockWin,
                    creditsDelta: data.credits,
                });
                updatePayload['vaultDial.overclockHistory'] = history;
            }

            transaction.update(userRef, updatePayload);
        })
            .then(() => {
                console.log(`[DIAL SYNC]: Firebase updated — CR:${data.credits > 0 ? '+' : ''}${data.credits}, XP:+${data.xp}, OC:${data.wasOverclock ? (data.overclockWin ? 'WIN' : 'CRASH') : 'N/A'}`);
            })
            .catch((err) => console.error("[DIAL SYNC FAIL]:", err));
    };

    /* ═══════════════════════════════════════════════════════════════════════
       RENDER
       ═══════════════════════════════════════════════════════════════════════ */

    const isPlaying = gameState === 'VAULT_RAIN' || gameState === 'VAULT_DIAL' || gameState === 'CASH_CALIBER';

    return (
        <div className="bg-black text-white font-display min-h-screen flex flex-col overflow-x-hidden selection:bg-white selection:text-black">

            {/* ═══ TOP NAV ═══ */}
            <header className="w-full border-b border-white/10 px-6 py-4 flex justify-between items-center z-20 bg-black sticky top-0">
                <div className="flex items-center gap-3 cursor-pointer group" onClick={() => router.push('/dashboard')}>
                    <span className="material-symbols-outlined text-xl text-white/70 group-hover:text-white transition-colors">arrow_back</span>
                    <h1 className="font-mono font-bold text-sm tracking-[0.25em] uppercase text-white/90 group-hover:text-white transition-colors">
                        Outworld Arcade Hub
                    </h1>
                </div>
                <div className="border border-white/20 px-4 py-2 bg-white/5 flex flex-col items-end min-w-[100px]">
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#00f0ff] font-bold">Credits</span>
                    <span className="font-mono text-base font-black tracking-tight">{userDoc?.credits ?? 0} CR</span>
                </div>
            </header>

            <main className="flex-1 w-full flex flex-col items-center p-4 lg:p-8 relative z-10">

                {/* ═══ LOBBY: MISSION SELECTION UI ═══ */}
                {(gameState === 'LOBBY' || gameState === 'DIAGNOSTIC') && (
                    <div className="w-full max-w-5xl mt-8 lg:mt-16">

                        {/* ── MISSION SELECTION HEADER ── */}
                        <div className="flex items-center gap-4 mb-12">
                            <div className="flex-1 h-px bg-white/20" />
                            <h2 className="font-mono font-black text-2xl lg:text-3xl uppercase tracking-[0.3em] text-white whitespace-nowrap">
                                Mission Selection
                            </h2>
                            <div className="flex-1 h-px bg-white/20" />
                        </div>

                        {/* ── 3-COLUMN CARD GRID ── */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                            {/* ─── CARD 1: VAULT RAIN (ACTIVE) ─── */}
                            <div className="border border-cyan-500/50 bg-black p-6 flex flex-col relative group overflow-hidden transition-all hover:border-cyan-400 hover:shadow-[0_0_30px_rgba(0,255,255,0.12)]">
                                <div className="absolute inset-0 bg-cyan-500 opacity-0 group-hover:opacity-[0.03] transition-opacity" />

                                <h3 className="font-mono text-xl lg:text-2xl font-black tracking-[0.2em] uppercase mb-1 relative z-10" style={{ color: '#00FFFF', textShadow: '2px 2px 0px #005555' }}>
                                    Vault Rain
                                </h3>
                                <p className="font-mono text-[11px] text-white/40 uppercase tracking-[0.15em] mb-8 relative z-10">
                                    High Speed Catcher [16-BIT]
                                </p>

                                <div className="mt-auto space-y-3 relative z-10">
                                    <div className="flex justify-between items-baseline font-mono text-xs border-b border-white/10 pb-2">
                                        <span className="text-white/50 uppercase tracking-[0.15em]">Ante:</span>
                                        <span className="text-white font-bold tracking-wider">10 CR</span>
                                    </div>
                                    <div className="flex justify-between items-baseline font-mono text-xs border-b border-white/10 pb-2">
                                        <span className="text-[#00f0ff] uppercase tracking-[0.1em]">Jackpot (20 Streak):</span>
                                        <span className="text-white font-bold tracking-wider">+25 CR | +200 XP</span>
                                    </div>
                                </div>

                                <button
                                    onClick={(e) => { e.stopPropagation(); handlePlayVaultRain(); }}
                                    disabled={gameState === 'DIAGNOSTIC'}
                                    className={`mt-8 w-full py-4 font-mono font-bold text-sm tracking-[0.25em] uppercase transition-all relative z-10 ${gameState === 'DIAGNOSTIC'
                                        ? 'bg-white/20 text-white/50 cursor-not-allowed'
                                        : 'bg-[#0a1628] text-cyan-400 border border-cyan-500/40 hover:bg-cyan-500 hover:text-black hover:border-cyan-400'
                                        }`}
                                >
                                    {gameState === 'DIAGNOSTIC' ? 'Verifying Ledger...' : 'Drop In'}
                                </button>
                            </div>

                            {/* ─── CARD 2: VAULT DIAL (ACTIVE) ─── */}
                            <div className="border border-yellow-500/40 bg-black p-6 flex flex-col relative group overflow-hidden transition-all hover:border-yellow-400 hover:shadow-[0_0_30px_rgba(234,179,8,0.12)]">
                                <div className="absolute inset-0 bg-yellow-500 opacity-0 group-hover:opacity-[0.03] transition-opacity" />

                                {/* Caution tape accent */}
                                <div className="absolute top-0 right-0 bg-yellow-500/20 text-yellow-500 text-[8px] font-mono font-black tracking-[0.3em] uppercase px-3 py-1 z-10">
                                    LIVE
                                </div>

                                <h3 className="font-mono text-xl lg:text-2xl font-black tracking-[0.2em] uppercase mb-1 relative z-10" style={{ color: '#EAB308', textShadow: '2px 2px 0px #78350F' }}>
                                    Vault Dial
                                </h3>
                                <p className="font-mono text-[11px] text-white/40 uppercase tracking-[0.15em] mb-8 relative z-10">
                                    Hold-to-Spin RNG [OVERCLOCK]
                                </p>

                                <div className="mt-auto space-y-3 relative z-10">
                                    <div className="flex justify-between items-baseline font-mono text-xs border-b border-white/10 pb-2">
                                        <span className="text-white/50 uppercase tracking-[0.15em]">Ante:</span>
                                        <span className="text-white font-bold tracking-wider">15 CR</span>
                                    </div>
                                    <div className="flex justify-between items-baseline font-mono text-xs border-b border-white/10 pb-2">
                                        <span className="text-yellow-400 uppercase tracking-[0.1em]">Overclock (2×):</span>
                                        <span className="text-white font-bold tracking-wider">Double or Nothing</span>
                                    </div>
                                    <div className="flex justify-between items-baseline font-mono text-xs border-b border-white/10 pb-2">
                                        <span className="text-red-400/60 uppercase tracking-[0.1em]">Crash Penalty:</span>
                                        <span className="text-red-400/80 font-bold tracking-wider text-[11px]">60 min Lockout</span>
                                    </div>
                                </div>

                                <button
                                    onClick={(e) => { e.stopPropagation(); handlePlayVaultDial(); }}
                                    disabled={gameState === 'DIAGNOSTIC'}
                                    className={`mt-8 w-full py-4 font-mono font-bold text-sm tracking-[0.25em] uppercase transition-all relative z-10 ${gameState === 'DIAGNOSTIC'
                                        ? 'bg-white/20 text-white/50 cursor-not-allowed'
                                        : 'bg-[#1a1400] text-yellow-400 border border-yellow-500/40 hover:bg-yellow-500 hover:text-black hover:border-yellow-400'
                                        }`}
                                >
                                    {gameState === 'DIAGNOSTIC' ? 'Verifying Ledger...' : 'Enter Vault'}
                                </button>
                            </div>

                            {/* ─── CARD 3: CASH CALIBER — FIELD MODE (ACTIVE) ─── */}
                            <div className="border border-emerald-500/40 bg-black p-6 flex flex-col relative group overflow-hidden transition-all hover:border-emerald-400 hover:shadow-[0_0_30px_rgba(0,255,100,0.12)]">
                                <div className="absolute inset-0 bg-emerald-500 opacity-0 group-hover:opacity-[0.03] transition-opacity" />

                                <div className="absolute top-0 right-0 bg-emerald-500/20 text-emerald-400 text-[8px] font-mono font-black tracking-[0.3em] uppercase px-3 py-1 z-10">
                                    NEW
                                </div>

                                <h3 className="font-mono text-xl lg:text-2xl font-black tracking-[0.2em] uppercase mb-1 relative z-10" style={{ color: '#00FF66', textShadow: '2px 2px 0px #004422' }}>
                                    Cash Caliber
                                </h3>
                                <p className="font-mono text-[11px] text-white/40 uppercase tracking-[0.15em] mb-8 relative z-10">
                                    FIELD MODE Rhythm Shooter [114 BPM]
                                </p>

                                <div className="mt-auto space-y-3 relative z-10">
                                    <div className="flex justify-between items-baseline font-mono text-xs border-b border-white/10 pb-2">
                                        <span className="text-white/50 uppercase tracking-[0.15em]">Ante:</span>
                                        <span className="text-white font-bold tracking-wider">10 CR</span>
                                    </div>
                                    <div className="flex justify-between items-baseline font-mono text-xs border-b border-white/10 pb-2">
                                        <span className="text-emerald-400 uppercase tracking-[0.1em]">Jackpot (20 Streak):</span>
                                        <span className="text-white font-bold tracking-wider">+25 CR | +200 XP</span>
                                    </div>
                                </div>

                                <button
                                    onClick={(e) => { e.stopPropagation(); handlePlayCashCaliber(); }}
                                    disabled={gameState === 'DIAGNOSTIC'}
                                    className={`mt-8 w-full py-4 font-mono font-bold text-sm tracking-[0.25em] uppercase transition-all relative z-10 ${gameState === 'DIAGNOSTIC'
                                        ? 'bg-white/20 text-white/50 cursor-not-allowed'
                                        : 'bg-[#001a0d] text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500 hover:text-black hover:border-emerald-400'
                                        }`}
                                >
                                    {gameState === 'DIAGNOSTIC' ? 'Verifying Ledger...' : 'Enter Field'}
                                </button>
                            </div>

                        </div>
                    </div>
                )}

                {/* ═══ VAULT RAIN ENGINE ═══ */}
                {gameState === 'VAULT_RAIN' && (
                    <VaultRainModule
                        credits={userDoc?.credits ?? 0}
                        onGameStart={handleGameStart}
                        onViralStreak={handleViralStreak}
                        onGameOver={handleGameOver}
                        onExit={() => setGameState('LOBBY')}
                    />
                )}

                {/* ═══ VAULT DIAL ENGINE ═══ */}
                {gameState === 'VAULT_DIAL' && (
                    <VaultDialModule
                        credits={userDoc?.credits ?? 0}
                        onSpinStart={handleDialSpinStart}
                        onSpinComplete={handleDialSpinComplete}
                        onExit={() => setGameState('LOBBY')}
                    />
                )}

                {/* ═══ CASH CALIBER — FIELD MODE ENGINE ═══ */}
                {gameState === 'CASH_CALIBER' && (
                    <CashCaliberEngine
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
                            <div className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-pulse" />
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
            {!isPlaying && (
                <footer className="w-full text-center py-6 relative z-20 border-t border-white/5">
                    <p className="text-white/30 text-[10px] font-mono font-normal leading-normal uppercase tracking-[0.4em]">
                        © 2026 OUTWORLD LLC.
                    </p>
                </footer>
            )}
        </div>
    );
}
