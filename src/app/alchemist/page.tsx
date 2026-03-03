'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function PromptAlchemist() {
    const router = useRouter();
    const { userDoc, firebaseUser } = useAuth();
    const [promptInput, setPromptInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [result, setResult] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!promptInput.trim()) return;
        if (!firebaseUser || !userDoc) return;

        // Check if user has enough credits
        if (userDoc.credits < 25) {
            alert('Insufficient credits. Top up required.');
            return;
        }

        setIsGenerating(true);
        setResult(null);

        try {
            // Deduct 25 credits
            const userRef = doc(db, 'users', firebaseUser.uid);
            await updateDoc(userRef, {
                credits: increment(-25)
            });

            // Simulate generation delay
            setTimeout(() => {
                setResult("PROMPT GENERATED: 'Gritty lo-fi industrial ambient with subtle 808s and dissonant jazz chords in 142 BPM, A minor. Texture: Distorted memory.'");
                setIsGenerating(false);
                setPromptInput('');
            }, 3000);

        } catch (error) {
            console.error('Error generating prompt:', error);
            setIsGenerating(false);
        }
    };

    return (
        <div className="bg-background-dark text-slate-100 font-display min-h-screen flex flex-col overflow-x-hidden">
            <div className="relative flex min-h-screen w-full flex-col group/design-root">
                <header className="flex items-center justify-between whitespace-nowrap border-b border-white/10 px-6 py-4 lg:px-10 z-20 bg-background-dark/50 backdrop-blur-sm">
                    <div className="flex items-center gap-4 cursor-pointer" onClick={() => router.push('/dashboard')}>
                        <div className="size-6 text-primary">
                            <span className="material-symbols-outlined text-2xl leading-none">graphic_eq</span>
                        </div>
                        <h2 className="text-primary text-xl font-bold leading-tight tracking-widest uppercase hover:text-slate-300 transition-colors">savehxpe</h2>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded">
                            <span className="text-xs uppercase tracking-widest text-slate-400">Balance</span>
                            <span className="text-sm font-bold text-white tracking-widest">{userDoc?.credits ?? 0} CR</span>
                        </div>
                    </div>
                </header>

                <main className="flex flex-1 flex-col relative justify-center items-center px-4 py-12 lg:py-20 w-full max-w-7xl mx-auto z-10">
                    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 flex items-center justify-center">
                        <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
                    </div>

                    <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-3xl gap-10 border border-white/10 p-8 rounded-lg bg-white/5 backdrop-blur-md shadow-2xl">
                        <div className="text-center space-y-2">
                            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-white drop-shadow-lg">Prompt Alchemist</h1>
                            <p className="text-sm md:text-base text-slate-400 uppercase tracking-[0.2em] font-medium">Synthesize your sound</p>
                        </div>

                        <div className="w-full bg-white text-black p-1 rounded-sm shadow-2xl relative">
                            <div className="bg-white p-6 md:p-8 flex flex-col gap-6">
                                <div className="relative group">
                                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-2 mb-2">
                                        <label className="text-xs font-bold uppercase tracking-widest text-black">Input Directive</label>
                                        <div className="flex items-center gap-1 bg-black text-white px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-sm">
                                            <span>Cost:</span>
                                            <span>25 Credits</span>
                                        </div>
                                    </div>
                                    <div className="relative border-b-2 border-black">
                                        <input
                                            value={promptInput}
                                            onChange={(e) => setPromptInput(e.target.value)}
                                            className="w-full bg-transparent border-none p-4 text-lg md:text-xl font-bold placeholder:text-slate-400 placeholder:font-medium focus:ring-0 text-black uppercase tracking-wide outline-none"
                                            placeholder="DESCRIBE THE VIBE..."
                                            type="text"
                                            disabled={isGenerating}
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={handleGenerate}
                                    disabled={isGenerating || !promptInput.trim()}
                                    className="w-full bg-black text-white h-16 md:h-20 flex items-center justify-center gap-3 hover:bg-slate-800 transition-colors group/btn disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <span className={`material-symbols-outlined text-2xl transition-transform duration-300 ${isGenerating ? 'animate-spin' : 'group-hover/btn:rotate-90'}`}>
                                        {isGenerating ? 'refresh' : 'auto_awesome'}
                                    </span>
                                    <span className="text-xl md:text-2xl font-black uppercase tracking-[0.15em]">
                                        {isGenerating ? 'Synthesizing...' : 'Generate Prompt'}
                                    </span>
                                </button>
                            </div>
                        </div>

                        <div className="w-full border border-white/20 bg-black/40 rounded p-6 shadow-inner flex flex-col gap-4">
                            <div className="flex items-center justify-between border-b border-white/10 pb-2">
                                <span className="text-xs font-mono text-slate-400 uppercase tracking-widest font-semibold">Output Log</span>
                                <span className="flex h-2 w-2 relative">
                                    {isGenerating ? (
                                        <>
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                        </>
                                    ) : (
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-600"></span>
                                    )}
                                </span>
                            </div>

                            <div className="relative overflow-hidden min-h-[120px] flex items-center justify-center">
                                {isGenerating ? (
                                    <div className="absolute inset-0 p-4 font-mono text-sm leading-relaxed text-green-400 select-none pointer-events-none animate-pulse text-left">
                                        Analyzing input vector... extracting sonic characteristics... synthesizing rhythmic pattern... bpm: 142... key: A minor... texture: gritty, lo-fi distortion... harmonies: dissonant jazz chords...
                                    </div>
                                ) : result ? (
                                    <div className="z-10 p-4 font-mono text-sm leading-relaxed text-white text-center font-bold tracking-wider">
                                        {result}
                                    </div>
                                ) : (
                                    <>
                                        <div className="absolute inset-0 p-4 font-mono text-sm leading-relaxed text-white/20 blur-[2px] select-none pointer-events-none text-left">
                                            analyzing input vector... extracting sonic characteristics... synthesizing rhythmic pattern... bpm: 142... key: A minor... texture: gritty, lo-fi distortion... harmonies: dissonant jazz chords...
                                        </div>
                                        <div className="z-10 flex flex-col items-center gap-2">
                                            <span className="material-symbols-outlined text-4xl text-slate-500">lock</span>
                                            <span className="text-slate-500 font-bold uppercase tracking-[0.2em] text-sm">Awaiting Input</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </main>

                <footer className="relative z-10 flex flex-col gap-6 px-5 py-8 text-center border-t border-white/5 bg-background-dark/80 backdrop-blur-sm mt-auto">
                    <p className="text-slate-500 text-xs font-normal leading-normal uppercase tracking-widest">© 2026 sincethe80s, llc/radical publishing. All rights reserved.</p>
                </footer>
            </div>
        </div>
    );
}
