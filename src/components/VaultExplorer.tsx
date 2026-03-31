'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import VaultPricing from './VaultPricing';

const directoryStructure = [
    {
        id: 'HANDOUT',
        label: '// PROJECT: HANDOUT',
        files: [
            { id: 'ho1', name: 'HANDOUT_MASTER.wav', duration: '3:10', size: '45.0 MB' }
        ]
    },
    {
        id: 'RAW_STEMS',
        label: '// RAW_STEMS',
        files: [
            { id: 'rs1', name: 'DRUM_BUS_RAW.wav', duration: '3:45', size: '42.5 MB' },
            { id: 'rs2', name: 'BASS_SUB_RAW.wav', duration: '3:45', size: '28.1 MB' },
            { id: 'rs3', name: 'SYNTH_LEAD_RAW.wav', duration: '3:45', size: '60.2 MB' },
        ]
    },
    {
        id: 'INSTRUMENTALS',
        label: '// INSTRUMENTALS',
        files: [
            { id: 'ins1', name: 'OUTWORLD_ANTHEM_INST.wav', duration: '4:12', size: '55.0 MB' },
            { id: 'ins2', name: 'NIGHT_CITY_INST.wav', duration: '2:58', size: '38.4 MB' },
        ]
    },
    {
        id: 'BREAKDOWNS',
        label: '// BREAKDOWNS',
        files: [
            { id: 'br1', name: 'SESSION_01_BREAKDOWN.mp4', duration: '12:05', size: '450.2 MB' },
            { id: 'br2', name: 'MIXING_LOW_END.mp4', duration: '08:30', size: '312.5 MB' },
        ]
    }
];

// Placeholder SVG UI
const PlayIcon = () => <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>;
const PauseIcon = () => <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>;
const LoopIcon = () => <svg className="w-5 h-5 fill-none stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M17 1l4 4-4 4" /> <path d="M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4" /> <path d="M21 13v2a4 4 0 0 1-4 4H3" /></svg>;

function AccessDenied() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[600px] w-full bg-[#050505] p-8">
            <h1 className="text-3xl font-black text-red-500 mb-4 tracking-widest font-mono border-b border-red-500/50 pb-4 w-full max-w-2xl text-center">
                ACCESS DENIED
            </h1>
            <p className="text-red-400/80 font-mono mb-8 max-w-xl text-center">
                SECURITY CLEARANCE REQUIRED. YOUR CITIZEN PROFILE LACKS THE NECESSARY SUBSCRIPTION TIER TO ACCESS THE VAULT ARCHIVES.
            </p>
            <VaultPricing />
        </div>
    );
}

