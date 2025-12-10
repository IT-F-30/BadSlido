import { NextResponse } from 'next/server';
import { getMessages } from '@/lib/messages';

export async function GET() {
    try {
        const messages = await getMessages();
        return NextResponse.json(messages);
    } catch (error) {
        console.error('GET /api/messages error', error);
        return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }
}
