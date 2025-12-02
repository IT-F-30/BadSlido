'use client';

import { useState, type FormEvent, type ChangeEvent } from 'react';

interface PollCreatorProps {
    onPollCreated: () => void;
}

export default function PollCreator({ onPollCreated }: PollCreatorProps) {
    const [question, setQuestion] = useState('');
    const [options, setOptions] = useState<string[]>(['', '']);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleAddOption = () => {
        if (options.length < 10) {
            setOptions([...options, '']);
        }
    };

    const handleRemoveOption = (index: number) => {
        if (options.length > 2) {
            setOptions(options.filter((_, i) => i !== index));
        }
    };

    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');

        const validOptions = options.filter(opt => opt.trim() !== '');
        if (!question.trim() || validOptions.length < 2) {
            setError('質問と少なくとも2つの選択肢を入力してください');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch('/api/polls', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: question.trim(),
                    options: validOptions
                })
            });

            if (!response.ok) {
                throw new Error('アンケートの作成に失敗しました');
            }

            setQuestion('');
            setOptions(['', '']);
            onPollCreated();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'エラーが発生しました');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="poll-creator-card">
            <h2>📊 新しいアンケートを作成</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="question">質問</label>
                    <input
                        id="question"
                        type="text"
                        value={question}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setQuestion(e.target.value)}
                        placeholder="例: お気に入りのプログラミング言語は？"
                        className="poll-input"
                    />
                </div>

                <div className="form-group">
                    <label>選択肢</label>
                    {options.map((option, index) => (
                        <div key={index} className="option-input-row">
                            <input
                                type="text"
                                value={option}
                                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                    handleOptionChange(index, e.target.value)
                                }
                                placeholder={`選択肢 ${index + 1}`}
                                className="poll-input"
                            />
                            {options.length > 2 && (
                                <button
                                    type="button"
                                    onClick={() => handleRemoveOption(index)}
                                    className="remove-option-btn"
                                    aria-label="削除"
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                {options.length < 10 && (
                    <button
                        type="button"
                        onClick={handleAddOption}
                        className="add-option-btn"
                    >
                        + 選択肢を追加
                    </button>
                )}

                {error && <p className="error-message">{error}</p>}

                <button
                    type="submit"
                    className="submit-poll-btn"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? '作成中...' : 'アンケートを作成'}
                </button>
            </form>
        </div>
    );
}
