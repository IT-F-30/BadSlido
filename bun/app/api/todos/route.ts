import { NextResponse } from 'next/server';
import { createTodo, getTodos } from '@/lib/todos';

type RouteContext = {
    params: Record<string, string>;
};

export async function GET(_req: Request, _context: RouteContext) {
    try {
        const todos = await getTodos();
        return NextResponse.json(todos);
    } catch (error) {
        console.error('GET /api/todos error', error);
        return NextResponse.json({ error: 'Failed to fetch todos' }, { status: 500 });
    }
}

export async function POST(req: Request, _context: RouteContext) {
    try {
        const body = await req.json();
        const { word, weight } = body ?? {};

        if (!word || typeof word !== 'string' || weight === undefined) {
            return NextResponse.json({ error: 'word and weight are required' }, { status: 400 });
        }

        const parsedWeight = Number(weight);
        if (!Number.isFinite(parsedWeight)) {
            return NextResponse.json({ error: 'weight must be a number' }, { status: 400 });
        }

        const newTodo = await createTodo({ word: word.trim(), weight: parsedWeight });
        return NextResponse.json(newTodo, { status: 201 });
    } catch (error) {
        console.error('POST /api/todos error', error);
        return NextResponse.json({ error: 'Failed to create todo' }, { status: 500 });
    }
}
