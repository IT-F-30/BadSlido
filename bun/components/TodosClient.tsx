'use client';

import { useMemo, useState, useTransition, type ChangeEvent, type FormEvent } from 'react';
import WordCloudCanvas from '@/components/WordCloudCanvas';
import type { Todo } from '@/types/todo';

interface TodosClientProps {
    initialTodos: Todo[];
}

export default function TodosClient({ initialTodos }: TodosClientProps) {
    const [todos, setTodos] = useState<Todo[]>(initialTodos);
    const [word, setWord] = useState('');
    const [weight, setWeight] = useState('');
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState('');

    const sortedTodos = useMemo(
        () => [...todos].sort((a, b) => b.weight - a.weight),
        [todos]
    );

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError('');

        const numericWeight = Number(weight);
        if (!word.trim() || !Number.isFinite(numericWeight)) {
            setError('単語と数値のweightを入力してください。');
            return;
        }

        startTransition(async () => {
            try {
                const response = await fetch('/api/todos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ word: word.trim(), weight: numericWeight }),
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || '保存に失敗しました');
                }

                const newTodo: Todo = await response.json();
                setTodos((prev) => [...prev, newTodo]);
                setWord('');
                setWeight('');
            } catch (submitError) {
                console.error('Failed to submit todo', submitError);
                setError(submitError instanceof Error ? submitError.message : '不明なエラーです');
            }
        });
    };

    return (
        <section className="dashboard-grid">
            <div className="word-cloud-shell">
                <WordCloudCanvas todos={sortedTodos} />
            </div>

            <div className="form-card">
                <h2>新しい単語を追加</h2>
                <form onSubmit={handleSubmit}>
                    <label>
                        単語
                        <input
                            type="text"
                            value={word}
                            onChange={(event: ChangeEvent<HTMLInputElement>) => setWord(event.target.value)}
                            placeholder="例: Network"
                            required
                        />
                    </label>
                    <label>
                        Weight（数値）
                        <input
                            type="number"
                            value={weight}
                            onChange={(event: ChangeEvent<HTMLInputElement>) => setWeight(event.target.value)}
                            placeholder="例: 42"
                            required
                        />
                    </label>
                    {error ? <p className="error-text">{error}</p> : null}
                    <button type="submit" disabled={isPending}>
                        {isPending ? '保存中…' : '追加する'}
                    </button>
                </form>
            </div>
        </section>
    );
}
