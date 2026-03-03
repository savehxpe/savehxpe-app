'use client';

interface XPBarProps {
    total: number;
    multiplier: number;
    tier: 'FREE' | 'STANDARD' | 'PREMIUM';
}

function getLevel(xpTotal: number): number {
    return Math.floor(xpTotal / 500) + 1;
}

function getXPProgress(xpTotal: number): number {
    return (xpTotal % 500) / 500 * 100;
}

function getRank(level: number): string {
    if (level >= 50) return 'LEGENDARY';
    if (level >= 30) return 'ELITE';
    if (level >= 20) return 'VETERAN';
    if (level >= 10) return 'ADEPT';
    if (level >= 5) return 'INITIATE';
    return 'NOVICE';
}

export default function XPBar({ total, multiplier, tier }: XPBarProps) {
    const level = getLevel(total);
    const progress = getXPProgress(total);
    const rank = getRank(level);
    const nextLevelXP = level * 500;

    const tierClass = tier === 'PREMIUM' ? 'tier-premium'
        : tier === 'STANDARD' ? 'tier-standard'
            : 'tier-free';

    return (
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
            {/* Header Row */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.75rem',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{
                        fontWeight: 800,
                        fontSize: '1.125rem',
                    }}>
                        {total.toLocaleString()} XP
                    </span>
                    {multiplier > 1 && (
                        <span className={tier === 'PREMIUM' ? 'badge' : 'badge badge-purple'} style={{
                            color: tier === 'PREMIUM' ? 'var(--color-xp-premium)' : undefined,
                            borderColor: tier === 'PREMIUM' ? 'var(--color-xp-premium)' : undefined,
                        }}>
                            {multiplier}x
                        </span>
                    )}
                </div>
                <span className="text-label">
                    Level {level} · {rank}
                </span>
            </div>

            {/* XP Progress Bar */}
            <div className="xp-bar">
                <div
                    className={`xp-bar-fill ${tierClass}`}
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Footer */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '0.5rem',
            }}>
                <span className="text-label" style={{ fontSize: '0.5625rem' }}>
                    {total % 500} / 500 to next level
                </span>
                <span className="text-label" style={{ fontSize: '0.5625rem' }}>
                    Next: {nextLevelXP.toLocaleString()} XP
                </span>
            </div>
        </div>
    );
}
