'use client';

import useSWR from 'swr';

interface BrainStatus {
  isActive: boolean;
  memoryLoad: number;
  activeContexts: number;
  lastActivity: string;
  healthScore: number;
  layers: {
    ephemeral: { count: number; sizeBytes: number };
    session: { count: number; sizeBytes: number };
    working: { count: number; sizeBytes: number };
    semantic: { count: number; sizeBytes: number };
    episodic: { count: number; sizeBytes: number };
    system: { count: number; sizeBytes: number };
  };
}

interface BrainContext {
  userId: string;
  recentMemories: Array<{
    id: string;
    content: string;
    layer: string;
    timestamp: string;
    relevance: number;
  }>;
  activeTopics: string[];
  conversationSummary: string;
}

const fetcher = (url: string) => fetch(url).then(r => {
  if (!r.ok) throw new Error(`Brain API error: ${r.status}`);
  return r.json();
});

export function useBrainStatus() {
  const { data, error, isLoading, mutate } = useSWR<BrainStatus>(
    '/api/brain/status',
    fetcher,
    { refreshInterval: 5000, revalidateOnFocus: false }
  );
  return { status: data, error, isLoading, refresh: mutate };
}

export function useBrainContext(userId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<BrainContext>(
    userId ? `/api/brain/context/${userId}` : null,
    fetcher,
    { refreshInterval: 10000, revalidateOnFocus: false }
  );
  return { context: data, error, isLoading, refresh: mutate };
}
