import { MongoClient, MongoClientOptions } from 'mongodb';

const uri = process.env.MONGODB_URI || "mongodb://root:password@db:27017/db_todo?authSource=admin";
const options: MongoClientOptions = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
    // eslint-disable-next-line no-var
    var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (!process.env.MONGODB_URI) {
    console.warn('MONGODB_URI is not defined in environment variables. Using default fallback.');
}

const connectWithRetry = async (retries = 5, delay = 2000): Promise<MongoClient> => {
    try {
        client = new MongoClient(uri, options);
        const connectedClient = await client.connect();
        console.log('Successfully connected to MongoDB');
        return connectedClient;
    } catch (err) {
        if (retries === 0) {
            console.error('Failed to connect to MongoDB after multiple attempts:', err);
            throw err;
        }
        console.warn(`MongoDB connection failed. Retrying in ${delay}ms... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return connectWithRetry(retries - 1, delay * 1.5);
    }
};

if (process.env.NODE_ENV === 'development') {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    if (!global._mongoClientPromise) {
        global._mongoClientPromise = connectWithRetry();
    }
    clientPromise = global._mongoClientPromise;
} else {
    // In production mode, it's best to not use a global variable.
    clientPromise = connectWithRetry();
}

export function getMongoClient() {
    return clientPromise;
}

export function getDatabaseName() {
    return process.env.MONGODB_DB || 'db_todo';
}
