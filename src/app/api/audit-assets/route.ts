export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { adminStorage } from '@/lib/firebase-admin';

export async function GET() {
    try {
        const bucket = adminStorage.bucket();
        const file = bucket.file('vault/stems/HANDOUT_MASTER.wav');
        const [exists] = await file.exists();

        if (exists) {
            const [metadata] = await file.getMetadata();
            return NextResponse.json({
                status: 'OK',
                message: 'Asset verified on CDN.',
                asset: 'vault/stems/HANDOUT_MASTER.wav',
                metadata: {
                    size: metadata.size,
                    contentType: metadata.contentType,
                    timeCreated: metadata.timeCreated
                }
            });
        } else {
            return NextResponse.json({
                status: 'ERROR',
                message: 'Asset 404. HANDOUT_MASTER.wav not found in bucket.'
            }, { status: 404 });
        }
    } catch (error: unknown) {
        console.error('Audit Error:', error);
        return NextResponse.json({
            status: 'FATAL',
            error: error instanceof Error ? error.message : String(error),
            code: (error as { code?: string })?.code || 'UNKNOWN'
        }, { status: 500 });
    }
}
