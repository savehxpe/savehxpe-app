'use client';

import { useSystemStatus } from '@/hooks/useSystemStatus';

export default function SystemAlert() {
    const { systemStatus, loadingStatus } = useSystemStatus();

    if (loadingStatus || !systemStatus.maintenance_mode) return null;

    return (
        <div className="w-full bg-red-600 px-4 py-3 sm:py-2 text-white font-mono text-center flex flex-col sm:flex-row items-center justify-center gap-2 z-50 animate-[pulse_3s_ease-in-out_infinite] shadow-[0_0_15px_rgba(220,38,38,0.5)]">
            <span className="material-symbols-outlined text-sm font-bold">warning</span>
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em]">
                SYSTEM ALERT: {systemStatus.maintenance_message} — TRANSACTIONS SUSPENDED.
            </span>
        </div>
    );
}
