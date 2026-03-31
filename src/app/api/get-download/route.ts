import { NextResponse } from 'next/server';
import { adminAuth, adminStorage } from '@/lib/firebase-admin';

export async function POST(req: Request) {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.split('Bearer ')[1];
        await adminAuth.verifyIdToken(token);

        const { item } = await req.json();

        if (!item) {
            return NextResponse.json({ error: 'Item parameter required' }, { status: 400 });
        }

        // Map item to file path
        let path = '';
        if (item === 'BUNDLE') {
            path = 'stems/handout/HANDOUT_BUNDLE_V1.zip';
        } else if (item === 'INSTRUMENTAL') {
            path = 'stems/handout/HANDOUT_INSTRUMENTAL_MASTER.wav';
        } else if (item === 'DRUMS') {
            path = 'stems/handout/drums_24bit.wav';
        } else if (item === 'BASS') {
            path = 'stems/handout/bass_24bit.wav';
        } else if (item === 'SYNTHS') {
            path = 'stems/handout/synths_24bit.wav';
        } else {
            path = `stems/handout/${item.toLowerCase()}_24bit.wav`;
        }

        // Use the public bucket environment variable if running locally or deployed.
        const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
        if (!bucketName) {
            throw new Error("Storage bucket not configured.");
        }

        const file = adminStorage.bucket(bucketName).file(path);

        // Ensure file exists
        const [exists] = await file.exists();
        if (!exists) {
            console.error(`[STORAGE ERROR] File not found at path: ${path} in bucket: ${bucketName}`);
            return NextResponse.json({ error: 'File not found in storage vault' }, { status: 404 });
        }

        const [url] = await file.getSignedUrl({
            action: 'read',
            expires: Date.now() + 5 * 60 * 1000, // 5 minutes
            responseDisposition: `attachment; filename="${item}.wav"`
        });

        return NextResponse.json({ url });
    } catch (error: unknown) {
        console.error('🔥 [CRITICAL SERVER ERROR] Vault Download Handler Crashed:', error);
        console.error('Error Stack:', error instanceof Error ? error.stack : undefined);
        console.error('Error Code:', (error as { code?: string })?.code);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
