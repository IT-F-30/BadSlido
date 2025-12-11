import { NextResponse } from 'next/server';
import { getMongoClient, getDatabaseName } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function GET() {
    const client = await getMongoClient();
    const db = client.db(getDatabaseName());
    const collection = db.collection('correlations');

    let changeStream: any;

    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();

            // Send a comment to keep the connection open and confirm it's working
            controller.enqueue(encoder.encode(': connected\n\n'));

            try {
                changeStream = collection.watch();

                for await (const change of changeStream) {
                    // Check if the stream is still open
                    if (controller.desiredSize === null) {
                        break;
                    }

                    // Send the update event
                    const data = JSON.stringify({ type: 'update' });
                    controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                }
            } catch (error) {
                console.error('SSE Stream Error:', error);
            }
        },
        async cancel() {
            if (changeStream) {
                await changeStream.close();
            }
        }
    });

    return new NextResponse(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}
