import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
        const stripeKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeKey) {
            throw new Error('STRIPE_SECRET_KEY is undefined in environment');
        }

        const stripe = new Stripe(stripeKey, {
            apiVersion: '2026-02-25.clover', // Match current type version
            typescript: true,
        });

        const bodyText = await req.text();
        if (!bodyText) {
            throw new Error('Empty request body');
        }

        const body = JSON.parse(bodyText);
        const { tier, frequency, uid } = body;

        if (!tier || !frequency || !uid) {
            throw new Error('Missing tier, frequency, or uid');
        }

        // Determine Price ID based on tier and frequency
        let priceId = '';
        if (tier === 'standard' && frequency === 'monthly') priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_STANDARD_MONTHLY || 'price_standard_monthly';
        if (tier === 'standard' && frequency === 'yearly') priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_STANDARD_YEARLY || 'price_standard_yearly';
        if (tier === 'premium' && frequency === 'monthly') priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_MONTHLY || 'price_premium_monthly';
        if (tier === 'premium' && frequency === 'yearly') priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_YEARLY || 'price_premium_yearly';

        // Retrieve or create Stripe Customer ID
        const userDocRef = adminDb.collection('users').doc(uid);
        const userDoc = await userDocRef.get();
        let stripeCustomerId = userDoc.exists ? userDoc.data()?.stripeCustomerId : null;

        if (!stripeCustomerId) {
            // Optional: get user email from auth
            const { getAuth } = await import('firebase-admin/auth');
            let email = undefined;
            try {
                const userRecord = await getAuth().getUser(uid);
                email = userRecord.email;
            } catch (e) {
                // Ignore if we can't fetch auth
            }

            const customer = await stripe.customers.create({
                metadata: { firebaseUID: uid },
                ...(email ? { email } : {}),
            });
            stripeCustomerId = customer.id;

            // Save it back to firestore
            await userDocRef.set({ stripeCustomerId }, { merge: true });
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        // Create Checkout Session
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
            success_url: `${appUrl}/dashboard?upgrade=success`,
            cancel_url: `${appUrl}/ascension`,
        });

        // Must return a valid JSON object with sessionId according to the instructions
        return NextResponse.json({ sessionId: session.id, url: session.url });

    } catch (err: any) {
        console.error('Checkout session creation error:', err);
        return NextResponse.json({ error: err.message || 'Unknown server error' }, { status: 500 });
    }
}
