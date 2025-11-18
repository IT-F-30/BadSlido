'use client';

import { useEffect, useState } from 'react';
import cloud from 'd3-cloud';
import type { Todo } from '@/types/todo';

interface Word extends d3.layout.cloud.Word {
    _id?: string;
    color?: string;
}

const COLORS = ['#00bcd4', '#26c6da', '#4dd0e1', '#80deea', '#b2ebf2', '#18ffff'];
const VIEWBOX_WIDTH = 900;
const VIEWBOX_HEIGHT = 600;

function mapFontSizes(todos: Todo[]) {
    if (!todos.length) {
        return () => 16;
    }

    const weights = todos.map((todo) => todo.weight);
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    const spread = max - min || 1;

    return (weight: number) => 12 + ((weight - min) / spread) * 72;
}

function hashWord(word: string) {
    let hash = 0;
    for (let i = 0; i < word.length; i += 1) {
        hash = (hash << 5) - hash + word.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
}

export default function WordCloudCanvas({ todos }: { todos: Todo[] }) {
    const [positionedWords, setPositionedWords] = useState<Word[]>([]);

    useEffect(() => {
        if (!todos.length) {
            setPositionedWords([]);
            return;
        }

        const fontForWeight = mapFontSizes(todos);

        const layout = cloud<Word>()
            .size([VIEWBOX_WIDTH, VIEWBOX_HEIGHT])
            .words(
                todos.map((todo) => {
                    const hash = hashWord(`${todo.word}-${todo.weight}`);
                    return {
                        ...todo,
                        text: todo.word,
                        size: fontForWeight(todo.weight),
                        color: todo.color || COLORS[hash % COLORS.length],
                    };
                })
            )
            .padding(5)
            .rotate(() => (Math.random() > 0.7 ? -90 : 0))
            .font('Montserrat, sans-serif')
            .fontSize((d) => d.size!)
            .on('end', (words) => {
                setPositionedWords(words);
            });

        layout.start();
    }, [todos]);

    if (!todos.length) {
        return (
            <div style={{ width: '100vw', height: '100vh', display: 'grid', placeItems: 'center' }}>
                <p style={{ color: '#999' }}>データがありません</p>
            </div>
        );
    }

    return (
        <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
            role="img"
            aria-label="Word cloud visualization"
        >
            <g transform={`translate(${VIEWBOX_WIDTH / 2},${VIEWBOX_HEIGHT / 2})`}>
                {positionedWords.map((word) => (
                    <text
                        key={`${word.text}-${word._id ?? word.size}`}
                        fill={word.color}
                        fontSize={word.size}
                        fontFamily={word.font}
                        textAnchor="middle"
                        transform={`translate(${word.x}, ${word.y}) rotate(${word.rotate})`}
                    >
                        {word.text}
                    </text>
                ))}
            </g>
        </svg>
    );
}
