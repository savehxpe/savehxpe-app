'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════════════ */

type CratePhase = 'SEALED' | 'DECRYPTING' | 'REVEALED';
type PayoutType = 'XP' | 'CREDITS' | 'STEM';

interface Payout {
    type: PayoutType;
    label: string;
    sublabel: string;
}

interface Shard {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    rotation: number;
    rotSpeed: number;
    life: number;
}

interface Props {
    credits: number;
    onOpen: (cb: (ok: boolean) => void) => void;
    onPayout: (data: { credits: number; xp: number; stem?: boolean }) => void;
    onExit: () => void;
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════════════════ */

const DECRYPT_DURATION = 1000;
const SHARD_COUNT = 120;

const PAYOUTS: { weight: number; payout: Payout; data: { credits: number; xp: number; stem?: boolean } }[] = [
    { weight: 70, payout: { type: 'XP', label: '500 XP', sublabel: 'EXPERIENCE INJECTED' }, data: { credits: 0, xp: 500 } },
    { weight: 20, payout: { type: 'CREDITS', label: '50 CR', sublabel: 'CREDIT CACHE FOUND' }, data: { credits: 50, xp: 0 } },
    { weight: 10, payout: { type: 'STEM', label: 'RARE AUDIO STEM', sublabel: 'UNLOCKED — CHECK VAULT' }, data: { credits: 0, xp: 0, stem: true } },
];

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

export default function VoidCrate({ credits, onOpen, onPayout, onExit }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animRef = useRef<number>(0);
    const shardsRef = useRef<Shard[]>([]);

    const [phase, setPhase] = useState<CratePhase>('SEALED');
    const [decryptProgress, setDecryptProgress] = useState(0);
    const [result, setResult] = useState<Payout | null>(null);
    const decryptStart = useRef(0);

    /* ─── RNG ─── */

    const rollPayout = useCallback(() => {
        const roll = Math.random() * 100;
        let cumulative = 0;
        for (const entry of PAYOUTS) {
            cumulative += entry.weight;
            if (roll < cumulative) return entry;
        }
        return PAYOUTS[0];
    }, []);

    /* ─── Shatter Effect ─── */

    const spawnShards = useCallback((w: number, h: number) => {
        const shards: Shard[] = [];
        const cx = w / 2;
        const cy = h / 2;
        const boxSize = Math.min(w, h) * 0.4;
        const halfBox = boxSize / 2;

        for (let i = 0; i < SHARD_COUNT; i++) {
            const sx = cx - halfBox + Math.random() * boxSize;
            const sy = cy - halfBox + Math.random() * boxSize;
            const angle = Math.atan2(sy - cy, sx - cx) + (Math.random() - 0.5) * 0.8;
            const speed = 3 + Math.random() * 8;

            shards.push({
                x: sx,
                y: sy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 2 + Math.random() * 6,
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.3,
                life: 1,
            });
        }
        shardsRef.current = shards;
    }, []);

    /* ─── Canvas Animation ─── */

    const render = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        ctx.scale(dpr, dpr);

        // Background
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);

        const cx = w / 2;
        const cy = h / 2;
        const boxSize = Math.min(w, h) * 0.4;
        const halfBox = boxSize / 2;

        if (phase === 'SEALED') {
            // Static crate box
            ctx.fillStyle = '#000';
            ctx.strokeStyle = 'rgba(255,255,255,0.25)';
            ctx.lineWidth = 2;
            ctx.fillRect(cx - halfBox, cy - halfBox, boxSize, boxSize);
            ctx.strokeRect(cx - halfBox, cy - halfBox, boxSize, boxSize);

            // Inner cross lines
            ctx.strokeStyle = 'rgba(255,255,255,0.08)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cx - halfBox, cy - halfBox);
            ctx.lineTo(cx + halfBox, cy + halfBox);
            ctx.moveTo(cx + halfBox, cy - halfBox);
            ctx.lineTo(cx - halfBox, cy + halfBox);
            ctx.stroke();

            // Center lock icon
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.font = 'bold 24px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('[ ? ]', cx, cy);
        }

        if (phase === 'DECRYPTING') {
            const now = Date.now();
            const elapsed = now - decryptStart.current;
            const progress = Math.min(1, elapsed / DECRYPT_DURATION);
            setDecryptProgress(progress);

            // Glitching crate
            const glitchOffset = (Math.random() - 0.5) * progress * 12;
            const bx = cx - halfBox + glitchOffset;
            const by = cy - halfBox + (Math.random() - 0.5) * progress * 8;

            ctx.fillStyle = '#000';
            ctx.strokeStyle = `rgba(255,255,255,${0.25 + progress * 0.5})`;
            ctx.lineWidth = 2;
            ctx.fillRect(bx, by, boxSize, boxSize);
            ctx.strokeRect(bx, by, boxSize, boxSize);

            // Scanline flicker
            ctx.fillStyle = `rgba(255,255,255,${0.03 + progress * 0.06})`;
            for (let y = 0; y < boxSize; y += 3) {
                if (Math.random() > 0.5) {
                    ctx.fillRect(bx, by + y, boxSize, 1);
                }
            }

            // Center text
            ctx.fillStyle = `rgba(255,255,255,${0.5 + Math.sin(now * 0.02) * 0.3})`;
            ctx.font = 'bold 14px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const dots = '.'.repeat(Math.floor((now / 300) % 4));
            ctx.fillText(`DECRYPTING${dots}`, cx + glitchOffset, cy);

            // Progress bar below crate
            const barW = boxSize * 0.8;
            const barH = 3;
            const barX = cx - barW / 2;
            const barY = cy + halfBox + 20;
            ctx.fillStyle = 'rgba(255,255,255,0.1)';
            ctx.fillRect(barX, barY, barW, barH);
            ctx.fillStyle = '#fff';
            ctx.fillRect(barX, barY, barW * progress, barH);

            if (progress >= 1) {
                // Trigger shatter + reveal
                const outcome = rollPayout();
                setResult(outcome.payout);
                onPayout(outcome.data);
                spawnShards(w, h);
                setPhase('REVEALED');
            }
        }

