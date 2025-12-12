'use client';

import { useMemo, useState, useTransition, useEffect, type ChangeEvent, type FormEvent } from 'react';
import WordCloudCanvas from '@/components/WordCloudCanvas';
import type { Todo } from '@/types/todo';
import type { Message } from '@/lib/messages';

interface TodosClientProps {
    initialTodos: Todo[];
}

export default function TodosClient({ initialTodos }: TodosClientProps) {
    const [todos, setTodos] = useState<Todo[]>(initialTodos);
    const [messages, setMessages] = useState<Message[]>([]);
    const [word, setWord] = useState('');
    const [weight, setWeight] = useState('');
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState('');

    useEffect(() => {
        const eventSource = new EventSource('/api/sse');

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'update') {
                    fetchTodos();
                    fetchMessages();
                }
            } catch (error) {
                console.error('SSE parse error', error);
            }
        };

        // Handle errors (optional, browser auto-retries usually)
        eventSource.onerror = (err) => {
            console.error('SSE connection error', err);
            // We don't close it explicitly to allow auto-reconnect
        };

        return () => {
            eventSource.close();
        };
    }, []);

    useEffect(() => {
        fetchMessages();
    }, []);

    const fetchTodos = async () => {
        try {
            const response = await fetch('/api/todos');
            if (response.ok) {
                const newTodos = await response.json();
                setTodos(newTodos);
            }
        } catch (error) {
            console.error('Failed to fetch todos', error);
        }
    };

    const fetchMessages = async () => {
        try {
            const response = await fetch('/api/messages');
            if (response.ok) {
                const newMessages = await response.json();
                setMessages(newMessages);
            }
        } catch (error) {
            console.error('Failed to fetch messages', error);
        }
    };

    const sortedTodos = useMemo(
        () => [...todos].sort((a, b) => b.weight - a.weight),
        [todos]
    );

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError('');

        if (!word.trim()) {
            setError('単語を入力してください。');
            return;
        }

        startTransition(async () => {
            try {
                const response = await fetch('/api/todos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ word: word.trim() }),
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || '保存に失敗しました');
                }

                const newTodo: Todo = await response.json();
                setTodos((prev) => [...prev, newTodo]);

                // 全 messages を取得してコンソールに表示 -> State更新に変更
                await fetchMessages();
                const messagesResponse = await fetch('/api/messages');
                if (messagesResponse.ok) {
                    const messages = await messagesResponse.json();
                    const messageList = messages
                        .map((m: { _id: string; word: string }) => `${m._id}:${m.word}`)
                        .join('\n');
                    console.log(`[message]\n${messageList}`);
                }
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
                <WordCloudCanvas todos={messages} />
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
                    {error ? <p className="error-text">{error}</p> : null}
                    <button type="submit" disabled={isPending}>
                        {isPending ? '保存中…' : '追加する'}
                    </button>
                </form>
            </div>
        </section>
    );
}
