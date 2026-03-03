'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    signInWithPopup,
    GoogleAuthProvider,
    User as FirebaseUser,
} from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

// ── Firestore User Document Type (matches architecture spec) ──
export interface UserDocument {
    uid: string;
    email: string;
    name?: string;
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
    credits: number;
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
    unlocked_assets?: string[];
    ascensionVerifiedToast?: boolean;
    engagementScore: number;
    inviteCode?: string;
    referral_count?: number;
    last_sync_bonus_claimed?: number;
}

interface AuthContextType {
    firebaseUser: FirebaseUser | null;
    userDoc: UserDocument | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    signup: (email: string, password: string, name?: string) => Promise<void>;
    loginWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    firebaseUser: null,
    userDoc: null,
    loading: true,
    login: async () => { },
    signup: async () => { },
    loginWithGoogle: async () => { },
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

    const signup = async (email: string, password: string, name?: string) => {
        const { user } = await createUserWithEmailAndPassword(auth, email, password);
        // Initialize the economy variables for this new citizen
        const { setDoc } = await import('firebase/firestore');
        const userRef = doc(db, 'users', user.uid);
        try {
            await setDoc(userRef, {
                uid: user.uid,
                email,
                name: name || '',
                createdAt: new Date(),
                lastLogin: new Date(),
                stripeCustomerId: '',
                tier: {
                    current: 'FREE',
                    previous: null,
                    updatedAt: new Date(),
                    manualApprovalFlag: false,
                },
                subscriptionStatus: {
                    status: 'none',
                },
                trialEndsAt: null,
                // Economy Initialization
                credits: 125,
                xp: {
                    total: 500,
                    multiplier: 1,
                    lastUpdated: new Date()
                },
                collectibles: [],
                engagementScore: 0,
            }, { merge: true });
        } catch (err) {
            console.error('Failed to initialize economy for new citizen:', err);
        }
    };

    const loginWithGoogle = async () => {
        const provider = new GoogleAuthProvider();
        const { user } = await signInWithPopup(auth, provider);

        // Ensure user entry exists
        const { getDoc, setDoc } = await import('firebase/firestore');
        const userRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userRef);

        if (!userDocSnap.exists()) {
            try {
                await setDoc(userRef, {
                    uid: user.uid,
                    email: user.email || '',
                    name: user.displayName || '',
                    createdAt: new Date(),
                    lastLogin: new Date(),
                    stripeCustomerId: '',
                    tier: {
                        current: 'FREE',
                        previous: null,
                        updatedAt: new Date(),
                        manualApprovalFlag: false,
                    },
                    subscriptionStatus: {
                        status: 'none',
                    },
                    trialEndsAt: null,
                    credits: 125,
                    xp: {
                        total: 500,
                        multiplier: 1,
                        lastUpdated: new Date()
                    },
                    collectibles: [],
                    engagementScore: 0,
                }, { merge: true });
            } catch (err) {
                console.error('Failed to initialize economy for Google Sign-in citizen:', err);
            }
        }
    };

    const logout = async () => {
        await signOut(auth);
    };

    return (
        <AuthContext.Provider value={{ firebaseUser, userDoc, loading, login, signup, loginWithGoogle, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
}
