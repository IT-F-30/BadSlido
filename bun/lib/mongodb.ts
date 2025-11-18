import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;

if (!uri) {
    throw new Error('MONGODB_URI is not defined. Set it in your environment variables.');
}

let cachedClientPromise: Promise<MongoClient> | undefined;

declare global {
    // eslint-disable-next-line no-var
    var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === 'development') {
    cachedClientPromise = global._mongoClientPromise;
}

if (!cachedClientPromise) {
    const client = new MongoClient(uri);
    cachedClientPromise = client.connect();

    if (process.env.NODE_ENV === 'development') {
        global._mongoClientPromise = cachedClientPromise;
    }
}

export function getMongoClient() {
    return cachedClientPromise as Promise<MongoClient>;
}

export function getDatabaseName() {
    return process.env.MONGODB_DB || 'db_todo';
}
