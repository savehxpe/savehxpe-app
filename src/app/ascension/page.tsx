'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder');

function AuthorizeButton({ selectedTier, billingFrequency }: { selectedTier: string, billingFrequency: string }) {
    const { firebaseUser } = useAuth();
    const [isAuthorizing, setIsAuthorizing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAuthorize = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!firebaseUser) return;

        setIsAuthorizing(true);
        setError(null);

        try {
            const res = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tier: selectedTier,
                    frequency: billingFrequency,
                    uid: firebaseUser.uid
                })
            });

            if (!res.ok) {
                let errorMsg = 'Failed to initialize checkout';
                try {
                    const data = await res.json();
                    if (data.error) errorMsg = data.error;
                } catch (e) { }

                throw new Error(errorMsg);
            }

            const data = await res.json();

            if (!data.sessionId) {
                throw new Error('No session ID returned from API');
            }

            const stripe = await stripePromise;
            if (!stripe) {
                throw new Error('Stripe failed to initialize');
            }

            const { error: stripeError } = await (stripe as any).redirectToCheckout({
                sessionId: data.sessionId
            });

            if (stripeError) {
                setError(stripeError.message || 'Payment forwarding failed');
            }

        } catch (err: any) {
            console.error('Payment failed:', err);
            setError(err.message || 'Payment processing failed due to a system error.');
        } finally {
            setIsAuthorizing(false);
        }
    };

    return (
        <form onSubmit={handleAuthorize} className="flex flex-col gap-6 relative mt-4">
            {isAuthorizing && (
                <div className="absolute -inset-10 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.4),transparent)] skew-x-[-20deg] pointer-events-none z-20 animate-[scan_1.5s_linear_infinite]" />
            )}

            {error && (
                <div className="text-red-500 text-xs font-mono uppercase tracking-widest text-center border border-red-500/30 p-3 bg-red-500/10">
                    {error}
                </div>
            )}

            <button
                type="submit"
                disabled={isAuthorizing}
                className="w-full bg-white text-black h-16 font-bold uppercase tracking-[0.2em] text-sm hover:bg-white/90 transition-all duration-200 relative overflow-hidden group"
            >
                <span className="relative z-10">{isAuthorizing ? 'INITIALIZING FREQUENCY...' : 'Authorize Ascension'}</span>
                <div className="absolute inset-0 bg-black/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            </button>
            <div className="text-center">
                <p className="text-[10px] text-white/30 font-mono uppercase tracking-widest">Encrypted via Stripe // 256-bit SSL</p>
            </div>
        </form>
    );
}


