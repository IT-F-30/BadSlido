import { MongoClient } from 'mongodb';

// Simple HTTP server using Bun
const server = Bun.serve({
    port: 3000,
    async fetch(req) {
        const url = new URL(req.url);
        let filePath = url.pathname;

        // API endpoint for MongoDB todos
        if (filePath === '/api/todos') {
            try {
                const mongoUrl = 'mongodb://root:password@db:27017';
                const client = new MongoClient(mongoUrl);
                await client.connect();

                const database = client.db('db_todo');
                const collection = database.collection('todos');

                // Handle GET request - fetch all todos
                if (req.method === 'GET') {
                    const todos = await collection.find({}).toArray();
                    await client.close();

                    return new Response(JSON.stringify(todos), {
                        headers: { 'Content-Type': 'application/json' }
                    });
                }

                // Handle POST request - add new todo
                if (req.method === 'POST') {
                    const body = await req.json();
                    const { word, weight } = body;

                    if (!word || weight === undefined) {
                        await client.close();
                        return new Response(JSON.stringify({ error: 'word and weight are required' }), {
                            status: 400,
                            headers: { 'Content-Type': 'application/json' }
                        });
                    }

                    const newTodo = { word, weight: Number(weight) };
                    const result = await collection.insertOne(newTodo);

                    await client.close();

                    return new Response(JSON.stringify({ ...newTodo, _id: result.insertedId }), {
                        status: 201,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }

                await client.close();
                return new Response(JSON.stringify({ error: 'Method not allowed' }), {
                    status: 405,
                    headers: { 'Content-Type': 'application/json' }
                });

            } catch (error) {
                console.error('MongoDB接続エラー:', error);
                return new Response(JSON.stringify({ error: 'Database error' }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }

        // Serve index.html for root path
        if (filePath === '/') {
            filePath = '/index.html';
        }

        try {
            const file = Bun.file(`.${filePath}`);

            // Check if file exists
            if (await file.exists()) {
                return new Response(file);
            }

            return new Response('404 Not Found', { status: 404 });
        } catch (error) {
            return new Response('500 Internal Server Error', { status: 500 });
        }
    },
});

console.log(`🚀 Server running at http://localhost:${server.port}`);
console.log(`\n✨ Open http://localhost:${server.port} in your browser`);
