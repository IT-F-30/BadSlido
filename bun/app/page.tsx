import TodosClient from '@/components/TodosClient';
import { getTodos } from '@/lib/todos';
import { deleteTodo } from '@/lib/todos';

export default async function Home() {
    const todos = await getTodos();

    await deleteTodo("692e59ad731067cd36c0dc17");

    return (
        <main>
            <div>
                <h1>BadSlido</h1>
            </div>
            <TodosClient initialTodos={todos} />
        </main>
    );
}
