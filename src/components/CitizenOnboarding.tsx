'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function CitizenOnboarding() {
    const { firebaseUser, userDoc } = useAuth();
    const [isClosing, setIsClosing] = useState(false);

    const isVisible = Boolean(userDoc?.hasSeenOnboarding === false && !isClosing);

    const handleEnterFieldMode = async () => {
        if (!firebaseUser) return;
        setIsClosing(true);

        try {
            const userRef = doc(db, 'users', firebaseUser.uid);
            await updateDoc(userRef, { hasSeenOnboarding: true });
        } catch (error) {
            console.error('Failed to update onboarding flag', error);
        }
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
                >
                    <motion.div
                        initial={{ scale: 0.95, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.95, y: -20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="relative max-w-lg w-full bg-[#0a0a0a] border-4 border-[#00f0ff] p-8 shadow-[0_0_40px_rgba(0,240,255,0.15)]"
                    >
                        {/* 16-bit corners emulation */}
                        <div className="absolute -top-1 -left-1 w-2 h-2 bg-black"></div>
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-black"></div>
                        <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-black"></div>
                        <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-black"></div>

                        <div className="absolute top-0 left-0 w-2 h-2 bg-[#00f0ff] mt-1 ml-1"></div>
                        <div className="absolute top-0 right-0 w-2 h-2 bg-[#00f0ff] mt-1 mr-1"></div>
                        <div className="absolute bottom-0 left-0 w-2 h-2 bg-[#00f0ff] mb-1 ml-1"></div>
                        <div className="absolute bottom-0 right-0 w-2 h-2 bg-[#00f0ff] mb-1 mr-1"></div>

                        <div className="text-center relative z-10">
                            <h2 className="text-2xl md:text-3xl font-bold tracking-[0.1em] uppercase mb-6 font-mono select-none" style={{ textShadow: '2px 2px 0px rgba(0,240,255,0.4)', color: '#fff' }}>
                                WELCOME TO THE OUTWORLD,<br />
                                <span className="text-[#00f0ff] mt-2 block tracking-widest">
                                    CITIZEN {userDoc?.name ? userDoc.name.split(' ')[0].toUpperCase() : 'UNKNOWN'}
                                </span>
                            </h2>

                            <p className="text-zinc-400 font-mono text-sm leading-relaxed mb-8 select-none border-t border-b border-zinc-800 py-6">
                                Your frequency has been synchronized. You have been granted <span className="text-[#00f0ff] font-bold">20 Credits</span> to begin your extraction. Access the Vault for stems or the Arcade to earn your rank.
                            </p>

                            <button
                                onClick={handleEnterFieldMode}
                                className="hover-trigger relative group inline-flex items-center justify-center w-full px-8 py-4 font-bold text-black bg-[#00f0ff] overflow-hidden uppercase tracking-[0.2em] transition-all hover:bg-white hover:shadow-[0_0_20px_rgba(0,240,255,0.5)] active:scale-[0.98]"
                                style={{
                                    boxShadow: '4px 4px 0px rgba(255,255,255,0.2)'
                                }}
                            >
                                <span className="absolute inset-0 w-full h-full bg-white opacity-0 group-hover:opacity-20 transition-opacity"></span>
                                <div className="glitch-layer"></div>
                                {/* Glitch decorative lines */}
                                <span className="absolute left-0 w-1 h-full bg-black translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-100"></span>
                                <span className="absolute right-0 w-1 h-full bg-black translate-x-[100%] group-hover:translate-x-0 transition-transform duration-100"></span>

                                <span className="relative z-10 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-xl">electric_bolt</span>
                                    ENTER FIELD MODE
                                </span>
                            </button>
                        </div>

                        {/* Scanline overlay effect */}
                        <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(rgba(255,255,255,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%]"></div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
