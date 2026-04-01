'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY_LAST_CLAIM = 'hxpe_daily_last_claim';
const STORAGE_KEY_STREAK = 'hxpe_daily_streak';
const DAY_MS = 24 * 60 * 60 * 1000;
const BPM_PULSE_DURATION = 60 / 114; // seconds per beat at 114 BPM

interface Props {
    onClaim: (credits: number) => void;
}

export default function DailyBonus({ onClaim }: Props) {
    const [canClaim, setCanClaim] = useState(false);
    const [streak, setStreak] = useState(0);
    const [claimed, setClaimed] = useState(false);

    useEffect(() => {
        const lastClaim = localStorage.getItem(STORAGE_KEY_LAST_CLAIM);
        const savedStreak = parseInt(localStorage.getItem(STORAGE_KEY_STREAK) || '0', 10);
        const now = Date.now();

        if (!lastClaim) {
            setCanClaim(true);
            setStreak(savedStreak);
            return;
        }

        const elapsed = now - parseInt(lastClaim, 10);

        if (elapsed >= DAY_MS) {
            setCanClaim(true);
            // If more than 48h, streak resets
            if (elapsed >= DAY_MS * 2) {
                setStreak(0);
                localStorage.setItem(STORAGE_KEY_STREAK, '0');
            } else {
                setStreak(savedStreak);
            }
        } else {
            setCanClaim(false);
            setStreak(savedStreak);
        }
    }, []);

    const handleClaim = useCallback(() => {
        if (!canClaim || claimed) return;

        const now = Date.now();
        const newStreak = streak + 1;

        localStorage.setItem(STORAGE_KEY_LAST_CLAIM, now.toString());
        localStorage.setItem(STORAGE_KEY_STREAK, newStreak.toString());

        setStreak(newStreak);
        setCanClaim(false);
        setClaimed(true);
        onClaim(10);
    }, [canClaim, claimed, streak, onClaim]);

    const padded = streak.toString().padStart(2, '0');

    return (
        <div style={{
            padding: '0.75rem 1.25rem',
            borderBottom: '1px solid var(--color-border)',
        }}>
            {canClaim && !claimed ? (
                <button
                    onClick={handleClaim}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        width: '100%',
                        background: 'none',
                        border: '1px solid rgba(255,255,255,0.15)',
                        padding: '0.5rem 0.625rem',
                        cursor: 'pointer',
                        transition: 'border-color 0.2s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)')}
                >
                    <span
                        style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            backgroundColor: '#fff',
                            flexShrink: 0,
                            animation: `dailyPulse ${BPM_PULSE_DURATION}s ease-in-out infinite`,
                        }}
                    />
                    <span style={{
                        fontFamily: 'monospace',
                        fontSize: '0.5625rem',
                        fontWeight: 700,
                        letterSpacing: '0.15em',
                        textTransform: 'uppercase' as const,
                        color: '#fff',
                    }}>
                        CLAIM DAILY DEPLOYMENT: +10 CR
                    </span>
                </button>
            ) : (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 0.625rem',
                    opacity: 0.4,
                }}>
                    <span style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        backgroundColor: '#fff',
                        flexShrink: 0,
                    }} />
                    <span style={{
                        fontFamily: 'monospace',
                        fontSize: '0.5625rem',
                        fontWeight: 700,
                        letterSpacing: '0.15em',
                        textTransform: 'uppercase' as const,
                        color: '#fff',
                    }}>
                        {claimed ? 'DEPLOYED' : 'DEPLOYED'}
                    </span>
                </div>
            )}

            <div style={{
                fontFamily: 'monospace',
                fontSize: '0.5rem',
                fontWeight: 700,
                letterSpacing: '0.2em',
                textTransform: 'uppercase' as const,
                color: 'rgba(255,255,255,0.3)',
                marginTop: '0.375rem',
                paddingLeft: '0.625rem',
            }}>
                STREAK: {padded} DAYS
            </div>

            <style>{`
                @keyframes dailyPulse {
                    0%, 100% { opacity: 0.3; transform: scale(0.85); }
                    50% { opacity: 1; transform: scale(1.15); }
                }
            `}</style>
        </div>
    );
}
