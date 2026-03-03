'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import UpgradePrompt from '@/components/UpgradePrompt';

// ── Sample vault items for demonstration (replaced by Firestore data in production) ──
const VAULT_ITEMS = [
    {
        id: 'stem_drums_001',
        name: 'DRUMS',
        type: 'audio_stem',
        file: 'STEM_FILE_01.WAV',
        public: true,
        xpUnlock: 0,
        rarity: 'COMMON',
    },
    {
        id: 'stem_bass_002',
        name: 'BASS',
        type: 'audio_stem',
        file: 'STEM_FILE_02.WAV',
        public: false,
        xpUnlock: 1000,
        rarity: 'RARE',
    },
    {
        id: 'stem_synths_003',
        name: 'SYNTHS',
        type: 'audio_stem',
        file: 'STEM_FILE_03.WAV',
        public: false,
        xpUnlock: 2500,
        rarity: 'RARE',
    },
    {
        id: 'stem_vocals_004',
        name: 'VOCALS',
        type: 'audio_stem',
        file: 'STEM_FILE_04.WAV',
        public: false,
        xpUnlock: 5000,
        rarity: 'EPIC',
    },
    {
        id: 'stem_acapella_005',
        name: 'ACAPELLA',
        type: 'audio_stem',
        file: 'STEM_ACAPELLA.WAV',
        public: false,
        xpUnlock: 7500,
        rarity: 'LEGENDARY',
    },
    {
        id: 'remix_pack_006',
        name: 'FULL REMIX PACK',
        type: 'remix_bundle',
        file: 'REMIX_BUNDLE.ZIP',
        public: false,
        xpUnlock: 10000,
        rarity: 'LEGENDARY',
    },
];

function WaveformVisual({ animated }: { animated: boolean }) {
    const bars = Array.from({ length: 24 }, (_, i) => {
        const height = Math.sin(i * 0.5) * 30 + 30 + Math.random() * 15;
        return height;
    });

    return (
        <div className="waveform-visual">
            {bars.map((h, i) => (
                <div
                    key={i}
                    className="bar"
                    style={{
                        height: `${h}%`,
                        animationDelay: animated ? `${i * 0.05}s` : undefined,
                    }}
                />
            ))}
        </div>
    );
}

function getRarityColor(rarity: string): string {
    switch (rarity) {
        case 'LEGENDARY': return 'var(--color-accent-gold)';
        case 'EPIC': return 'var(--color-accent-purple)';
        case 'RARE': return 'var(--color-accent-green)';
        default: return 'var(--color-text-muted)';
    }
}

