import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase-admin';
import stripe from '@/lib/stripe';

// Required for parsing the raw body to verify Stripe signatures correctly
export const runtime = 'nodejs';

// ── Hardcoded Subscription Tiers ──
const PREMIUM_PRICE_ID = 'price_1T85GFJz7Jx6TKcu4FISKYdh';
const STANDARD_PRICE_ID = 'price_1T85FTJz7Jx6TKcuPgihv3KV';

export async function POST(req: NextRequest) {
    const bodyText = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
        console.warn('[WEBHOOK SECURITY] Missing stripe-signature header.');
        return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
        console.error('[WEBHOOK ALARM] Missing STRIPE_WEBHOOK_SECRET environment variable.');
        return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(bodyText, signature, webhookSecret);
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown signature verification error';
        console.error(`[WEBHOOK HACK ATTEMPT] Signature verification failed: ${msg}`);
        return NextResponse.json({ error: `Webhook Error: ${msg}` }, { status: 400 });
    }

    // Helper function to locate the user in Firestore via Stripe Customer ID or Email
    const updateUserByCustomer = async (customerId: string, email: string | null, updateData: any) => {
        try {
            let userDocId: string | null = null;

            // 1. Prioritize matching by stripeCustomerId
            const customerQuery = await adminDb.collection('users').where('stripeCustomerId', '==', customerId).limit(1).get();

            if (!customerQuery.empty) {
                userDocId = customerQuery.docs[0].id;
            } else if (email) {
                // 2. Fallback to matching by email if customer ID isn't linked yet
                console.log(`[WEBHOOK] User not found by Stripe Customer ID ${customerId}, falling back to email ${email}`);
                const emailQuery = await adminDb.collection('users').where('email', '==', email).limit(1).get();
                if (!emailQuery.empty) {
                    userDocId = emailQuery.docs[0].id;
                }
            }

            if (userDocId) {
                await adminDb.collection('users').doc(userDocId).update(updateData);
                console.log(`[WEBHOOK SUCCESS] Firestore updated for [${userDocId}] | Data:`, updateData);
            } else {
                console.error(`[WEBHOOK ORPHAN] No user found for customerId: ${customerId} / email: ${email}`);
            }
        } catch (error) {
            console.error(`[WEBHOOK FIRESTORE ERROR] DB Update failed:`, error);
        }
    };

    console.log(`[WEBHOOK RECEIVED] Processing Event: ${event.type}`);

    try {
        switch (event.type) {

            // ── Event: NEW SUBSCRIPTION ──
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;

                // Retrieve the session with line_items expanded to read the purchased Price ID
                const expandedSession = await stripe.checkout.sessions.retrieve(session.id, {
                    expand: ['line_items']
                });

                const lineItems = expandedSession.line_items?.data || [];

                let tier: 'Premium' | 'Standard' | 'None' = 'None';

                // Scan line items for our hardcoded Subscription Tiers
                for (const item of lineItems) {
                    const priceId = item.price?.id;
                    if (priceId === PREMIUM_PRICE_ID) {
                        tier = 'Premium';
                        break;
                    } else if (priceId === STANDARD_PRICE_ID) {
                        tier = 'Standard';
                        break;
                    }
                }

                if (tier === 'None') {
                    console.log(`[WEBHOOK WARNING] Session ${session.id} completed, but no recognized Subscription Tier matched.`);
                }

                const customerId = session.customer as string;
                const email = session.customer_details?.email || session.customer_email || null;

                const updateData = {
                    subscriptionStatus: 'active',
                    tier,
                    ...(customerId && { stripeCustomerId: customerId })
                };

                await updateUserByCustomer(customerId, email, updateData);
                break;
            }

            // ── Event: SUBSCRIPTION RENEWAL ──
            case 'invoice.payment_succeeded': {
                const invoice = event.data.object as Stripe.Invoice & { subscription?: any };

                // Only process if the invoice belongs to a subscription (ignores one-off payments)
                if (invoice.subscription) {
                    const customerId = invoice.customer as string;
                    const email = invoice.customer_email || null;

                    await updateUserByCustomer(customerId, email, {
                        subscriptionStatus: 'active'
                    });
                }
                break;
            }

            // ── Event: SUBSCRIPTION FAILED / PAYMENT FATAL ──
            case 'invoice.payment_failed': {
                const invoice = event.data.object as Stripe.Invoice & { subscription?: any };

                // Instant lockout for the gated Vault content
                if (invoice.subscription) {
                    const customerId = invoice.customer as string;
                    const email = invoice.customer_email || null;

                    await updateUserByCustomer(customerId, email, {
                        subscriptionStatus: 'inactive',
                        tier: 'None'
                    });
                }
                break;
            }

            // ── Event: SUBSCRIPTION DELETED (CANCELED/EXPIRED) ──
            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                const customerId = subscription.customer as string;

                // Instant lockout for the gated Vault content
                await updateUserByCustomer(customerId, null, {
                    subscriptionStatus: 'inactive',
                    tier: 'None'
                });
                break;
            }

            default:
                console.log(`[WEBHOOK IGNORED] Unhandled Event: ${event.type}`);
        }

        return NextResponse.json({ received: true }, { status: 200 });

    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown processing error';
        console.error(`[WEBHOOK CRITICAL] Processing crashed: ${msg}`);
        return NextResponse.json({ error: 'Internal Server Error', details: msg }, { status: 500 });
    }
}
