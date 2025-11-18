'use client';

import { useMemo } from 'react';
import type { Todo } from '@/types/todo';

interface PositionedWord extends Todo {
    x: number;
    y: number;
    fontSize: number;
    rotate: number;
    color: string;
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
    const positioned = useMemo<PositionedWord[]>(() => {
        const fontForWeight = mapFontSizes(todos);
        const goldenAngle = Math.PI * (3 - Math.sqrt(5));
        const centerX = VIEWBOX_WIDTH / 2;
        const centerY = VIEWBOX_HEIGHT / 2;

        return todos.map((todo, index) => {
            const angle = index * goldenAngle;
            const radius = 12 * Math.sqrt(index + 1);
            const hash = hashWord(`${todo.word}-${index}`);
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            return {
                ...todo,
                x,
                y,
                fontSize: fontForWeight(todo.weight),
                rotate: hash % 4 === 0 ? -90 : 0,
                color: todo.color || COLORS[hash % COLORS.length],
            };
        });
    }, [todos]);

    if (!positioned.length) {
        return (
            <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center' }}>
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
            {positioned.map((word) => (
                <text
                    key={`${word.word}-${word._id ?? word.weight}`}
                    x={word.x}
                    y={word.y}
                    fill={word.color}
                    fontSize={word.fontSize}
                    fontFamily="Montserrat, sans-serif"
                    textAnchor="middle"
                    transform={`rotate(${word.rotate}, ${word.x}, ${word.y})`}
                >
                    {word.word}
                </text>
            ))}
        </svg>
    );
}
