'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { createCheckoutSession } from '@/app/actions/createCheckoutSession';

const STANDARD_PRICE_ID = 'price_1T85FTJz7Jx6TKcuPgihv3KV';
const PREMIUM_PRICE_ID = 'price_1T85GFJz7Jx6TKcu4FISKYdh';

export default function VaultPricing() {
    const { firebaseUser } = useAuth();
    const [loadingTier, setLoadingTier] = useState<'Standard' | 'Premium' | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleInitiateTransfer = async (tier: 'Standard' | 'Premium', priceId: string) => {
        if (!firebaseUser) {
            setErrorMsg('ACCESS DENIED. CITIZEN AUTHENTICATION REQUIRED.');
            return;
        }

        try {
            setLoadingTier(tier);
            setErrorMsg(null);

            const idToken = await firebaseUser.getIdToken(true);
            const res = await createCheckoutSession(priceId, idToken);

            if (res.error) {
                setErrorMsg(res.error);
                setLoadingTier(null);
            } else if (res.url) {
                window.location.href = res.url;
            } else {
                setErrorMsg('SYSTEM ERROR: UNABLE TO GENERATE SECURE LINK.');
                setLoadingTier(null);
            }
        } catch (err: unknown) {
            console.error('Transfer Error:', err);
            setErrorMsg('ENCRYPTION FAILURE: COULD NOT INITIATE TRANSFER.');
            setLoadingTier(null);
        }
    };

    return (
        <div className="w-full max-w-6xl mx-auto rounded-lg overflow-hidden border border-[#00FFFF]/20 relative bg-[#050505] p-6 lg:p-12 shadow-[0_0_50px_rgba(0,255,255,0.05)] font-mono selection:bg-[#00FFFF] selection:text-black">

            {/* ═══ CRT Scanline Overlay ═══ */}
            <div
                className="absolute inset-0 z-0 pointer-events-none"
                style={{
                    background: 'linear-gradient(rgba(0,0,0,0) 50%, rgba(0,0,0,0.2) 50%)',
                    backgroundSize: '100% 4px'
                }}
            />

            <div className="relative z-10 text-center mb-12 border-b border-[#00FFFF]/30 pb-6">
                <h2 className="text-3xl lg:text-5xl font-black text-[#00FFFF] tracking-widest uppercase mb-2" style={{ textShadow: '0 0 10px rgba(0,255,255,0.5)' }}>
                    VAULT ACCESS
                </h2>
                <p className="text-[#00FFFF]/60 tracking-[0.2em] text-xs lg:text-sm uppercase">
                    Select your security clearance level
                </p>
                {errorMsg && (
                    <div className="mt-6 border border-red-500 bg-red-500/10 p-4 text-red-500 font-bold uppercase tracking-widest text-sm inline-block shadow-[0_0_15px_rgba(239,68,68,0.4)]">
                        {errorMsg}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10 w-full">

                {/* ─── TIER 1: STANDARD CITIZEN ─── */}
                <div className="border border-white/20 bg-black/40 p-8 flex flex-col items-center text-center transition-all hover:border-[#00FFFF]/50 hover:bg-[#00FFFF]/5 min-h-[450px]">
                    <h3 className="text-2xl font-bold text-white uppercase tracking-widest mb-2">Standard Citizen</h3>
                    <div className="text-[#00FFFF] font-black text-4xl mb-8 tracking-tighter">
                        $5<span className="text-lg text-[#00FFFF]/50 font-normal">/mo</span>
                    </div>

                    <ul className="text-sm text-white/70 space-y-4 mb-auto text-left w-full max-w-xs">
                        <li className="flex items-start gap-3">
                            <span className="text-[#00FFFF] mt-0.5">✓</span> Base Vault Access
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-[#00FFFF] mt-0.5">✓</span> Standard Mission Comms
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-[#00FFFF] mt-0.5">✓</span> Standard Engagement Multiplier
                        </li>
                    </ul>

                    <button
                        onClick={() => handleInitiateTransfer('Standard', STANDARD_PRICE_ID)}
                        disabled={loadingTier !== null}
                        className={`mt-10 w-full lg:w-3/4 py-4 px-6 border font-bold tracking-[0.2em] transition-all uppercase
                            ${loadingTier === 'Standard'
                                ? 'bg-[#00FFFF]/20 border-[#00FFFF]/50 text-[#00FFFF] cursor-wait'
                                : 'bg-transparent border-white/30 text-white hover:border-[#00FFFF] hover:text-[#00FFFF] hover:shadow-[0_0_20px_rgba(0,255,255,0.2)]'
                            } 
                            ${loadingTier === 'Premium' ? 'opacity-50 cursor-not-allowed border-white/10 text-white/30' : ''}
                        `}
                    >
                        {loadingTier === 'Standard' ? 'Decrypting Secure Link...' : 'Initiate Transfer'}
                    </button>
                </div>

                {/* ─── TIER 2: PREMIUM CITIZEN ─── */}
                <div
                    className="border-2 border-[#FFD700]/60 bg-black/60 p-8 flex flex-col items-center text-center transition-all shadow-[0_0_30px_rgba(255,215,0,0.1)] hover:shadow-[0_0_50px_rgba(255,215,0,0.2)] hover:border-[#FFD700] relative overflow-hidden min-h-[450px]"
                    style={{ animation: 'pulseBorder 3s infinite' }}
                >
                    <style>{`
                        @keyframes pulseBorder {
                            0% { box-shadow: 0 0 10px rgba(255, 215, 0, 0.2); border-color: rgba(255, 215, 0, 0.5); }
                            50% { box-shadow: 0 0 25px rgba(255, 215, 0, 0.5); border-color: rgba(255, 215, 0, 0.9); }
                            100% { box-shadow: 0 0 10px rgba(255, 215, 0, 0.2); border-color: rgba(255, 215, 0, 0.5); }
                        }
                    `}</style>

                    <div className="absolute top-4 right-4 bg-[#FFD700]/10 border border-[#FFD700]/50 text-[#FFD700] text-[10px] sm:text-xs font-black px-3 py-1 uppercase tracking-widest shadow-[0_0_10px_rgba(255,215,0,0.3)]">
                        [PRIORITY ACCESS]
                    </div>

                    <h3 className="text-2xl font-bold text-white uppercase tracking-widest mb-2 mt-4" style={{ textShadow: '0 0 10px rgba(255,215,0,0.3)' }}>
                        Premium Citizen
                    </h3>
                    <div className="text-[#FFD700] font-black text-4xl mb-8 tracking-tighter" style={{ textShadow: '0 0 20px rgba(255,215,0,0.5)' }}>
                        $15<span className="text-lg text-[#FFD700]/50 font-normal">/mo</span>
                    </div>

                    <ul className="text-sm text-white/90 space-y-4 mb-auto text-left w-full max-w-xs font-bold">
                        <li className="flex items-start gap-3">
                            <span className="text-[#FFD700] mt-0.5">✓</span> Full Stems & Instrumentals
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-[#FFD700] mt-0.5">✓</span> Beat Breakdowns
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-[#FFD700] mt-0.5">✓</span> 2x XP Multiplier in Arcade
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-[#FFD700] mt-0.5">✓</span> Direct Syndicate Comms
                        </li>
                    </ul>

                    <button
                        onClick={() => handleInitiateTransfer('Premium', PREMIUM_PRICE_ID)}
                        disabled={loadingTier !== null}
                        className={`mt-10 w-full lg:w-3/4 py-4 px-6 border-2 font-black tracking-[0.2em] relative transition-all uppercase
                            ${loadingTier === 'Premium'
                                ? 'bg-[#FFD700]/20 border-[#FFD700] text-[#FFD700] cursor-wait'
                                : 'bg-transparent border-[#FFD700]/70 text-[#FFD700] hover:bg-[#FFD700] hover:text-black hover:border-[#FFD700] hover:shadow-[0_0_25px_rgba(255,215,0,0.5)]'
                            }
                            ${loadingTier === 'Standard' ? 'opacity-50 cursor-not-allowed border-[#FFD700]/30 text-[#FFD700]/50' : ''}
                        `}
                    >
                        {loadingTier === 'Premium' ? 'Decrypting Secure Link...' : 'Initiate Transfer'}
                    </button>
                </div>

            </div>
        </div>
    );
}
