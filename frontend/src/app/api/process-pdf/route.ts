import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';

        // Forward the multipart form data to FastAPI
        const response = await fetch(`${backendUrl}/process-pdf`, {
            method: 'POST',
            body: formData, // No Content-Type header needed, fetch adds it for FormData
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(data, { status: response.status });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('API Proxy Error (process-pdf):', error);
        return NextResponse.json({ detail: 'Failed to process PDF' }, { status: 500 });
    }
}
