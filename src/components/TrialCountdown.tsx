'use client';

import { useEffect, useState } from 'react';

interface TrialCountdownProps {
    trialEndsAt: { _seconds: number; _nanoseconds: number } | null | undefined;
}

function formatTime(seconds: number): { days: number; hours: number; minutes: number; secs: number } {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return { days, hours, minutes, secs };
}

function pad(n: number): string {
    return n.toString().padStart(2, '0');
}

export default function TrialCountdown({ trialEndsAt }: TrialCountdownProps) {
    const [remaining, setRemaining] = useState<number | null>(() => {
        if (!trialEndsAt) return null;
        const endMs = trialEndsAt._seconds * 1000;
        return Math.max(0, Math.floor((endMs - Date.now()) / 1000));
    });

    useEffect(() => {
        if (!trialEndsAt) return;

        const endMs = trialEndsAt._seconds * 1000;

        const interval = setInterval(() => {
            const diff = Math.max(0, Math.floor((endMs - Date.now()) / 1000));
            setRemaining(diff);
        }, 1000);

        return () => clearInterval(interval);
    }, [trialEndsAt]);

    if (remaining === null || remaining <= 0) return null;

    const { days, hours, minutes, secs } = formatTime(remaining);
    const isUrgent = remaining < 48 * 3600; // < 48 hours

    return (
        <div className="card" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '1.5rem',
            background: isUrgent ? 'rgba(255,51,68,0.05)' : 'var(--color-surface)',
            borderColor: isUrgent ? 'rgba(255,51,68,0.3)' : undefined,
        }}>
            <span className="text-label" style={{
                color: isUrgent ? 'var(--color-accent-red)' : undefined,
            }}>
                {isUrgent ? '⚠ Trial Ending Soon' : 'Standard Trial Active'}
            </span>

            <div className={`trial-countdown ${isUrgent ? 'urgent' : ''}`}>
                {days > 0 && <span>{days}d </span>}
                <span>{pad(hours)}</span>
                <span style={{ opacity: 0.4 }}>:</span>
                <span>{pad(minutes)}</span>
                <span style={{ opacity: 0.4 }}>:</span>
                <span>{pad(secs)}</span>
            </div>

            <span className="text-label" style={{ fontSize: '0.5625rem' }}>
                Vault access expires when trial ends
            </span>
        </div>
    );
}
