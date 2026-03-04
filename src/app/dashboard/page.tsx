'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { doc, runTransaction, arrayUnion, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import CommanderWidget from '@/components/CommanderWidget';
import SystemAlert from '@/components/SystemAlert';
import { useSystemStatus } from '@/hooks/useSystemStatus';
import RemixPromoBanner from '@/components/RemixPromoBanner';

export default function Dashboard() {
    const router = useRouter();
    const { userDoc, firebaseUser, logout } = useAuth();
    const { systemStatus } = useSystemStatus();

    // Alchemist State
    const [promptInput, setPromptInput] = useState('');
    const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [justDeducted, setJustDeducted] = useState(false);
    const [showAscensionToast, setShowAscensionToast] = useState(false);

    useEffect(() => {
        if (userDoc?.ascensionVerifiedToast && firebaseUser) {
            setShowAscensionToast(true);
            const userRef = doc(db, 'users', firebaseUser.uid);
            updateDoc(userRef, { ascensionVerifiedToast: false }).catch(console.error);
            setTimeout(() => setShowAscensionToast(false), 6000);
        }
    }, [userDoc?.ascensionVerifiedToast, firebaseUser]);

    // Stem Mixer State
    const hasStandardAccess = userDoc?.tier.current === 'STANDARD' || userDoc?.tier.current === 'PREMIUM' || (userDoc?.xp.total ?? 0) >= 1000;
    const isOwned = (assetId: string) => hasStandardAccess || !!userDoc?.unlocked_assets?.includes(assetId);

    const handleGenerate = async () => {
        if (!firebaseUser || !userDoc || !promptInput.trim()) return;

        if (userDoc.credits < 10) {
            alert('Insufficient credits. 10 CR required to use Prompt Alchemist.');
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
                if (currentCredits < 10) throw "Not enough credits";
                transaction.update(userRef, { credits: currentCredits - 10 });
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

        const assetId = isBundle ? 'BUNDLE' : stemName.toUpperCase();
        const cost = isBundle ? 100 : 50;
        const alreadyOwned = userDoc.unlocked_assets?.includes(assetId);

        if (hasStandardAccess || alreadyOwned || (isBundle && alreadyOwned)) {
            // They already have access, just fetch the link directly
            await fetchDownloadUrl(assetId);
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
                const data = docSnap.data();
                const currentCredits = data.credits || 0;
                if (currentCredits < cost) throw "Not enough credits";

                const currentAssets = data.unlocked_assets || [];
                if (currentAssets.includes(assetId)) {
                    // Already unlocked by another process
                    return;
                }

                transaction.update(userRef, {
                    credits: currentCredits - cost,
                    unlocked_assets: arrayUnion(assetId)
                });
            });

            alert("Transmission Verified. Initiating Secure Download.");
            // Immediately open the signed download URL
            await fetchDownloadUrl(assetId);

        } catch (error) {
            console.error('Error unlocking item:', error);
            alert("Error Processing Transaction.");
        }
    };

    return (
        <div className="bg-[#000000] text-slate-100 font-display min-h-screen flex flex-col overflow-x-hidden selection:bg-white selection:text-black">
            <SystemAlert />
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
                                        <span className="text-lg font-bold text-white">{userDoc?.xp?.total ?? 500}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1 relative">
                                    <span className="text-xs text-slate-500 uppercase tracking-widest">Credits</span>
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm text-green-500">database</span>
                                        <span className={`text-lg font-bold text-white ${justDeducted ? 'animate-credits-drop' : ''}`}>
                                            {userDoc?.credits ?? 20}
                                        </span>
                                    </div>
                                    {/* Flash Deduction */}
                                    {justDeducted && (
                                        <div className="absolute top-8 left-6 text-red-500 text-xs font-mono font-bold animate-[flash_2s_ease-out_forwards]">
                                            -10
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col gap-1 mt-2 p-3 bg-white/5 border border-white/10 rounded">
                                <span className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold">Engagement Score</span>
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm text-blue-400">monitoring</span>
                                    <span className="text-xl font-bold font-mono tracking-widest text-[#E2E8F0]">
                                        {(Math.log10((userDoc?.xp?.total ?? 500) + 1) * 20).toFixed(1)}
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
                                Ascension
                            </button>

                            {/* Ascension Verified Toast */}
                            {showAscensionToast && (
                                <div className="mt-8 p-4 bg-yellow-500/10 border border-yellow-500/50 rounded-md animate-[flash_ease-in-out_6s]">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="material-symbols-outlined text-yellow-500 text-xl">verified</span>
                                        <h3 className="text-yellow-500 font-display uppercase tracking-widest text-sm font-bold">Ascension Verified</h3>
                                    </div>
                                    <p className="text-xs text-yellow-500/80 font-mono">NODE COMMANDER STATUS ACTIVE. YOU NOW EARN 1.5X XP.</p>
                                </div>
                            )}

                            {/* Commander Elite Widget */}
                            <CommanderWidget userDoc={userDoc} firebaseUser={firebaseUser} setPromptInput={setPromptInput} />

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
                            {/* Remix Promo Section */}
                            <section className="p-6 md:p-10 lg:p-16 w-full">
                                <RemixPromoBanner />

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
                                                disabled={systemStatus.maintenance_mode && !isOwned('BUNDLE')}
                                                className={`w-full md:w-72 py-4 text-xs font-bold uppercase tracking-[0.15em] transition-colors ${systemStatus.maintenance_mode && !isOwned('BUNDLE') ? 'bg-slate-500 text-slate-200 cursor-not-allowed grayscale' : isOwned('BUNDLE') ? 'bg-black text-white border border-white hover:bg-white hover:text-black' : 'bg-white text-black hover:bg-slate-200'} text-center`}
                                            >
                                                {isOwned('BUNDLE') ? 'DOWNLOAD .ZIP' : 'UNLOCK ARCHIVE — 100 CR'}
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
                                            COST: 10 CREDITS
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                                        <div className="lg:col-span-7 flex flex-col gap-4">
                                            <div className="bg-black border border-white p-1">
                                                <div className="flex flex-col md:flex-row">
                                                    <input
                                                        type="text"
                                                        value={promptInput}
                                                        onChange={(e) => setPromptInput(e.target.value)}
                                                        placeholder="DESCRIBE THE VIBE (e.g. Gritty 90s boom bap with distorted bass)"
                                                        className="bg-black text-white border-none focus:ring-0 placeholder-white/40 uppercase tracking-widest text-sm font-bold w-full py-4 px-6 outline-none"
                                                    />
                                                    <button
                                                        onClick={handleGenerate}
                                                        disabled={isGenerating || !promptInput.trim() || systemStatus.maintenance_mode}
                                                        className={`bg-white text-black px-8 py-4 text-xs font-bold uppercase tracking-[0.2em] transition-colors whitespace-nowrap border-l border-white/10 ${systemStatus.maintenance_mode ? 'bg-slate-600 grayscale cursor-not-allowed text-slate-300' : 'hover:bg-slate-200 disabled:opacity-50'}`}
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
                                                                    <span className="text-xs font-bold uppercase tracking-widest">PROMPT ARCHITECTED: -10 CREDITS</span>
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
                                                        <span className="text-[10px] text-white/60 uppercase tracking-[0.3em] font-bold">RESULTS READY</span>
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
