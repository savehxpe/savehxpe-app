'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { doc, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function Dashboard() {
    const router = useRouter();
    const { userDoc, firebaseUser, logout } = useAuth();

    // Alchemist State
    const [promptInput, setPromptInput] = useState('');
    const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [justDeducted, setJustDeducted] = useState(false);

    // Stem Mixer State
    const hasStandardAccess = userDoc?.tier.current === 'STANDARD' || userDoc?.tier.current === 'PREMIUM' || (userDoc?.xp.total ?? 0) >= 1000;
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [playingStem, setPlayingStem] = useState<string | null>(null);
    const [previewError, setPreviewError] = useState<string | null>(null);

    // Cleanup audio on unmount
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    const handleGenerate = async () => {
        if (!firebaseUser || !userDoc || !promptInput.trim()) return;

        if (userDoc.credits < 25) {
            alert('Insufficient credits. 25 CR required to use Prompt Alchemist.');
            return;
        }

        setIsGenerating(true);
        setGeneratedPrompt(null);
        setJustDeducted(false);

        try {
            const userRef = doc(db, 'users', firebaseUser.uid);
            await runTransaction(db, async (transaction) => {
                const docSnap = await transaction.get(userRef);
                if (!docSnap.exists()) throw "User does not exist";
                const currentCredits = docSnap.data().credits || 0;
                if (currentCredits < 25) throw "Not enough credits";
                transaction.update(userRef, { credits: currentCredits - 25 });
            });

            setJustDeducted(true);

            // Simulate generation delay
            setTimeout(() => {
                setGeneratedPrompt(`GENERATED SONIC ARCHITECTURE FOR: "${promptInput.toUpperCase()}". 
DARK INDUSTRIAL PHONK X FREDDIE GIBBS FLOW. 150 BPM. DISTORTED 808s, GLITCHED HI-HATS, LO-FI MEMPHIS VOCAL CHOPS.`);
                setIsGenerating(false);
                setTimeout(() => setJustDeducted(false), 2000);
            }, 2000);
        } catch (error) {
            console.error('Error generating:', error);
            setIsGenerating(false);
        }
    };

    const fetchDownloadUrl = async (itemCode: string) => {
        try {
            const token = await firebaseUser!.getIdToken();
            const res = await fetch('/api/get-download', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ item: itemCode })
            });
            const data = await res.json();
            if (data.url) {
                window.open(data.url, '_blank');
            } else {
                alert("Failed to secure download link.");
            }
        } catch (err) {
            console.error('Download error:', err);
            alert("Secure transmission failed.");
        }
    };

    const handleUnlockStem = async (stemName: string, isBundle: boolean = false) => {
        if (!firebaseUser || !userDoc) return;

        const cost = isBundle ? 100 : 50;

        if (hasStandardAccess && !isBundle) {
            // They already have access, just fetch the link directly
            await fetchDownloadUrl(stemName.toUpperCase());
            return;
        }

        if (userDoc.credits < cost) {
            alert(`Insufficient credits. ${cost} CR required.`);
            return;
        }

        try {
            const userRef = doc(db, 'users', firebaseUser.uid);
            await runTransaction(db, async (transaction) => {
                const docSnap = await transaction.get(userRef);
                if (!docSnap.exists()) throw "User does not exist";
                const currentCredits = docSnap.data().credits || 0;
                if (currentCredits < cost) throw "Not enough credits";
                transaction.update(userRef, { credits: currentCredits - cost });
            });

            // Immediately open the signed download URL
            await fetchDownloadUrl(isBundle ? 'BUNDLE' : stemName.toUpperCase());

        } catch (error) {
            console.error('Error unlocking item:', error);
        }
    };

    const handlePlayPreview = async (stemName: string) => {
        if (playingStem === stemName) {
            audioRef.current?.pause();
            setPlayingStem(null);
            return;
        }

        if (audioRef.current) {
            audioRef.current.pause();
        }

        try {
            const { getDownloadURL, ref } = await import('firebase/storage');
            const { storage } = await import('@/lib/firebase');

            const path = `vault/previews/${stemName.toUpperCase()}_PREVIEW.mp3`;
            const url = await getDownloadURL(ref(storage, path));

            const audio = new Audio(url);
            audioRef.current = audio;
            audio.play();
            setPlayingStem(stemName);

            audio.onended = () => {
                setPlayingStem(null);
            };
        } catch (error) {
            console.error("Preview failed:", error);
            setPreviewError("Preview unavailable. Handshake failed to locate the transmission file.");
        }
    };

    return (
        <div className="bg-[#000000] text-slate-100 font-display min-h-screen flex flex-col overflow-x-hidden selection:bg-white selection:text-black">
            <div className="relative flex min-h-screen w-full flex-col group/design-root">
                <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 flex items-center justify-center">
                    <div className="w-[300px] h-[300px] md:w-[600px] md:h-[600px] bg-white/5 rounded-full blur-[100px] absolute -top-20 -left-20"></div>
                    <div className="w-full h-full absolute opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent"></div>
                </div>

                <div className="layout-container flex h-full grow flex-col md:flex-row relative z-10">
                    <aside className="w-full md:w-72 border-b md:border-b-0 md:border-r border-white/10 bg-black/80 backdrop-blur-md flex flex-col shrink-0">
                        <div className="flex items-center gap-4 px-6 py-6 border-b border-white/10">
                            <div className="size-6 text-primary">
                                <span className="material-symbols-outlined text-2xl leading-none">graphic_eq</span>
                            </div>
                            <h2 className="text-primary text-xl font-bold leading-tight tracking-widest uppercase">savehxpe</h2>
                        </div>
                        <div className="p-6 flex flex-col gap-6">
                            <div className="flex flex-col gap-1">
                                <span className="text-xs text-slate-500 uppercase tracking-widest">Fan ID</span>
                                <span className="text-sm font-mono text-white tracking-wider truncate">{userDoc?.name || 'GUEST'}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1">
                                    <span className="text-xs text-slate-500 uppercase tracking-widest">XP Level</span>
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm text-yellow-500">bolt</span>
                                        <span className="text-lg font-bold text-white">{userDoc?.xp.total || 0}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1 relative">
                                    <span className="text-xs text-slate-500 uppercase tracking-widest">Credits</span>
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm text-green-500">database</span>
                                        <span className={`text-lg font-bold text-white ${justDeducted ? 'animate-credits-drop' : ''}`}>
                                            {userDoc?.credits ?? 0}
                                        </span>
                                    </div>
                                    {/* Flash Deduction */}
                                    {justDeducted && (
                                        <div className="absolute top-8 left-6 text-red-500 text-xs font-mono font-bold animate-[flash_2s_ease-out_forwards]">
                                            -25
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col gap-1 mt-2 p-3 bg-white/5 border border-white/10 rounded">
                                <span className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold">Engagement Score</span>
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm text-blue-400">monitoring</span>
                                    <span className="text-xl font-bold font-mono tracking-widest text-[#E2E8F0]">
                                        {(Math.log10((userDoc?.xp.total || 0) + 1) * 20).toFixed(1)}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <nav className="flex-1 px-4 py-2 flex flex-col gap-2">
                            <button onClick={() => router.push('/dashboard')} className="flex w-full items-center gap-3 px-4 py-3 text-white bg-white/10 rounded border border-white/5 uppercase tracking-wider text-sm font-bold">
                                <span className="material-symbols-outlined text-lg">dashboard</span>
                                Dashboard
                            </button>
                            <button onClick={() => router.push('/vault')} className="flex w-full items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-white/5 rounded transition-colors uppercase tracking-wider text-sm">
                                <span className="material-symbols-outlined text-lg">lock_open</span>
                                The Vault
                            </button>
                            <button onClick={() => router.push('/no-handouts')} className="flex w-full items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-white/5 rounded transition-colors uppercase tracking-wider text-sm">
                                <span className="material-symbols-outlined text-lg">videogame_asset</span>
                                No Handouts
                            </button>
                            <button onClick={() => router.push('/merch')} className="flex w-full items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-white/5 rounded transition-colors uppercase tracking-wider text-sm">
                                <span className="material-symbols-outlined text-lg">shopping_bag</span>
                                Merch
                            </button>
                            <button onClick={() => router.push('/ascension')} className="flex w-full items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-white/5 rounded transition-colors uppercase tracking-wider text-sm mt-4 border-t border-white/10 pt-4">
                                <span className="material-symbols-outlined text-lg text-yellow-500">star</span>
                                Ascension Portal
                            </button>
                        </nav>
                        <div className="p-6 border-t border-white/10 mt-auto">
                            <button onClick={() => { logout(); router.push('/'); }} className="w-full py-3 px-4 border border-white/20 hover:border-white text-xs uppercase tracking-[0.2em] transition-colors rounded">
                                Log Out
                            </button>
                        </div>
                    </aside>
                    <main className="flex-1 flex flex-col relative h-full">
                        <header className="flex items-center justify-between px-6 py-6 md:px-10 border-b border-white/10 bg-black/50 backdrop-blur-sm">
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-tighter text-white leading-none">Unified Workspace</h1>
                                <p className="text-slate-400 text-xs uppercase tracking-[0.2em] mt-2">Vault Stems + Prompt Alchemist</p>
                            </div>
                            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded bg-white/5 border border-white/10">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                <span className="text-xs uppercase tracking-widest text-slate-300 font-mono">Live Link Active</span>
                            </div>
                        </header>
                        <div className="flex-1 overflow-y-auto">
                            {/* Gated Stems Section */}
                            <section className="p-6 md:p-10 lg:p-16">
                                <div className="flex items-center justify-between mb-8 max-w-6xl mx-auto border-l-2 border-white pl-4">
                                    <h2 className="text-lg font-bold uppercase tracking-[0.3em] text-white">Gated Stems</h2>
                                    <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Series: Handout_2026</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
                                    {[
                                        { title: 'Drums', file: 'STEM_FILE_01.WAV', img: "https://lh3.googleusercontent.com/aida-public/AB6AXuD9LC0I08unnfrnQSzMPqY0--dn0V5HdDMRKNJ9le1Ixuoe1Wb28SGIYrQ5yUPZKWQKdas6Qo_qa2lEwHVk3QAG2Mg1iIZTCJTuP4y6HLyBo1Or-dIgMqWxiJTCUvgWbvLtVHEbD4FF0kt1TX-ZV59-GL8Kb7DVppn_HLLlhyWlNDnzivKknCO8z7JdyceB-plJbHz015GKOSl0OiG3l5lFf51vBkcoH9edkQKy00cQUhileEzO1ebX5pSVX9bLMsuyVpTQGPjq09Y" },
                                        { title: 'Bass', file: 'STEM_FILE_02.WAV', img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBYvm7ZZvozth3hIUIKlKeXZnXItW8prQSbKBb-uilqt7XsURZf8XPpdbtS3v3iJzYlzsQgVTFGK5aEoOXDKwgzK-oti8KvLuapewzT0OHRYq6z4Cf7q1Ywze8GryN2obc2-7gYzkF_MYdhEJwXUR-0H-JyCb36ieQQDKdKMB3IxmTwKBdZx8HBER5zc0gSQ8mdzrKFLtkeQMjuRCaZ1rXYDHy4nAklcohOY9Bz_2WS_vMEqeu4sv_ZZx8ewS9s9EMBBhmbkbjN888" },
                                        { title: 'Synths', file: 'STEM_FILE_03.WAV', img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCFQhPoMjFkWrCcJKOdl3Be8FH20GZ2u1LVs7RI3Jff2eczjh3hUACmwLNG64iSsxqA02A94skHH1xEuAiNmDEFmenH_fMb4AvOrCC47ztMpMPcodK5RNY4GNcZeRoMhdm5I4gniTrC8H4ZPWoikS2XvWnKVDD_OOCIeJFJiIVTd_6pu6DoXSAoXQyc7aqTCZFlYduBuukGsA95MhIVepBcDBO1-rq7VhV6I1LwdyqdmMxCmwjmSzV4eW4dvZQ6Il4QBEwBnmc7s5w" },
                                        { title: 'Instrumental', file: 'HANDOUT_INSTRUMENTAL.WAV', img: "https://lh3.googleusercontent.com/aida-public/AB6AXuB2eD6j_2z0oXGfOeyxYZR_oKXXH2T5bHIn_2kU3o6v23XgW8VqT7Ym8e8mFk9Vl8J5c4n8w3s0z5Q1l4t1QXV1S5P_1E_1t_4g6g2f9k4s0D3Y_p2D_8e1e_0R_F_s_50M2v3N3s2Y8L2x4f9X6D3z2O1D04" }
                                    ].map((stem, index) => (
                                        <div key={index} className="relative overflow-hidden rounded-lg border border-white/10 aspect-[3/4] flex flex-col justify-end p-6 bg-black/50 transition-all duration-300 hover:border-white/30 group">
                                            <div className="absolute inset-0 w-full h-full bg-cover bg-center opacity-50 blur-[15px] grayscale" style={{ backgroundImage: `url('${stem.img}')` }}></div>
                                            <div className="relative z-10 flex flex-col h-full items-center justify-center text-center gap-6 p-4">
                                                {!hasStandardAccess && (
                                                    <div className="size-16 rounded-full bg-black/80 border border-white/20 flex items-center justify-center backdrop-blur-md mb-2">
                                                        <span className="material-symbols-outlined text-3xl text-white">lock</span>
                                                    </div>
                                                )}
                                                <div className="space-y-1">
                                                    <h3 className="text-3xl font-bold uppercase tracking-widest text-white">{stem.title}</h3>
                                                    <p className="text-xs text-slate-300 font-mono tracking-wider">{stem.file}</p>
                                                </div>
                                                <div className="w-full border-t border-white/20 my-2"></div>
                                                <div className="flex flex-col gap-3 w-full">
                                                    <button
                                                        onClick={() => handleUnlockStem(stem.title)}
                                                        className={`w-full py-3 text-xs font-bold uppercase tracking-[0.15em] transition-colors ${hasStandardAccess ? 'bg-black text-white border border-white hover:bg-white hover:text-black' : 'bg-white text-black hover:bg-slate-200'}`}
                                                    >
                                                        {hasStandardAccess ? 'DOWNLOAD .WAV' : '50 Credits To Unlock'}
                                                    </button>
                                                    {!hasStandardAccess && (
                                                        <span className="text-[10px] uppercase tracking-widest text-slate-400">or Unlimited Access (Standard Tier)</span>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handlePlayPreview(stem.title)}
                                                className={`absolute top-4 right-4 z-20 size-10 rounded-full border border-white/20 flex items-center justify-center transition-all group-hover:scale-110 ${playingStem === stem.title ? 'bg-white text-black' : 'bg-black/60 text-white hover:bg-white hover:text-black'}`}
                                            >
                                                <span className="material-symbols-outlined text-xl">
                                                    {playingStem === stem.title ? 'stop' : 'play_arrow'}
                                                </span>
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                {/* Handout Bundle Card */}
                                <div className="max-w-6xl mx-auto mt-8 relative overflow-hidden rounded-lg border border-white/10 bg-black/50 p-6 md:p-10 transition-all duration-300 hover:border-white/30 group">
                                    <div className="absolute inset-0 w-full h-full bg-cover bg-center opacity-20 blur-[10px] grayscale" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuD9LC0I08unnfrnQSzMPqY0--dn0V5HdDMRKNJ9le1Ixuoe1Wb28SGIYrQ5yUPZKWQKdas6Qo_qa2lEwHVk3QAG2Mg1iIZTCJTuP4y6HLyBo1Or-dIgMqWxiJTCUvgWbvLtVHEbD4FF0kt1TX-ZV59-GL8Kb7DVppn_HLLlhyWlNDnzivKknCO8z7JdyceB-plJbHz015GKOSl0OiG3l5lFf51vBkcoH9edkQKy00cQUhileEzO1ebX5pSVX9bLMsuyVpTQGPjq09Y')" }}></div>
                                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                                        <div>
                                            <h3 className="text-2xl md:text-3xl font-bold uppercase tracking-widest text-white">THE HANDOUT ARCHIVE <span className="text-green-500 font-mono text-sm tracking-tighter align-top ml-2">[ ALL STEMS + EXTRAS ]</span></h3>
                                            <p className="text-xs text-slate-400 font-mono tracking-wider mt-2">DOWNLOAD THE ENTIRE VAULT PROJECT FILE (.ZIP)</p>
                                        </div>
                                        <div className="flex flex-col md:items-end w-full md:w-auto gap-3">
                                            <button
                                                onClick={() => handleUnlockStem('BUNDLE', true)}
                                                className="w-full md:w-72 py-4 text-xs font-bold uppercase tracking-[0.15em] transition-colors bg-white text-black hover:bg-slate-200 text-center"
                                            >
                                                UNLOCK ARCHIVE — 100 CR
                                            </button>
                                            <span className="text-[10px] uppercase tracking-widest text-green-500/80 font-mono flex items-center justify-end gap-2 w-full">
                                                <span className="line-through text-slate-500">200 CR</span>
                                                <span>50% BUNDLE DISCOUNT</span>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Prompt Alchemist Section */}
                            <section className="p-6 md:p-10 lg:px-16 lg:pb-24 border-t border-white/10 bg-white/[0.02]">
                                <div className="max-w-6xl mx-auto">
                                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                                        <div className="border-l-2 border-white pl-4">
                                            <h2 className="text-2xl font-bold uppercase tracking-[0.3em] text-white">Prompt Alchemist</h2>
                                            <p className="text-xs text-slate-500 uppercase tracking-widest mt-2">AI-DRIVEN SONIC ARCHITECTURE</p>
                                        </div>
                                        <div className="px-3 py-1.5 border border-white/20 bg-black text-white text-[10px] font-bold uppercase tracking-[0.2em]">
                                            COST: 25 CREDITS
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                                        <div className="lg:col-span-7 flex flex-col gap-4">
                                            <div className="bg-white p-1">
                                                <div className="flex flex-col md:flex-row">
                                                    <input
                                                        type="text"
                                                        value={promptInput}
                                                        onChange={(e) => setPromptInput(e.target.value)}
                                                        placeholder="DESCRIBE THE VIBE (e.g. Gritty 90s boom bap with distorted bass)"
                                                        className="bg-white text-black border-none focus:ring-0 placeholder-black/40 uppercase tracking-widest text-sm font-bold w-full py-4 px-6 outline-none"
                                                    />
                                                    <button
                                                        onClick={handleGenerate}
                                                        disabled={isGenerating || !promptInput.trim()}
                                                        className="bg-black text-white px-8 py-4 text-xs font-bold uppercase tracking-[0.2em] hover:bg-zinc-800 transition-colors whitespace-nowrap border-l border-white/10 disabled:opacity-50"
                                                    >
                                                        {isGenerating ? 'Synthesizing...' : 'Generate Prompt'}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center px-1">
                                                <span className="text-[9px] text-slate-500 uppercase tracking-widest">Model: SONIC-V3-ALPHA</span>
                                                <span className="text-[9px] text-slate-500 uppercase tracking-widest">Token Entropy: 0.85</span>
                                            </div>
                                        </div>
                                        <div className="lg:col-span-5 relative group">
                                            <div className="absolute -top-3 left-4 px-2 bg-[#000000] z-20 flex gap-4">
                                                <span className="text-[10px] text-white uppercase tracking-widest font-bold">Output Log</span>
                                            </div>
                                            <div className="border border-white/40 h-40 md:h-full min-h-[140px] flex items-start justify-start relative overflow-hidden bg-black/80 p-6 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
                                                {generatedPrompt ? (
                                                    <>
                                                        <div className="absolute top-0 right-0 p-3">
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                                                <span className="text-[9px] font-bold text-green-500 uppercase tracking-widest">MINTING SUCCESSFUL</span>
                                                            </div>
                                                        </div>
                                                        {/* Flash logic inside output log */}
                                                        {justDeducted && (
                                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none w-full px-6 flex justify-center">
                                                                <div className="bg-white text-black py-2 px-4 text-center animate-[flash_2s_ease-out_forwards] shadow-lg">
                                                                    <span className="text-xs font-bold uppercase tracking-widest">PROMPT ARCHITECTED: -25 CREDITS</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                        <div className="relative z-10 w-full h-full font-mono text-sm leading-relaxed text-white/90">
                                                            <p className="overflow-hidden whitespace-pre-wrap animate-[typing_3.5s_steps(40,end)_forwards] border-r-2 border-white">{generatedPrompt}</p>
                                                        </div>
                                                    </>
                                                ) : isGenerating ? (
                                                    <div className="absolute inset-0 blur-[8px] opacity-40 p-4 space-y-3 pointer-events-none select-none">
                                                        <div className="h-2 w-3/4 bg-white/40 rounded-full"></div>
                                                        <div className="h-2 w-1/2 bg-white/40 rounded-full"></div>
                                                        <div className="h-2 w-5/6 bg-white/40 rounded-full"></div>
                                                        <div className="h-2 w-2/3 bg-white/40 rounded-full"></div>
                                                    </div>
                                                ) : (
                                                    <div className="relative z-10 flex flex-col items-center justify-center w-full h-full gap-3">
                                                        <span className="material-symbols-outlined text-white/40 text-2xl">lock_clock</span>
                                                        <span className="text-[10px] text-white/60 uppercase tracking-[0.3em] font-bold">Results Ready</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>
                        <footer className="relative z-10 flex flex-col gap-6 px-10 py-8 text-center border-t border-white/5 bg-black/40 backdrop-blur-sm">
                            <p className="text-slate-500 text-[10px] font-normal leading-normal uppercase tracking-[0.4em]">© 2026 HANDOUT MUSIC DROP</p>
                        </footer>

                        {/* PREVIEW ERROR MODAL */}
                        {previewError && (
                            <div className="absolute inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-300">
                                <div className="border border-red-500 bg-black p-8 max-w-md w-full relative overflow-hidden shadow-[0_0_50px_rgba(239,68,68,0.2)]">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-pulse"></div>
                                    <span className="material-symbols-outlined text-red-500 text-6xl mb-6">warning</span>
                                    <h2 className="text-3xl font-black text-red-500 uppercase tracking-widest mb-4">Signal Lost</h2>
                                    <div className="font-mono text-sm text-white/80 mb-8 border border-white/10 bg-white/5 p-4 uppercase">
                                        {previewError}
                                    </div>
                                    <button
                                        onClick={() => setPreviewError(null)}
                                        className="px-8 py-4 bg-red-500 text-black font-bold uppercase tracking-widest hover:bg-red-400 transition-colors w-full shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                                    >
                                        Acknowledge
                                    </button>
                                </div>
                            </div>
                        )}

                    </main>
                </div>
            </div>
            {/* Base flicker/typing keyframes */}
            <style jsx global>{`
                @keyframes flash {
                    0% { opacity: 0; transform: scale(0.95) translateY(10px); }
                    20% { opacity: 1; transform: scale(1) translateY(0); }
                    80% { opacity: 1; transform: scale(1) translateY(0); }
                    100% { opacity: 0; transform: scale(0.95) translateY(-10px); }
                }
                @keyframes typing {
                    from { width: 0; max-height: 100% }
                    to { width: 100%; max-height: 100% }
                }
                @keyframes creditsDrop {
                    0% { color: #ffffff; }
                    50% { color: #ef4444; }
                    100% { color: #ffffff; }
                }
            `}</style>
        </div>
    );
}
