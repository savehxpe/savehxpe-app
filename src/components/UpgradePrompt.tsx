'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface UpgradePromptProps {
    variant?: 'header' | 'full' | 'inline';
}

export default function UpgradePrompt({ variant = 'full' }: UpgradePromptProps) {
    const { firebaseUser } = useAuth();
    const [loading, setLoading] = useState(false);

    const handleUpgrade = async () => {
        if (!firebaseUser) return;
        setLoading(true);
        try {
            const res = await fetch('/api/create-checkout-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STANDARD,
                    uid: firebaseUser.uid,
                }),
            });

            const data = await res.json();

            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error(data.error || 'Failed to create checkout session');
            }
        } catch (err) {
            console.error('Upgrade error:', err);
            setLoading(false);
        }
    };

    if (variant === 'header') {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                background: 'linear-gradient(90deg, rgba(255,215,0,0.08), rgba(168,85,247,0.08))',
                border: '1px solid rgba(255,215,0,0.15)',
                marginBottom: '1.5rem',
            }}>
                <div>
                    <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase' as const,
                    }}>
                        ⚡ Unlock Full Vault Access
                    </span>
                    <span className="text-label" style={{
                        display: 'block',
                        marginTop: '0.125rem',
                        color: 'var(--color-text-muted)',
                    }}>
                        7-day free trial · 1.5x XP multiplier
                    </span>
                </div>
                <button
                    onClick={handleUpgrade}
                    disabled={loading}
                    style={{
                        background: 'var(--color-accent-gold)',
                        color: '#000',
                        border: 'none',
                        padding: '0.5rem 1rem',
                        fontFamily: 'var(--font-display)',
                        fontWeight: 800,
                        fontSize: '0.625rem',
                        letterSpacing: '0.15em',
                        textTransform: 'uppercase' as const,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap' as const,
                    }}
                >
                    {loading ? '...' : 'Upgrade'}
                </button>
            </div>
        );
    }

    if (variant === 'inline') {
        return (
            <button
                onClick={handleUpgrade}
                disabled={loading}
                className="btn-gold"
                style={{ maxWidth: '300px' }}
            >
                {loading ? (
                    <div className="spinner" style={{ width: '18px', height: '18px', borderColor: '#333', borderTopColor: '#000' }} />
                ) : (
                    'Start 7-Day Free Trial'
                )}
            </button>
        );
    }

    // Full variant
    return (
        <div className="vault-locked-overlay">
            <div style={{
                textAlign: 'center',
                maxWidth: '320px',
                padding: '2rem',
            }}>
                <div style={{
                    fontSize: '2.5rem',
                    marginBottom: '1rem',
                    opacity: 0.6,
                }}>
                    🔒
                </div>
                <h2 className="text-heading" style={{ marginBottom: '0.75rem' }}>
                    Vault Access Restricted
                </h2>
                <p style={{
                    fontSize: '0.8125rem',
                    color: 'var(--color-text-secondary)',
                    lineHeight: 1.6,
                    marginBottom: '1.5rem',
                }}>
                    Start your 7-day free trial to unlock exclusive stems, early access tracks, and your 1.5x XP multiplier.
                </p>
                <button
                    onClick={handleUpgrade}
                    disabled={loading}
                    className="btn-gold"
                >
                    {loading ? (
                        <div className="spinner" style={{ width: '18px', height: '18px', borderColor: '#333', borderTopColor: '#000' }} />
                    ) : (
                        'Upgrade to Standard'
                    )}
                </button>
            </div>
        </div>
    );
}
