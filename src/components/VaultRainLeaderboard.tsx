'use client';

import { useMemo } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// VAULT RAIN LEADERBOARD — The Syndicate
// Dark mode scrollable leaderboard with Top 3 medal styling, Viral badges,
// and Engagement Score (E = log10(XP_total + 1) × 20) column.
// ─────────────────────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
    rank: number;
    username: string;
    maxStreak: number;
    totalXp: number;
    engagementScore: number;
}

interface VaultRainLeaderboardProps {
    leaderboardData: LeaderboardEntry[];
    activeUser?: {
        rank: number;
        username: string;
        maxStreak: number;
        totalXp: number;
        engagementScore: number;
    };
}

export default function VaultRainLeaderboard({
    leaderboardData,
    activeUser,
}: VaultRainLeaderboardProps) {
    const isActiveInTop10 = useMemo(() => {
        if (!activeUser) return true;
        return leaderboardData.some(
            (entry) => entry.username === activeUser.username && entry.rank <= 10
        );
    }, [leaderboardData, activeUser]);

    const getRankShadow = (rank: number): string => {
        switch (rank) {
            case 1: return '0 0 12px #FFD700, 0 0 4px #FFD700';
            case 2: return '0 0 10px #C0C0C0, 0 0 3px #C0C0C0';
            case 3: return '0 0 10px #CD7F32, 0 0 3px #CD7F32';
            default: return 'none';
        }
    };

    const getRankColor = (rank: number): string => {
        switch (rank) {
            case 1: return '#FFD700';
            case 2: return '#C0C0C0';
            case 3: return '#CD7F32';
            default: return '#888888';
        }
    };

    const getRankLabel = (rank: number): string => {
        switch (rank) {
            case 1: return '👑';
            case 2: return '🥈';
            case 3: return '🥉';
            default: return `${rank}`;
        }
    };

    return (
        <div
            className="relative flex flex-col rounded-lg overflow-hidden"
            style={{
                backgroundColor: '#050505',
                border: '2px solid rgba(0, 255, 255, 0.3)',
                boxShadow: 'inset 0 2px 20px rgba(0, 0, 0, 0.8), 0 0 40px rgba(0, 255, 255, 0.05)',
                fontFamily: "'Courier New', Courier, monospace",
                maxHeight: '600px',
            }}
        >
            {/* ═══ Header ═══ */}
            <div
                className="px-5 py-4 border-b flex items-center justify-between shrink-0"
                style={{ borderColor: 'rgba(0, 255, 255, 0.2)' }}
            >
                <h2
                    className="text-sm sm:text-base font-bold tracking-wider uppercase"
                    style={{ color: 'rgb(34, 211, 238)' }}
                >
                    {'// VAULT_RAIN : THE SYNDICATE'}
                </h2>
                <div
                    className="flex items-center gap-2 text-xs uppercase tracking-wider"
                    style={{ color: 'rgba(0, 255, 255, 0.5)' }}
                >
                    <span
                        className="inline-block w-2 h-2 rounded-full animate-pulse"
                        style={{ backgroundColor: '#00FF00' }}
                    />
                    LIVE
                </div>
            </div>

            {/* ═══ Table Header Row ═══ */}
            <div
                className="grid px-5 py-2 text-[10px] uppercase tracking-[0.2em] font-bold shrink-0"
                style={{
                    gridTemplateColumns: '50px 1fr 100px 80px 110px',
                    color: 'rgba(255, 255, 255, 0.35)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                }}
            >
                <span>RNK</span>
                <span>OPERATIVE</span>
                <span className="text-center">STREAK</span>
                <span className="text-center">XP</span>
                <span className="text-right">E-SCORE</span>
            </div>

            {/* ═══ Scrollable List ═══ */}
            <div
                className="flex-1 overflow-y-auto"
                style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgba(0, 255, 255, 0.2) transparent',
                }}
            >
                <style>{`
                    .vault-leaderboard-scroll::-webkit-scrollbar {
                        width: 4px;
                    }
                    .vault-leaderboard-scroll::-webkit-scrollbar-track {
                        background: transparent;
                    }
                    .vault-leaderboard-scroll::-webkit-scrollbar-thumb {
                        background: rgba(0, 255, 255, 0.25);
                        border-radius: 2px;
                    }
                    .vault-leaderboard-scroll::-webkit-scrollbar-thumb:hover {
                        background: rgba(0, 255, 255, 0.5);
                    }
                    @keyframes viralPulse {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.4; }
                    }
                `}</style>
                <div className="vault-leaderboard-scroll overflow-y-auto" style={{ maxHeight: '420px' }}>
                    {leaderboardData.length === 0 ? (
                        <div className="text-center py-12 uppercase tracking-widest text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                            NO SYNDICATE DATA FOUND
                        </div>
                    ) : (
                        leaderboardData.map((entry) => (
                            <div
                                key={`${entry.rank}-${entry.username}`}
                                className="grid items-center px-5 py-3 transition-all duration-150 hover:bg-white/[0.03]"
                                style={{
                                    gridTemplateColumns: '50px 1fr 100px 80px 110px',
                                    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                                }}
                            >
                                {/* Rank */}
                                <span
                                    className="font-black text-base"
                                    style={{
                                        color: getRankColor(entry.rank),
                                        textShadow: getRankShadow(entry.rank),
                                    }}
                                >
                                    {getRankLabel(entry.rank)}
                                </span>

                                {/* Username */}
                                <span
                                    className="font-bold text-sm tracking-wider uppercase truncate pr-4"
                                    style={{
                                        color: entry.rank <= 3 ? '#FFFFFF' : 'rgba(255,255,255,0.7)',
                                        textShadow: entry.rank <= 3 ? getRankShadow(entry.rank) : 'none',
                                    }}
                                >
                                    {entry.username}
                                </span>

                                {/* Streak + Viral Badge */}
                                <div className="flex items-center justify-center gap-1.5">
                                    <span
                                        className="font-bold text-sm"
                                        style={{ color: 'rgba(255, 255, 255, 0.8)' }}
                                    >
                                        {entry.maxStreak}
                                    </span>
                                    {entry.maxStreak >= 20 && (
                                        <span
                                            className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded"
                                            style={{
                                                color: '#22C55E',
                                                backgroundColor: 'rgba(34, 197, 94, 0.12)',
                                                border: '1px solid rgba(34, 197, 94, 0.3)',
                                                animation: 'viralPulse 2s ease-in-out infinite',
                                            }}
                                        >
                                            VIRAL
                                        </span>
                                    )}
                                </div>

                                {/* XP */}
                                <span
                                    className="text-center text-xs font-bold"
                                    style={{ color: '#FF00FF' }}
                                >
                                    {entry.totalXp.toLocaleString()}
                                </span>

                                {/* Engagement Score — Pixelated emphasis */}
                                <div
                                    className="text-right font-black text-base tracking-wider"
                                    style={{
                                        color: '#00FF00',
                                        textShadow: '0 0 8px rgba(0, 255, 0, 0.4)',
                                        fontFamily: "'Courier New', Courier, monospace",
                                        imageRendering: 'pixelated',
                                    }}
                                >
                                    {entry.engagementScore.toFixed(1)}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* ═══ Formula Footer ═══ */}
            <div
                className="px-5 py-2 flex items-center justify-center gap-3 text-[10px] uppercase tracking-widest shrink-0"
                style={{
                    borderTop: '1px solid rgba(0, 255, 255, 0.15)',
                    color: 'rgba(0, 255, 255, 0.4)',
                    backgroundColor: 'rgba(0, 255, 255, 0.02)',
                }}
            >
                <span>FORMULA:</span>
                <span
                    className="font-bold tracking-tight"
                    style={{
                        color: '#00FF00',
                        fontFamily: "'Courier New', Courier, monospace",
                    }}
                >
                    E = log₁₀(XP + 1) × 20
                </span>
            </div>

            {/* ═══ Active User Sticky Footer (if not in top 10) ═══ */}
            {activeUser && !isActiveInTop10 && (
                <div
                    className="grid items-center px-5 py-3 shrink-0"
                    style={{
                        gridTemplateColumns: '50px 1fr 100px 80px 110px',
                        borderTop: '2px solid #EF4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.05)',
                    }}
                >
                    {/* Rank */}
                    <span
                        className="font-bold text-sm"
                        style={{ color: '#EF4444' }}
                    >
                        {activeUser.rank}
                    </span>

                    {/* Username */}
                    <span
                        className="font-bold text-sm tracking-wider uppercase truncate pr-4"
                        style={{ color: '#EF4444' }}
                    >
                        {activeUser.username}
                        <span className="text-[9px] ml-2 opacity-50 normal-case">(YOU)</span>
                    </span>

                    {/* Streak */}
                    <div className="flex items-center justify-center gap-1.5">
                        <span className="font-bold text-sm" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                            {activeUser.maxStreak}
                        </span>
                        {activeUser.maxStreak >= 20 && (
                            <span
                                className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded"
                                style={{
                                    color: '#22C55E',
                                    backgroundColor: 'rgba(34, 197, 94, 0.12)',
                                    border: '1px solid rgba(34, 197, 94, 0.3)',
                                    animation: 'viralPulse 2s ease-in-out infinite',
                                }}
                            >
                                VIRAL
                            </span>
                        )}
                    </div>

                    {/* XP */}
                    <span className="text-center text-xs font-bold" style={{ color: '#FF00FF' }}>
                        {activeUser.totalXp.toLocaleString()}
                    </span>

                    {/* Engagement Score */}
                    <div
                        className="text-right font-black text-base tracking-wider"
                        style={{
                            color: '#EF4444',
                            textShadow: '0 0 8px rgba(239, 68, 68, 0.3)',
                            fontFamily: "'Courier New', Courier, monospace",
                        }}
                    >
                        {activeUser.engagementScore.toFixed(1)}
                    </div>
                </div>
            )}
        </div>
    );
}
