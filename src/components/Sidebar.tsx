'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth, UserDocument } from '@/hooks/useAuth';
import { useState } from 'react';

function generateFanId(uid: string): string {
    const hash = uid.slice(0, 8).toUpperCase().replace(/[^A-Z0-9]/g, 'X');
    return `HXPE-${hash.slice(0, 4)}-${hash.slice(4, 5)}`;
}

function getLevel(xpTotal: number): number {
    return Math.floor(xpTotal / 500) + 1;
}

export default function Sidebar() {
    const { userDoc, logout, firebaseUser } = useAuth();
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);

    const tier = userDoc?.tier?.current || 'FREE';
    const xpTotal = userDoc?.xp?.total || 0;
    const multiplier = userDoc?.xp?.multiplier || 1.0;
    const level = getLevel(xpTotal);
    const fanId = firebaseUser ? generateFanId(firebaseUser.uid) : '----';

    const navItems = [
        { href: '/dashboard', label: 'Dashboard', icon: '⊞' },
        { href: '/vault', label: 'The Vault', icon: '🔒' },
    ];

    const getTierBadge = () => {
        switch (tier) {
            case 'PREMIUM':
                return { label: 'PREMIUM', className: 'badge badge-gold' };
            case 'STANDARD':
                return { label: 'STANDARD', className: 'badge badge-purple' };
            default:
                return { label: 'FREE', className: 'badge' };
        }
    };

    const tierBadge = getTierBadge();

    return (
        <>
            {/* Mobile Hamburger */}
            <button
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Toggle navigation"
                style={{
                    position: 'fixed',
                    top: '1rem',
                    right: '1rem',
                    zIndex: 100,
                    background: 'rgba(0,0,0,0.8)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                    width: '40px',
                    height: '40px',
                    display: 'none',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '1.25rem',
                    fontFamily: 'var(--font-display)',
                }}
                className="mobile-menu-btn"
            >
                {mobileOpen ? '✕' : '≡'}
            </button>

            {/* Overlay for mobile */}
            {mobileOpen && (
                <div
                    onClick={() => setMobileOpen(false)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.7)',
                        zIndex: 40,
                    }}
                />
            )}

            <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
                {/* Brand Header */}
                <div style={{
                    padding: '1.5rem 1.25rem',
                    borderBottom: '1px solid var(--color-border)',
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: '1.25rem',
                    }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                            <rect x="2" y="4" width="20" height="16" rx="0" />
                            <line x1="6" y1="12" x2="6" y2="16" />
                            <line x1="9" y1="10" x2="9" y2="16" />
                            <line x1="12" y1="8" x2="12" y2="16" />
                            <line x1="15" y1="10" x2="15" y2="16" />
                            <line x1="18" y1="12" x2="18" y2="16" />
                        </svg>
                        <span style={{
                            fontWeight: 800,
                            letterSpacing: '0.15em',
                            textTransform: 'uppercase' as const,
                            fontSize: '0.875rem',
                        }}>saveHXPE</span>
                    </div>

                    {/* Fan Identity */}
                    <div style={{ marginBottom: '0.75rem' }}>
                        <span className="text-label" style={{ display: 'block', marginBottom: '0.25rem' }}>Fan ID</span>
                        <span className="text-mono" style={{ fontWeight: 700 }}>{fanId}</span>
                    </div>

                    {/* XP & Credits Row */}
                    <div style={{
                        display: 'flex',
                        gap: '1.5rem',
                    }}>
                        <div>
                            <span className="text-label" style={{ display: 'block', marginBottom: '0.25rem' }}>XP Level</span>
                            <span style={{
                                fontWeight: 700,
                                fontSize: '0.875rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                            }}>
                                ⚡ Lvl {level}
                            </span>
                        </div>
                        <div>
                            <span className="text-label" style={{ display: 'block', marginBottom: '0.25rem' }}>Multiplier</span>
                            <span style={{
                                fontWeight: 700,
                                fontSize: '0.875rem',
                                color: multiplier > 1 ? 'var(--color-accent-purple)' : 'var(--color-text-secondary)',
                            }}>
                                {multiplier}x
                            </span>
                        </div>
                    </div>
                </div>

                {/* Navigation Links */}
                <nav style={{ flex: 1, padding: '0.5rem 0' }}>
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
                            onClick={() => setMobileOpen(false)}
                        >
                            <span style={{ fontSize: '1rem' }}>{item.icon}</span>
                            {item.label}
                        </Link>
                    ))}
                </nav>

                {/* Tier Badge + Logout */}
                <div style={{
                    padding: '1.25rem',
                    borderTop: '1px solid var(--color-border)',
                }}>
                    <div style={{ marginBottom: '1rem' }}>
                        <span className={tierBadge.className} style={{
                            borderColor: tier === 'FREE' ? 'var(--color-text-muted)' : undefined,
                            color: tier === 'FREE' ? 'var(--color-text-muted)' : undefined,
                        }}>
                            {tierBadge.label}
                        </span>
                    </div>
                    <button
                        onClick={logout}
                        className="btn-outline"
                        style={{ height: '2.5rem', fontSize: '0.625rem' }}
                    >
                        Log Out
                    </button>
                </div>
            </aside>

            <style jsx>{`
        @media (max-width: 768px) {
          .mobile-menu-btn {
            display: flex !important;
          }
        }
      `}</style>
        </>
    );
}
