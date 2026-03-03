'use client';

import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface SystemStatus {
    maintenance_mode: boolean;
    maintenance_message: string;
}

export function useSystemStatus() {
    const [status, setStatus] = useState<SystemStatus>({
        maintenance_mode: false,
        maintenance_message: "SYSTEM MAINTENANCE"
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'config', 'system_status'), (docSnap) => {
            if (docSnap.exists()) {
                setStatus({
                    maintenance_mode: !!docSnap.data().maintenance_mode,
                    maintenance_message: docSnap.data().maintenance_message || "SYSTEM MAINTENANCE"
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
