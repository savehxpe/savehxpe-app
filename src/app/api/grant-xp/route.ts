import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// ── XP Action Matrix (server-side validation) ──
const XP_ACTIONS: Record<string, { base: number; cooldownMs?: number }> = {
    account_creation: { base: 500 },
    daily_login: { base: 50, cooldownMs: 24 * 60 * 60 * 1000 },       // 24 hours
    listen_track: { base: 20, cooldownMs: 30 * 1000 },                 // 30s between tracks
    share_link: { base: 100, cooldownMs: 60 * 1000 },                  // 1 min cooldown
    refer_friend: { base: 1000 },
    vault_challenge: { base: 300 },
    submit_ugc: { base: 500 },
    poll_response: { base: 150 },
    streak_7day: { base: 1000 },
};

export async function POST(req: NextRequest) {
    const { adminDb } = await import('@/lib/firebase-admin');
    const { FieldValue } = await import('firebase-admin/firestore');

    try {
        const { uid, action } = await req.json();

        if (!uid || !action) {
            return NextResponse.json({ error: 'Missing uid or action' }, { status: 400 });
        }

        const actionConfig = XP_ACTIONS[action];
        if (!actionConfig) {
            return NextResponse.json({ error: 'Invalid action type' }, { status: 400 });
        }

        const userRef = adminDb.collection('users').doc(uid);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const userData = userDoc.data()!;
        const multiplier = userData.xp?.multiplier || 1.0;

        // ── Cooldown Check ──
        if (actionConfig.cooldownMs) {
            const lastUpdated = userData.xp?.lastUpdated;
            if (lastUpdated) {
                const lastMs = lastUpdated._seconds
                    ? lastUpdated._seconds * 1000
                    : lastUpdated.toMillis?.() || 0;
                const elapsed = Date.now() - lastMs;

                if (elapsed < actionConfig.cooldownMs) {
                    return NextResponse.json({
                        error: 'Action on cooldown',
                        remainingMs: actionConfig.cooldownMs - elapsed,
                    }, { status: 429 });
                }
            }
        }

        // ── Calculate and Apply XP ──
        const xpGrant = Math.round(actionConfig.base * multiplier);

        await userRef.update({
            'xp.total': FieldValue.increment(xpGrant),
            'xp.lastUpdated': FieldValue.serverTimestamp(),
        });

        // ── Special: Daily Login also updates lastLogin ──
        if (action === 'daily_login') {
            await userRef.update({
                'lastLogin': FieldValue.serverTimestamp(),
            });
        }

        // ── Special: Referral also increments engagement score ──
        if (action === 'refer_friend') {
            await userRef.update({
                'engagementScore': FieldValue.increment(10),
            });
        }

        return NextResponse.json({
            success: true,
            xpGranted: xpGrant,
            action,
            multiplier,
        });
    } catch (err: unknown) {
        console.error('XP grant error:', err);
        const message = err instanceof Error ? err.message : 'Failed to grant XP';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
