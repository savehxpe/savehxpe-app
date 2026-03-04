'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { doc, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import CashCaliberEngine from '@/components/CashCaliberEngine';

export default function NoHandouts() {
    const router = useRouter();
    const { userDoc, firebaseUser } = useAuth();

    const [gameState, setGameState] = useState<'LOBBY' | 'DIAGNOSTIC' | 'PLAYING' | 'GAME_OVER'>('LOBBY');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Audio Refs
    const audioCtxRef = useRef<AudioContext | null>(null);

    const handlePlay = async () => {
        // 1. Force Audio Context Creation Synchronously on Click
        let audioCtx = audioCtxRef.current;
        if (!audioCtx) {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            audioCtx = new AudioContextClass();
            audioCtxRef.current = audioCtx;
        }

        // Resume to unlock securely within the click stack, then suspend while awaiting Firebase
        if (audioCtx.state === 'suspended') {
            audioCtx.resume().catch(() => { });
        }
        audioCtx.suspend().catch(() => { });

        if (!firebaseUser || !userDoc || gameState === 'DIAGNOSTIC') return;

        if (userDoc.credits < 10) {
            setErrorMsg('INSUFFICIENT FUNDS: ASCEND OR REFILL LEDGER');
            setGameState('LOBBY');
            return;
        }

        setGameState('DIAGNOSTIC');
        setErrorMsg(null);

        try {
            // 2. Execute 10 CR Secure Transaction BEFORE Network Burden
            const userRef = doc(db, 'users', firebaseUser.uid);
            await runTransaction(db, async (transaction) => {
                const docSnap = await transaction.get(userRef);
                if (!docSnap.exists()) throw new Error("User does not exist");
                const currentCredits = docSnap.data().credits || 0;
                if (currentCredits < 10) throw new Error("Insufficient credits");
                transaction.update(userRef, { credits: currentCredits - 10 });
            });

            // 4. State Handshake completed successfully
            setGameState('PLAYING');

        } catch (error: any) {
            console.error('Error starting game:', error);
            setErrorMsg(error?.message || error?.toString() || 'Secure transaction failed. SIGNAL LOST.');
            setGameState('LOBBY');
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

            <main className="flex-1 w-full flex flex-col items-center justify-center p-4 lg:p-8 relative z-10">

                {/* LOBBY UI */}
                {(gameState === 'LOBBY' || gameState === 'DIAGNOSTIC') && (
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
                                    disabled={gameState === 'DIAGNOSTIC'}
                                    className={`mt-8 w-full py-4 font-bold tracking-[0.2em] uppercase transition-all border ${gameState === 'DIAGNOSTIC' ? 'bg-white/50 text-black cursor-not-allowed border-white/50' : 'bg-white text-black hover:bg-black hover:text-white border-white'}`}
                                >
                                    {gameState === 'DIAGNOSTIC' ? 'VERIFYING LEDGER...' : 'Insert Ante'}
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

                {/* THE ENGINE INSTANTIATION */}
                {gameState === 'PLAYING' && audioCtxRef.current && (
                    <CashCaliberEngine
                        audioSrc="https://firebasestorage.googleapis.com/v0/b/savehxpe-prod.firebasestorage.app/o/vault%2Fstems%2FHANDOUT_MASTER.wav?alt=media&token=22d20d9f-44f2-46cf-9866-dc8af52c9b09"
                        audioContext={audioCtxRef.current}
                        onExit={() => setGameState('LOBBY')}
                    />
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
