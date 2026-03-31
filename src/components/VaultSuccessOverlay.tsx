'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function VaultOverlayContent() {
    const searchParams = useSearchParams();
    const [isVisible, setIsVisible] = useState(false);
    const [phase, setPhase] = useState<number>(0);

    useEffect(() => {
        const payment = searchParams?.get('payment');
        if (payment === 'success') {
            setIsVisible(true);

            // Clean up the URL parameter to prevent replay
            if (typeof window !== 'undefined') {
                const url = new URL(window.location.href);
                url.searchParams.delete('payment');
                window.history.replaceState({}, document.title, url.toString());
            }

            const sequence = async () => {
                // Phase 1: Terminal Boot [1.5s]
                setPhase(1);
                await new Promise(r => setTimeout(r, 1500));

                // Phase 2: Padlock Shatter [1s]
                setPhase(2);
                await new Promise(r => setTimeout(r, 1000));

                // Phase 3: Door Slide & Shake [1.5s]
                setPhase(3);
                await new Promise(r => setTimeout(r, 1500));

                // Phase 4: Glow Reveal & Fadeout [0.5s]
                setPhase(4);
                await new Promise(r => setTimeout(r, 500));

                // Finish sequence: unmount
                setIsVisible(false);
            };

            sequence();
        }
    }, [searchParams]);

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden pointer-events-none font-mono">
            {/* Phase 1: Terminal Boot */}
            {phase === 1 && (
                <div className="absolute inset-0 bg-[#050505] flex flex-col justify-center items-center px-6">
                    <div className="text-cyan-400 text-xl md:text-4xl font-black tracking-[0.2em] text-left w-full max-w-2xl" style={{ textShadow: '0 0 10px rgba(0,255,255,0.4)' }}>
                        <div className="overflow-hidden whitespace-nowrap border-r-4 border-cyan-400 pr-2 animate-[typing_0.8s_steps(25,end)_forwards,blink_0.75s_step-end_infinite]">
                            &gt; VERIFYING PAYMENT...
                        </div>
                        <div className="overflow-hidden whitespace-nowrap opacity-0 animate-[reveal_0.1s_ease-in_0.8s_forwards] mt-4 text-green-400" style={{ textShadow: '0 0 10px rgba(74,222,128,0.4)' }}>
                            &gt; CLEARANCE GRANTED.
                        </div>
                    </div>
                    <style>{`
                        @keyframes typing { from { width: 0; } to { width: 100%; } }
                        @keyframes blink { from, to { border-color: transparent } 50% { border-color: #22d3ee; } }
                        @keyframes reveal { to { opacity: 1; } }
                    `}</style>
                </div>
            )}

            {/* Phase 2: Padlock Shatter */}
            {phase === 2 && (
                <div className="absolute inset-0 bg-[#050505] flex justify-center items-center">
                    <div className="w-48 h-48 animate-[padlockSequenceVariant_1s_ease-in-out_forwards]">
                        <svg className="w-full h-full fill-none stroke-current stroke-[1.5]" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0110 0v4" />
                            <circle cx="12" cy="16" r="1.5" className="fill-current" />
                        </svg>
                    </div>
                    <style>{`
                        @keyframes padlockSequenceVariant {
                            0% { color: #EF4444; transform: translateX(0); }
                            10% { color: #EF4444; transform: translateX(-15px); }
                            20% { color: #EF4444; transform: translateX(15px); }
                            30% { color: #EF4444; transform: translateX(-15px); }
                            40% { color: #EF4444; transform: translateX(15px); }
                            50% { color: #22c55e; transform: translateX(0) scale(1); opacity: 1; filter: drop-shadow(0 0 20px rgba(34,197,94,0.5)); }
                            90% { color: #22c55e; transform: translateX(0) scale(4); opacity: 1; filter: drop-shadow(0 0 40px rgba(34,197,94,0.8)); }
                            100% { color: #22c55e; transform: translateX(0) scale(6); opacity: 0; }
                        }
                    `}</style>
                </div>
            )}

            {/* Phase 3 & 4: Door Slide, Shake, Glow Reveal */}
            {(phase === 3 || phase === 4) && (
                <div className="absolute inset-0 w-full h-full animate-[screenShake_1s_linear]">
                    {/* The Background that fades out in phase 4 */}
                    <div className={`absolute inset-0 bg-[#050505] transition-opacity duration-500 ${phase === 4 ? 'opacity-0' : 'opacity-100'}`}></div>

                    {/* Left Door */}
                    <div className="absolute top-0 left-0 w-1/2 h-full bg-gray-900 border-r-2 border-[#FFD700]/50 animate-[slideDoorLeft_1.5s_cubic-bezier(0.25,1,0.5,1)_forwards] shadow-[10px_0_30px_rgba(0,0,0,0.8)] z-10">
                        <div className="absolute top-1/2 right-0 w-12 h-40 bg-gray-800 -translate-y-1/2 flex items-center justify-center border-l-4 border-y-4 border-[#FFD700]/30 rounded-l-md">
                            <div className="w-2 h-20 bg-[#FFD700] shadow-[0_0_20px_rgba(255,215,0,0.8)] rounded-full"></div>
                        </div>
                    </div>

                    {/* Right Door */}
                    <div className="absolute top-0 right-0 w-1/2 h-full bg-gray-900 border-l-2 border-[#00FFFF]/50 animate-[slideDoorRight_1.5s_cubic-bezier(0.25,1,0.5,1)_forwards] shadow-[-10px_0_30px_rgba(0,0,0,0.8)] z-10">
                        <div className="absolute top-1/2 left-0 w-12 h-40 bg-gray-800 -translate-y-1/2 flex items-center justify-center border-r-4 border-y-4 border-[#00FFFF]/30 rounded-r-md">
                            <div className="w-2 h-20 bg-[#00FFFF] shadow-[0_0_20px_rgba(0,255,255,0.8)] rounded-full"></div>
                        </div>
                    </div>

                    {/* Glow Reveal Component */}
                    {phase === 4 && (
                        <div className="absolute inset-0 mix-blend-screen animate-[glowFlash_0.5s_ease-out_forwards] z-20 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255,215,0,0.8) 0%, rgba(0,255,255,0.4) 40%, transparent 100%)' }}></div>
                    )}

                    <style>{`
                        @keyframes screenShake {
                            0%, 100% { transform: translateX(0) scale(1.02); }
                            10%, 30%, 50%, 70%, 90% { transform: translateX(-15px) scale(1.02); }
                            20%, 40%, 60%, 80% { transform: translateX(15px) scale(1.02); }
                        }
                        @keyframes slideDoorLeft {
                            0% { transform: translateX(0); }
                            10% { transform: translateX(2%); } /* initial bump inwards */
                            100% { transform: translateX(-100%); }
                        }
                        @keyframes slideDoorRight {
                            0% { transform: translateX(0); }
                            10% { transform: translateX(-2%); } /* initial bump inwards */
                            100% { transform: translateX(100%); }
                        }
                        @keyframes glowFlash {
                            0% { opacity: 0; transform: scale(0.5); }
                            30% { opacity: 1; transform: scale(1.5); }
                            100% { opacity: 0; transform: scale(2); }
                        }
                    `}</style>
                </div>
            )}
        </div>
    );
}

export default function VaultSuccessOverlay() {
    return (
        <Suspense fallback={null}>
            <VaultOverlayContent />
        </Suspense>
    );
}
