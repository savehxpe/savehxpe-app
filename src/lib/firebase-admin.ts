import { initializeApp, getApps, cert, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

function getAdminApp() {
    if (getApps().length > 0) return getApp();

    // In production, use GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
        ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
        : undefined;

    return initializeApp(
        serviceAccount
            ? { credential: cert(serviceAccount) }
            : { projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID }
    );
}

const adminApp = getAdminApp();
const adminDb = getFirestore(adminApp);
const adminAuth = getAuth(adminApp);

export { adminApp, adminDb, adminAuth };
