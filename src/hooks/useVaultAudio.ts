'use client';

import { useState, useCallback, useRef } from 'react';

export function useVaultAudio() {
    const audioContextRef = useRef<AudioContext | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    const initAudio = useCallback(() => {
        if (!audioContextRef.current) {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            audioContextRef.current = new AudioContext();
            setIsInitialized(true);

            // Resume context if suspended
            if (audioContextRef.current.state === 'suspended') {
                audioContextRef.current.resume();
            }
        }
    }, []);

    const playDigitTick = useCallback(() => {
        if (!audioContextRef.current) return;
        const ctx = audioContextRef.current;

        // Ensure context is running stringently
        if (ctx.state === 'suspended') ctx.resume();

        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        // 800Hz Square Wave
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, now);

        // Quick attack and steep decay over 20ms
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.5, now + 0.005);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.02);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.03); // Stop slightly after decay
    }, []);

    const playMasterUnlock = useCallback(() => {
        if (!audioContextRef.current) return;
        const ctx = audioContextRef.current;

        if (ctx.state === 'suspended') ctx.resume();

        const now = ctx.currentTime;

        // 1. The Thud: Low frequency Sine wave dropping
        const thudOsc = ctx.createOscillator();
        const thudGain = ctx.createGain();

        thudOsc.type = 'sine';
        thudOsc.frequency.setValueAtTime(150, now);
        thudOsc.frequency.exponentialRampToValueAtTime(40, now + 0.2); // Drop over 200ms

        thudGain.gain.setValueAtTime(0, now);
        thudGain.gain.linearRampToValueAtTime(1, now + 0.02);
        thudGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

        thudOsc.connect(thudGain);
        thudGain.connect(ctx.destination);

        thudOsc.start(now);
        thudOsc.stop(now + 0.5);

        // 2. The Shatter: White-noise burst with Highpass at 2000Hz
        const bufferSize = ctx.sampleRate * 0.2; // 200ms of noise
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1; // White noise
        }

        const noiseSource = ctx.createBufferSource();
        noiseSource.buffer = noiseBuffer;

        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.setValueAtTime(2000, now);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(1, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2); // Quick decay

        noiseSource.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(ctx.destination);

        noiseSource.start(now);
        // Source naturally stops when buffer ends, but we can explicitly set it
        noiseSource.stop(now + 0.2);


        // 3. The Hum: Sub-bass hum at 30Hz for 1 second
        const humOsc = ctx.createOscillator();
        const humGain = ctx.createGain();

        humOsc.type = 'sine';
        humOsc.frequency.setValueAtTime(30, now);

        humGain.gain.setValueAtTime(0, now);
        humGain.gain.linearRampToValueAtTime(0.3, now + 0.1); // Ease in
        humGain.gain.setValueAtTime(0.3, now + 0.8);
        humGain.gain.linearRampToValueAtTime(0.01, now + 1.2); // Fade out

        humOsc.connect(humGain);
        humGain.connect(ctx.destination);

        humOsc.start(now);
        humOsc.stop(now + 1.3);

    }, []);

    return {
        initAudio,
        isInitialized,
        playDigitTick,
        playMasterUnlock,
    };
}
