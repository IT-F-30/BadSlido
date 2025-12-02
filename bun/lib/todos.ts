import type { Todo } from '@/types/todo';
import { getDatabaseName, getMongoClient } from '@/lib/mongodb';
import { ObjectId, type InsertOneResult, type WithId } from 'mongodb';

const COLLECTION = 'todos';

function normalize(doc: WithId<Todo>): Todo {
    const { _id, ...rest } = doc;
    return { ...rest, _id: _id?.toString() };
}

const DEFAULT_TODOS: Pick<Todo, 'word' | 'weight'>[] = [
    { word: 'React', weight: 10 },
    { word: 'Next.js', weight: 8 },
    { word: 'TypeScript', weight: 8 },
    { word: 'MongoDB', weight: 6 },
    { word: 'Docker', weight: 5 },
];

export async function getTodos(): Promise<Todo[]> {
    try {
        const client = await getMongoClient();
        const collection = client.db(getDatabaseName()).collection<Todo>(COLLECTION);
        const docs = await collection.find({}, { sort: { weight: -1 } }).toArray();

        if (docs.length === 0) {
            console.log('No todos found, initializing with default data...');
            await collection.insertMany(DEFAULT_TODOS as any);
            return (await collection.find({}, { sort: { weight: -1 } }).toArray()).map(normalize);
        }

        return docs.map(normalize);
    } catch (error) {
        console.error('Failed to fetch todos:', error);
        return [];
    }
}

export async function createTodo(payload: Pick<Todo, 'word' | 'weight'>): Promise<Todo> {
    try {
        const client = await getMongoClient();
        const collection = client.db(getDatabaseName()).collection<Todo>(COLLECTION);

        const result: InsertOneResult<Todo> = await collection.insertOne({ ...payload });
        return { ...payload, _id: result.insertedId.toString() };
    } catch (error) {
        console.error('Failed to create todo:', error);
        throw error;
    }
}

export async function deleteTodo(id: string): Promise<void> {
    try {
        const client = await getMongoClient();
        const collection = client.db(getDatabaseName()).collection<Todo>(COLLECTION);

        await collection.deleteOne({ _id: new ObjectId(id) as any });
    } catch (error) {
        console.error('Failed to delete todo:', error);
        throw error;
    }
}