export default function AscensionPortal() {
    const router = useRouter();
    const { userDoc } = useAuth();

    const [billingFrequency, setBillingFrequency] = useState<'monthly' | 'yearly'>('yearly');
    const [selectedTier, setSelectedTier] = useState<'standard' | 'premium'>('standard');

    return (
        <div className="bg-black text-slate-100 font-display min-h-screen flex flex-col overflow-x-hidden selection:bg-white selection:text-black">
            <div className="relative flex min-h-screen w-full flex-col group/design-root">

                {/* Blurred Background Content */}
                <div className="layout-container flex h-full grow flex-col absolute inset-0 z-0">
                    <header className="flex items-center justify-between border-b border-white/10 px-6 py-4 lg:px-10 bg-black/50 backdrop-blur-sm filter blur-[2px] opacity-50 pointer-events-none">
                        <div className="flex items-center gap-4">
                            <div className="size-6 text-primary">
                                <span className="material-symbols-outlined text-2xl leading-none">graphic_eq</span>
                            </div>
                            <h2 className="text-primary text-xl font-bold leading-tight tracking-widest uppercase">savehxpe</h2>
                        </div>
                    </header>
                    <main className="flex flex-1 flex-col justify-center items-center px-4 py-12 lg:py-20 w-full max-w-7xl mx-auto filter blur-sm opacity-30 pointer-events-none transition-all duration-500">
                        <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-[400px]">
                            <div className="w-full h-full rounded-lg border border-white bg-black flex flex-col justify-between p-8 text-white">
                                <div>
                                    <h2 className="text-2xl font-bold tracking-tight uppercase mb-6 leading-none">Standard Tier<br />Benefits</h2>
                                    <ul className="flex flex-col gap-4">
                                        <li className="flex items-start gap-3">
                                            <span className="material-symbols-outlined text-sm mt-1">check_circle</span>
                                            <span className="text-sm font-bold tracking-wide uppercase">500 Credits Minted Monthly</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </main>
                    <footer className="relative flex flex-col gap-6 px-5 py-8 text-center border-t border-white/5 bg-black/80 backdrop-blur-sm filter blur-[2px] opacity-50 pointer-events-none mt-auto">
                        <p className="text-[#555555] text-xs font-normal leading-normal uppercase tracking-widest">© 2026 HANDOUT MUSIC DROP</p>
                    </footer>
                </div>

                {/* Overlaid Payment Modal */}
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-lg bg-black text-white border border-white shadow-[0_0_0_1px_rgba(255,255,255,0.1)] relative overflow-hidden">
                        <div className="p-6 md:p-10 flex flex-col gap-8 relative z-10">
                            {/* Close button to go back */}
                            <button onClick={() => router.back()} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors z-30">
                                <span className="material-symbols-outlined">close</span>
                            </button>

                            <div className="text-center border-b border-white/20 pb-6 mt-4">
                                <h2 className="text-2xl font-bold tracking-[0.2em] uppercase font-display">Outworld Citizenship</h2>
                                <p className="text-[10px] font-mono mt-2 text-white/50 tracking-widest">SECURE PAYMENT GATEWAY // V.2.0.4</p>
                            </div>

                            <div className="flex flex-col gap-4">
                                <div className="flex justify-between items-end px-2">
                                    <span className="text-xs font-mono text-white/60 uppercase tracking-wider">Select Frequency</span>
                                    <div className="flex gap-2">
                                        <span className="text-[10px] bg-white text-black px-1.5 py-0.5 font-bold uppercase tracking-wide animate-pulse">20% OFF ALL TIERS ANNUALLY</span>
                                    </div>
                                </div>
                                <div className="flex border border-white h-12">
                                    <button
                                        onClick={() => setBillingFrequency('monthly')}
                                        className={`flex-1 font-mono text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2 border-r border-white/20 ${billingFrequency === 'monthly' ? 'bg-white text-black font-bold' : 'text-white/40 hover:text-white'}`}
                                    >
                                        Monthly
                                        {billingFrequency === 'monthly' && <span className="material-symbols-outlined text-[16px]">check</span>}
                                    </button>
                                    <button
                                        onClick={() => setBillingFrequency('yearly')}
                                        className={`flex-1 font-mono text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2 ${billingFrequency === 'yearly' ? 'bg-white text-black font-bold' : 'text-white/40 hover:text-white'}`}
                                    >
                                        Yearly
                                        {billingFrequency === 'yearly' && <span className="material-symbols-outlined text-[16px]">check</span>}
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <label className="cursor-pointer group relative">
                                    <input
                                        type="radio"
                                        name="tier"
                                        value="standard"
                                        className="peer sr-only"
                                        checked={selectedTier === 'standard'}
                                        onChange={() => setSelectedTier('standard')}
                                    />
                                    <div className="border border-white/30 peer-checked:border-white peer-checked:bg-white/10 p-4 h-full transition-all hover:border-white/60">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-mono text-xs uppercase tracking-wider text-white/70">Standard</span>
                                            <div className={`w-2 h-2 rounded-full border border-white ${selectedTier === 'standard' ? 'bg-white' : ''}`}></div>
                                        </div>
                                        <div className="font-display font-bold text-lg">
                                            ${billingFrequency === 'yearly' ? '10' : '15'}<span className="text-xs font-normal text-white/50">/mo</span>
                                        </div>
                                    </div>
                                </label>
                                <label className="cursor-pointer group relative">
                                    <input
                                        type="radio"
                                        name="tier"
                                        value="premium"
                                        className="peer sr-only"
                                        checked={selectedTier === 'premium'}
                                        onChange={() => setSelectedTier('premium')}
                                    />
                                    <div className="border border-white/30 peer-checked:border-white peer-checked:bg-white/10 p-4 h-full transition-all hover:border-white/60">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-mono text-xs uppercase tracking-wider text-white/70">Premium</span>
                                            <div className={`w-2 h-2 rounded-full border border-white ${selectedTier === 'premium' ? 'bg-white' : ''}`}></div>
                                        </div>
                                        <div className="font-display font-bold text-lg">
                                            ${billingFrequency === 'yearly' ? '25' : '35'}<span className="text-xs font-normal text-white/50">/mo</span>
                                        </div>
                                    </div>
                                </label>
                            </div>

                            <div className="bg-white/5 border border-white/10 p-4 text-center">
                                <p className="font-mono text-xs text-white tracking-widest uppercase leading-relaxed">
                                    <span className="text-white/50 mr-2">INCLUDES:</span>
                                    {selectedTier === 'standard' ? '1,000 MONTHLY CREDITS + 1.5X XP' : 'UNLIMITED CREDITS + 2X XP MULTIPLIER + EXCLUSIVE MERCH'}
                                </p>
                            </div>

                            {/* Stripe Checkout Handling */}
                            <AuthorizeButton selectedTier={selectedTier} billingFrequency={billingFrequency} />

                        </div>
                    </div>
                </div>
            </div>
            <style jsx global>{`
                @keyframes scan {
                    0% { transform: translateX(-150%) skewX(-20deg); }
                    100% { transform: translateX(250%) skewX(-20deg); }
                }
            `}</style>
        </div>
    );
}
