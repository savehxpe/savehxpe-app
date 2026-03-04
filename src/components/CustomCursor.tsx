'use client';

import { useState, useEffect, useCallback } from 'react';

export default function CustomCursor() {
    const [pos, setPos] = useState({ x: -100, y: -100 });
    const [isHovering, setIsHovering] = useState(false);
    const [isClicking, setIsClicking] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    const handleMove = useCallback((e: MouseEvent) => {
        setPos({ x: e.clientX, y: e.clientY });
        if (!isVisible) setIsVisible(true);
    }, [isVisible]);

    useEffect(() => {
        // Detect touch device — skip custom cursor entirely
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        if (isTouchDevice) return;

        const onMove = (e: MouseEvent) => handleMove(e);
        const onDown = () => setIsClicking(true);
        const onUp = () => setIsClicking(false);
        const onLeave = () => setIsVisible(false);
        const onEnter = () => setIsVisible(true);

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mousedown', onDown);
        window.addEventListener('mouseup', onUp);
        document.addEventListener('mouseleave', onLeave);
        document.addEventListener('mouseenter', onEnter);

        // Hover detection for interactive elements
        const observer = new MutationObserver(() => attachHoverListeners());
        observer.observe(document.body, { childList: true, subtree: true });
        attachHoverListeners();

        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mousedown', onDown);
            window.removeEventListener('mouseup', onUp);
            document.removeEventListener('mouseleave', onLeave);
            document.removeEventListener('mouseenter', onEnter);
            observer.disconnect();
        };
    }, [handleMove]);

    const attachHoverListeners = () => {
        const interactives = document.querySelectorAll('button, a, [role="button"], input, select, textarea, .cursor-pointer');
        interactives.forEach(el => {
            const htmlEl = el as HTMLElement;
            if (htmlEl.dataset.cursorBound) return;
            htmlEl.dataset.cursorBound = '1';
            htmlEl.addEventListener('mouseenter', () => setIsHovering(true));
            htmlEl.addEventListener('mouseleave', () => setIsHovering(false));
        });
    };

    // Don't render on touch devices or server
    if (typeof window === 'undefined') return null;

    const size = isHovering ? 40 : 20;
    const innerSize = isHovering ? 6 : 3;

    return (
        <>
            {/* Hide default cursor globally */}
            <style>{`
                *, *::before, *::after {
                    cursor: none !important;
                }
            `}</style>

            {/* Outer Ring */}
            <div
                className="pointer-events-none fixed z-[9999] mix-blend-difference"
                style={{
                    left: pos.x - size / 2,
                    top: pos.y - size / 2,
                    width: size,
                    height: size,
                    opacity: isVisible ? 1 : 0,
                    transition: 'width 0.15s ease, height 0.15s ease, opacity 0.2s ease, left 0.05s ease, top 0.05s ease',
                }}
            >
                {/* Crosshair Lines */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[2px] h-[6px] bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[2px] h-[6px] bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[6px] h-[2px] bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[6px] h-[2px] bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />

                {/* Center Dot */}
                <div
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee]"
                    style={{
                        width: innerSize,
                        height: innerSize,
                        transition: 'width 0.15s ease, height 0.15s ease',
                    }}
                />

                {/* Outer border ring on hover */}
                {isHovering && (
                    <div
                        className="absolute inset-0 border-2 border-cyan-400/60 rounded-full animate-pulse shadow-[0_0_15px_#22d3ee]"
                    />
                )}

                {/* Click shrink indicator */}
                {isClicking && (
                    <div className="absolute inset-[6px] border border-white/80 rounded-full" />
                )}
            </div>
        </>
    );
}
