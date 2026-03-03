'use client';

import { useRouter } from 'next/navigation';

export default function GatewayPreview() {
    const router = useRouter();

    return (
        <div className="bg-[#000000] text-slate-100 font-display min-h-screen flex flex-col overflow-x-hidden selection:bg-white selection:text-black">
            <div className="relative flex min-h-screen w-full flex-col group/design-root">
                <div className="layout-container flex h-full grow flex-col">
                    <header className="flex items-center justify-between whitespace-nowrap border-b border-white/10 px-6 py-4 lg:px-10 z-20 bg-black/50 backdrop-blur-sm">
                        <div className="flex items-center gap-4">
                            <div className="size-6 text-primary">
                                <span className="material-symbols-outlined text-2xl leading-none">graphic_eq</span>
                            </div>
                            <h2 className="text-primary text-xl font-bold leading-tight tracking-widest uppercase">savehxpe</h2>
                        </div>
                        <div className="flex items-center gap-6">
                            <button
                                onClick={() => router.push('/identity')}
                                className="hidden sm:flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded border border-primary bg-transparent text-primary hover:bg-primary hover:text-black transition-colors duration-200 h-9 px-4 text-sm font-bold leading-normal tracking-wider"
                            >
                                <span className="truncate">LOGIN</span>
                            </button>
                            <button className="sm:hidden text-primary">
                                <span className="material-symbols-outlined">menu</span>
                            </button>
                        </div>
                    </header>

                    <main className="flex flex-1 flex-col relative justify-center items-center px-4 py-12 lg:py-20 w-full max-w-7xl mx-auto z-10">
                        {/* Background Effects */}
                        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 flex items-center justify-center">
                            <div className="w-[300px] h-[300px] md:w-[600px] md:h-[600px] bg-white/5 rounded-full blur-[100px] absolute animate-[pulse_3s_cubic-bezier(0.4,0,0.6,1)_infinite]"></div>
                            <div className="w-full h-full absolute opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent"></div>
                        </div>

                        <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-4xl gap-12 lg:gap-20">
                            {/* Player Preview Component */}
                            <div className="w-full max-w-2xl aspect-video relative overflow-hidden rounded-lg shadow-2xl border border-white/5 group play-button-overlay cursor-pointer">
                                <div className="absolute inset-0 bg-black/40 z-10 transition-opacity duration-500 group-hover:opacity-30"></div>
                                <div className="absolute inset-0 bg-cover bg-center grayscale group-hover:grayscale-0 transition-all duration-700 scale-100 group-hover:scale-105"
                                    style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCJ7VFnjDIOdlTJ4BFVRODok53QLROyFM_ktGtzhGMslAEQA10wadj7t5qD8nbwGCu1OlBaw-dvUzZ3swkBDeAWXWpP1tp9TSQn8RMs3maUkUGEwvMDYP0ksFpuaJa50YoohX73x6zPuxxkbWClROZk5ASrqx1PP7xQKGiQY4VE0juSyVpBR14CiIB4ZG05n8rFzJeMAfXjc9Z-uHnfWPqdvLLkoOuopVVBok4kZkJo4D9Qem6tgGKRG0rlTCGuHuy_VvNEvyPAXZ8")' }}
                                ></div>
                                <div className="absolute inset-0 z-20 flex items-center justify-center">
                                    <div className="relative flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.1)] transition-transform duration-300 group-hover:scale-110">
                                        <div className="absolute inset-0 rounded-full border border-white/30 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] opacity-50"></div>
                                        <span className="material-symbols-outlined text-white text-5xl sm:text-6xl pl-2 transition-transform duration-300">play_arrow</span>
                                    </div>
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 z-20">
                                    <div className="h-full w-1/3 bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>
                                </div>
                                <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded border border-white/20 shadow-lg">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                    </span>
                                    <span className="text-xs font-mono text-white font-bold uppercase tracking-widest">Preview Live</span>
                                </div>
                            </div>

                            <div className="flex flex-col items-center gap-8 w-full">
                                {/* Countdown Component */}
                                <div className="flex gap-2 sm:gap-6 md:gap-8 justify-center w-full">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="flex items-center justify-center bg-[#111111] border border-white/10 w-16 h-20 sm:w-24 sm:h-28 md:w-32 md:h-36 rounded-lg backdrop-blur-sm relative overflow-hidden group hover:border-white/30 transition-colors">
                                            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20 pointer-events-none"></div>
                                            <span className="text-3xl sm:text-5xl md:text-7xl font-bold text-primary tracking-tighter">00</span>
                                        </div>
                                        <span className="text-xs sm:text-sm uppercase tracking-[0.2em] text-slate-400">Days</span>
                                    </div>
                                    <div className="flex flex-col justify-start pt-4 sm:pt-6 md:pt-8 h-20 sm:h-28 md:h-36">
                                        <span className="text-2xl sm:text-4xl md:text-6xl font-light text-white/20">:</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="flex items-center justify-center bg-[#111111] border border-white/10 w-16 h-20 sm:w-24 sm:h-28 md:w-32 md:h-36 rounded-lg backdrop-blur-sm relative overflow-hidden group hover:border-white/30 transition-colors">
                                            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20 pointer-events-none"></div>
                                            <span className="text-3xl sm:text-5xl md:text-7xl font-bold text-primary tracking-tighter">03</span>
                                        </div>
                                        <span className="text-xs sm:text-sm uppercase tracking-[0.2em] text-slate-400">Hours</span>
                                    </div>
                                    <div className="flex flex-col justify-start pt-4 sm:pt-6 md:pt-8 h-20 sm:h-28 md:h-36">
                                        <span className="text-2xl sm:text-4xl md:text-6xl font-light text-white/20">:</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="flex items-center justify-center bg-[#111111] border border-white/10 w-16 h-20 sm:w-24 sm:h-28 md:w-32 md:h-36 rounded-lg backdrop-blur-sm relative overflow-hidden group hover:border-white/30 transition-colors">
                                            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20 pointer-events-none"></div>
                                            <span className="text-3xl sm:text-5xl md:text-7xl font-bold text-primary tracking-tighter">14</span>
                                        </div>
                                        <span className="text-xs sm:text-sm uppercase tracking-[0.2em] text-slate-400">Minutes</span>
                                    </div>
                                    <div className="flex flex-col justify-start pt-4 sm:pt-6 md:pt-8 h-20 sm:h-28 md:h-36">
                                        <span className="text-2xl sm:text-4xl md:text-6xl font-light text-white/20">:</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="flex items-center justify-center bg-[#111111] border border-white/10 w-16 h-20 sm:w-24 sm:h-28 md:w-32 md:h-36 rounded-lg backdrop-blur-sm relative overflow-hidden group hover:border-white/30 transition-colors">
                                            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20 pointer-events-none"></div>
                                            <span className="text-3xl sm:text-5xl md:text-7xl font-bold text-primary tracking-tighter animate-pulse">55</span>
                                        </div>
                                        <span className="text-xs sm:text-sm uppercase tracking-[0.2em] text-slate-400">Seconds</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => router.push('/identity')}
                                    className="animate-[flicker_6s_linear_infinite] delay-[5s] group mt-8 relative flex w-full max-w-[520px] cursor-pointer items-center justify-center overflow-hidden rounded bg-primary h-20 sm:h-24 px-8 transition-transform active:scale-95 hover:shadow-[0_0_50px_-5px_rgba(255,255,255,0.4)] border border-transparent hover:border-white"
                                >
                                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>
                                    <div className="flex items-center gap-3 relative z-10">
                                        <span className="material-symbols-outlined text-black text-3xl">lock_open</span>
                                        <span className="truncate text-black text-lg sm:text-xl font-black leading-normal tracking-[0.1em] uppercase text-center">
                                            Sign in to unlock full track
                                        </span>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </main>

                    <footer className="relative z-10 flex flex-col gap-6 px-5 py-8 text-center border-t border-white/5 bg-black/80 backdrop-blur-sm">
                        <div className="flex flex-col sm:flex-row justify-center items-center gap-6 text-sm text-slate-400">
                            <a className="hover:text-primary transition-colors uppercase tracking-wider" href="#">Privacy Policy</a>
                            <span className="hidden sm:inline w-1 h-1 rounded-full bg-slate-700"></span>
                            <a className="hover:text-primary transition-colors uppercase tracking-wider" href="#">Terms of Service</a>
                            <span className="hidden sm:inline w-1 h-1 rounded-full bg-slate-700"></span>
                            <a className="hover:text-primary transition-colors uppercase tracking-wider" href="#">Support</a>
                        </div>
                        <p className="text-[#555555] text-xs font-normal leading-normal uppercase tracking-widest">© 2026 sincethe80s, llc/radical publishing. All rights reserved.</p>
                    </footer>
                </div>
            </div>
            {/* Base flicker animation keyframes are placed in layout or via tailwind config in global */}
            <style jsx global>{`
                @keyframes flicker {
                    0%, 19.999%, 22%, 62.999%, 64%, 64.999%, 70%, 100% { opacity: 0.99; }
                    20%, 21.999%, 63%, 63.999%, 65%, 69.999% { opacity: 0.4; }
                }
            `}</style>
        </div>
    );
}
