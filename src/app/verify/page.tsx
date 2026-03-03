'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useVaultAudio } from '@/hooks/useVaultAudio';

export default function FrequencyVerifier() {
    const router = useRouter();
    const [code, setCode] = useState<string>('');
    const [isVerified, setIsVerified] = useState(false);

    const { initAudio, isInitialized, playDigitTick, playMasterUnlock } = useVaultAudio();

    const handleKeypadPress = (val: string) => {
        // Initialize Web Audio on first interaction
        if (!isInitialized) {
            initAudio();
        }

        if (code.length < 4) {
            const newCode = code + val;
            setCode(newCode);

            if (newCode.length < 4) {
                // Digits 1, 2, 3
                playDigitTick();
            } else if (newCode.length === 4) {
                // Master Unlock on Digit 4
                handleVerify();
            }
        }
    };

    const handleBackspace = () => {
        // Init just in case they backspace first
        if (!isInitialized) initAudio();
        setCode(prev => prev.slice(0, -1));
    };

    const handleVerify = () => {
        playMasterUnlock();

        // Slightly delay verify state to show pop-up right at the shatter peak
        setTimeout(() => {
            setIsVerified(true);
            setTimeout(() => {
                router.push('/transmission');
            }, 3000); // Wait 3 seconds to let hum play out and transition
        }, 50); // Small delay to sync UI render with sound peak
    };

    return (
        <div className="relative flex min-h-screen w-full flex-col group/design-root bg-background-dark text-slate-100 font-display min-h-screen overflow-hidden selection:bg-white selection:text-black">
            <header className="flex items-center justify-between whitespace-nowrap border-b border-white/10 px-6 py-4 lg:px-10 z-20 bg-background-dark/50 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                    <div className="size-6 text-primary">
                        <span className="material-symbols-outlined text-2xl leading-none">graphic_eq</span>
                    </div>
                    <h2 className="text-primary text-xl font-bold leading-tight tracking-widest uppercase">savehxpe</h2>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-xs font-mono uppercase tracking-widest text-slate-400">System Online</span>
                </div>
            </header>

            <main className="flex flex-1 flex-col relative justify-center items-center px-4 py-8 lg:py-12 w-full max-w-7xl mx-auto z-10">
                <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 flex items-center justify-center">
                    <div className="w-[300px] h-[300px] md:w-[600px] md:h-[600px] bg-white/5 rounded-full blur-[100px] absolute"></div>
                    <div className="absolute top-0 w-px h-full bg-white/5 left-1/4"></div>
                    <div className="absolute top-0 w-px h-full bg-white/5 right-1/4"></div>
                    <div className="absolute top-1/3 w-full h-px bg-white/5"></div>
                    <div className="absolute bottom-1/3 w-full h-px bg-white/5"></div>
                </div>

                <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-lg gap-8 lg:gap-12">
                    <div className="text-center space-y-4">
                        <div className="inline-block px-3 py-1 border border-white/20 rounded bg-white/5 backdrop-blur-sm mb-4">
                            <span className="text-xs font-mono uppercase tracking-[0.2em] text-primary">Step 2: Frequency Verification</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold uppercase tracking-tighter leading-none">Verify Your Frequency</h1>
                        <p className="text-slate-400 text-sm md:text-base uppercase tracking-widest font-light max-w-md mx-auto">
                            A secure 4-digit code has been generated for your session constraints.
                        </p>
                    </div>

                    <div className="grid grid-cols-4 gap-4 w-full px-4">
                        {[0, 1, 2, 3].map((index) => (
                            <div
                                key={index}
                                className={`aspect-square flex items-center justify-center border-2 rounded-lg transition-colors ${code.length > index ? 'border-white bg-white text-black' :
                                    code.length === index ? 'border-white bg-transparent' : 'border-white/30 bg-white/5'
                                    }`}
                            >
                                <span className={`text-4xl md:text-6xl font-bold ${code.length === index ? 'animate-blink' : ''}`}>
                                    {code[index] !== undefined ? code[index] : (code.length === index ? '_' : '')}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="w-full max-w-xs mt-4">
                        <div className="grid grid-cols-3 gap-3 md:gap-4">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                <button
                                    key={num}
                                    onClick={() => handleKeypadPress(num.toString())}
                                    className="keypad-btn h-14 md:h-16 flex items-center justify-center border border-white/20 hover:border-white hover:bg-white/10 transition-all rounded text-xl font-bold font-mono"
                                >
                                    {num}
                                </button>
                            ))}
                            <button onClick={handleBackspace} className="h-14 md:h-16 flex items-center justify-center text-slate-500 hover:text-white transition-colors">
                                <span className="material-symbols-outlined">backspace</span>
                            </button>
                            <button onClick={() => handleKeypadPress('0')} className="keypad-btn h-14 md:h-16 flex items-center justify-center border border-white/20 hover:border-white hover:bg-white/10 transition-all rounded text-xl font-bold font-mono">
                                0
                            </button>
                            <button disabled={code.length === 4} onClick={() => { }} className={`h-14 md:h-16 flex items-center justify-center transition-colors ${code.length === 4 ? 'text-white cursor-default' : 'text-slate-500 hover:text-white'}`}>
                                <span className="material-symbols-outlined">check_circle</span>
                            </button>
                        </div>
                    </div>

                    <div className="text-center pt-4">
                        <button className="text-xs text-slate-500 hover:text-white uppercase tracking-widest border-b border-transparent hover:border-white transition-all pb-1">
                            Resend Code
                        </button>
                    </div>
                </div>

                {/* CITIZEN INITIALIZED POPUP */}
                {isVerified && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="border border-green-500/50 bg-black/90 p-10 max-w-sm text-center shadow-[0_0_50px_rgba(34,197,94,0.2)]">
                            <span className="material-symbols-outlined text-green-500 text-6xl mb-4">gpp_good</span>
                            <h2 className="text-2xl font-bold text-white uppercase tracking-widest mb-2 font-mono">
                                CITIZEN INITIALIZED
                            </h2>
                            <p className="text-green-500 font-mono text-xs uppercase tracking-[0.2em] animate-pulse">
                                Access Granted. Redirecting...
                            </p>
                        </div>
                    </div>
                )}
            </main>

            <footer className="relative z-10 flex flex-col gap-6 px-5 py-6 text-center border-t border-white/5 bg-background-dark/80 backdrop-blur-sm">
                <div className="flex flex-col sm:flex-row justify-center items-center gap-6 text-xs text-slate-500">
                    <span className="uppercase tracking-widest">Connection: Secure</span>
                    <span className="hidden sm:inline w-px h-3 bg-slate-800"></span>
                    <span className="uppercase tracking-widest">Latency: 12ms</span>
                    <span className="hidden sm:inline w-px h-3 bg-slate-800"></span>
                    <span className="uppercase tracking-widest">Ver: 2.0.4</span>
                </div>
            </footer>
        </div>
    );
}
