import TodosClient from '@/components/TodosClient';
import { getTodos } from '@/lib/todos';

export default async function Home() {
    const todos = await getTodos();

    return (
        <main>
            <div>
                <h1>BadSlido</h1>
            </div>
            <TodosClient initialTodos={todos} />
        </main>
    );
}
