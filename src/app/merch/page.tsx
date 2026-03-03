'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function MerchGallery() {
    const router = useRouter();
    const { userDoc } = useAuth();

    // Tier / XP check logic
    const hasStandardAccess = userDoc?.tier.current === 'STANDARD' || userDoc?.tier.current === 'PREMIUM' || (userDoc?.xp.total ?? 0) >= 1000;
    const hasPremiumAccess = userDoc?.tier.current === 'PREMIUM';

    return (
        <div className="bg-white text-black font-display min-h-screen flex flex-col overflow-x-hidden selection:bg-black selection:text-white">
            <div className="fixed inset-0 z-0 bg-grid-pattern bg-[length:40px_40px] pointer-events-none opacity-30"></div>

            <header className="relative z-20 w-full border-b-2 border-black bg-white px-6 py-4 md:px-12 flex flex-col md:flex-row justify-between items-center sticky top-0 gap-4 md:gap-0">
                <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-start">
                    <div className="flex flex-col cursor-pointer" onClick={() => router.push('/dashboard')}>
                        <h1 className="font-display font-black text-2xl tracking-tighter leading-none hover:text-slate-600 transition-colors">SAVEHXPE</h1>
                        <span className="font-mono text-[10px] tracking-widest uppercase text-black/60">Merch Vault // Gallery</span>
                    </div>
                    <div className="h-8 w-[2px] bg-black hidden md:block"></div>
                    <div className="md:hidden flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">menu</span>
                    </div>
                </div>

                <div className="flex items-center gap-4 md:gap-8 w-full md:w-auto justify-between md:justify-end">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-xl">military_tech</span>
                        <div className="flex flex-col items-end">
                            <span className="font-mono text-[10px] uppercase tracking-widest text-black/60">XP Mastery</span>
                            <div className="font-mono text-sm font-bold tracking-tight">{userDoc?.xp.total ?? 0} XP <span className="text-xs font-normal text-black/40">/ 1000</span></div>
                        </div>
                    </div>
                    <div className="w-[1px] h-8 bg-black/20"></div>
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-xl">account_balance_wallet</span>
                        <div className="flex flex-col items-end">
                            <span className="font-mono text-[10px] uppercase tracking-widest text-black/60">Credit Ledger</span>
                            <div className="font-mono text-sm font-bold tracking-tight">{userDoc?.credits ?? 0} CR</div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="relative z-10 flex-1 w-full max-w-[1920px] mx-auto p-6 md:p-12">
                <div className="mb-12 flex flex-col md:flex-row justify-between items-end gap-4 border-b border-black pb-4">
                    <div>
                        <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none mb-2">Exclusive Drops</h2>
                        <p className="font-mono text-xs md:text-sm uppercase tracking-widest text-black/60">Limited Edition Gear // Season 04</p>
                    </div>
                    <div className="flex gap-2">
                        <span className="px-2 py-1 border border-black text-xs font-mono uppercase bg-black text-white cursor-pointer hover:bg-slate-800 transition-colors">All Items</span>
                        <span className="px-2 py-1 border border-black text-xs font-mono uppercase text-black/50 hover:text-black transition-colors cursor-pointer">Unlocked</span>
                        <span className="px-2 py-1 border border-black text-xs font-mono uppercase text-black/50 hover:text-black transition-colors cursor-pointer">Vaulted</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {/* Item 1: Unlocked for everyone */}
                    <article className="group relative flex flex-col border border-black bg-white transition-all hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                        <div className="relative aspect-[4/5] overflow-hidden border-b border-black bg-neutral-100 flex items-center justify-center">
                            <img alt="Outworld Tee" className="object-cover w-full h-full grayscale group-hover:scale-105 transition-transform duration-500" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDQJUvrqwZKV_3Hp2syY2ltu2LGvndv14dw5oXwRQ74qqiC-04q5xKOybeqMjlvy7Inq3Aun3zctRj5EGGEIMEW92apQ9FTUtlaCEnejOm-VoNRmHk3t63l-Ha6uQCgxlMNqe4v5yPV1f6meYCtOTKh6v_xJI7qKKzsLGMc2F2jMOZ5FHxP0TS6xfXF3wIzLXf3KAxsd2gkhRvyeAK_YShgAvNOLqMuYZ8pwXUOYSU68AtHn6lMYLTwdsRrHQqPdd0C83adb8ew-h0" />
                            <div className="absolute top-4 left-4 bg-white border border-black px-2 py-1 z-10">
                                <span className="font-mono text-[10px] font-bold uppercase tracking-widest">In Stock</span>
                            </div>
                        </div>
                        <div className="p-6 flex flex-col flex-1 justify-between gap-4">
                            <div>
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-2xl font-bold uppercase tracking-tight">Outworld Tee</h3>
                                    <span className="font-mono font-bold">$45.00</span>
                                </div>
                                <p className="font-mono text-xs text-black/60 leading-relaxed uppercase">Heavyweight cotton. Oversized fit. Inverted graphic print.</p>
                            </div>
                            <button className="w-full bg-black text-white border-2 border-black py-3 font-bold uppercase tracking-widest text-sm hover:bg-white hover:text-black transition-colors flex items-center justify-center gap-2">
                                Add to Cart
                            </button>
                        </div>
                    </article>

                    {/* Item 2: Requires Standard or 1000 XP */}
                    <article className="group relative flex flex-col border border-black bg-white opacity-90 transition-all hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                        <div className="relative aspect-[4/5] overflow-hidden border-b border-black bg-gray-50 flex items-center justify-center">
                            <img alt="Handout Hoodie" className={`absolute inset-0 object-cover w-full h-full grayscale transition-transform duration-500 ${!hasStandardAccess ? 'locked-vault-blur opacity-50' : 'group-hover:scale-105'}`} src="https://lh3.googleusercontent.com/aida-public/AB6AXuBQ4N4e_ms8latx7MxXbPrvcm7-9TZS40QIuU2yJlQ6q5nz2RbwTv2c3Xk5avM74jUzFrM5fgEQMEwiYLdl-mvETp96W9bKDJ-yhavVa_9NWKNTeJbgcGceGimxOOYIipHJjzVeRNZFg0xY524sZxQ8lH3VCEDzSdNWNgaTFVcXMCQ_y-tHfFxD545HX1b7nGjT6LBzj__1hTXLXvBQXnetEXZTyA9zxETgWumURDf6k9Q52XAFHnJ0T-B-il8HBSsZ-V_drnxXdcg" />

                            {!hasStandardAccess && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center z-20 p-6 text-center">
                                    <div className="w-16 h-16 bg-black text-white rounded-full flex items-center justify-center mb-4 shadow-xl">
                                        <span className="material-symbols-outlined text-3xl">lock</span>
                                    </div>
                                    <div className="bg-black text-white p-3 border border-white max-w-[240px]">
                                        <p className="font-mono text-[10px] uppercase tracking-widest leading-relaxed">
                                            Requires 1,000 XP or Standard Tier to Unlock
                                        </p>
                                    </div>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.05)_50%)] bg-[length:100%_4px] pointer-events-none z-10"></div>
                            {hasStandardAccess && (
                                <div className="absolute top-4 left-4 bg-white border border-black px-2 py-1 z-10">
                                    <span className="font-mono text-[10px] font-bold uppercase tracking-widest">In Stock</span>
                                </div>
                            )}
                        </div>
                        <div className={`p-6 flex flex-col flex-1 justify-between gap-4 ${!hasStandardAccess ? 'opacity-50 select-none' : ''}`}>
                            <div>
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-2xl font-bold uppercase tracking-tight">Handout Hoodie</h3>
                                    <span className="font-mono font-bold">$85.00</span>
                                </div>
                                <p className="font-mono text-xs text-black/60 leading-relaxed uppercase">Tactical fleece. Reinforced elbows. Hidden pockets.</p>
                            </div>
                            <button
                                className={`w-full py-3 font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-colors ${!hasStandardAccess ? 'bg-transparent text-black border-2 border-black/20 cursor-not-allowed' : 'bg-black text-white border-2 border-black hover:bg-white hover:text-black'}`}
                                disabled={!hasStandardAccess}
                            >
                                {!hasStandardAccess ? (
                                    <><span className="material-symbols-outlined text-sm">lock</span> Locked</>
                                ) : (
                                    <>Add to Cart</>
                                )}
                            </button>
                        </div>
                    </article>

                    {/* Item 3: Premium Only */}
                    <article className="group relative flex flex-col border border-black bg-white opacity-90 transition-all hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                        <div className="relative aspect-[4/5] overflow-hidden border-b border-black bg-gray-50 flex items-center justify-center">
                            <img alt="Physical Vinyl" className={`absolute inset-0 object-cover w-full h-full grayscale transition-transform duration-500 ${!hasPremiumAccess ? 'locked-vault-blur opacity-50' : 'group-hover:scale-105'}`} src="https://lh3.googleusercontent.com/aida-public/AB6AXuBzRwsB9FR8YQtZp8WB940ZcnmqU1mz_rpGPSC2dlvVrld-LJa9EVDGqe6dFHX5Op9bs_elK16PgRURj4Jm6PX3Jgbcbmbzb_n2_5ZdAHrnAqf237phqMSPtVHw2JkyH76GCwg1xh4HUywmgcyEydMzNZcCiwMG6v7cr3tLkv5ZEWcW4gGY9ctGS_LXIozcK4HGmzReiNAgOd_gB14vzwGhZandb07r6XAAolsni70i4QxpZqEaPt9Q-_oRe3FKBVDz4wCJoCPWhEs" />

                            {!hasPremiumAccess && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center z-20 p-6 text-center">
                                    <div className="w-16 h-16 bg-black text-white rounded-full flex items-center justify-center mb-4 shadow-xl">
                                        <span className="material-symbols-outlined text-3xl">lock</span>
                                    </div>
                                    <div className="bg-black text-white p-3 border border-white max-w-[240px]">
                                        <p className="font-mono text-[10px] uppercase tracking-widest leading-relaxed">
                                            Requires Premium Tier Subscription
                                        </p>
                                    </div>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.05)_50%)] bg-[length:100%_4px] pointer-events-none z-10"></div>
                            {hasPremiumAccess && (
                                <div className="absolute top-4 left-4 bg-white border border-black px-2 py-1 z-10">
                                    <span className="font-mono text-[10px] font-bold uppercase tracking-widest">In Stock</span>
                                </div>
                            )}
                        </div>
                        <div className={`p-6 flex flex-col flex-1 justify-between gap-4 ${!hasPremiumAccess ? 'opacity-50 select-none' : ''}`}>
                            <div>
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-2xl font-bold uppercase tracking-tight">Limited Vinyl</h3>
                                    <span className="font-mono font-bold">$120.00</span>
                                </div>
                                <p className="font-mono text-xs text-black/60 leading-relaxed uppercase">180g White Vinyl. Gatefold jacket. Includes digital download.</p>
                            </div>
                            <button
                                className={`w-full py-3 font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-colors ${!hasPremiumAccess ? 'bg-transparent text-black border-2 border-black/20 cursor-not-allowed' : 'bg-black text-white border-2 border-black hover:bg-white hover:text-black'}`}
                                disabled={!hasPremiumAccess}
                            >
                                {!hasPremiumAccess ? (
                                    <><span className="material-symbols-outlined text-sm">lock</span> Locked</>
                                ) : (
                                    <>Add to Cart</>
                                )}
                            </button>
                        </div>
                    </article>
                </div>

                <div className="mt-12 w-full border-t border-black pt-6 flex justify-between items-center text-[10px] font-mono uppercase tracking-widest text-black/60">
                    <span>Vault Access: Level {hasStandardAccess ? (hasPremiumAccess ? '3 (Premium)' : '2 (Standard)') : '1 (Base)'}</span>
                    <span>Next Unlock: {hasStandardAccess ? 'N/A' : `${1000 - (userDoc?.xp.total ?? 0)} XP`}</span>
                </div>
            </main>

            <footer className="relative z-20 border-t-2 border-black w-full bg-white py-8 px-6 md:px-12 flex flex-col md:flex-row justify-between items-center gap-4 mt-auto">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-xl">verified_user</span>
                    <span className="font-mono text-[10px] uppercase tracking-widest">Official Merch Store</span>
                </div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-center md:text-right">
                    <p>© 2026 SAVEHXPE</p>
                    <p className="text-black/40 mt-1">VAULT_VER_1.0.4</p>
                </div>
            </footer>
        </div>
    );
}
