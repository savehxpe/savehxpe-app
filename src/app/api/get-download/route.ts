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
            path = 'vault/source/HANDOUT_BUNDLE_V1.zip';
        } else if (item === 'INSTRUMENTAL') {
            path = 'vault/stems/HANDOUT_INSTRUMENTAL.wav';
        } else {
            path = `vault/source/${item}.wav`;
        }

        // Use the public bucket environment variable if running locally or deployed.
        const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
        if (!bucketName) {
            throw new Error("Storage bucket not configured.");
        }

        const file = adminStorage.bucket(bucketName).file(path);

        const [url] = await file.getSignedUrl({
            action: 'read',
            expires: Date.now() + 5 * 60 * 1000, // 5 minutes
            responseDisposition: 'attachment'
        });

        return NextResponse.json({ url });
    } catch (error) {
        console.error('Error generating download link:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