export default function VaultPage() {
    const { firebaseUser, userDoc, loading } = useAuth();
    const router = useRouter();
    const [unlockedItem, setUnlockedItem] = useState<string | null>(null);

    const currentYear = new Date().getFullYear();

    useEffect(() => {
        if (!loading && !firebaseUser) {
            router.replace('/login');
        }
    }, [firebaseUser, loading, router]);

    if (loading || !firebaseUser) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
                <div className="spinner" />
            </div>
        );
    }

    const tier = userDoc?.tier?.current || 'FREE';
    const xpTotal = userDoc?.xp?.total || 0;
    const isFree = tier === 'FREE';
    const isPremium = tier === 'PREMIUM';

    // Determine which items are accessible
    const getItemStatus = (item: typeof VAULT_ITEMS[0]) => {
        if (isFree) {
            return item.public ? 'unlocked' : 'locked';
        }
        if (isPremium) return 'unlocked'; // Premium bypasses everything
        // Standard: unlocked if XP threshold met or item is public
        return (item.public || xpTotal >= item.xpUnlock) ? 'unlocked' : 'xp-locked';
    };

    return (
        <>
            <Sidebar />
            <main className="main-content">
                {/* Page Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '1.5rem',
                }}>
                    <div>
                        <h1 className="text-heading" style={{ marginBottom: '0.25rem' }}>
                            Vault Stems
                        </h1>
                        <p className="text-label">
                            Campaign: Handout / Status: {isFree ? 'Gated' : 'Unlocked'}
                        </p>
                    </div>

                    {!isFree && (
                        <div className="badge badge-green" style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.375rem',
                        }}>
                            <div style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: 'var(--color-accent-green)',
                            }} />
                            Live Drop
                        </div>
                    )}
                </div>

                {/* Vault Grid with Overlay Logic */}
                <div style={{ position: 'relative' }}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: '1rem',
                    }}>
                        {VAULT_ITEMS.map((item) => {
                            const status = getItemStatus(item);
                            const isUnlocked = status === 'unlocked';
                            const isXPLocked = status === 'xp-locked';

                            return (
                                <div
                                    key={item.id}
                                    className={`stem-card ${isUnlocked ? 'unlocked' : 'locked'}`}
                                    style={{
                                        filter: (!isUnlocked && isFree) ? 'blur(2px)' : undefined,
                                        position: 'relative',
                                    }}
                                    onClick={() => {
                                        if (isUnlocked) {
                                            setUnlockedItem(item.id);
                                        }
                                    }}
                                >
                                    {/* Lock Icon */}
                                    {!isUnlocked && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '0.75rem',
                                            left: '0.75rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            zIndex: 2,
                                        }}>
                                            <span style={{ fontSize: '1.25rem', opacity: 0.6 }}>🔒</span>
                                        </div>
                                    )}

                                    {/* Play indicator for unlocked */}
                                    {isUnlocked && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '0.75rem',
                                            right: '0.75rem',
                                            width: '28px',
                                            height: '28px',
                                            borderRadius: '50%',
                                            background: 'rgba(255,255,255,0.1)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '0.75rem',
                                            cursor: 'pointer',
                                        }}>
                                            ▶
                                        </div>
                                    )}

                                    {/* Waveform */}
                                    <WaveformVisual animated={isUnlocked} />

                                    {/* Stem Name */}
                                    <h3 style={{
                                        fontSize: '1.5rem',
                                        fontWeight: 800,
                                        textTransform: 'uppercase' as const,
                                        letterSpacing: '-0.01em',
                                        marginTop: '0.5rem',
                                        marginBottom: '0.25rem',
                                    }}>
                                        {item.name}
                                    </h3>

                                    {/* Status Text */}
                                    {isUnlocked ? (
                                        <span style={{
                                            fontSize: '0.625rem',
                                            fontWeight: 700,
                                            letterSpacing: '0.2em',
                                            textTransform: 'uppercase' as const,
                                            color: 'var(--color-accent-green)',
                                        }}>
                                            Unlocked // Ready
                                        </span>
                                    ) : (
                                        <div>
                                            <span className="text-mono" style={{
                                                display: 'block',
                                                marginBottom: '0.5rem',
                                                color: 'var(--color-text-muted)',
                                            }}>
                                                {item.file}
                                            </span>
                                            {isXPLocked ? (
                                                <div style={{
                                                    display: 'inline-flex',
                                                    padding: '0.375rem 0.75rem',
                                                    border: '1px solid var(--color-border)',
                                                    fontSize: '0.625rem',
                                                    fontWeight: 700,
                                                    letterSpacing: '0.15em',
                                                    textTransform: 'uppercase' as const,
                                                }}>
                                                    {item.xpUnlock.toLocaleString()} XP to Unlock
                                                </div>
                                            ) : (
                                                <div>
                                                    <span className="text-label" style={{ fontSize: '0.5625rem' }}>
                                                        Standard Tier Required
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Rarity Indicator */}
                                    <div style={{
                                        marginTop: '0.75rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.375rem',
                                    }}>
                                        <div style={{
                                            width: '4px',
                                            height: '4px',
                                            background: getRarityColor(item.rarity),
                                            borderRadius: '50%',
                                        }} />
                                        <span style={{
                                            fontSize: '0.5625rem',
                                            fontWeight: 600,
                                            letterSpacing: '0.15em',
                                            textTransform: 'uppercase' as const,
                                            color: getRarityColor(item.rarity),
                                        }}>
                                            {item.rarity}
                                        </span>
                                    </div>

                                    {/* Download Button for Unlocked */}
                                    {isUnlocked && (
                                        <button style={{
                                            marginTop: '0.75rem',
                                            width: '100%',
                                            height: '2rem',
                                            background: 'transparent',
                                            border: '1px solid var(--color-border)',
                                            color: 'var(--color-text-secondary)',
                                            fontFamily: 'var(--font-display)',
                                            fontSize: '0.5625rem',
                                            fontWeight: 600,
                                            letterSpacing: '0.15em',
                                            textTransform: 'uppercase' as const,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.375rem',
                                        }}>
                                            ↓ Download
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* FREE Tier Locked Overlay */}
                    {isFree && <UpgradePrompt variant="full" />}
                </div>

                {/* Unlock Popup */}
                {unlockedItem && (
                    <div
                        style={{
                            position: 'fixed',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(0,0,0,0.85)',
                            backdropFilter: 'blur(4px)',
                            zIndex: 100,
                        }}
                        onClick={() => setUnlockedItem(null)}
                    >
                        <div
                            className="animate-slide-up"
                            style={{
                                background: 'var(--color-surface)',
                                border: '1px solid var(--color-border)',
                                padding: '2.5rem',
                                maxWidth: '380px',
                                textAlign: 'center',
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div style={{
                                width: '48px',
                                height: '48px',
                                border: '2px solid var(--color-accent-green)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 1.5rem',
                                fontSize: '1.25rem',
                                color: 'var(--color-accent-green)',
                            }}>
                                ✓
                            </div>
                            <h3 style={{
                                fontSize: '1.5rem',
                                fontWeight: 800,
                                textTransform: 'uppercase' as const,
                                marginBottom: '0.25rem',
                            }}>
                                Stem Unlocked: {VAULT_ITEMS.find(i => i.id === unlockedItem)?.name}
                            </h3>
                            <div style={{
                                width: '40px',
                                height: '2px',
                                background: 'var(--color-border)',
                                margin: '1rem auto',
                            }} />
                            <p className="text-mono" style={{
                                color: 'var(--color-text-muted)',
                            }}>
                                +100 XP Minted
                            </p>
                        </div>
                    </div>
                )}

                {/* Copyright Footer */}
                <footer className="copyright-footer">
                    © {currentYear} saveHXPE. All rights reserved. System Ver: 4.0.2
                </footer>
            </main>
        </>
    );
}
