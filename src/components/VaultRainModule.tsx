'use client';

import { useEffect, useRef, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// VAULT RAIN ENGINE — High Speed Catcher (16-bit Canvas w/ Phosphor Trails)
// Pure reaction/physics catcher. Zero music-syncing or beat-matching mechanics.
// ─────────────────────────────────────────────────────────────────────────────

interface VaultRainHooks {
    onGameStart: (callback: (success: boolean) => void) => void;
    onViralStreak: (data: { credits: number; xp: number }) => void;
    onGameOver: (data: {
        score: number;
        xp: number;
        engagement: string;
        viralReached: boolean;
    }) => void;
    initialCredits: number;
}

// ── Chrome Color Helpers ──
function varChrome1() { return '#E0E0E0'; }
function varChrome2() { return '#9E9E9E'; }
function varChrome3() { return '#616161'; }

// ── Falling Item Type ──
interface FallingItem {
    x: number; y: number; width: number; height: number;
    vy: number; type: 'GLITCH' | 'CASH' | 'CREDIT'; color: string;
    active: boolean; rot: number; rotSpeed: number;
}

// ── Particle Type ──
interface Particle {
    x: number; y: number; vx: number; vy: number;
    life: number; color?: string; type: string; size: number;
}

// ── Floating Text Type ──
interface FloatingText {
    text: string; x: number; y: number; color: string;
    life: number; vy: number;
}

/**
 * VaultRainEngine — Canvas-based 16-bit catcher game
 * Manages its own requestAnimationFrame loop, phosphor trails, screen shake, and particles.
 */
class VaultRainEngine {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
    hooks: {
        onGameStart: (cb: (success: boolean) => void) => void;
        onViralStreak: (data: { credits: number; xp: number }) => void;
        onGameOver: (data: { score: number; xp: number; engagement: string; viralReached: boolean }) => void;
    };
    state: 'IDLE' | 'PLAYING' | 'VIRAL' | 'GAMEOVER';
    lastTime: number;
    gameTime: number;
    animationFrameId: number | null;

    briefcase: { x: number; y: number; width: number; height: number; vx: number };
    targetX: number;

    score: number;
    streak: number;
    maxStreak: number;
    totalXP: number;
    credits: number;
    levelDuration: number;

    fallingItems: FallingItem[];
    particles: Particle[];
    floatingTexts: FloatingText[];
    screenShake: number;
    flashColor: string | null;
    flashIntensity: number;
    baseSpeedMultiplier: number;
    nextSpawnTime: number;

    boundLoop: (timestamp: number) => void;
    boundHandleInput: (e: MouseEvent) => void;

    constructor(canvas: HTMLCanvasElement, hooks: VaultRainHooks) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false })!;
        this.ctx.imageSmoothingEnabled = false;

        this.width = 1280;
        this.height = 720;

        this.hooks = {
            onGameStart: hooks.onGameStart || ((cb: (s: boolean) => void) => cb(true)),
            onViralStreak: hooks.onViralStreak || (() => { }),
            onGameOver: hooks.onGameOver || (() => { }),
        };

        this.state = 'IDLE';
        this.lastTime = 0;
        this.gameTime = 0;
        this.animationFrameId = null;

        this.briefcase = { x: this.width / 2, y: this.height - 100, width: 140, height: 80, vx: 0 };
        this.targetX = this.width / 2;

        this.score = 0;
        this.streak = 0;
        this.maxStreak = 20;
        this.totalXP = 0;
        this.credits = hooks.initialCredits || 0;
        this.levelDuration = 40000;

        this.fallingItems = [];
        this.particles = [];
        this.floatingTexts = [];
        this.screenShake = 0;
        this.flashColor = null;
        this.flashIntensity = 0;
        this.baseSpeedMultiplier = 1.0;
        this.nextSpawnTime = 0;

        this.boundLoop = this.loop.bind(this);
        this.boundHandleInput = this.handleInput.bind(this);

        this.init();
    }

    init() {
        this.canvas.addEventListener('mousemove', this.boundHandleInput);
        this.canvas.addEventListener('touchmove', (e: TouchEvent) => {
            e.preventDefault();
            if (e.touches.length > 0) {
                this.updateTargetX(e.touches[0].clientX);
            }
        }, { passive: false });

        this.ctx.fillStyle = '#050505';
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    destroy() {
        this.state = 'IDLE';
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        this.canvas.removeEventListener('mousemove', this.boundHandleInput);
    }

    updateTargetX(clientX: number) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        this.targetX = (clientX - rect.left) * scaleX;
        if (this.targetX < this.briefcase.width / 2) this.targetX = this.briefcase.width / 2;
        if (this.targetX > this.width - this.briefcase.width / 2) this.targetX = this.width - this.briefcase.width / 2;
    }

    handleInput(e: MouseEvent) {
        if (this.state !== 'PLAYING') return;
        this.updateTargetX(e.clientX);
    }

    start() {
        this.hooks.onGameStart((success: boolean) => {
            if (success) {
                this.reset();
                this.state = 'PLAYING';
                this.lastTime = performance.now();
                this.ctx.fillStyle = '#050505';
                this.ctx.fillRect(0, 0, this.width, this.height);
                this.animationFrameId = requestAnimationFrame(this.boundLoop);
            }
        });
    }

    reset() {
        this.score = 0;
        this.streak = 0;
        this.totalXP = 0;
        this.gameTime = 0;
        this.screenShake = 0;
        this.baseSpeedMultiplier = 1.0;
        this.nextSpawnTime = 500;
        this.fallingItems = [];
        this.particles = [];
        this.floatingTexts = [];
        this.flashIntensity = 0;
        this.briefcase.x = this.width / 2;
        this.targetX = this.width / 2;
    }

    triggerFlash(color: string) {
        this.flashColor = color;
        this.flashIntensity = 0.6;
    }

    payoutAnimation() {
        this.state = 'VIRAL';
        this.triggerFlash('#FFD700');

        for (let i = 0; i < 200; i++) {
            this.particles.push({
                x: Math.random() * this.width,
                y: -Math.random() * 1000,
                vx: (Math.random() - 0.5) * 300,
                vy: 500 + Math.random() * 600,
                life: 5, type: 'GOLD',
                size: 10 + Math.random() * 12
            });
        }

        this.totalXP += 200;
        this.hooks.onViralStreak({ credits: 25, xp: 200 });
    }

    resume() {
        if (this.state === 'VIRAL') {
            this.state = 'PLAYING';
            this.streak = 0;
            this.fallingItems = [];
            this.lastTime = performance.now();
        }
    }

    endGame() {
        this.state = 'GAMEOVER';
        const engagementScore = Math.log10(this.totalXP + 1) * 20;
        this.hooks.onGameOver({
            score: this.score,
            xp: this.totalXP,
            engagement: engagementScore.toFixed(2),
            viralReached: this.streak >= this.maxStreak
        });
    }

    spawnItem() {
        const typeRoll = Math.random();
        let type: 'GLITCH' | 'CASH' | 'CREDIT', color: string, w: number, h: number;

        if (typeRoll < 0.25) {
            type = 'GLITCH'; color = '#FF0000'; w = 50; h = 50;
        } else if (typeRoll < 0.6) {
            type = 'CASH'; color = '#00FF00'; w = 60; h = 30;
        } else {
            type = 'CREDIT'; color = '#00FFFF'; w = 40; h = 40;
        }

        const speed = (350 + Math.random() * 450) * this.baseSpeedMultiplier;
        const x = Math.random() * (this.width - w);

        this.fallingItems.push({
            x, y: -100, width: w, height: h,
            vy: speed, type, color, active: true,
            rot: 0, rotSpeed: (Math.random() - 0.5) * 5
        });
    }

    addFloatingText(text: string, x: number, y: number, color: string) {
        this.floatingTexts.push({ text, x, y, color, life: 1.0, vy: -100 });
    }

    spawnParticles(x: number, y: number, color: string, type = 'SPARK') {
        for (let i = 0; i < 20; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 800,
                vy: (Math.random() - 0.5) * 800,
                life: 0.5 + Math.random() * 0.7,
                color, type,
                size: 4 + Math.random() * 8
            });
        }
    }

    update(dt: number) {
        if (this.state === 'GAMEOVER') return;

        this.gameTime += dt * 1000;

        // Smooth Briefcase Follow (Lerp)
        this.briefcase.x += (this.targetX - this.briefcase.x) * 15 * dt;

        // Screen Shake decay
        if (this.screenShake > 0) this.screenShake -= dt * 60;
        if (this.screenShake < 0) this.screenShake = 0;

        // Flash decay
        if (this.flashIntensity > 0) this.flashIntensity -= dt * 2;

        if (this.state === 'PLAYING') {
            this.baseSpeedMultiplier = 1.0 + (this.gameTime / this.levelDuration) * 1.8;

            if (this.gameTime > this.nextSpawnTime) {
                this.spawnItem();
                const spawnRate = Math.max(150, 700 - (this.gameTime / this.levelDuration) * 550);
                this.nextSpawnTime = this.gameTime + spawnRate + Math.random() * 200;
            }

            if (this.gameTime >= this.levelDuration && this.fallingItems.length === 0) {
                this.endGame();
                return;
            }

            const bc = this.briefcase;

            this.fallingItems.forEach(item => {
                item.y += item.vy * dt;
                item.rot += item.rotSpeed * dt;

                if (item.active &&
                    item.x < bc.x + bc.width / 2 &&
                    item.x + item.width > bc.x - bc.width / 2 &&
                    item.y < bc.y + bc.height &&
                    item.y + item.height > bc.y) {

                    item.active = false;

                    if (item.type === 'GLITCH') {
                        this.streak = 0;
                        this.score = Math.max(0, this.score - 150);
                        this.screenShake = 25;
                        this.triggerFlash('#FF0000');
                        this.spawnParticles(item.x, item.y, '#FF0000', 'GLITCH');
                        this.addFloatingText("SYSTEM ERROR", bc.x, bc.y - 20, '#FF0000');
                    } else {
                        this.streak++;
                        const pts = item.type === 'CASH' ? 100 : 50;
                        const xp = item.type === 'CASH' ? 10 : 5;
                        this.score += pts;
                        this.totalXP += xp;

                        this.triggerFlash(item.color);
                        this.spawnParticles(bc.x, bc.y - 10, item.color, 'SPARK');
                        this.addFloatingText(`+${pts}`, bc.x, bc.y - 40, item.color);

                        if (this.streak >= this.maxStreak) {
                            this.payoutAnimation();
                        }
                    }
                }

                if (item.y > this.height + 100) item.active = false;
            });
            this.fallingItems = this.fallingItems.filter(i => i.active);
        }

        // Particles
        this.particles.forEach(p => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            if (p.type === 'GOLD') {
                p.vy += 1200 * dt;
            } else {
                p.life -= dt;
            }
        });
        this.particles = this.particles.filter(p => p.type === 'GOLD' ? p.y < this.height + 100 : p.life > 0);

        // Texts
        this.floatingTexts.forEach(ft => {
            ft.y += ft.vy * dt;
            ft.life -= dt;
        });
        this.floatingTexts = this.floatingTexts.filter(ft => ft.life > 0);
    }

    drawPixelRect(x: number, y: number, w: number, h: number, color: string) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
    }

    drawPixelOutline(x: number, y: number, w: number, h: number, color: string, thickness = 2) {
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = thickness;
        this.ctx.strokeRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
    }

    draw() {
        // ═══ Phosphor Trail Effect (Partial clear) ═══
        this.ctx.fillStyle = 'rgba(5, 5, 5, 0.4)';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // ═══ Screen Flash (Dopamine Hit) ═══
        if (this.flashIntensity > 0 && this.flashColor) {
            this.ctx.fillStyle = this.flashColor;
            this.ctx.globalAlpha = this.flashIntensity * 0.4;
            this.ctx.fillRect(0, 0, this.width, this.height);
            this.ctx.globalAlpha = 1.0;
        }

        this.ctx.save();

        if (this.screenShake > 0) {
            const dx = (Math.random() - 0.5) * this.screenShake;
            const dy = (Math.random() - 0.5) * this.screenShake;
            this.ctx.translate(dx, dy);
        }

        // ═══ Draw Falling Items ═══
        this.fallingItems.forEach(item => {
            this.ctx.save();
            this.ctx.translate(item.x + item.width / 2, item.y + item.height / 2);

            this.ctx.shadowColor = item.color;
            this.ctx.shadowBlur = 15;

            if (item.type === 'CASH') {
                this.ctx.rotate(item.rot);
                this.drawPixelRect(-item.width / 2, -item.height / 2, item.width, item.height, '#002200');
                this.drawPixelOutline(-item.width / 2, -item.height / 2, item.width, item.height, item.color, 4);
                this.ctx.fillStyle = item.color;
                this.ctx.font = "bold 20px 'Courier New'";
                this.ctx.textAlign = "center";
                this.ctx.textBaseline = "middle";
                this.ctx.shadowBlur = 0;
                this.ctx.fillText("$", 0, 2);
            } else if (item.type === 'CREDIT') {
                this.ctx.rotate(item.rot);
                this.drawPixelRect(-item.width / 2, -item.height / 2, item.width, item.height, '#002222');
                this.drawPixelOutline(-item.width / 2, -item.height / 2, item.width, item.height, item.color, 4);
                this.drawPixelRect(-10, -10, 20, 20, item.color);
            } else if (item.type === 'GLITCH') {
                this.ctx.fillStyle = item.color;
                const time = this.gameTime * 0.02;
                for (let i = 0; i < 5; i++) {
                    const jx = Math.sin(time + i * 2.1) * 20;
                    const jy = Math.cos(time + i * 1.7) * 20;
                    const size = 15 + Math.sin(time * 0.8 + i) * 15;
                    this.drawPixelRect(-10 + jx, -10 + jy, size, size, item.color);
                }
                this.drawPixelRect(-8 + Math.random() * 4, -8 + Math.random() * 4, 16, 16, '#FFFFFF');
            }

            this.ctx.restore();
        });

        // ═══ Draw Particles ═══
        this.particles.forEach(p => {
            this.ctx.shadowColor = p.color || '#FFF';
            this.ctx.shadowBlur = 10;
            this.ctx.fillStyle = p.color || '#FFF';

            if (p.type === 'GOLD') {
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.strokeStyle = '#DAA520';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            } else if (p.type === 'GLITCH') {
                this.drawPixelRect(p.x, p.y, p.size, p.size, p.color || '#FF0000');
            } else {
                this.drawPixelRect(p.x, p.y, p.size, p.size, p.color || '#FFF');
            }
            this.ctx.shadowBlur = 0;
        });

        // ═══ Draw Chrome Briefcase (Player) ═══
        this.ctx.save();
        this.ctx.translate(this.briefcase.x, this.briefcase.y);

        this.ctx.shadowColor = '#00FFFF';
        this.ctx.shadowBlur = 20;

        this.drawPixelRect(-this.briefcase.width / 2, 0, this.briefcase.width, this.briefcase.height, varChrome3());
        this.drawPixelRect(-this.briefcase.width / 2 + 5, 5, this.briefcase.width - 10, this.briefcase.height - 10, varChrome2());
        this.drawPixelRect(-this.briefcase.width / 2 + 10, 10, this.briefcase.width - 20, 15, varChrome1());

        this.drawPixelRect(-30, -20, 60, 20, varChrome3());
        this.drawPixelRect(-20, -10, 40, 10, '#000');

        this.drawPixelRect(-40, 10, 15, 15, '#00FFFF');
        this.drawPixelRect(25, 10, 15, 15, '#00FFFF');

        this.ctx.restore();
        this.ctx.restore();

        // ═══ Floating Texts ═══
        this.floatingTexts.forEach(ft => {
            this.ctx.fillStyle = ft.color;
            this.ctx.shadowColor = ft.color;
            this.ctx.shadowBlur = 10;
            this.ctx.globalAlpha = Math.max(0, ft.life);
            this.ctx.font = "bold 24px 'Courier New'";
            this.ctx.textAlign = "center";
            this.ctx.fillText(ft.text, ft.x, ft.y);
            this.ctx.globalAlpha = 1.0;
            this.ctx.shadowBlur = 0;
        });

        // ═══ HUD ═══
        this.ctx.fillStyle = '#00FFFF';
        this.ctx.shadowColor = '#00FFFF';
        this.ctx.shadowBlur = 5;
        this.ctx.font = "bold 28px 'Courier New'";
        this.ctx.textAlign = "left";
        this.ctx.textBaseline = "top";
        this.ctx.fillText(`SCORE: ${this.score}`, 30, 30);

        this.ctx.fillStyle = '#FF00FF';
        this.ctx.shadowColor = '#FF00FF';
        this.ctx.font = "bold 18px 'Courier New'";
        this.ctx.fillText(`XP: ${this.totalXP}`, 30, 65);

        this.ctx.textAlign = "right";
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.shadowColor = '#FFFFFF';
        this.ctx.font = "bold 28px 'Courier New'";
        this.ctx.fillText(`CREDITS: ${this.credits}`, this.width - 30, 30);

        this.ctx.textAlign = "center";
        this.ctx.fillStyle = '#00FF00';
        this.ctx.shadowColor = '#00FF00';
        this.ctx.fillText(`STREAK: ${this.streak}/${this.maxStreak}`, this.width / 2, 30);

        const barW = 300;
        const barH = 15;
        const bx = this.width / 2 - barW / 2;
        const by = 65;

        this.ctx.shadowBlur = 0;
        this.ctx.strokeStyle = '#00FF00';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(bx, by, barW, barH);

        const fillW = (Math.min(this.streak, this.maxStreak) / this.maxStreak) * barW;
        this.ctx.fillRect(bx, by, fillW, barH);

        const timeRatio = Math.max(0, 1 - (this.gameTime / this.levelDuration));
        this.ctx.fillStyle = '#00FFFF';
        this.ctx.fillRect(0, this.height - 5, this.width * timeRatio, 5);
    }

    loop(timestamp: number) {
        if (!this.lastTime) this.lastTime = timestamp;
        const dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        // Clamp dt to prevent physics blowup on tab-out (locked at ~60fps)
        if (dt < 0.1) {
            this.update(dt);
            this.draw();
        }

        if (this.state !== 'IDLE') {
            this.animationFrameId = requestAnimationFrame(this.boundLoop);
        }
    }
}


