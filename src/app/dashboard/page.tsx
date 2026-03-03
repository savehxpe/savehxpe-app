'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import Sidebar from '@/components/Sidebar';
import XPBar from '@/components/XPBar';
import TrialCountdown from '@/components/TrialCountdown';
import UpgradePrompt from '@/components/UpgradePrompt';
import DailyStreak from '@/components/DailyStreak';

function DashboardContent() {
    const { firebaseUser, userDoc, loading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [showUpgradeSuccess, setShowUpgradeSuccess] = useState(false);

    const currentYear = new Date().getFullYear();

    useEffect(() => {
        if (!loading && !firebaseUser) {
            router.replace('/login');
        }
    }, [firebaseUser, loading, router]);

    // Check for upgrade success redirect
    useEffect(() => {
        if (searchParams.get('upgrade') === 'success') {
            setShowUpgradeSuccess(true);
            const timer = setTimeout(() => setShowUpgradeSuccess(false), 5000);
            return () => clearTimeout(timer);
        }
    }, [searchParams]);

    if (loading || !firebaseUser) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
                <div className="spinner" />
            </div>
        );
    }

    const tier = userDoc?.tier?.current || 'FREE';
    const xpTotal = userDoc?.xp?.total || 0;
    const multiplier = userDoc?.xp?.multiplier || 1.0;
    const isTrial = userDoc?.subscriptionStatus?.status === 'trialing';
    const isStandard = tier === 'STANDARD';
    const isPremium = tier === 'PREMIUM';
    const isFree = tier === 'FREE';

    // Fallback: if trial expired beyond 2-hour grace period, render as FREE
    const trialEndsAt = userDoc?.trialEndsAt;
    const trialExpiredLocally = trialEndsAt
        ? (trialEndsAt._seconds * 1000 + 2 * 3600 * 1000) < Date.now()
        : false;
    const effectiveTier = trialExpiredLocally && isTrial ? 'FREE' : tier;

    return (
        <>
            <Sidebar />
            <main className="main-content" style={{
                background: isPremium ? 'linear-gradient(180deg, #0a0800 0%, #000 30%)' : undefined,
            }}>
                {/* Upgrade Success Toast */}
                {showUpgradeSuccess && (
                    <div className="animate-slide-up" style={{
                        padding: '1rem',
                        background: 'rgba(0,255,136,0.08)',
                        border: '1px solid rgba(0,255,136,0.3)',
                        marginBottom: '1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                    }}>
                        <span style={{ fontSize: '1.25rem' }}>✓</span>
                        <div>
                            <span style={{
                                fontWeight: 700,
                                fontSize: '0.8125rem',
                                letterSpacing: '0.05em',
                                textTransform: 'uppercase' as const,
                            }}>
                                Upgrade Successful
                            </span>
                            <span className="text-label" style={{
                                display: 'block',
                                marginTop: '0.125rem',
                                color: 'var(--color-accent-green)',
                            }}>
                                Your 7-day Standard trial is now active
                            </span>
                        </div>
                    </div>
                )}

                {/* FREE Tier: Upgrade Header */}
                {effectiveTier === 'FREE' && <UpgradePrompt variant="header" />}

                {/* Page Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '1.5rem',
                }}>
                    <div>
                        <h1 className="text-heading" style={{ marginBottom: '0.25rem' }}>
                            {isPremium ? 'Command Center' : 'Dashboard'}
                        </h1>
                        <p className="text-label">
                            {isPremium ? 'VIP Access · Direct Line Active'
                                : isStandard ? 'Standard Access · Vault Unlocked'
                                    : 'Free Access · Limited Vault'}
                        </p>
                    </div>

                    {/* Live Drop Indicator */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        padding: '0.375rem 0.75rem',
                        border: '1px solid var(--color-border)',
                    }}>
                        <div style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: '#00FF88',
                            boxShadow: '0 0 8px rgba(0,255,136,0.5)',
                        }} />
                        <span className="text-label" style={{ fontSize: '0.5625rem' }}>System Online</span>
                    </div>
                </div>

                {/* XP Bar */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <XPBar total={xpTotal} multiplier={multiplier} tier={effectiveTier as 'FREE' | 'STANDARD' | 'PREMIUM'} />
                </div>

                {/* Grid Layout */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '1rem',
                }}>
                    {/* Trial Countdown (STANDARD only) */}
                    {isStandard && isTrial && (
                        <TrialCountdown trialEndsAt={trialEndsAt} />
                    )}

                    {/* Daily Streak */}
                    <DailyStreak
                        currentStreak={Math.min(Math.floor(xpTotal / 50), 6)}
                        xpReward={50}
                        multiplier={multiplier}
                        claimed={false}
                        onClaim={async () => {
                            try {
                                await fetch('/api/grant-xp', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        uid: firebaseUser.uid,
                                        action: 'daily_login',
                                    }),
                                });
                            } catch (err) {
                                console.error('Failed to claim daily loot:', err);
                            }
                        }}
                    />

                    {/* Quick Stats Card */}
                    <div className="card" style={{ padding: '1.25rem' }}>
                        <span className="text-label" style={{
                            display: 'block',
                            marginBottom: '1rem',
                        }}>Fan Intelligence</span>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '1rem',
                        }}>
                            <div>
                                <span style={{
                                    fontSize: '1.5rem',
                                    fontWeight: 800,
                                    display: 'block',
                                }}>
                                    {userDoc?.collectibles?.length || 0}
                                </span>
                                <span className="text-label" style={{ fontSize: '0.5625rem' }}>Collectibles</span>
                            </div>
                            <div>
                                <span style={{
                                    fontSize: '1.5rem',
                                    fontWeight: 800,
                                    display: 'block',
                                    color: userDoc?.engagementScore && userDoc.engagementScore > 500
                                        ? 'var(--color-accent-green)' : undefined,
                                }}>
                                    {Math.round(userDoc?.engagementScore || 0)}
                                </span>
                                <span className="text-label" style={{ fontSize: '0.5625rem' }}>Engagement Score</span>
                            </div>
                            <div>
                                <span style={{
                                    fontSize: '1.5rem',
                                    fontWeight: 800,
                                    display: 'block',
                                }}>
                                    {multiplier}x
                                </span>
                                <span className="text-label" style={{ fontSize: '0.5625rem' }}>XP Multiplier</span>
                            </div>
                            <div>
                                <span style={{
                                    fontSize: '1.5rem',
                                    fontWeight: 800,
                                    display: 'block',
                                    color: isPremium ? 'var(--color-accent-gold)' : isStandard ? 'var(--color-accent-purple)' : undefined,
                                }}>
                                    {effectiveTier}
                                </span>
                                <span className="text-label" style={{ fontSize: '0.5625rem' }}>Current Tier</span>
                            </div>
                        </div>
                    </div>

                    {/* Premium Concierge Widget */}
                    {isPremium && (
                        <div className="card glow-gold" style={{
                            background: 'linear-gradient(135deg, rgba(255,215,0,0.05), rgba(0,0,0,0.9))',
                            borderColor: 'rgba(255,215,0,0.2)',
                            padding: '1.5rem',
                        }}>
                            <span className="text-label" style={{
                                color: 'var(--color-accent-gold)',
                                display: 'block',
                                marginBottom: '0.75rem',
                            }}>VIP Concierge</span>
                            <p style={{
                                fontSize: '0.8125rem',
                                color: 'var(--color-text-secondary)',
                                lineHeight: 1.6,
                                marginBottom: '1rem',
                            }}>
                                Direct line to the saveHXPE team. Exclusive drops, pre-release access, and priority support.
                            </p>
                            <button className="btn-outline" style={{
                                borderColor: 'var(--color-accent-gold)',
                                color: 'var(--color-accent-gold)',
                                height: '2.5rem',
                            }}>
                                Open Direct Chat
                            </button>
                        </div>
                    )}
                </div>

                {/* Copyright Footer */}
                <footer className="copyright-footer">
                    © {currentYear} saveHXPE. All rights reserved. System Ver: 4.0.2
                </footer>
            </main>
        </>
    );
}

export default function DashboardPage() {
    return (
        <Suspense fallback={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
                <div className="spinner" />
            </div>
        }>
            <DashboardContent />
        </Suspense>
    );
}
