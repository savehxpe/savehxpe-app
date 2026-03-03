'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function UpgradePage() {
    const { firebaseUser, userDoc, loading } = useAuth();
    const router = useRouter();
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!loading && !firebaseUser) {
            router.replace('/login');
        }
    }, [firebaseUser, loading, router]);

    const handleUpgrade = async () => {
        if (!firebaseUser) return;
        setProcessing(true);
        setError('');

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
            const message = err instanceof Error ? err.message : 'An error occurred';
            setError(message);
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
                <div className="spinner" />
            </div>
        );
    }

    const tier = userDoc?.tier?.current || 'FREE';

    if (tier !== 'FREE') {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                padding: '2rem',
                textAlign: 'center',
            }}>
                <span className="badge badge-purple" style={{ marginBottom: '1rem' }}>
                    {tier}
                </span>
                <h1 className="text-heading" style={{ marginBottom: '0.5rem' }}>
                    You are already on the {tier} tier
                </h1>
                <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
                    Your vault is unlocked. Go explore.
                </p>
                <button className="btn-outline" onClick={() => router.push('/dashboard')} style={{ maxWidth: '200px' }}>
                    Back to Dashboard
                </button>
            </div>
        );
    }

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '2rem',
        }}>
            <div style={{
                maxWidth: '420px',
                width: '100%',
                textAlign: 'center',
            }}>
                <h1 className="text-display" style={{ marginBottom: '0.5rem' }}>
                    Unlock the Vault
                </h1>
                <p style={{
                    color: 'var(--color-text-secondary)',
                    fontSize: '0.875rem',
                    lineHeight: 1.6,
                    marginBottom: '2.5rem',
                }}>
                    Get full access to exclusive stems, early releases, and your 1.5x XP multiplier with a 7-day free trial.
                </p>

                {/* Features List */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    marginBottom: '2rem',
                    textAlign: 'left',
                }}>
                    {[
                        'Full Vault access — all stems and releases',
                        '1.5x XP multiplier on all actions',
                        'Exclusive EPIC and LEGENDARY collectibles',
                        'Priority leaderboard placement',
                        'Cancel anytime during trial',
                    ].map((feature, i) => (
                        <div key={i} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.75rem 1rem',
                            background: 'var(--color-surface)',
                            border: '1px solid var(--color-border)',
                        }}>
                            <span style={{ color: 'var(--color-accent-green)', fontWeight: 700 }}>✓</span>
                            <span style={{ fontSize: '0.8125rem' }}>{feature}</span>
                        </div>
                    ))}
                </div>

                {error && (
                    <div style={{
                        padding: '0.75rem 1rem',
                        background: 'rgba(255,51,68,0.1)',
                        border: '1px solid rgba(255,51,68,0.3)',
                        fontSize: '0.75rem',
                        color: '#FF3344',
                        marginBottom: '1rem',
                    }}>
                        {error}
                    </div>
                )}

                <button
                    className="btn-gold"
                    onClick={handleUpgrade}
                    disabled={processing}
                >
                    {processing ? (
                        <div className="spinner" style={{ width: '18px', height: '18px', borderColor: '#333', borderTopColor: '#000' }} />
                    ) : (
                        'Start 7-Day Free Trial'
                    )}
                </button>

                <button
                    className="btn-outline"
                    onClick={() => router.push('/dashboard')}
                    style={{ marginTop: '0.75rem', height: '2.5rem' }}
                >
                    Maybe Later
                </button>
            </div>
        </div>
    );
}
