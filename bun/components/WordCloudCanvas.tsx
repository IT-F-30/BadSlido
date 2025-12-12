'use client';

import { useEffect, useState, useRef } from 'react';
import type { Message } from '@/lib/messages';

const WORD_CLOUD_CONFIG = {
    fontOffset: 10,
    fontFamily: 'Montserrat, sans-serif',
    verticalEnabled: true,
    padding_left: 4, // Restored padding to prevent overlaps
    padding_top: 4,
    spacing: 12 // Global spacing
};



interface PlacedWord {
    id: string;
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    font: string;
    fontSize: number;
    rotate: number;
    index: number; // Added for animation delay
}



function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        const minHex = 5;
        const idx = Math.floor(Math.random() * (16 - minHex)) + minHex;
        color += letters[idx];
    }
    return color;
}

export default function WordCloudCanvas({ messages }: { messages: Message[] }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [words, setWords] = useState<PlacedWord[]>([]);

    useEffect(() => {
        if (!messages.length || !containerRef.current) {
            setWords([]);
            return;
        }

        const container = containerRef.current;
        const tWidth = container.offsetWidth;
        const tHeight = container.offsetHeight;
        const xOffset = tWidth / 2;
        const yOffset = tHeight / 2;

        // Function to check if word is within bounds
        const isWithinBounds = (x: number, y: number, w: number, h: number, rotate: number): boolean => {
            if (rotate === 0) {
                return x >= 0 && y >= 0 && x + w <= tWidth && y + h <= tHeight;
            } else {
                // For rotated text, check if the bounding box fits
                // When rotated 270deg, width and height are swapped in terms of screen space
                return x >= 0 && y >= 0 && x + h <= tWidth && y + w <= tHeight;
            }
        };

        // Check for intersection between two rectangles with spacing
        const intersect = (word1: PlacedWord, x2: number, y2: number, w2: number, h2: number): boolean => {
            // Add spacing to the periodic checks
            const spacing = WORD_CLOUD_CONFIG.spacing;
            return !(
                x2 + w2 + spacing <= word1.x ||
                x2 >= word1.x + word1.width + spacing ||
                y2 + h2 + spacing <= word1.y ||
                y2 >= word1.y + word1.height + spacing
            );
        };

        // Try to place words with different font scales using Spiral Layout
        const attemptPlacement = (fontScale: number): PlacedWord[] => {
            const options = {
                ...WORD_CLOUD_CONFIG,
                minFont: Math.max(Math.floor(tWidth / 30), 10) * fontScale,
                maxFont: Math.floor(tWidth / 8) * fontScale,
            };

            const sortedWords = [...messages].sort((a, b) => b.weight - a.weight);

            if (sortedWords.length === 0) return [];

            const maxWeight = sortedWords[0].weight;
            const minWeight = sortedWords[sortedWords.length - 1].weight;
            const fontFactor = (options.maxFont - options.minFont) / ((maxWeight - minWeight) || 1);

            const measureWord = (text: string, fontSize: number) => {
                const span = document.createElement('span');
                span.style.position = 'absolute';
                span.style.visibility = 'hidden';
                span.style.fontSize = `${fontSize}px`;
                span.style.fontFamily = options.fontFamily;
                span.style.lineHeight = '0.9'; // Tighter line height
                // Add padding to the measurement to ensure spacing
                span.style.padding = `${options.padding_top}px ${options.padding_left}px`;
                span.style.whiteSpace = 'nowrap';
                span.innerText = text;
                document.body.appendChild(span);
                const w = span.offsetWidth;
                const h = span.offsetHeight;
                document.body.removeChild(span);
                return { w, h };
            };

            const placedWords: PlacedWord[] = [];

            // Spiral parameters
            const spiralStep = 0.1; // Radian step
            const spiralOriginX = xOffset;
            const spiralOriginY = yOffset;

            // Loop through each word to place
            for (let i = 0; i < sortedWords.length; i++) {
                const wordItem = sortedWords[i];
                const fontSize = Math.floor(((wordItem.weight - minWeight) * fontFactor) + options.minFont + options.fontOffset);
                const color = getRandomColor();

                const { w, h } = measureWord(wordItem.word, fontSize);

                let angle = 0;
                let radius = 0;
                let placed = false;
                let finalX = 0;
                let finalY = 0;
                let rotate = 0;

                // 50% chance to rotate vertical if enabled (and not the very first word usually)
                if (options.verticalEnabled && Math.random() < 0.5) {
                    rotate = 270;
                }

                // If rotated, width/height for bounds checking are swapped relative to the unrotated rect
                // BUT: The DOM element is transformed.
                // Our collision logic compares axis-aligned bounding boxes. 
                // If we rotate 270, the visual width is height, and visual height is width.
                // We add a safety factor of 1.1 to ensure no overlaps due to font rendering differences.
                const visualW = (rotate === 0 ? w : h) * 1.1;
                const visualH = (rotate === 0 ? h : w) * 1.1;

                // Max iterations to prevent infinite loops if it doesn't fit
                let maxIter = 2500;

                while (maxIter-- > 0) {
                    // Archimedean spiral: r = b * theta
                    // We can just use radius increasing with angle
                    // Simple uniform spiral:
                    // x = center + radius * cos(angle)
                    // y = center + radius * sin(angle)

                    // We want radius to grow slowly to keep it tight
                    radius = 5 * angle;

                    const x = spiralOriginX + radius * Math.cos(angle) - visualW / 2;
                    const y = spiralOriginY + radius * Math.sin(angle) - visualH / 2;

                    // Bounds check
                    if (isWithinBounds(x, y, visualW, visualH, 0)) {
                        // Collision check
                        let collision = false;
                        for (const existing of placedWords) {
                            if (intersect(existing, x, y, visualW, visualH)) {
                                collision = true;
                                break;
                            }
                        }

                        if (!collision) {
                            finalX = x;
                            finalY = y;
                            placed = true;
                            break;
                        }
                    }

                    angle += spiralStep;
                }

                if (placed) {
                    placedWords.push({
                        id: wordItem._id || `${wordItem.word}-${i}`,
                        text: wordItem.word,
                        x: finalX,
                        y: finalY,
                        width: visualW,
                        height: visualH,
                        color,
                        font: options.fontFamily,
                        fontSize,
                        rotate,
                        index: i
                    });
                } else {
                    // If we failed to place a word, this scale attempt fails
                    return [];
                }
            }

            return placedWords;
        };

        // Dynamic scaling loop to ensure all words fit
        let result: PlacedWord[] = [];
        let currentScale = 1.0;
        const minScale = 0.2;
        const scaleStep = 0.05;

        // Try to find the largest scale that works
        while (currentScale >= minScale) {
            const attempt = attemptPlacement(currentScale);
            if (attempt.length === messages.length) {
                result = attempt;
                break;
            }
            currentScale -= scaleStep;
        }

        setWords(result);

    }, [messages]);

    if (!messages.length) {
        return (
            <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center' }}>
                <p style={{ color: '#999' }}>データがありません</p>
            </div>
        );
    }

    return (
        <>
            <style jsx global>{`
                @keyframes popIn {
                    0% {
                        opacity: 0;
                        transform: scale(0);
                    }
                    80% {
                         transform: scale(1.1);
                    }
                    100% {
                        opacity: 1;
                        transform: scale(1);
                    }
                }
            `}</style>
            <div
                ref={containerRef}
                style={{
                    width: '100%',
                    height: '75vh',
                    position: 'relative',
                    overflow: 'hidden',
                    fontFamily: 'Montserrat, sans-serif'
                }}
            >
                {words.map((word) => {
                    // Calculate unrotated dimensions
                    // If rotated (270deg), visual width was the original height, and visual height was original width.
                    // word.width/height are the visual (bounding box) dimensions.
                    const isRotated = word.rotate !== 0;
                    const unrotatedW = isRotated ? word.height : word.width;
                    const unrotatedH = isRotated ? word.width : word.height;

                    // Calculate the render position adjustment.
                    // The collision box (visual box) is at (word.x, word.y) with size (word.width, word.height).
                    // We render a generic span of size (unrotatedW, unrotatedH) at (left, top).
                    // We must position this span such that its CENTER aligns with the collision box CENTER.
                    // Collision Center X = word.x + word.width / 2
                    // Collision Center Y = word.y + word.height / 2
                    // Span Center X = left + unrotatedW / 2
                    // Span Center Y = top + unrotatedH / 2
                    // => left = word.x + word.width / 2 - unrotatedW / 2
                    // => top = word.y + word.height / 2 - unrotatedH / 2

                    const left = word.x + word.width / 2 - unrotatedW / 2;
                    const top = word.y + word.height / 2 - unrotatedH / 2;

                    return (
                        <span
                            key={word.id}
                            style={{
                                position: 'absolute',
                                left: left,
                                top: top,
                                width: `${unrotatedW}px`,
                                height: `${unrotatedH}px`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                userSelect: 'none',
                                pointerEvents: 'none', // Prevent interaction interfering
                            }}
                        >
                            <div style={{
                                fontSize: `${word.fontSize}px`,
                                fontFamily: word.font,
                                color: word.color,
                                lineHeight: '0.9',
                                whiteSpace: 'nowrap',
                                transform: `rotate(${word.rotate}deg)`,
                                transformOrigin: 'center center',
                                display: 'inline-block',
                                animation: `popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards`,
                                animationDelay: `${word.index * 0.05}s`,
                                opacity: 0 // Start invisible
                            }}>
                                {word.text}
                            </div>
                        </span>
                    );
                })}
            </div>
        </>
    );
}
