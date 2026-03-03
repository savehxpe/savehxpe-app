'use client';

import { useSystemStatus } from '@/hooks/useSystemStatus';

export default function SystemAlert() {
    const { systemStatus, loadingStatus } = useSystemStatus();

    if (loadingStatus) return null;

    if (systemStatus.maintenance_mode) {
        return (
            <div className="w-full bg-red-600 px-4 py-3 sm:py-2 text-white font-mono text-center flex flex-col sm:flex-row items-center justify-center gap-2 z-50 animate-[pulse_3s_ease-in-out_infinite] shadow-[0_0_15px_rgba(220,38,38,0.5)]">
                <span className="material-symbols-outlined text-sm font-bold">warning</span>
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em]">
                    SYSTEM ALERT: {systemStatus.maintenance_message} — TRANSACTIONS SUSPENDED.
                </span>
            </div>
        );
    }

    const RESTORE_WINDOW = 60 * 60 * 1000; // 60 minutes
    const isRecentlyRestored = systemStatus.last_restored_at && (Date.now() - systemStatus.last_restored_at) <= RESTORE_WINDOW;

    if (isRecentlyRestored) {
        return (
            <div className="w-full bg-green-500 px-4 py-3 sm:py-2 text-black font-mono text-center flex flex-col sm:flex-row items-center justify-center gap-2 z-50 shadow-[0_0_15px_rgba(34,197,94,0.5)]">
                <span className="material-symbols-outlined text-sm font-bold">verified</span>
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em]">
                    SYSTEM ONLINE: FREQUENCY VERIFIED. RE-SYNC BONUS (+100 XP) ACTIVE.
                </span>
            </div>
        );
    }

    return null;
}
