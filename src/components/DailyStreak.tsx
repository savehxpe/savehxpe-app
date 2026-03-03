'use client';

interface DailyStreakProps {
    currentStreak: number;
    onClaim?: () => void;
    xpReward: number;
    multiplier: number;
    claimed?: boolean;
}

export default function DailyStreak({
    currentStreak = 0,
    onClaim,
    xpReward = 50,
    multiplier = 1.0,
    claimed = false,
}: DailyStreakProps) {
    const days = [1, 2, 3, 4, 5, 6, 7];
    const actualReward = Math.round(xpReward * multiplier);

    return (
        <div className="card" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.5rem',
            padding: '2rem 1.5rem',
        }}>
            {/* Title */}
            <div style={{ textAlign: 'center' }}>
                <h3 style={{
                    fontSize: '1.75rem',
                    fontWeight: 800,
                    textTransform: 'uppercase' as const,
                    letterSpacing: '-0.02em',
                    marginBottom: '0.25rem',
                }}>
                    Daily Loot
                </h3>
                <p className="text-label">Maintain your streak for bonuses</p>
            </div>

            {/* Day Indicators */}
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '0.5rem',
                width: '100%',
            }}>
                {days.map((day) => {
                    const isCompleted = day <= currentStreak;
                    const isCurrent = day === currentStreak + 1;
                    const isFuture = day > currentStreak + 1;
                    const isBonusDay = day === 7;

                    return (
                        <div key={day} style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.375rem',
                        }}>
                            <div className={`streak-day ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${isFuture ? 'future' : ''}`}>
                                {isCompleted ? '✓' : isCurrent ? '⚡' : isBonusDay ? '★' : day}
                            </div>
                            <span style={{
                                fontSize: '0.5625rem',
                                fontWeight: isCurrent ? 700 : 500,
                                letterSpacing: '0.15em',
                                textTransform: 'uppercase' as const,
                                color: isCurrent ? '#fff' : 'var(--color-text-muted)',
                            }}>
                                D{day}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* 7-Day Bonus Info */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
                padding: '0.75rem 1rem',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--color-border)',
            }}>
                <span className="text-label" style={{ letterSpacing: '0.15em' }}>7-Day Streak Bonus</span>
                <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase' as const,
                }}>+1,000 XP</span>
            </div>

            {/* Claim Button */}
            <button
                className="btn-primary"
                onClick={onClaim}
                disabled={claimed}
                style={{
                    opacity: claimed ? 0.5 : 1,
                    cursor: claimed ? 'default' : 'pointer',
                }}
            >
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                }}>
                    <span style={{ fontSize: '0.875rem' }}>
                        {claimed ? 'Loot Claimed' : 'Claim Daily Loot'}
                    </span>
                    <span style={{
                        fontSize: '0.5625rem',
                        opacity: 0.6,
                        letterSpacing: '0.15em',
                    }}>
                        {claimed ? 'Return tomorrow' : 'Streak Active'}
                    </span>
                </div>
                <div style={{
                    marginLeft: 'auto',
                    background: '#000',
                    color: '#fff',
                    padding: '0.375rem 0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                }}>
                    + {actualReward} XP
                    {multiplier > 1 && (
                        <span style={{ fontSize: '0.5625rem', opacity: 0.5, marginLeft: '0.25rem' }}>
                            ({multiplier}x)
                        </span>
                    )}
                </div>
            </button>
        </div>
    );
}
