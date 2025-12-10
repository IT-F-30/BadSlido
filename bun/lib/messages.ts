import { getDatabaseName, getMongoClient } from '@/lib/mongodb';
import type { WithId } from 'mongodb';

export interface Message {
    _id?: string;
    word: string;
}

const COLLECTION = 'messages';

function normalize(doc: WithId<Message>): Message {
    const { _id, ...rest } = doc;
    return { ...rest, _id: _id?.toString() };
}

export async function getMessages(): Promise<Message[]> {
    try {
        const client = await getMongoClient();
        const collection = client.db(getDatabaseName()).collection<Message>(COLLECTION);
        const docs = await collection.find({}).toArray();

        return docs.map(normalize);
    } catch (error) {
        console.error('Failed to fetch messages:', error);
        return [];
    }
}
