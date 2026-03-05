import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
        const response = await fetch(`${backendUrl}/generate-quiz`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await response.json();
        if (!response.ok) return NextResponse.json(data, { status: response.status });
        return NextResponse.json(data);
    } catch (error: unknown) {
        console.error('generate-quiz proxy error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ detail: 'Failed to generate quiz', error: message }, { status: 500 });
    }
}
