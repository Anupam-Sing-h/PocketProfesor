import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';

        const response = await fetch(`${backendUrl}/process-video`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(data, { status: response.status });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('API Proxy Error (process-video):', error);
        return NextResponse.json({ detail: 'Failed to process video' }, { status: 500 });
    }
}
