'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function Identity() {
    const router = useRouter();
    const { signup, login } = useAuth();
    const [isLoginMode, setIsLoginMode] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLoginMode) {
                await login(email, password);
                router.push('/dashboard');
            } else {
                await signup(email, password, name);
                router.push('/verify');
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Authentication failed';
            if (message.includes('user-not-found') || message.includes('wrong-password') || message.includes('invalid-credential')) {
                setError(isLoginMode
                    ? 'Invalid email or password.'
                    : 'Invalid credentials provided for sign up.');
            } else if (message.includes('email-already-in-use')) {
                setError('This email is already registered. Try signing in.');
            } else if (message.includes('weak-password')) {
                setError('Password must be at least 6 characters.');
            } else {
                setError(message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative flex min-h-screen w-full flex-col group/design-root">
            <div className="layout-container flex h-full grow flex-col">
                <header className="flex items-center justify-between whitespace-nowrap border-b border-white/10 px-6 py-4 lg:px-10 z-20 bg-background-light/50 dark:bg-background-dark/50 backdrop-blur-sm fixed w-full top-0">
                    <div className="flex items-center gap-4">
                        <div className="size-6 text-slate-900 dark:text-primary">
                            <span className="material-symbols-outlined text-2xl leading-none">graphic_eq</span>
                        </div>
                        <h2 className="text-slate-900 dark:text-primary text-xl font-bold leading-tight tracking-widest uppercase">savehxpe</h2>
                    </div>
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => setIsLoginMode(!isLoginMode)}
                            className="hidden sm:flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded border border-slate-900 dark:border-primary bg-transparent text-slate-900 dark:text-primary hover:bg-slate-900 hover:text-white dark:hover:bg-primary dark:hover:text-background-dark transition-colors duration-200 h-9 px-4 text-sm font-bold leading-normal tracking-wider"
                        >
                            <span className="truncate uppercase">{isLoginMode ? 'CREATE ACCOUNT' : 'LOGIN'}</span>
                        </button>
                    </div>
                </header>

                <main className="flex flex-1 flex-col relative justify-center items-center px-4 py-24 lg:py-32 w-full max-w-7xl mx-auto z-10 min-h-screen">
                    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 flex items-center justify-center">
                        <div className="w-[300px] h-[300px] md:w-[600px] md:h-[600px] bg-primary/5 rounded-full blur-[100px] absolute animate-pulse-slow"></div>
                        <div className="w-full h-full absolute opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent"></div>
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
                    </div>

                    <div className="relative z-10 w-full max-w-md">
                        <div className="bg-white text-black p-8 sm:p-10 shadow-[0_0_50px_-12px_rgba(255,255,255,0.25)] border border-white/20">
                            <div className="mb-10 text-center">
                                <div className="inline-flex items-center justify-center w-12 h-12 mb-6 border border-black rounded-full">
                                    <span className="material-symbols-outlined text-2xl">fingerprint</span>
                                </div>
                                <h1 className="text-3xl font-black tracking-tighter uppercase mb-2">
                                    {isLoginMode ? 'Enter The Vault' : 'Join The Outworld'}
                                </h1>
                                <p className="font-mono text-xs uppercase tracking-[0.2em] text-gray-500">
                                    {isLoginMode ? 'Awaiting Identity' : 'Step 1: Identification'}
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-8">
                                <div className="space-y-6">
                                    {!isLoginMode && (
                                        <div className="group relative">
                                            <input
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="input-field border-black focus:border-black/50"
                                                placeholder="NAME"
                                                required
                                                type="text"
                                            />
                                        </div>
                                    )}
                                    <div className="group relative">
                                        <input
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="input-field border-black focus:border-black/50"
                                            placeholder="EMAIL"
                                            required
                                            type="email"
                                        />
                                    </div>
                                    <div className="group relative">
                                        <input
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="input-field border-black focus:border-black/50"
                                            placeholder="PASSWORD"
                                            required
                                            type="password"
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <p className="text-red-500 text-xs font-bold tracking-widest text-center mt-4">
                                        {error}
                                    </p>
                                )}

                                <div className="pt-4 space-y-4">
                                    <button
                                        disabled={loading}
                                        className="w-full h-14 bg-black text-white hover:bg-slate-900 transition-colors flex items-center justify-center font-bold tracking-[0.15em] text-lg uppercase group relative overflow-hidden disabled:opacity-50"
                                        type="submit"
                                    >
                                        <span className="relative z-10">{loading ? 'Processing...' : 'Continue'}</span>
                                        <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                    </button>

                                    <div className="relative flex py-2 items-center">
                                        <div className="flex-grow border-t border-black/10"></div>
                                        <span className="flex-shrink-0 mx-4 text-black/40 text-[10px] font-mono uppercase tracking-widest">Authentication</span>
                                        <div className="flex-grow border-t border-black/10"></div>
                                    </div>

                                    <button
                                        className="w-full h-14 border border-black/20 hover:border-black bg-transparent text-black transition-all flex items-center justify-center gap-3 font-bold tracking-wider text-sm uppercase group"
                                        type="button"
                                        onClick={() => setIsLoginMode(!isLoginMode)}
                                    >
                                        {isLoginMode ? 'Need access? Create Account' : 'Existing Citizen? Login Here'}
                                    </button>
                                </div>
                            </form>

                            <div className="mt-8 text-center">
                                <p className="text-[10px] text-gray-500 font-mono">SECURE CONNECTION ESTABLISHED</p>
                            </div>
                        </div>

                        <div className="flex justify-between mt-4 px-2">
                            <span className="text-[10px] font-mono text-white/30 tracking-widest">ID: V1-OUTWORLD</span>
                            <span className="text-[10px] font-mono text-white/30 tracking-widest">STATUS: PENDING</span>
                        </div>
                    </div>
                </main>

                <footer className="relative z-10 flex flex-col gap-6 px-5 py-8 text-center border-t border-white/5 bg-background-light/50 dark:bg-background-dark/80 backdrop-blur-sm">
                    <p className="text-slate-400 dark:text-[#555555] text-xs font-normal leading-normal uppercase tracking-widest">
                        © 2026 sincethe80s, llc/radical publishing. All rights reserved.
                    </p>
                </footer>
            </div>
        </div>
    );
}