// ─────────────────────────────────────────────────────────────────────────────
// REACT WRAPPER — VaultRainModule Component
// Handles lifecycle, overlay screens, and Firebase/Stripe hook integration.
// ─────────────────────────────────────────────────────────────────────────────

interface VaultRainModuleProps {
    credits: number;
    onGameStart: (callback: (success: boolean) => void) => void;
    onViralStreak: (data: { credits: number; xp: number }) => void;
    onGameOver: (data: {
        score: number;
        xp: number;
        engagement: string;
        viralReached: boolean;
    }) => void;
    onExit: () => void;
}

export default function VaultRainModule({
    credits,
    onGameStart,
    onViralStreak,
    onGameOver,
    onExit,
}: VaultRainModuleProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<VaultRainEngine | null>(null);

    // Overlay states
    const startScreenRef = useRef<HTMLDivElement>(null);
    const jackpotScreenRef = useRef<HTMLDivElement>(null);
    const gameOverScreenRef = useRef<HTMLDivElement>(null);
    const finalScoreRef = useRef<HTMLDivElement>(null);

    // Initialize the engine once on mount
    useEffect(() => {
        if (!canvasRef.current) return;

        const engine = new VaultRainEngine(canvasRef.current, {
            initialCredits: credits,
            onGameStart: (startCallback) => {
                onGameStart((success) => {
                    if (success) {
                        startCallback(true);
                    } else {
                        startCallback(false);
                    }
                });
            },
            onViralStreak: (data) => {
                onViralStreak(data);
                // Show jackpot overlay
                if (jackpotScreenRef.current) {
                    jackpotScreenRef.current.classList.remove('opacity-0', 'pointer-events-none');
                }
            },
            onGameOver: (data) => {
                onGameOver(data);
                // Show game over overlay
                if (finalScoreRef.current) {
                    finalScoreRef.current.innerHTML = `
                        <div class="text-xl lg:text-2xl text-white mb-2 font-bold" style="font-family: 'Courier New', monospace;">FINAL SCORE: ${data.score}</div>
                        <div class="text-base lg:text-lg text-cyan-400 mb-2" style="font-family: 'Courier New', monospace;">XP MINED: ${data.xp}</div>
                        <div class="text-xl lg:text-2xl text-green-400 border-2 border-green-400 p-3 inline-block" style="background: rgba(0,255,0,0.1); font-family: 'Courier New', monospace;">
                            ENGAGEMENT SCORE [E]: ${data.engagement}
                        </div>
                    `;
                }
                if (gameOverScreenRef.current) {
                    gameOverScreenRef.current.classList.remove('opacity-0', 'pointer-events-none');
                }
            }
        });

        engineRef.current = engine;

        return () => {
            engine.destroy();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Sync credits from parent into the engine instance
    useEffect(() => {
        if (engineRef.current) {
            engineRef.current.credits = credits;
        }
    }, [credits]);

    const handleStart = useCallback(() => {
        if (startScreenRef.current) {
            startScreenRef.current.classList.add('opacity-0', 'pointer-events-none');
        }
        engineRef.current?.start();
    }, []);

    const handleContinue = useCallback(() => {
        if (jackpotScreenRef.current) {
            jackpotScreenRef.current.classList.add('opacity-0', 'pointer-events-none');
        }
        engineRef.current?.resume();
    }, []);

    const handleRestart = useCallback(() => {
        if (gameOverScreenRef.current) {
            gameOverScreenRef.current.classList.add('opacity-0', 'pointer-events-none');
        }
        engineRef.current?.start();
    }, []);

    return (
        <div className="relative w-full max-w-[1280px] mx-auto" style={{ aspectRatio: '16 / 9' }}>
            {/* ═══ Game Wrapper ═══ */}
            <div
                className="relative w-full h-full overflow-hidden rounded-lg"
                style={{
                    backgroundColor: '#050505',
                    boxShadow: '0 0 50px rgba(0, 255, 255, 0.05)',
                    border: '2px solid #111',
                }}
            >
                {/* Canvas */}
                <canvas
                    ref={canvasRef}
                    width={1280}
                    height={720}
                    className="block w-full h-full"
                    style={{ imageRendering: 'pixelated' }}
                />

                {/* ═══ 16-bit Scanline Overlay ═══ */}
                <div
                    className="absolute inset-0 z-[2] pointer-events-none"
                    style={{
                        background: 'linear-gradient(rgba(0,0,0,0) 50%, rgba(0,0,0,0.3) 50%)',
                        backgroundSize: '100% 6px',
                    }}
                />

                {/* ═══ Heavy Radial CRT Vignette ═══ */}
                <div
                    className="absolute inset-0 z-[3] pointer-events-none"
                    style={{
                        background: 'radial-gradient(circle at center, transparent 40%, rgba(0,0,0,0.95) 100%)',
                    }}
                />

                {/* ═══ Start Screen Overlay ═══ */}
                <div
                    ref={startScreenRef}
                    className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center transition-opacity duration-200"
                    style={{
                        background: 'rgba(5, 5, 5, 0.9)',
                        fontFamily: "'Courier New', Courier, monospace",
                        color: '#00FFFF',
                    }}
                >
                    <h1
                        className="text-4xl sm:text-5xl lg:text-7xl font-bold uppercase tracking-wider mb-2"
                        style={{ textShadow: '6px 6px 0px #005555' }}
                    >
                        VAULT RAIN
                    </h1>
                    <p className="mb-8 text-sm sm:text-base lg:text-lg" style={{ color: '#aaa' }}>
                        CATCH CASH. DODGE GLITCHES.
                    </p>
                    <button
                        onClick={handleStart}
                        className="uppercase font-bold text-base sm:text-lg px-8 sm:px-10 py-3 sm:py-4 cursor-pointer transition-all active:translate-x-1 active:translate-y-1 hover:bg-[#00FFFF] hover:text-black"
                        style={{
                            background: '#111',
                            color: '#00FFFF',
                            border: '4px solid #00FFFF',
                            boxShadow: '6px 6px 0px rgba(0, 255, 255, 0.3)',
                            fontFamily: "'Courier New', Courier, monospace",
                        }}
                    >
                        DROP IN (10 CR)
                    </button>
                </div>

                {/* ═══ Jackpot / Viral Streak Screen ═══ */}
                <div
                    ref={jackpotScreenRef}
                    className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center transition-opacity duration-200 opacity-0 pointer-events-none"
                    style={{
                        background: 'rgba(5, 5, 5, 0.9)',
                        fontFamily: "'Courier New', Courier, monospace",
                    }}
                >
                    <h1
                        className="text-4xl sm:text-5xl lg:text-7xl font-bold uppercase tracking-wider mb-2"
                        style={{ color: '#00FF00', textShadow: '4px 4px 0px #004400' }}
                    >
                        VIRAL STREAK!
                    </h1>
                    <h2
                        className="text-xl sm:text-2xl lg:text-3xl mb-8"
                        style={{ color: '#00FF00', textShadow: '2px 2px 0px #004400' }}
                    >
                        +25 CREDITS SECURED
                    </h2>
                    <button
                        onClick={handleContinue}
                        className="uppercase font-bold text-base sm:text-lg px-8 sm:px-10 py-3 sm:py-4 cursor-pointer transition-all active:translate-x-1 active:translate-y-1 hover:bg-[#00FFFF] hover:text-black"
                        style={{
                            background: '#111',
                            color: '#00FFFF',
                            border: '4px solid #00FFFF',
                            boxShadow: '6px 6px 0px rgba(0, 255, 255, 0.3)',
                            fontFamily: "'Courier New', Courier, monospace",
                        }}
                    >
                        RESUME HUSTLE
                    </button>
                </div>

                {/* ═══ Game Over Screen ═══ */}
                <div
                    ref={gameOverScreenRef}
                    className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center transition-opacity duration-200 opacity-0 pointer-events-none"
                    style={{
                        background: 'rgba(5, 5, 5, 0.9)',
                        fontFamily: "'Courier New', Courier, monospace",
                    }}
                >
                    <h1
                        className="text-4xl sm:text-5xl lg:text-7xl font-bold uppercase tracking-wider mb-4"
                        style={{ color: '#FF00FF', textShadow: '4px 4px 0px #440044' }}
                    >
                        VAULT CLOSED
                    </h1>
                    <div ref={finalScoreRef} className="mb-8" />
                    <div className="flex flex-col sm:flex-row gap-4">
                        <button
                            onClick={handleRestart}
                            className="uppercase font-bold text-base sm:text-lg px-8 sm:px-10 py-3 sm:py-4 cursor-pointer transition-all active:translate-x-1 active:translate-y-1 hover:bg-[#00FFFF] hover:text-black"
                            style={{
                                background: '#111',
                                color: '#00FFFF',
                                border: '4px solid #00FFFF',
                                boxShadow: '6px 6px 0px rgba(0, 255, 255, 0.3)',
                                fontFamily: "'Courier New', Courier, monospace",
                            }}
                        >
                            RE-ENTER (10 CR)
                        </button>
                        <button
                            onClick={onExit}
                            className="uppercase font-bold text-base sm:text-lg px-8 sm:px-10 py-3 sm:py-4 cursor-pointer transition-all active:translate-x-1 active:translate-y-1 hover:bg-[#FF00FF] hover:text-black"
                            style={{
                                background: '#111',
                                color: '#FF00FF',
                                border: '4px solid #FF00FF',
                                boxShadow: '6px 6px 0px rgba(255, 0, 255, 0.3)',
                                fontFamily: "'Courier New', Courier, monospace",
                            }}
                        >
                            EXIT VAULT
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
