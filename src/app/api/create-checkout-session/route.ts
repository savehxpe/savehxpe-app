import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    const { adminDb } = await import('@/lib/firebase-admin');
    const stripe = (await import('@/lib/stripe')).default;

    try {
        const { priceId, uid } = await req.json();

        if (!priceId || !uid) {
            return NextResponse.json({ error: 'Missing priceId or uid' }, { status: 400 });
        }

        // Retrieve the user's Stripe Customer ID from Firestore
        const userDoc = await adminDb.collection('users').doc(uid).get();

        if (!userDoc.exists) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const userData = userDoc.data();
        const stripeCustomerId = userData?.stripeCustomerId;

        if (!stripeCustomerId) {
            return NextResponse.json({ error: 'No Stripe customer ID found' }, { status: 400 });
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        // Create Stripe Checkout Session with 7-day trial
        const session = await stripe.checkout.sessions.create({
            customer: stripeCustomerId,
            payment_method_types: ['card'],
            mode: 'subscription',
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            subscription_data: {
                trial_period_days: 7,
            },
            success_url: `${appUrl}/dashboard?upgrade=success`,
            cancel_url: `${appUrl}/dashboard`,
        });

        return NextResponse.json({ url: session.url });
    } catch (err: unknown) {
        console.error('Checkout session creation error:', err);
        const message = err instanceof Error ? err.message : 'Failed to create checkout session';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
