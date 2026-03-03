'use client';

import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface SystemStatus {
    maintenance_mode: boolean;
    maintenance_message: string;
    last_restored_at: number | null;
}

export function useSystemStatus() {
    const [status, setStatus] = useState<SystemStatus>({
        maintenance_mode: false,
        maintenance_message: "SYSTEM MAINTENANCE",
        last_restored_at: null
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'config', 'system_status'), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                let timestamp = null;
                if (data.last_restored_at) {
                    timestamp = data.last_restored_at.toMillis ? data.last_restored_at.toMillis() : Date.now();
                }
                setStatus({
                    maintenance_mode: !!data.maintenance_mode,
                    maintenance_message: data.maintenance_message || "SYSTEM MAINTENANCE",
                    last_restored_at: timestamp
                });
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching system status:", error);
            setLoading(false);
        });

        return () => unsub();
    }, []);

    return { systemStatus: status, loadingStatus: loading };
}
