'use client';

/**
 * useMemory Hook - February 5, 2026
 * 
 * React hook for interacting with MYCA's memory system.
 * Provides unified access to memory operations across all layers.
 */

import { useState, useCallback } from 'react';

export interface MemoryRecord {
  id: string;
  key: string;
  value: string | Record<string, unknown>;
  layer: string;
  scope: string;
  importance?: number;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
}

export interface MemoryStats {
  coordinator?: {
    initialized: boolean;
    active_conversations: number;
    agent_namespaces: string[];
  };
  myca_memory?: {
    total_memories: number;
    layers: Record<string, { count: number; avg_importance: number }>;
  };
  total_memories?: number;
  active_conversations?: number;
  agent_count?: number;
  vector_count?: number;
}

export interface UserProfile {
  user_id: string;
  preferences: Record<string, string | number | boolean>;
  facts: Array<{
    type: string;
    content: string;
    learned_from?: string;
    timestamp?: string;
  }>;
  last_interaction?: string;
  created_at?: string;
}

export interface Episode {
  id: string;
  event_type: string;
  description: string;
  importance: number;
  context?: Record<string, unknown>;
  timestamp: string;
  agent_id?: string;
}

export interface BrainStatus {
  status: string;
  brain: {
    initialized: boolean;
    frontier_router?: boolean;
    memory_coordinator?: boolean;
  };
  providers: Record<string, { healthy: boolean }>;
  memory?: {
    total_memories?: number;
    active_sessions?: number;
  };
  timestamp: string;
}

export function useMemory() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getStats = useCallback(async (): Promise<MemoryStats | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/memory/stats');
      const result = await response.json();
      if (result.success) {
        return result.data;
      }
      setError(result.error || 'Failed to fetch stats');
      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getUserProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/memory/user/${userId}`);
      const result = await response.json();
      if (result.success) {
        return result.data;
      }
      setError(result.error || 'Failed to fetch user profile');
      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateUserProfile = useCallback(async (
    userId: string,
    preferences: Record<string, string | number | boolean>
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      for (const [key, value] of Object.entries(preferences)) {
        const response = await fetch(`/api/memory/user/${userId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update_preference',
            key,
            value,
          }),
        });
        const result = await response.json();
        if (!result.success) {
          setError(result.error || 'Failed to update preference');
          return false;
        }
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const getEpisodes = useCallback(async (
    agentId?: string,
    limit?: number,
    eventType?: string
  ): Promise<Episode[]> => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (agentId) params.set('agent_id', agentId);
      if (limit) params.set('limit', limit.toString());
      if (eventType) params.set('event_type', eventType);
      
      const response = await fetch(`/api/memory/episodes?${params}`);
      const result = await response.json();
      if (result.success) {
        return result.data.episodes || [];
      }
      setError(result.error || 'Failed to fetch episodes');
      return [];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getBrainStatus = useCallback(async (): Promise<BrainStatus | null> => {
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

  const getBrainContext = useCallback(async (
    userId: string,
    query?: string
  ): Promise<Record<string, unknown> | null> => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query) params.set('query', query);
      
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

  const exportMemory = useCallback(async (
    scope: string,
    format: 'json' | 'csv' = 'json'
  ): Promise<Blob | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/memory/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope, format }),
      });
      if (!response.ok) {
        throw new Error('Export failed');
      }
      return await response.blob();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const cleanupMemory = useCallback(async (
    scope: string,
    olderThanDays: number
  ): Promise<{ deleted: number } | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/memory/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope, older_than_days: olderThanDays }),
      });
      const result = await response.json();
      if (result.success) {
        return result.data;
      }
      setError(result.error || 'Cleanup failed');
      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    getStats,
    getUserProfile,
    updateUserProfile,
    getEpisodes,
    getBrainStatus,
    getBrainContext,
    exportMemory,
    cleanupMemory,
  };
}

export default useMemory;