export default function VaultExplorer() {
    const { userDoc, loading } = useAuth();
    const [activeFolder, setActiveFolder] = useState<string>('RAW_STEMS');
    const [playingState, setPlayingState] = useState<{ id: string | null; paused: boolean }>({ id: null, paused: false });
    const [extractingId, setExtractingId] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);

    // Ensure we handle both potential tier shape mutations
    const rawTier = userDoc?.tier as any;
    const isPremium = rawTier === 'Premium' || rawTier?.current === 'PREMIUM';
    const isStandard = rawTier === 'Standard' || rawTier?.current === 'STANDARD';
    const hasAccess = isPremium || isStandard;

    // "Decrypting" extraction simulation
    useEffect(() => {
        if (!extractingId) return;
        const interval = setInterval(() => {
            setProgress(p => {
                if (p >= 100) {
                    clearInterval(interval);
                    setTimeout(() => setExtractingId(null), 500);
                    return 100;
                }
                return p + Math.floor(Math.random() * 20) + 5;
            });
        }, 300);
        return () => clearInterval(interval);
    }, [extractingId]);

    if (loading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center font-mono text-cyan-400">&gt; INITIALIZING VAULT...</div>;

    if (!hasAccess) {
        return <AccessDenied />;
    }

    const currentFiles = directoryStructure.find(d => d.id === activeFolder)?.files || [];

    const handleExtract = (id: string) => {
        if (extractingId) return; // Prevent multiple
        setProgress(0);
        setExtractingId(id);
    };

    const handlePlayPause = (id: string) => {
        if (playingState.id === id) {
            setPlayingState(prev => ({ ...prev, paused: !prev.paused }));
        } else {
            setPlayingState({ id, paused: false });
        }
    };

    return (
        <div className="w-full flex flex-col bg-[#050505] min-h-[80vh] font-mono text-white selection:bg-[#00FFFF] selection:text-black border border-[#333] relative overflow-hidden">

            {/* Ambient Core Glow */}
            <div className="absolute inset-0 z-0 pointer-events-none" style={{ background: 'radial-gradient(circle at center, rgba(0,255,255,0.02) 0%, transparent 60%)' }} />

            {/* Main Viewport */}
            <div className="flex flex-1 overflow-hidden z-10">

                {/* ── 1. The Directory Nav (Left Sidebar) ── */}
                <aside className="w-64 border-r border-[#333] bg-[#0A0A0A] shrink-0 p-4 flex flex-col">
                    <div className="text-xs text-[#00FFFF]/50 mb-6 tracking-widest uppercase border-b border-[#333] pb-2">Vault Directory</div>
                    <ul className="space-y-4">
                        {directoryStructure.map((folder) => {
                            const isActive = activeFolder === folder.id;
                            return (
                                <li key={folder.id}>
                                    <button
                                        onClick={() => setActiveFolder(folder.id)}
                                        className={`w-full text-left font-bold transition-all flex items-center gap-2 group
                                            ${isActive ? 'text-[#00FFFF]' : 'text-gray-400 hover:text-white'}
                                        `}
                                        style={isActive ? { textShadow: '0 0 8px rgba(0,255,255,0.4)' } : {}}
                                    >
                                        <span className={`transition-colors ${isActive ? 'text-[#00FFFF]' : 'text-gray-600 group-hover:text-gray-400'}`}>
                                            {isActive ? '[-]' : '[+]'}
                                        </span>
                                        <span className={`uppercase tracking-wider text-sm ${isActive ? 'border-l-2 border-[#00FFFF] pl-2 -ml-[2px]' : 'pl-2'}`}>
                                            {folder.label.replace('// ', '')}
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </aside>

                {/* ── 2. The Data Grid (Main Content Area) ── */}
                <main className="flex-1 p-6 relative overflow-y-auto custom-scrollbar">
                    <div className="text-sm tracking-widest text-[#00FFFF] mb-4 uppercase [&_span]:opacity-50 border-b border-[#333] pb-2 text-shadow-glow">
                        // PATH: <span>ROOT / {activeFolder.replace('_', ' ')}</span>
                    </div>

                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-xs text-gray-400 uppercase tracking-widest border-b border-[#333]/50">
                                <th className="pb-3 pt-2 pl-4 font-normal">FILE_NAME</th>
                                <th className="pb-3 pt-2 px-4 font-normal">DURATION</th>
                                <th className="pb-3 pt-2 px-4 font-normal">SIZE (MB)</th>
                                <th className="pb-3 pt-2 px-4 font-normal text-right">ACTION</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentFiles.map((file) => {
                                const isExtracting = extractingId === file.id;
                                const isRowPlaying = playingState.id === file.id && !playingState.paused;

                                return (
                                    <tr
                                        key={file.id}
                                        className={`group border-b border-[#222] transition-colors hover:bg-[#00FFFF]/[0.02] 
                                            ${isRowPlaying ? 'bg-[#00FFFF]/[0.05] border-l-2 border-l-[#00FFFF]' : 'border-l-2 border-l-transparent'}
                                        `}
                                    >
                                        {/* Row Highlight styles via group-hover */}
                                        <td className="py-4 pl-4 font-sans text-sm md:text-base font-semibold tracking-wide text-gray-200 group-hover:text-white transition-all">
                                            <span
                                                className={`cursor-pointer transition-all ${isRowPlaying ? 'text-[#00FFFF]' : ''}`}
                                                onClick={() => handlePlayPause(file.id)}
                                                style={isRowPlaying ? { textShadow: '0 0 8px rgba(0,255,255,0.4)' } : {}}
                                            >
                                                {file.name}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4 text-xs md:text-sm text-gray-500">{file.duration}</td>
                                        <td className="py-4 px-4 text-xs md:text-sm text-gray-500">{file.size}</td>
                                        <td className="py-4 px-4 text-right">

                                            {isExtracting ? (
                                                <div className="w-32 inline-flex flex-col items-end gap-1">
                                                    <span className="text-[10px] text-gray-400 animate-pulse uppercase tracking-widest">Decrypting...</span>
                                                    <div className="w-full bg-[#111] h-1.5 border border-[#333] overflow-hidden">
                                                        <div
                                                            className="h-full bg-[#00FFFF] shadow-[0_0_10px_rgba(0,255,255,0.8)] transition-all duration-300"
                                                            style={{ width: `${progress}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => handleExtract(file.id)}
                                                    className="inline-block px-4 py-1.5 border-2 border-[#555] bg-[#111] text-xs font-bold tracking-[0.2em] text-gray-300 rounded-full transition-all hover:border-[#00FFFF] hover:bg-[#00FFFF] hover:text-black hover:scale-105 active:scale-95"
                                                    style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)' }} // metallic pill look
                                                >
                                                    [ EXTRACT ]
                                                </button>
                                            )}

                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </main>
            </div>

            {/* ── 3. The Playback Console (Bottom Anchor) ── */}
            <footer className="w-full bg-gradient-to-b from-[#111] to-[#0A0A0A] border-t-2 border-[#333] px-6 py-4 flex items-center justify-between z-20 shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">

                <div className="flex items-center gap-6">
                    <button
                        onClick={() => playingState.id && setPlayingState(p => ({ ...p, paused: !p.paused }))}
                        className="w-10 h-10 rounded-full bg-[#1A1A1A] border-2 border-[#444] flex items-center justify-center transition-all hover:border-[#00FFFF] hover:text-[#00FFFF] active:bg-[#00FFFF]/20"
                    >
                        {playingState.id && !playingState.paused ? <PauseIcon /> : <PlayIcon />}
                    </button>
                    <button className="text-gray-500 hover:text-white transition-colors">
                        <LoopIcon />
                    </button>
                </div>

                {/* The Waveform Visualizer */}
                <div className="flex-1 max-w-xl mx-8 flex items-end justify-center gap-[2px] h-8 overflow-hidden">
                    {Array.from({ length: 48 }).map((_, i) => (
                        <div
                            key={i}
                            className="bg-[#00FFFF] w-1.5 rounded-t-sm transition-all"
                            style={{
                                height: (playingState.id && !playingState.paused)
                                    ? `${15 + Math.random() * 85}%`
                                    : '15%',
                                opacity: (playingState.id && !playingState.paused) ? 0.8 : 0.2,
                                boxShadow: (playingState.id && !playingState.paused) ? '0 0 5px rgba(0,255,255,0.5)' : 'none',
                                animation: (playingState.id && !playingState.paused) ? `waveAnim ${0.2 + Math.random() * 0.3}s ease-in-out infinite alternate` : 'none'
                            }}
                        />
                    ))}
                </div>

                <div className="text-xs text-[#00FFFF] tracking-widest uppercase">
                    {playingState.id ? (
                        <span className="animate-pulse">SIGNAL LOCK</span>
                    ) : (
                        <span className="text-gray-600">NO SIGNAL</span>
                    )}
                </div>

                <style>{`
                    @keyframes waveAnim {
                        0% { transform: scaleY(0.8); }
                        100% { transform: scaleY(1.2); }
                    }
                    /* Subtle table hover row flicker */
                    tbody tr:hover {
                        animation: CRT_Flicker 0.15s ease-in-out 1;
                    }
                    @keyframes CRT_Flicker {
                        0% { opacity: 1; }
                        50% { opacity: 0.8; }
                        100% { opacity: 1; }
                    }
                `}</style>
            </footer>
        </div>
    );
}
