'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface CommanderWidgetProps {
    userDoc: any;
    firebaseUser: any;
    setPromptInput: (prompt: string) => void;
}

export default function CommanderWidget({ userDoc, firebaseUser, setPromptInput }: CommanderWidgetProps) {
    const [globalStanding, setGlobalStanding] = useState<number | null>(null);

    // Calculate Engagement Score logic similar to leaderboard (E = log10(XP_total + 1) * 20)
    useEffect(() => {
        const fetchStanding = async () => {
            if (!firebaseUser) return;
            try {
                // If there's a leaderboards/global_engagement collection, query it. 
                // Or if we sort all users by engagementScore:
                const usersRef = collection(db, 'users');
                const q = query(usersRef, orderBy('xp.total', 'desc')); // Assuming xp.total correlates to high engagementScore
                const snapshot = await getDocs(q);

                let standing = 1;
                let found = false;
                snapshot.forEach((docSnap) => {
                    if (!found) {
                        if (docSnap.id === firebaseUser.uid) {
                            found = true;
                        } else {
                            standing++;
                        }
                    }
                });

                if (found) {
                    setGlobalStanding(standing);
                }
            } catch (err) {
                console.error("Error fetching global standing:", err);
            }
        };

        fetchStanding();
    }, [firebaseUser]);

    if (!userDoc || userDoc.tier?.current !== 'STANDARD') {
        return null; // Render only for Standard Tier users.
    }

    const networkStrength = userDoc.referral_count || 0;

    const initiateMaxResonance = () => {
        setPromptInput("PROTOCOL: [OUTLANDIA_MAX_RESONANCE] — BYPASS ARCHIVE LIMITS; GENERATE RAW FREQUENCY.");

        // Optionally scroll to Alchemist section so the user sees it injected.
        window.scrollBy({ top: 800, behavior: 'smooth' }); // Rough scroll down to Alchemist
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full relative mt-4 overflow-hidden rounded-md bg-black border border-yellow-500/30 p-4 shadow-[0_0_15px_rgba(234,179,8,0.1)] flex flex-col gap-4 group"
        >
            {/* Breathing Gold Border */}
            <motion.div
                animate={{
                    opacity: [0.3, 0.7, 0.3],
                }}
                transition={{
                    duration: 3,
                    ease: "easeInOut",
                    repeat: Infinity,
                }}
                className="absolute inset-0 border border-yellow-500 pointer-events-none rounded-md z-0"
            />

            <div className="relative z-10 flex items-center gap-3 border-b border-yellow-500/20 pb-3">
                <span className="material-symbols-outlined text-yellow-500 text-xl">admin_panel_settings</span>
                <h3 className="text-yellow-500 font-display uppercase tracking-widest text-sm font-bold">Node Commander</h3>
            </div>

            <div className="relative z-10 flex flex-col gap-3">
                {/* Network Strength */}
                <div className="flex justify-between items-center bg-white/5 p-2 rounded">
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">[ NETWORK_STRENGTH ]</span>
                    <span className="text-xs text-white font-bold font-mono border-b border-yellow-500/50">{networkStrength} RECRUITS</span>
                </div>

                {/* Global Standing */}
                <div className="flex justify-between items-center bg-white/5 p-2 rounded">
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">[ GLOBAL_STANDING ]</span>
                    <span className="text-xs text-white font-bold font-mono">
                        {globalStanding !== null ? `#${globalStanding}` : 'CALCULATING...'}
                    </span>
                </div>

                {/* Multiplier */}
                <div className="flex justify-between items-center bg-yellow-500/10 p-2 rounded border border-yellow-500/20">
                    <span className="text-[10px] text-yellow-500/80 uppercase tracking-widest font-mono">[ MULTIPLIER_MOD ]</span>
                    <motion.span
                        animate={{ opacity: [0.6, 1, 0.6], textShadow: ["0px 0px 0px rgba(234,179,8,0)", "0px 0px 8px rgba(234,179,8,0.8)", "0px 0px 0px rgba(234,179,8,0)"] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="text-xs text-yellow-400 font-black font-mono tracking-widest"
                    >
                        1.5X XP BOOST
                    </motion.span>
                </div>
            </div>

            <div className="relative z-10 mt-2">
                <button
                    onClick={initiateMaxResonance}
                    className="w-full bg-yellow-500 text-black py-3 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-yellow-400 transition-colors flex items-center justify-center gap-2"
                >
                    <span className="material-symbols-outlined text-sm">psychology</span>
                    Initiate Max Resonance
                </button>
            </div>

            <div className="absolute top-0 right-0 p-2 opacity-10 pointer-events-none">
                <span className="material-symbols-outlined text-6xl text-yellow-500">grid_goldenratio</span>
            </div>
        </motion.div>
    );
}
