import type { Todo } from '@/types/todo';
import { getDatabaseName, getMongoClient } from '@/lib/mongodb';
import type { InsertOneResult, WithId } from 'mongodb';

const COLLECTION = 'todos';

function normalize(doc: WithId<Todo>): Todo {
    const { _id, ...rest } = doc;
    return { ...rest, _id: _id?.toString() };
}

export async function getTodos(): Promise<Todo[]> {
    const client = await getMongoClient();
    const collection = client.db(getDatabaseName()).collection<Todo>(COLLECTION);
    const docs = await collection.find({}, { sort: { weight: -1 } }).toArray();
    return docs.map(normalize);
}

export async function createTodo(payload: Pick<Todo, 'word' | 'weight'>): Promise<Todo> {
    const client = await getMongoClient();
    const collection = client.db(getDatabaseName()).collection<Todo>(COLLECTION);

    const result: InsertOneResult<Todo> = await collection.insertOne({ ...payload });
    return { ...payload, _id: result.insertedId.toString() };
}
