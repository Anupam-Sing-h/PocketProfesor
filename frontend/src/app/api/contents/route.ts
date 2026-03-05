import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';

        const response = await fetch(`${backendUrl}/contents`, {
            cache: 'no-store',
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(data, { status: response.status });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('API Proxy Error (list contents):', error);
        return NextResponse.json({ detail: 'Failed to fetch contents' }, { status: 500 });
    }
}
