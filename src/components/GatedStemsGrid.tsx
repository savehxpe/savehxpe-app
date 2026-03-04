'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { doc, runTransaction, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useSystemStatus } from '@/hooks/useSystemStatus';
import { VAULT_ITEMS } from '@/lib/vaultConfig';

export default function GatedStemsGrid() {
    const { userDoc, firebaseUser } = useAuth();
    const { systemStatus } = useSystemStatus();

    const isPremium = userDoc?.tier?.current === 'PREMIUM' || userDoc?.tier?.current === 'STANDARD' || !!userDoc?.unlocked_assets?.includes('VAULT_ACCESS');

    const [systemMessage, setSystemMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);
    const [playingStem, setPlayingStem] = useState<string | null>(null);
    const [verifying, setVerifying] = useState<string | null>(null);

    const showMessage = (type: 'error' | 'success', text: string) => {
        setSystemMessage({ type, text });
        setTimeout(() => setSystemMessage(null), 5000);
    };

    /**
     * Mobile-safe preview logic. Audio API must be triggered exactly inside the onClick stack.
     */
    const handlePreview = (previewUrl: string, stemId: string) => {
        if (!previewUrl) return;
        if (playingStem === stemId) return; // Ignore if already playing

        setPlayingStem(stemId);
        const audio = new Audio(previewUrl);
        audio.play().catch((e) => {
            console.error("Audio playback blocked", e);
            showMessage('error', 'PREVIEW ERROR: Audio playback blocked.');
            setPlayingStem(null);
        });

        audio.addEventListener('ended', () => {
            setPlayingStem(null);
        });
    };

    /**
     * Pure idempotent transaction wrapper for 50 CR item
     */
    const handleUnlock = async (stemId: string, cost: number) => {
        if (!firebaseUser || !userDoc) return;
        if (userDoc.credits < cost) {
            showMessage('error', 'INSUFFICIENT FUNDS');
            return;
        }
        if (userDoc.unlocked_assets?.includes(stemId)) return;

        setVerifying(stemId);
        try {
            const userRef = doc(db, 'users', firebaseUser.uid);
            await runTransaction(db, async (transaction) => {
                const docSnap = await transaction.get(userRef);
                const data = docSnap.data();
                if (!data) throw "No data";
                const currentCredits = data.credits || 0;
                if (currentCredits < cost) throw "Not enough credits";

                transaction.update(userRef, {
                    credits: currentCredits - cost,
                    unlocked_assets: arrayUnion(stemId)
                });
            });
            showMessage('success', 'TRANSMISSION VERIFIED: Asset Unlocked.');
        } catch (err) {
            console.error(err);
            showMessage('error', "LEDGER FAILED: Error Processing Transaction.");
        } finally {
            setVerifying(null);
        }
    };

    /**
     * Force-downloads the asset after extracting the stream as a Blob
     */
    const handleDownload = async (stemId: string, ext: string, downloadUrl?: string) => {
        if (!firebaseUser) return;
        setSystemMessage(null);
        setVerifying(stemId);

        try {
            if (downloadUrl) {
                // The Extraction Hack (Forces true download, bypassing browser stream-open)
                const response = await fetch(downloadUrl);
                const blob = await response.blob();
                const blobUrl = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = `${stemId}${ext}`; // Force the filename natively
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(blobUrl);
                return;
            }

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
                setVerifying(null);
                return;
            }

            const data = await res.json();
            if (data.url) {
                // The Extraction Hack (Forces true download, bypassing browser stream-open)
                const response = await fetch(data.url);
                const blob = await response.blob();
                const blobUrl = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = `${stemId}${ext}`; // Force the filename natively
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(blobUrl);
            } else {
                showMessage('error', `TRANSMISSION FAILED [500]: Invalid Secure Link`);
            }
        } catch (err) {
            console.error(err);
            showMessage('error', "TRANSMISSION FAILED [500]: Network Error");
        } finally {
            setVerifying(null);
        }
    };

    return (
        <div className="flex flex-col gap-6 relative">
            {systemMessage && (
                <div className={`absolute -top-12 left-1/2 -translate-x-1/2 px-4 py-2 border-2 border-black font-mono text-xs uppercase tracking-widest font-bold z-50 ${systemMessage.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-black'}`}>
                    {systemMessage.text}
                </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {VAULT_ITEMS.map((item) => {
                    const isOwned = isPremium || userDoc?.unlocked_assets?.includes(item.id);
                    return (
                        <div key={item.id} className="group relative bg-white border border-black p-4 flex flex-col gap-4 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-shadow duration-300">
                            <div className="absolute top-2 right-2 z-10 bg-black text-white px-2 py-1 font-mono text-[10px] uppercase">{item.type}</div>
                            <div className="aspect-video bg-gray-100 relative overflow-hidden flex items-center justify-center border border-black/10">
                                <span className="material-symbols-outlined text-6xl text-black/20 group-hover:text-black transition-colors duration-500">{item.icon}</span>
                                <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent"></div>

                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10">
                                    <button
                                        onClick={() => handlePreview(item.previewUrl, item.id)}
                                        className="w-12 h-12 bg-black rounded-full flex items-center justify-center text-white transform hover:scale-110 transition-transform"
                                    >
                                        <span className="material-symbols-outlined">{playingStem === item.id ? 'equalizer' : 'play_arrow'}</span>
                                    </button>
                                </div>
                            </div>
                            <div className="flex flex-col gap-1">
                                <h4 className="font-bold text-xl uppercase leading-tight whitespace-pre-line">{item.title}</h4>
                                <p className="font-mono text-xs text-black/60 uppercase">{item.description}</p>
                            </div>
                            <button
                                onClick={() => isOwned ? handleDownload(item.id, item.ext, item.downloadUrl) : handleUnlock(item.id, 50)}
                                disabled={systemStatus?.maintenance_mode || verifying === item.id}
                                className={`mt-auto w-full border-2 border-black h-12 font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${systemStatus?.maintenance_mode ? 'bg-slate-400 text-slate-700 cursor-not-allowed grayscale' : 'text-black bg-white hover:bg-black hover:text-white'}`}
                            >
                                {verifying === item.id ? (
                                    <>VERIFYING LEDGER...</>
                                ) : isOwned ? (
                                    <>
                                        <span className="material-symbols-outlined text-lg">download</span> DOWNLOAD {item.ext}
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-lg">lock_open</span> 50 CREDITS TO UNLOCK
                                    </>
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
