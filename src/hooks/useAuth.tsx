'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    User as FirebaseUser,
} from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

// ── Firestore User Document Type (matches architecture spec) ──
export interface UserDocument {
    uid: string;
    email: string;
    createdAt: { _seconds: number; _nanoseconds: number } | null;
    lastLogin: { _seconds: number; _nanoseconds: number } | null;
    stripeCustomerId: string;
    tier: {
        current: 'FREE' | 'STANDARD' | 'PREMIUM';
        previous: string | null;
        updatedAt: { _seconds: number; _nanoseconds: number } | null;
        manualApprovalFlag: boolean;
    };
    subscriptionStatus: {
        id?: string;
        status: 'none' | 'trialing' | 'active' | 'canceled' | 'past_due';
        cancelAtPeriodEnd?: boolean;
        currentPeriodEnd?: { _seconds: number; _nanoseconds: number } | null;
    };
    trialEndsAt: { _seconds: number; _nanoseconds: number } | null;
    xp: {
        total: number;
        multiplier: number;
        lastUpdated: { _seconds: number; _nanoseconds: number } | null;
    };
    collectibles: Array<{
        id: string;
        acquiredAt: { _seconds: number; _nanoseconds: number };
        type: string;
        name?: string;
        rarity?: string;
    }>;
    engagementScore: number;
}

interface AuthContextType {
    firebaseUser: FirebaseUser | null;
    userDoc: UserDocument | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    signup: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    firebaseUser: null,
    userDoc: null,
    loading: true,
    login: async () => { },
    signup: async () => { },
    logout: async () => { },
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
    const [userDoc, setUserDoc] = useState<UserDocument | null>(null);
    const [loading, setLoading] = useState(true);

    // ── Auth state listener ──
    useEffect(() => {
        const unsubAuth = onAuthStateChanged(auth, (user) => {
            setFirebaseUser(user);
            if (!user) {
                setUserDoc(null);
                setLoading(false);
            }
        });
        return () => unsubAuth();
    }, []);

    // ── Real-time Firestore document listener ──
    useEffect(() => {
        if (!firebaseUser) return;

        const userRef = doc(db, 'users', firebaseUser.uid);
        const unsubDoc = onSnapshot(
            userRef,
            (snapshot) => {
                if (snapshot.exists()) {
                    setUserDoc(snapshot.data() as UserDocument);
                } else {
                    // Document not yet created by Cloud Function — wait
                    setUserDoc(null);
                }
                setLoading(false);
            },
            (error) => {
                console.error('Firestore listener error:', error);
                setLoading(false);
            }
        );

        return () => unsubDoc();
    }, [firebaseUser]);

    const login = async (email: string, password: string) => {
        await signInWithEmailAndPassword(auth, email, password);
    };

    const signup = async (email: string, password: string) => {
        await createUserWithEmailAndPassword(auth, email, password);
    };

    const logout = async () => {
        await signOut(auth);
    };

    return (
        <AuthContext.Provider value={{ firebaseUser, userDoc, loading, login, signup, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
}