        if (phase === 'REVEALED') {
            // Update and draw shards
            let anyAlive = false;
            shardsRef.current.forEach(s => {
                s.x += s.vx;
                s.y += s.vy;
                s.vy += 0.12; // gravity
                s.vx *= 0.995;
                s.rotation += s.rotSpeed;
                s.life -= 0.012;

                if (s.life <= 0) return;
                anyAlive = true;

                ctx.save();
                ctx.translate(s.x, s.y);
                ctx.rotate(s.rotation);
                ctx.globalAlpha = Math.max(0, s.life);
                ctx.fillStyle = '#fff';
                ctx.fillRect(-s.size / 2, -s.size / 2, s.size, s.size);
                ctx.restore();
            });

            if (!anyAlive) {
                shardsRef.current = [];
            }

            // Result text
            if (result) {
                ctx.save();
                ctx.globalAlpha = 1;
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 28px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(result.label, cx, cy - 12);

                ctx.fillStyle = 'rgba(255,255,255,0.4)';
                ctx.font = 'bold 11px monospace';
                ctx.fillText(result.sublabel, cx, cy + 20);
                ctx.restore();
            }
        }

        animRef.current = requestAnimationFrame(render);
    }, [phase, result, rollPayout, spawnShards, onPayout]);

    useEffect(() => {
        animRef.current = requestAnimationFrame(render);
        return () => cancelAnimationFrame(animRef.current);
    }, [render]);

    /* ─── Open Crate ─── */

    const handleOpen = useCallback(() => {
        if (phase !== 'SEALED') return;
        onOpen((ok) => {
            if (!ok) return;
            decryptStart.current = Date.now();
            setPhase('DECRYPTING');
        });
    }, [phase, onOpen]);

    /* ─── Reset ─── */

    const handleReset = useCallback(() => {
        setPhase('SEALED');
        setResult(null);
        setDecryptProgress(0);
        shardsRef.current = [];
    }, []);

    /* ═══════════════════════════════════════════════════════════════════════
       RENDER
       ═══════════════════════════════════════════════════════════════════════ */

    return (
        <div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-6">

            {/* Canvas */}
            <div className="relative w-full aspect-square max-h-[420px] border border-white/10 overflow-hidden bg-black">
                <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full"
                    style={{ width: '100%', height: '100%' }}
                />
            </div>

            {/* Controls */}
            <div className="flex flex-col items-center gap-4 w-full max-w-xs">
                {phase === 'SEALED' && (
                    <button
                        onClick={handleOpen}
                        className="w-full py-4 font-mono font-bold text-sm tracking-[0.2em] uppercase border border-white/20 text-white bg-black hover:border-white hover:bg-white hover:text-black transition-all duration-200"
                        style={{ cursor: 'pointer' }}
                    >
                        OPEN VOID CRATE — 20 CR
                    </button>
                )}

                {phase === 'DECRYPTING' && (
                    <div className="w-full py-4 font-mono font-bold text-sm tracking-[0.2em] uppercase text-white/50 text-center">
                        DECRYPTING... {Math.floor(decryptProgress * 100)}%
                    </div>
                )}

                {phase === 'REVEALED' && (
                    <div className="flex gap-3 w-full">
                        <button
                            onClick={handleReset}
                            className="flex-1 py-4 font-mono font-bold text-xs tracking-[0.2em] uppercase border border-white/20 text-white bg-black hover:border-white hover:bg-white hover:text-black transition-all duration-200"
                            style={{ cursor: 'pointer' }}
                        >
                            OPEN ANOTHER
                        </button>
                        <button
                            onClick={onExit}
                            className="flex-1 py-4 font-mono font-bold text-xs tracking-[0.2em] uppercase border border-white/10 text-white/50 bg-black hover:border-white/30 hover:text-white transition-all duration-200"
                            style={{ cursor: 'pointer' }}
                        >
                            EXIT
                        </button>
                    </div>
                )}

                {phase === 'SEALED' && (
                    <button
                        onClick={onExit}
                        className="font-mono text-[10px] text-white/30 uppercase tracking-[0.2em] hover:text-white/70 transition-colors"
                        style={{ cursor: 'pointer' }}
                    >
                        &larr; Return to Arcade Hub
                    </button>
                )}
            </div>
        </div>
    );
}
