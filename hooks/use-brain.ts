'use client';

/**
 * useBrain Hook - February 5, 2026
 * 
 * React hook for interacting with MYCA's Brain API.
 * Provides access to LLM chat, status, and event recording.
 */

import { useState, useCallback } from 'react';

export interface BrainStatus {
  status: string;
  brain: {
    initialized: boolean;
    frontier_router?: boolean;
    memory_coordinator?: boolean;
  };
  providers: Record<string, { healthy: boolean; last_check?: string; error?: string }>;
  memory?: {
    total_memories?: number;
    active_sessions?: number;
  };
  timestamp: string;
}

export interface BrainContext {
  user_id: string;
  profile?: {
    preferences: Record<string, unknown>;
  };
  recent_memories?: Array<{
    key: string;
    value: string;
    timestamp: string;
  }>;
  context_summary?: string;
}

export interface ChatOptions {
  sessionId?: string;
  includeMemory?: boolean;
  model?: 'gemini' | 'claude' | 'openai';
}

export interface ChatResponse {
  response: string;
  session_id?: string;
  model_used?: string;
  tokens_used?: number;
  memory_context?: string[];
}

export function useBrain() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getStatus = useCallback(async (): Promise<BrainStatus | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/brain?endpoint=status');
      const result = await response.json();
      if (result.success) {
        return result.data;
      }
      setError(result.error || 'Failed to fetch brain status');
      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getContext = useCallback(async (
    userId: string,
    query?: string,
    limit?: number
  ): Promise<BrainContext | null> => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query) params.set('query', query);
      if (limit) params.set('limit', limit.toString());
      
      const response = await fetch(`/api/brain/context/${userId}?${params}`);
      const result = await response.json();
      if (result.success) {
        return result.data;
      }
      setError(result.error || 'Failed to fetch brain context');
      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const chat = useCallback(async (
    message: string,
    userId?: string,
    options?: ChatOptions
  ): Promise<ChatResponse | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/brain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          message,
          user_id: userId,
          session_id: options?.sessionId,
          include_memory: options?.includeMemory ?? true,
          model: options?.model,
        }),
      });
      const result = await response.json();
      if (result.success) {
        return result.data;
      }
      setError(result.error || 'Chat request failed');
      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const recordEvent = useCallback(async (
    eventType: string,
    description: string,
    context?: Record<string, unknown>,
    importance?: number
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/brain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'event',
          event_type: eventType,
          description,
          context,
          importance: importance ?? 0.5,
        }),
      });
      const result = await response.json();
      if (result.success) {
        return true;
      }
      setError(result.error || 'Failed to record event');
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    getStatus,
    getContext,
    chat,
    recordEvent,
  };
}

export default useBrain;
