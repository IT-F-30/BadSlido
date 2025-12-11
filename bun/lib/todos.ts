import type { Todo } from '@/types/todo';
import { getDatabaseName, getMongoClient } from '@/lib/mongodb';
import { ObjectId, type InsertOneResult, type WithId } from 'mongodb';

const COLLECTION = 'todos';

function normalize(doc: WithId<Todo>): Todo {
    const { _id, ...rest } = doc;
    return { ...rest, _id: _id?.toString() };
}

export async function getTodos(): Promise<Todo[]> {
    try {
        const client = await getMongoClient();
        const collection = client.db(getDatabaseName()).collection<Todo>(COLLECTION);
        const docs = await collection.find({}, { sort: { weight: -1 } }).toArray();

        return docs.map(normalize);
    } catch (error) {
        console.error('Failed to fetch todos:', error);
        return [];
    }
}

export async function createTodo(payload: Pick<Todo, 'word' | 'weight'>): Promise<Todo> {
    try {
        const client = await getMongoClient();
        const db = client.db(getDatabaseName());
        const todosCollection = db.collection<Todo>(COLLECTION);
        const messagesCollection = db.collection('messages');

        const result: InsertOneResult<Todo> = await todosCollection.insertOne({ ...payload });

        // messages コレクションには word (string) のみを追加（weight は含めない）
        await messagesCollection.insertOne({ word: payload.word });
        console.log(`[messages] Added word: "${payload.word}"`);

        return { ...payload, _id: result.insertedId.toString() };
    } catch (error) {
        console.error('Failed to create todo:', error);
        throw error;
    }
}