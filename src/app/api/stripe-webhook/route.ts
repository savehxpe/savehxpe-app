import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// ── Stripe Webhook Handler ──
// Processes: customer.subscription.created, .updated, .deleted, invoice.payment_failed
// Updates Firestore user document tier, XP multiplier, and subscription status

export const runtime = 'nodejs';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SubscriptionData = Stripe.Subscription & Record<string, any>;

export async function POST(req: NextRequest) {
    // Lazy imports for server-side only modules
    const { adminDb } = await import('@/lib/firebase-admin');
    const stripe = (await import('@/lib/stripe')).default;
    const { FieldValue, Timestamp } = await import('firebase-admin/firestore');

    const sig = req.headers.get('stripe-signature');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !webhookSecret) {
        return NextResponse.json({ error: 'Missing signature or secret' }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
        const body = await req.text();
        event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('Webhook signature verification failed:', message);
        return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
    }

    const data = event.data.object as SubscriptionData;
    const customerId = typeof data.customer === 'string' ? data.customer : data.customer?.id || '';

    // Locate user by Stripe Customer ID
    const userQuery = await adminDb
        .collection('users')
        .where('stripeCustomerId', '==', customerId)
        .limit(1)
        .get();

    if (userQuery.empty) {
        console.error(`No user found for Stripe customer: ${customerId}`);
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userDoc = userQuery.docs[0];
    const userRef = userDoc.ref;

    try {
        switch (event.type) {
            // ── Subscription Created (Trial Begins) ──
            case 'customer.subscription.created': {
                const sub = data;
                const periodEnd = sub.currentPeriodEnd ?? sub.current_period_end;
                const trialEnd = sub.trialEnd ?? sub.trial_end;

                await userRef.update({
                    'tier.current': 'STANDARD',
                    'tier.previous': userDoc.data().tier?.current || 'FREE',
                    'tier.updatedAt': FieldValue.serverTimestamp(),
                    'subscriptionStatus.id': sub.id,
                    'subscriptionStatus.status': sub.status,
                    'subscriptionStatus.currentPeriodEnd': periodEnd
                        ? Timestamp.fromMillis(periodEnd * 1000)
                        : null,
                    'trialEndsAt': trialEnd
                        ? Timestamp.fromMillis(trialEnd * 1000)
                        : null,
                    'xp.multiplier': 1.5,
                });

                // Grant trial XP bonus (500 XP)
                if (sub.status === 'trialing') {
                    await userRef.update({
                        'xp.total': FieldValue.increment(500),
                        'xp.lastUpdated': FieldValue.serverTimestamp(),
                    });
                }
                break;
            }

            // ── Subscription Updated (Trial converts to active, or mid-cycle update) ──
            case 'customer.subscription.updated': {
                const sub = data;
                const periodEnd = sub.currentPeriodEnd ?? sub.current_period_end;
                const trialEnd = sub.trialEnd ?? sub.trial_end;
                const cancelAtEnd = sub.cancelAtPeriodEnd ?? sub.cancel_at_period_end;

                const updatePayload: Record<string, unknown> = {
                    'subscriptionStatus.status': sub.status,
                    'subscriptionStatus.currentPeriodEnd': periodEnd
                        ? Timestamp.fromMillis(periodEnd * 1000)
                        : null,
                };

                // If trial converted to active, nullify trialEndsAt
                if (sub.status === 'active') {
                    updatePayload['trialEndsAt'] = null;
                } else if (trialEnd) {
                    updatePayload['trialEndsAt'] = Timestamp.fromMillis(trialEnd * 1000);
                }

                // Handle cancel_at_period_end
                if (cancelAtEnd !== undefined) {
                    updatePayload['subscriptionStatus.cancelAtPeriodEnd'] = cancelAtEnd;
                }

                await userRef.update(updatePayload);
                break;
            }

            // ── Subscription Deleted (Canceled + period ended) ──
            case 'customer.subscription.deleted': {
                await userRef.update({
                    'tier.previous': 'STANDARD',
                    'tier.current': 'FREE',
                    'tier.updatedAt': FieldValue.serverTimestamp(),
                    'subscriptionStatus.status': 'canceled',
                    'xp.multiplier': 1.0,
                    'trialEndsAt': null,
                });
                break;
            }

            // ── Invoice Payment Failed ──
            case 'invoice.payment_failed': {
                await userRef.update({
                    'tier.previous': 'STANDARD',
                    'tier.current': 'FREE',
                    'tier.updatedAt': FieldValue.serverTimestamp(),
                    'subscriptionStatus.status': 'past_due',
                    'xp.multiplier': 1.0,
                });
                break;
            }

            // ── Session Completed (Upgrade to Node Commander) ──
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                if (session.mode === 'subscription') {
                    // Re-fetch to guarantee we have the latest tier (in case subscription.created ran concurrently)
                    const latestDocSnap = await userRef.get();
                    const latestTier = latestDocSnap.data()?.tier?.current;

                    if (latestTier === 'STANDARD' || latestTier === 'PREMIUM') {
                        // Grant 1000 CR + Flag for Toast notification
                        await userRef.update({
                            'credits': FieldValue.increment(1000),
                            'ascensionVerifiedToast': true,
                            'unlocked_assets': FieldValue.arrayUnion('VAULT_ACCESS', 'BUNDLE')
                        });

                        // Dispatch Dispatch Email
                        const { sendNodeCommanderEmail } = await import('@/lib/email');
                        const email = session.customer_details?.email || latestDocSnap.data()?.email;
                        if (email) {
                            await sendNodeCommanderEmail(email);
                        }
                    } else {
                        // Fallback in case of race condition: force update tier + trigger
                        await userRef.update({
                            'tier.current': 'STANDARD',
                            'tier.previous': latestDocSnap.data()?.tier?.current || 'FREE',
                            'tier.updatedAt': FieldValue.serverTimestamp(),
                            'credits': FieldValue.increment(1000),
                            'ascensionVerifiedToast': true,
                            'unlocked_assets': FieldValue.arrayUnion('VAULT_ACCESS', 'BUNDLE')
                        });

                        const { sendNodeCommanderEmail } = await import('@/lib/email');
                        const email = session.customer_details?.email || latestDocSnap.data()?.email;
                        if (email) {
                            await sendNodeCommanderEmail(email);
                        }
                    }
                }
                break;
            }

            default:
                // Unhandled event type
                console.log(`Unhandled event type: ${event.type}`);
        }
    } catch (err) {
        console.error('Error processing webhook:', err);
        // Log to dead letter collection for retry
        try {
            await adminDb.collection('stripe_webhooks_deadletter').add({
                eventId: event.id,
                eventType: event.type,
                customerId,
                error: err instanceof Error ? err.message : 'Unknown error',
                timestamp: FieldValue.serverTimestamp(),
                rawData: JSON.stringify(data),
            });
        } catch (dlErr) {
            console.error('Failed to write to dead letter queue:', dlErr);
        }
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }

    return NextResponse.json({ received: true });
}
