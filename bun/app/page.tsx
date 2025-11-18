import TodosClient from '@/components/TodosClient';
import { getTodos } from '@/lib/todos';

export default async function Home() {
    const todos = await getTodos();

    return (
        <main>
            <div>
                <p>MongoDBからのデータをSSRで初期描画しています。</p>
                <h1>Word Cloud Dashboard</h1>
            </div>
            <TodosClient initialTodos={todos} />
        </main>
    );
}
