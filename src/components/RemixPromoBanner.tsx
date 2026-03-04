export default function RemixPromoBanner() {
    return (
        <div className="max-w-6xl mx-auto w-full border-[4px] border-cyan-500/50 mb-16 relative overflow-hidden bg-black p-8 md:p-12 group transition-all duration-300 hover:border-cyan-400 hover:shadow-[0_0_40px_rgba(34,211,238,0.2)]">

            {/* Background Texture & Noise */}
            <div className="absolute inset-0 scanline-bg opacity-30 pointer-events-none z-0"></div>
            <div className="absolute inset-0 bg-gradient-to-tr from-cyan-900/20 via-black to-black z-0 pointer-events-none"></div>

            <div className="relative z-10 flex flex-col items-center justify-center text-center gap-6">

                {/* Headers */}
                <div className="flex flex-col items-center gap-2">
                    <span className="font-mono text-cyan-400 uppercase tracking-[0.3em] text-xs font-bold px-2 py-1 border border-cyan-400/50 bg-cyan-400/10">TRANSMISSION INTERCEPTED</span>
                    <h2 className="font-black font-display text-4xl md:text-6xl lg:text-7xl uppercase tracking-tighter text-white drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] mt-2 line-clamp-2 leading-none">
                        HANDOUT REMIX
                    </h2>
                    <h3 className="font-mono text-lg md:text-xl uppercase tracking-widest text-slate-300 mt-2">
                        SAVEHXPE <span className="text-cyan-400">x</span> FREDDIE GIBBS
                    </h3>
                </div>

                {/* Video Skeleton Container */}
                <div className="w-full max-w-2xl aspect-video bg-zinc-900 border border-white/10 animate-pulse my-4 relative flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.8)]">
                    <span className="font-mono text-slate-600 text-[10px] uppercase tracking-widest">[ POSTER ASSET ENCRYPTED ]</span>
                    {/* Decorative Corner Accents */}
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-slate-700"></div>
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-slate-700"></div>
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-slate-700"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-slate-700"></div>
                </div>

                {/* Locked CTA */}
                <button
                    disabled={true}
                    className="w-full md:w-auto px-10 py-5 bg-white/5 border border-slate-700 text-slate-500 font-mono text-sm tracking-[0.2em] uppercase font-bold cursor-not-allowed flex items-center justify-center gap-3 transition-colors mt-2 grayscale"
                >
                    <span className="material-symbols-outlined text-lg">lock</span>
                    PRE-SAVE FREQUENCY (COMING SOON)
                </button>

            </div>
        </div>
    );
}
