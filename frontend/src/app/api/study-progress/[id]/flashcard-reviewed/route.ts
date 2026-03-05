import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
        const response = await fetch(`${backendUrl}/study-progress/${id}/flashcard-reviewed`, {
            method: 'POST',
        });
        const data = await response.json();
        if (!response.ok) return NextResponse.json(data, { status: response.status });
        return NextResponse.json(data);
    } catch {
        return NextResponse.json({ detail: 'Failed to update flashcard progress' }, { status: 500 });
    }
}
