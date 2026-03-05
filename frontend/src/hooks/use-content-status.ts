import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { Content } from '@/types';

export function useContentStatus(contentId: string) {
    const [status, setStatus] = useState<string>('processing');
    const [content, setContent] = useState<Content | null>(null);

    useEffect(() => {
        // Initial fetch
        let isMounted = true;

        const fetchContent = async () => {
            try {
                const data = await api.getContent(contentId);
                if (isMounted) {
                    setContent(data);
                    setStatus(data.status);
                }
            } catch {
                if (isMounted) {
                    setStatus('error');
                }
            }
        };

        fetchContent();

        return () => {
            isMounted = false;
        };
    }, [contentId]);

    useEffect(() => {
        if (status !== 'processing') return;

        let isMounted = true;
        const interval = setInterval(async () => {
            try {
                const data = await api.getContent(contentId);
                if (isMounted) {
                    setContent(data);
                    setStatus(data.status);
                    if (data.status !== 'processing') {
                        clearInterval(interval);
                    }
                }
            } catch {
                if (isMounted) {
                    setStatus('error');
                    clearInterval(interval);
                }
            }
        }, 3000); // Poll every 3 seconds

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [contentId, status]);

    return { status, content };
}
