'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function TrialActivation() {
    const router = useRouter();
    const { userDoc, loginWithGoogle } = useAuth();

    const handleStartTrial = () => {
        if (!userDoc) {
            alert('Please sign in or create an account First.');
        } else {
            // Assuming this would trigger a trial upgrade in a real backend
            alert('Trial access activated successfully! Redirecting...');
            router.push('/dashboard');
        }
    };

    return (
        <div className="bg-[#000000] text-slate-100 font-display min-h-screen flex flex-col overflow-hidden selection:bg-white selection:text-black">
            <div className="relative flex min-h-screen w-full flex-col group/design-root backdrop-blur-[12px] brightness-50">
                <div className="layout-container flex h-full grow flex-col">
                    <header className="flex items-center justify-between whitespace-nowrap border-b border-white/10 px-6 py-4 lg:px-10 z-0 opacity-20">
                        <div className="flex items-center gap-4">
                            <div className="size-6 text-primary">
                                <span className="material-symbols-outlined text-2xl leading-none">graphic_eq</span>
                            </div>
                            <h2 className="text-primary text-xl font-bold leading-tight tracking-widest uppercase">savehxpe</h2>
                        </div>
                    </header>
                    <main className="flex flex-1 flex-col relative justify-center items-center px-4 py-12 lg:py-20 w-full max-w-7xl mx-auto opacity-40">
                        <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-4xl gap-8">
                            <div className="flex flex-col items-center gap-4">
                                <span className="text-white/40 text-xs tracking-[1em] uppercase">Deployment Timeline</span>
                                <div className="flex gap-4 items-center">
                                    <div className="flex flex-col items-center">
                                        <span className="text-7xl md:text-9xl font-bold text-white tracking-tighter">07:00:00:00</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </main>
                    <footer className="relative z-0 flex flex-col gap-6 px-5 py-8 text-center border-t border-white/5 opacity-20">
                        <p className="text-[#555555] text-[10px] font-normal uppercase tracking-[0.4em]">© 2026 OUTWORLD LLC.</p>
                    </footer>
                </div>
            </div>

            {/* Trial Modal overlay */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 overflow-y-auto">
                <div className="bg-black border-[3px] border-white w-full max-w-[1000px] flex flex-col md:flex-row min-h-[600px] shadow-[30px_30px_0px_0px_rgba(255,255,255,0.05)] relative overflow-hidden">
                    <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(255,255,255,0.02)_50%)] bg-[length:100%_4px] pointer-events-none opacity-20 z-0"></div>

                    <div className="w-full md:w-1/2 border-b-[3px] md:border-b-0 md:border-r-[3px] border-white p-8 md:p-12 flex flex-col bg-[#050505] relative z-10">
                        <div className="mb-10">
                            <span className="inline-block border border-white px-3 py-1 text-[10px] font-bold tracking-[0.3em] uppercase mb-4 text-white">Standard Tier</span>
                            <h2 className="text-3xl font-bold text-white tracking-tighter uppercase leading-tight">Trial Access<br />Granted</h2>
                            <p className="text-zinc-500 text-[10px] tracking-[0.2em] font-medium uppercase mt-2">Start your 7-day gateway today</p>
                        </div>
                        <div className="flex-grow space-y-8">
                            <div className="space-y-6">
                                <div className="flex items-start gap-4">
                                    <span className="material-symbols-outlined text-white text-xl">token</span>
                                    <div>
                                        <h3 className="text-white text-xs font-bold tracking-widest uppercase">1,000 Monthly Credits</h3>
                                        <p className="text-zinc-500 text-[9px] uppercase tracking-wider mt-1">Full currency allocation for terminal usage</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <span className="material-symbols-outlined text-white text-xl">speed</span>
                                    <div>
                                        <h3 className="text-white text-xs font-bold tracking-widest uppercase">1.5x XP Multiplier</h3>
                                        <p className="text-zinc-500 text-[9px] uppercase tracking-wider mt-1">Accelerated ranking within the outworld</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <span className="material-symbols-outlined text-white text-xl">videogame_asset</span>
                                    <div>
                                        <h3 className="text-white text-xs font-bold tracking-widest uppercase">Unlimited Gameplay</h3>
                                        <p className="text-zinc-500 text-[9px] uppercase tracking-wider mt-1">No restrictions on simulation cycles</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <span className="material-symbols-outlined text-white text-xl">lock_open</span>
                                    <div>
                                        <h3 className="text-white text-xs font-bold tracking-widest uppercase">Exclusive Vault Access</h3>
                                        <p className="text-zinc-500 text-[9px] uppercase tracking-wider mt-1">Unfiltered entry to the 'HANDOUT' archives</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="mt-8 pt-8 border-t border-white/10">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 border border-white/20 flex items-center justify-center grayscale overflow-hidden relative">
                                    <img alt="Thumbnail" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCJ7VFnjDIOdlTJ4BFVRODok53QLROyFM_ktGtzhGMslAEQA10wadj7t5qD8nbwGCu1OlBaw-dvUzZ3swkBDeAWXWpP1tp9TSQn8RMs3maUkUGEwvMDYP0ksFpuaJa50YoohX73x6zPuxxkbWClROZk5ASrqx1PP7xQKGiQY4VE0juSyVpBR14CiIB4ZG05n8rFzJeMAfXjc9Z-uHnfWPqdvLLkoOuopVVBok4kZkJo4D9Qem6tgGKRG0rlTCGuHuy_VvNEvyPAXZ8" className="object-cover opacity-50 absolute inset-0 w-full h-full" />
                                </div>
                                <p className="text-[9px] text-zinc-400 tracking-widest uppercase font-bold italic">Verification Required for Trial Activation</p>
                            </div>
                        </div>
                    </div>

                    <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center gap-8 bg-black relative z-10">
                        <div className="space-y-2">
                            <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tighter leading-none uppercase">Join The<br />Outworld</h1>
                            <p className="text-zinc-500 text-xs tracking-[0.2em] font-medium uppercase">Enter credentials to initialize</p>
                        </div>

                        {!userDoc ? (
                            <div className="space-y-6">
                                <div className="space-y-3 pt-2">
                                    <button
                                        onClick={loginWithGoogle}
                                        className="w-full bg-transparent border-2 border-white text-white h-12 text-xs font-bold tracking-widest uppercase flex items-center justify-center gap-2 hover:bg-white hover:text-black transition-all"
                                    >
                                        <span className="material-symbols-outlined text-lg">login</span>
                                        Continue with Google
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <p className="text-sm font-mono text-white/80">Welcome back, {userDoc.name}</p>
                                </div>
                                <div className="space-y-3 pt-2">
                                    <button
                                        onClick={handleStartTrial}
                                        className="w-full bg-white text-black h-16 text-lg font-black tracking-[0.2em] uppercase hover:bg-zinc-200 transition-colors active:translate-y-1"
                                    >
                                        Start Trial
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="pt-4 border-t border-white/10">
                            <p className="text-[9px] text-zinc-600 tracking-widest leading-relaxed uppercase">
                                Trial expires in 168 hours. By signing up you agree to the terminal privacy policy.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
