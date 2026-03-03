'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const { login, signup, firebaseUser, loading } = useAuth();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Redirect if already authenticated
    if (!loading && firebaseUser) {
        router.replace('/dashboard');
        return null;
    }

    const currentYear = new Date().getFullYear();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);

        try {
            if (isSignUp) {
                await signup(email, password);
            } else {
                await login(email, password);
            }
            router.push('/dashboard');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Authentication failed';
            if (message.includes('user-not-found') || message.includes('wrong-password') || message.includes('invalid-credential')) {
                setError(isSignUp
                    ? 'Invalid credentials provided for sign up.'
                    : 'Invalid email or password. If you don\'t have an account, click "Create Account" below.');
            } else if (message.includes('email-already-in-use')) {
                setError('This email is already registered. Try signing in.');
            } else if (message.includes('weak-password')) {
                setError('Password must be at least 6 characters.');
            } else if (message.includes('invalid-email')) {
                setError('Please enter a valid email address.');
            } else {
                setError(message);
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '1rem',
            background: '#000',
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Scanline effect */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '2px',
                background: 'rgba(255,255,255,0.03)',
                animation: 'scanline 8s linear infinite',
                pointerEvents: 'none',
            }} />

            {/* Radial gradient backdrop */}
            <div style={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(circle at center, rgba(40,40,40,0.15) 0%, transparent 70%)',
                pointerEvents: 'none',
            }} />

            <div className="animate-fade-in" style={{
                width: '100%',
                maxWidth: '380px',
                position: 'relative',
                zIndex: 1,
            }}>
                {/* Logo */}
                <div style={{
                    textAlign: 'center',
                    marginBottom: '3rem',
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        marginBottom: '0.5rem',
                    }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                            <rect x="2" y="4" width="20" height="16" rx="0" />
                            <line x1="6" y1="12" x2="6" y2="16" />
                            <line x1="9" y1="10" x2="9" y2="16" />
                            <line x1="12" y1="8" x2="12" y2="16" />
                            <line x1="15" y1="10" x2="15" y2="16" />
                            <line x1="18" y1="12" x2="18" y2="16" />
                        </svg>
                        <span style={{
                            fontSize: '1.125rem',
                            fontWeight: 800,
                            letterSpacing: '0.15em',
                            textTransform: 'uppercase' as const,
                        }}>saveHXPE</span>
                    </div>
                    <p className="text-label" style={{ color: '#555' }}>
                        {isSignUp ? 'Create your identity' : 'Access the vault'}
                    </p>
                </div>

                {/* Auth Form */}
                <form onSubmit={handleSubmit} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                }}>
                    <input
                        type="email"
                        className="input-field"
                        placeholder="Email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                    />
                    <input
                        type="password"
                        className="input-field"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete={isSignUp ? 'new-password' : 'current-password'}
                        minLength={6}
                    />

                    {error && (
                        <div style={{
                            padding: '0.75rem 1rem',
                            background: 'rgba(255,51,68,0.1)',
                            border: '1px solid rgba(255,51,68,0.3)',
                            fontSize: '0.75rem',
                            color: '#FF3344',
                            letterSpacing: '0.05em',
                        }}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={submitting}
                        style={{ marginTop: '0.5rem' }}
                    >
                        {submitting ? (
                            <div className="spinner" style={{ width: '18px', height: '18px', borderColor: '#333', borderTopColor: '#000' }} />
                        ) : (
                            isSignUp ? 'Create Account' : 'Enter the Vault'
                        )}
                    </button>
                </form>

                {/* Toggle Sign Up / Sign In */}
                <div style={{
                    textAlign: 'center',
                    marginTop: '1.5rem',
                }}>
                    <button
                        type="button"
                        onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#888',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase' as const,
                            fontFamily: 'var(--font-display)',
                        }}
                    >
                        {isSignUp ? 'Already have an account? Sign In' : 'New here? Create Account'}
                    </button>
                </div>

                {/* System Status */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    marginTop: '3rem',
                    opacity: 0.4,
                }}>
                    <div style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: '#00FF88',
                    }} />
                    <span className="text-label">System Online</span>
                </div>

                {/* Copyright */}
                <footer className="copyright-footer" style={{ marginTop: '1rem' }}>
                    © {currentYear} saveHXPE. All rights reserved.
                </footer>
            </div>
        </div>
    );
}
