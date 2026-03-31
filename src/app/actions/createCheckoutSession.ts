'use server';

import stripe from '@/lib/stripe';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function createCheckoutSession(priceId: string, idToken: string) {
    try {
        if (!idToken) {
            throw new Error('No authentication token provided');
        }

        // 1. Verify user is authenticated via Firebase Auth
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const uid = decodedToken.uid;

        if (!uid) {
            throw new Error('Invalid authentication token');
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.savehxpe.com';

        let stripeCustomerId = undefined;
        try {
            const userDoc = await adminDb.collection('users').doc(uid).get();
            if (userDoc.exists) {
                stripeCustomerId = userDoc.data()?.stripeCustomerId;
            }
        } catch (e) {
            console.log('Error fetching user doc:', e);
        }

        // 2. The Session Payload
        const sessionPayload: any = {
            payment_method_types: ['card'],
            mode: 'subscription',
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            // CRUCIAL STEP: Pass Firebase UID into client_reference_id for Webhook processing
            client_reference_id: uid,
            success_url: `${appUrl}/dashboard?payment=success`,
            cancel_url: `${appUrl}/no-handouts`,
        };

        // If we already have a customer ID, attach it
        if (stripeCustomerId) {
            sessionPayload.customer = stripeCustomerId;
        } else {
            sessionPayload.customer_email = decodedToken.email;
        }

        // Generate the checkout URL
        const session = await stripe.checkout.sessions.create(sessionPayload);

        return { url: session.url };
    } catch (error: any) {
        console.error('[STRIPE CHECKOUT ERROR]:', error);
        return { error: error.message || 'Failed to generate checkout session' };
    }
}
