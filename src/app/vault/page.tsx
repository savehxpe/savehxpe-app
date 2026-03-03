'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { doc, runTransaction, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function VaultExplorer() {
    const router = useRouter();
    const { userDoc, firebaseUser } = useAuth();

    // Simulating access control: if tier is not PREMIUM, show gated view.
    const isPremium = userDoc?.tier.current === 'PREMIUM' || userDoc?.tier.current === 'STANDARD' || !!userDoc?.unlocked_assets?.includes('VAULT_ACCESS');

    const [systemMessage, setSystemMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

    const showMessage = (type: 'error' | 'success', text: string) => {
        setSystemMessage({ type, text });
        setTimeout(() => setSystemMessage(null), 5000);
    };

    const handleUnlockAttempt = async () => {
        if (!firebaseUser || !userDoc) return;
        if (userDoc.credits < 50) {
            showMessage('error', 'LEDGER FAILED: Insufficient credits to unlock.');
            return;
        }

        try {
            const userRef = doc(db, 'users', firebaseUser.uid);
            await runTransaction(db, async (transaction) => {
                const docSnap = await transaction.get(userRef);
                if (!docSnap.exists()) throw "User does not exist";
                const data = docSnap.data();
                const currentCredits = data.credits || 0;
                if (currentCredits < 50) throw "Not enough credits";

                const currentAssets = data.unlocked_assets || [];
                if (currentAssets.includes('VAULT_ACCESS')) return;

                transaction.update(userRef, {
                    credits: currentCredits - 50,
                    unlocked_assets: arrayUnion('VAULT_ACCESS')
                });
            });
            showMessage('success', 'TRANSMISSION VERIFIED: Vault Stream Unsealed.');
        } catch (err) {
            console.error(err);
            showMessage('error', 'LEDGER FAILED: Error Processing Transaction.');
        }
    };

    const handleAssetAction = async (stemId: string) => {
        if (!firebaseUser || !userDoc) return;
        setSystemMessage(null);

        const isOwned = isPremium || userDoc.unlocked_assets?.includes(stemId);

        if (isOwned) {
            // DOWNLOAD logic
            try {
                const token = await firebaseUser.getIdToken();
                const res = await fetch('/api/get-download', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ item: stemId })
                });

                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    const errorMsg = data.error || (res.status === 404 ? 'File Not Found' : 'Unauthorized');
                    showMessage('error', `TRANSMISSION FAILED [${res.status}]: ${errorMsg}`);
                    return;
                }

                const data = await res.json();
                if (data.url) {
                    window.location.href = data.url;
                } else {
                    showMessage('error', `TRANSMISSION FAILED [500]: Invalid Secure Link`);
                }
            } catch (err) {
                console.error(err);
                showMessage('error', "TRANSMISSION FAILED [500]: Network Error");
            }
        } else {
            // UNLOCK logic
            if (userDoc.credits < 50) {
                showMessage('error', 'LEDGER FAILED: Insufficient Credits (50 CR Required)');
                return;
            }

            try {
                const userRef = doc(db, 'users', firebaseUser.uid);
                await runTransaction(db, async (transaction) => {
                    const docSnap = await transaction.get(userRef);
                    if (!docSnap.exists()) throw "User does not exist";
                    const data = docSnap.data();
                    const currentCredits = data.credits || 0;
                    if (currentCredits < 50) throw "Not enough credits";

                    const currentAssets = data.unlocked_assets || [];
                    if (currentAssets.includes(stemId)) return;

                    transaction.update(userRef, {
                        credits: currentCredits - 50,
                        unlocked_assets: arrayUnion(stemId)
                    });
                });
                showMessage('success', 'TRANSMISSION VERIFIED: Asset Unlocked.');
            } catch (err) {
                console.error(err);
                showMessage('error', "LEDGER FAILED: Error Processing Transaction.");
            }
        }
    };

    const VAULT_ITEMS = [
        {
            id: 'BUNDLE',
            title: 'Handout Remix\nStems',
            type: 'Stems',
            icon: 'piano',
            description: 'Included: Drums, Bass, Synth, Vox',
            ext: '.ZIP'
        },
        {
            id: 'INSTRUMENTAL',
            title: 'Instrumental\nMaster',
            type: 'Master',
            icon: 'album',
            description: 'Format: WAV (24bit / 48kHz)',
            ext: '.WAV'
        },
        {
            id: 'VIDEO',
            title: 'Studio Sessions\nVideo',
            type: 'Video',
            icon: 'smart_display',
            description: 'Duration: 14:02 // 4K',
            ext: '.MP4'
        }
    ];

    return (
        <div className="bg-white text-black font-display min-h-screen flex flex-col overflow-x-hidden selection:bg-black selection:text-white relative">
            <div className="fixed inset-0 z-0 bg-grid-pattern bg-[length:40px_40px] pointer-events-none opacity-60"></div>

            <header className="relative z-20 w-full border-b-2 border-black bg-white px-6 py-4 md:px-12 flex justify-between items-center sticky top-0">
                <div className="flex items-center gap-6">
                    <div className="flex flex-col cursor-pointer" onClick={() => router.push('/dashboard')}>
                        <h1 className="font-display font-black text-2xl tracking-tighter leading-none hover:text-slate-600 transition-colors">SAVEHXPE</h1>
                        <span className="font-mono text-[10px] tracking-widest uppercase text-black/60">Vault Explorer</span>
                    </div>
                    <div className="h-8 w-[2px] bg-black hidden md:block"></div>
                    <div className={`hidden md:flex items-center gap-2 border border-black px-3 py-1 ${isPremium ? 'bg-black text-white' : 'bg-white text-black'}`}>
                        <span className="material-symbols-outlined text-sm">{isPremium ? 'verified' : 'lock'}</span>
                        <span className="font-mono text-xs font-bold tracking-widest uppercase">
                            {isPremium ? 'Premium Status' : 'Gated Access'}
                        </span>
                    </div>
                </div>
                {systemMessage && (
                    <div className={`absolute left-1/2 -translate-x-1/2 px-4 py-2 border-2 border-black font-mono text-xs uppercase tracking-widest font-bold z-50 ${systemMessage.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-black'}`}>
                        {systemMessage.text}
                    </div>
                )}
                <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end">
                        <span className="font-mono text-[10px] uppercase tracking-widest text-black/60">Credit Ledger</span>
                        <div className="font-mono text-xl font-bold tracking-tight">{userDoc?.credits ?? 0} CR</div>
                    </div>
                    <div className="w-10 h-10 border-2 border-black rounded-full flex items-center justify-center bg-black text-white hover:bg-slate-800 transition-colors cursor-pointer border-t-2">
                        <span className="material-symbols-outlined">person</span>
                    </div>
                </div>
            </header>

            <main className="relative z-10 flex-1 flex flex-col w-full max-w-[1920px] mx-auto p-6 md:p-12 gap-12">
                <section className="w-full flex flex-col gap-6">
                    <div className="flex justify-between items-end border-b border-black pb-2">
                        <h2 className="text-4xl md:text-6xl font-extrabold uppercase tracking-tighter">Handout <span className="text-stroke-1 text-transparent bg-clip-text bg-black font-outline-2">Remix</span></h2>
                        <div className="font-mono text-xs uppercase tracking-widest mb-2 flex items-center gap-2">
                            <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
                            Now Playing
                        </div>
                    </div>

                    <div className={`bg-white p-6 md:p-10 flex flex-col md:flex-row gap-8 items-center border-[1px] border-black shadow-[4px_4px_0_0_#000] relative`}>
                        {!isPremium && (
                            <div className="absolute inset-0 z-30 locked-vault-blur flex flex-col items-center justify-center text-white bg-black/60">
                                <span className="material-symbols-outlined text-5xl mb-2">lock</span>
                                <h3 className="font-bold text-xl uppercase tracking-widest">Vault Sealed</h3>
                                <p className="font-mono text-xs max-w-sm text-center mt-2 opacity-80">Requires Premium Status or one-time unlock.</p>
                                <button
                                    onClick={handleUnlockAttempt}
                                    className="mt-4 px-6 py-2 bg-white text-black font-bold uppercase tracking-wider text-sm hover:bg-slate-200"
                                >
                                    Unlock (50 CR)
                                </button>
                            </div>
                        )}

                        <div className="w-full md:w-64 shrink-0 flex flex-col gap-4">
                            <div className="aspect-square bg-black flex items-center justify-center text-white relative overflow-hidden group">
                                <span className="material-symbols-outlined text-6xl group-hover:scale-110 transition-transform duration-500">graphic_eq</span>
                                <div className="absolute bottom-2 left-2 font-mono text-[10px] border border-white px-1">WAV // 24BIT</div>
                            </div>
                            <div className="flex justify-between items-center">
                                <div>
                                    <div className="font-bold text-lg leading-none">HANDOUT</div>
                                    <div className="font-mono text-xs text-black/60">VIP MIX</div>
                                </div>
                                <span className="font-mono text-sm">03:42</span>
                            </div>
                        </div>

                        <div className="flex-1 w-full flex flex-col justify-between h-full gap-8">
                            <div className="flex items-center justify-center h-32 md:h-40 gap-[2px] w-full px-4 overflow-hidden mask-image-linear">
                                {Array.from({ length: 30 }).map((_, i) => (
                                    <div
                                        key={i}
                                        className={`w-1 mx-[1px] bg-black rounded-full transition-all duration-300 ${isPremium ? 'animate-[wave-anim_1.2s_ease-in-out_infinite]' : 'h-[10%]'}`}
                                        style={{ animationDelay: isPremium ? `${(i % 7) * 0.1}s` : '0s', height: isPremium ? '20%' : '10%' }}
                                    ></div>
                                ))}
                            </div>
                            <div className="flex items-center gap-4 sm:gap-6 border-t-2 border-black pt-6">
                                <button className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center border-2 border-black hover:bg-black hover:text-white transition-colors">
                                    <span className="material-symbols-outlined">skip_previous</span>
                                </button>
                                <button className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center bg-black text-white hover:bg-black/80 transition-colors">
                                    <span className="material-symbols-outlined text-3xl sm:text-4xl">pause</span>
                                </button>
                                <button className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center border-2 border-black hover:bg-black hover:text-white transition-colors">
                                    <span className="material-symbols-outlined">skip_next</span>
                                </button>
                                <div className="flex-1 h-2 bg-black/10 relative group cursor-pointer overflow-hidden">
                                    <div className="absolute inset-0 bg-black w-[45%]"></div>
                                </div>
                                <button className="flex items-center gap-2 font-mono text-xs font-bold uppercase hover:underline">
                                    <span className="material-symbols-outlined text-lg">volume_up</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="flex flex-col gap-6 relative">
                    <div className="flex justify-between items-end border-b border-black pb-2">
                        <h3 className="text-2xl font-bold uppercase tracking-tight">Unlocked Assets</h3>
                        <div className="font-mono text-xs uppercase tracking-widest text-black/60">3 Items Available</div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {VAULT_ITEMS.map((item) => {
                            const isOwned = isPremium || userDoc?.unlocked_assets?.includes(item.id);
                            return (
                                <div key={item.id} className="group relative bg-white border border-black p-4 flex flex-col gap-4 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-shadow duration-300">
                                    <div className="absolute top-2 right-2 z-10 bg-black text-white px-2 py-1 font-mono text-[10px] uppercase">{item.type}</div>
                                    <div className="aspect-video bg-gray-100 relative overflow-hidden flex items-center justify-center border border-black/10">
                                        <span className="material-symbols-outlined text-6xl text-black/20 group-hover:text-black transition-colors duration-500">{item.icon}</span>
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent"></div>
                                        {item.id === 'VIDEO' && (
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/5">
                                                <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center text-white">
                                                    <span className="material-symbols-outlined">play_arrow</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <h4 className="font-bold text-xl uppercase leading-tight whitespace-pre-line">{item.title}</h4>
                                        <p className="font-mono text-xs text-black/60 uppercase">{item.description}</p>
                                    </div>
                                    <button
                                        onClick={() => handleAssetAction(item.id)}
                                        className="mt-auto w-full border-2 border-black text-black bg-white hover:bg-black hover:text-white h-12 font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                    >
                                        {isOwned ? (
                                            <>
                                                <span className="material-symbols-outlined text-lg">download</span> DOWNLOAD {item.ext}
                                            </>
                                        ) : (
                                            <>
                                                <span className="material-symbols-outlined text-lg">lock_open</span> UNLOCK (50 CR)
                                            </>
                                        )}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </section>
            </main>

            <footer className="relative z-20 border-t-2 border-black w-full bg-white py-8 px-6 md:px-12 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-xl">{isPremium ? 'lock_open' : 'lock'}</span>
                    <span className="font-mono text-[10px] uppercase tracking-widest">
                        {isPremium ? 'Encrypted Channel: Open' : 'Encrypted Channel: Locked'}
                    </span>
                </div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-center md:text-right">
                    <p>© 2026 SAVEHXPE. All Rights Reserved.</p>
                    <p className="text-black/40 mt-1">ID: 8X-9902-{isPremium ? 'PREM' : 'GUEST'}</p>
                </div>
            </footer>
        </div>
    );
}
