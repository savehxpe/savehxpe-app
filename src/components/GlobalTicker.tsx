'use client';

import { useState, useEffect, useRef } from 'react';

/* ═══════════════════════════════════════════════════════════════════════════
   EVENT GENERATORS
   ═══════════════════════════════════════════════════════════════════════════ */

const PROXY_IDS = [
    'HXPE-3F7A-K', 'HXPE-9C2D-X', 'HXPE-0E8B-R', 'HXPE-6A1F-M',
    'HXPE-4D9E-J', 'HXPE-7B3C-W', 'HXPE-1F5A-Q', 'HXPE-8E2D-T',
];

const CITIES = [
    'MASERU, LESOTHO', 'LAGOS, NIGERIA', 'TOKYO, JAPAN', 'BERLIN, GERMANY',
    'ATLANTA, USA', 'LONDON, UK', 'SAO PAULO, BRAZIL', 'SEOUL, SOUTH KOREA',
    'NAIROBI, KENYA', 'TORONTO, CANADA', 'PARIS, FRANCE', 'CAPE TOWN, SA',
    'ACCRA, GHANA', 'STOCKHOLM, SWEDEN', 'MEXICO CITY, MX', 'CAIRO, EGYPT',
];

const STREAKS = [10, 12, 15, 18, 20, 25, 30];

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const generators = [
    () => `${pick(PROXY_IDS)} REACHED ${pick(STREAKS)}x STREAK IN CASH CALIBER`,
    () => `${pick(PROXY_IDS)} UNLOCKED THE REMIX ARCHIVE`,
    () => `NEW PROXY CONNECTED FROM [${pick(CITIES)}]`,
    () => `${pick(PROXY_IDS)} OPENED A VOID CRATE — RARE STEM DROP`,
    () => `${pick(PROXY_IDS)} CLAIMED DAILY DEPLOYMENT +10 CR`,
    () => `NEW PROXY CONNECTED FROM [${pick(CITIES)}]`,
];

const generateFeed = (): string => {
    const count = 8;
    const events: string[] = [];
    for (let i = 0; i < count; i++) {
        events.push(pick(generators)());
    }
    return events.map(e => `/// ${e}`).join('     ');
};

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

const CYCLE_MS = 30000;

export default function GlobalTicker() {
    const [feed, setFeed] = useState('');
    const tickerRef = useRef<HTMLDivElement>(null);

    // Generate initial feed on mount (avoid hydration mismatch)
    useEffect(() => {
        setFeed(generateFeed());
    }, []);

    // Refresh feed every 30s
    useEffect(() => {
        const interval = setInterval(() => {
            setFeed(generateFeed());
        }, CYCLE_MS);
        return () => clearInterval(interval);
    }, []);

    if (!feed) return null;

    return (
        <div
            ref={tickerRef}
            style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 50,
                height: '24px',
                overflow: 'hidden',
                backgroundColor: '#000',
                borderTop: '1px solid rgba(255,255,255,0.06)',
                pointerEvents: 'none',
            }}
        >
            <div
                style={{
                    display: 'inline-block',
                    whiteSpace: 'nowrap',
                    fontFamily: 'monospace',
                    fontSize: '10px',
                    fontWeight: 600,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.2)',
                    lineHeight: '24px',
                    paddingLeft: '100%',
                    animation: `tickerScroll ${CYCLE_MS}ms linear infinite`,
                }}
            >
                {feed}
            </div>

            <style>{`
                @keyframes tickerScroll {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-100%); }
                }
            `}</style>
        </div>
    );
}
