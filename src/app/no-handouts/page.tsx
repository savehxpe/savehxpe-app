'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { doc, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function NoHandouts() {
    const router = useRouter();
    const { userDoc, firebaseUser } = useAuth();
    const [isPlaying, setIsPlaying] = useState(false);
    const [score, setScore] = useState(0);

    const handlePlay = async () => {
        if (!firebaseUser || !userDoc) return;

        // Entry fee is 10 Credits
        if (userDoc.credits < 10) {
            alert('Insufficient credits. 10 CR required to play.');
            return;
        }

        try {
            const userRef = doc(db, 'users', firebaseUser.uid);
            await runTransaction(db, async (transaction) => {
                const docSnap = await transaction.get(userRef);
                if (!docSnap.exists()) throw "User does not exist";
                const currentCredits = docSnap.data().credits || 0;
                if (currentCredits < 10) throw "Not enough credits";
                transaction.update(userRef, { credits: currentCredits - 10 });
            });
            setIsPlaying(true);
            setScore(0);

            // Simulating a simple game session loop
            const gameInterval = setInterval(() => {
                setScore(prev => prev + 10);
            }, 1000);

            // Game over after 10 seconds simulation
            setTimeout(() => {
                clearInterval(gameInterval);
                setIsPlaying(false);
                alert('Game Over! You survived 10 seconds.');
            }, 10000);

        } catch (error) {
            console.error('Error starting game:', error);
        }
    };

    return (
        <div className="bg-black text-white font-display min-h-screen flex flex-col overflow-x-hidden selection:bg-white selection:text-black">
            <header className="w-full border-b border-white/20 px-6 py-4 flex justify-between items-center z-20 bg-black/80 backdrop-blur-sm sticky top-0">
                <div className="flex items-center gap-4 cursor-pointer" onClick={() => router.push('/dashboard')}>
                    <span className="material-symbols-outlined text-2xl">arrow_back</span>
                    <h1 className="font-display font-black text-xl tracking-widest uppercase">No Handouts</h1>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end">
                        <span className="font-mono text-[10px] uppercase tracking-widest text-white/60">Credit Ledger</span>
                        <div className="font-mono text-sm font-bold tracking-tight">{userDoc?.credits ?? 0} CR</div>
                    </div>
                </div>
            </header>

            <main className="flex-1 w-full flex flex-col items-center justify-center p-6 lg:p-12 relative z-10">
                <div className="max-w-4xl w-full border-2 border-white p-8 relative overflow-hidden h-[400px] flex flex-col items-center justify-center bg-white/5 shadow-[0_0_40px_rgba(255,255,255,0.1)]">
                    <div className="absolute inset-0 scanline-bg pointer-events-none opacity-20"></div>

                    {isPlaying ? (
                        <div className="relative z-10 flex flex-col items-center w-full">
                            <h2 className="text-2xl font-mono uppercase tracking-widest text-green-400 mb-8 break-words text-center">Score: {score}</h2>
                            <div className="w-full h-px bg-white/40 relative">
                                <div className="absolute bottom-0 left-[20%] w-8 h-8 bg-white border border-black animate-bounce flex items-center justify-center">
                                    <span className="material-symbols-outlined text-black select-none">directions_run</span>
                                </div>
                                <div className="absolute bottom-0 -right-8 w-4 h-8 bg-black border border-white/40 animate-[marquee_2s_linear_infinite]"></div>
                            </div>
                            <p className="mt-12 font-mono text-xs text-white/50 uppercase tracking-widest">Survive the obstacles...</p>
                        </div>
                    ) : (
                        <div className="relative z-10 flex flex-col items-center text-center max-w-lg">
                            <span className="material-symbols-outlined text-6xl mb-6">videogame_asset</span>
                            <h2 className="text-3xl font-black uppercase tracking-widest mb-4">No Handouts</h2>
                            <p className="font-mono text-sm text-white/60 uppercase leading-relaxed mb-8">
                                Test your reflexes. Survive the wasteland.<br />
                                Entry Fee: 10 Credits.
                            </p>
                            <button
                                onClick={handlePlay}
                                className="px-8 py-4 bg-white text-black font-bold uppercase tracking-widest hover:bg-black hover:text-white border-2 border-white transition-all transform hover:scale-105 active:scale-95"
                            >
                                Insert 10 CR
                            </button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
