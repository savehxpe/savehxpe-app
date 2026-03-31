import { initializeApp, getApps, cert, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

function getAdminApp() {
    if (getApps().length > 0) return getApp();

    // ── PRIORITY 1: Individual Service Account env vars ──
    // This is the recommended approach for Vercel / serverless deployments.
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (projectId && clientEmail && privateKey) {
        return initializeApp({
            credential: cert({
                projectId,
                clientEmail,
                // PEM newlines are stored as literal "\n" in env — restore them
                privateKey: privateKey.replace(/\\n/g, '\n'),
            }),
        });
    }

    // ── PRIORITY 2: Full JSON blob (legacy / local dev) ──
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        return initializeApp({ credential: cert(serviceAccount) });
    }

    // ── HARD FAIL: Do NOT fall through to ADC — it does not exist on Vercel ──
    throw new Error(
        '[firebase-admin] Cannot initialize: missing credentials. ' +
        'Set FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY, or provide FIREBASE_SERVICE_ACCOUNT as JSON.'
    );
}

const adminApp = getAdminApp();
const adminDb = getFirestore(adminApp);
const adminAuth = getAuth(adminApp);
const adminStorage = getStorage(adminApp);

export { adminApp, adminDb, adminAuth, adminStorage };
