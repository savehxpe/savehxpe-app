'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function Transmission() {
    const router = useRouter();
    const { userDoc } = useAuth(); // Could be used to display user's ID or name

    return (
        <div className="bg-background-light text-slate-900 font-display min-h-screen flex flex-col overflow-x-hidden selection:bg-black selection:text-white">
            <div className="relative flex min-h-screen w-full flex-col group/design-root">
                <div className="fixed top-24 right-6 lg:top-32 lg:right-10 z-50 animate-[float_6s_ease-in-out_infinite]">
                    <div className="bg-black text-white px-4 py-2 rounded-full font-bold text-sm tracking-wider shadow-xl border border-black/10 flex items-center gap-2">
                        <span className="material-symbols-outlined text-base">military_tech</span>
                        +500 XP EARNED
                    </div>
                </div>

                <div className="layout-container flex h-full grow flex-col">
                    <header className="flex items-center justify-between whitespace-nowrap border-b border-black/10 px-6 py-4 lg:px-10 z-20 bg-white/90 backdrop-blur-sm sticky top-0">
                        <div className="flex items-center gap-4">
                            <div className="size-6 text-black">
                                <span className="material-symbols-outlined text-2xl leading-none">graphic_eq</span>
                            </div>
                            <h2 className="text-black text-xl font-bold leading-tight tracking-widest uppercase">savehxpe</h2>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2 text-sm font-bold tracking-wider">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                LOGGED IN
                            </div>
                        </div>
                    </header>

                    <main className="flex flex-1 flex-col relative justify-center items-center px-4 py-12 lg:py-20 w-full max-w-7xl mx-auto z-10">
                        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 flex items-center justify-center">
                            <div className="w-[300px] h-[300px] md:w-[600px] md:h-[600px] bg-black/5 rounded-full blur-[100px] absolute animate-pulse-slow"></div>
                            <div className="w-full h-full absolute opacity-30 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-black/5 via-transparent to-transparent"></div>
                        </div>

                        <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-4xl gap-12 text-center">
                            <div className="flex flex-col items-center gap-6">
                                <div className="size-20 rounded-full bg-black flex items-center justify-center mb-4 shadow-2xl">
                                    <span className="material-symbols-outlined text-white text-5xl">check</span>
                                </div>
                                <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-black tracking-tighter leading-none uppercase">
                                    Transmission<br />Received.
                                </h1>
                                <p className="text-xl md:text-2xl font-bold text-black tracking-[0.2em] border-y-2 border-black py-4 px-8 uppercase">
                                    Track Unlocked
                                </p>
                            </div>

                            <div className="w-full max-w-[600px] flex flex-col gap-4 items-center mt-8">
                                <button className="group relative flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-black h-24 sm:h-32 px-8 transition-all active:scale-95 hover:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] border-2 border-black">
                                    <span className="absolute inset-0 bg-white/10 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300"></span>
                                    <div className="flex flex-col items-center gap-2 z-10">
                                        <div className="flex items-center gap-3">
                                            <span className="material-symbols-outlined text-white text-4xl transition-transform duration-300 group-hover:-translate-y-1">download</span>
                                            <span className="truncate text-white text-2xl sm:text-3xl font-black leading-normal tracking-tight uppercase">
                                                DOWNLOAD HANDOUT
                                            </span>
                                        </div>
                                        <span className="text-white/60 text-sm font-mono tracking-widest uppercase">(WAV FORMAT • 48.2 MB)</span>
                                    </div>
                                </button>

                                <p className="text-slate-500 text-xs uppercase tracking-widest mt-4">
                                    Link expires in 24 hours
                                </p>

                                <button
                                    onClick={() => router.push('/dashboard')}
                                    className="mt-8 border-b border-black text-black font-bold uppercase tracking-[0.2em] hover:text-slate-600 transition-colors pb-1"
                                >
                                    Proceed to Central Dashboard
                                </button>
                            </div>
                        </div>
                    </main>

                    <footer className="relative z-10 flex flex-col gap-6 px-5 py-8 text-center border-t border-black/10 bg-white/50 backdrop-blur-sm">
                        <div className="flex flex-col sm:flex-row justify-center items-center gap-6 text-sm text-slate-500">
                            <span className="hover:text-black transition-colors uppercase tracking-wider font-medium cursor-pointer">Privacy Policy</span>
                            <span className="hidden sm:inline w-1 h-1 rounded-full bg-slate-300"></span>
                            <span className="hover:text-black transition-colors uppercase tracking-wider font-medium cursor-pointer">Terms of Service</span>
                            <span className="hidden sm:inline w-1 h-1 rounded-full bg-slate-300"></span>
                            <span className="hover:text-black transition-colors uppercase tracking-wider font-medium cursor-pointer">Support</span>
                        </div>
                        <p className="text-slate-400 text-xs font-normal leading-normal uppercase tracking-widest">© 2026 sincethe80s, llc/radical publishing. All rights reserved.</p>
                    </footer>
                </div>
            </div>
        </div>
    );
}
