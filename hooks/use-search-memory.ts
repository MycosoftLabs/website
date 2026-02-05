'use client';

/**
 * useSearchMemory Hook - February 5, 2026
 * 
 * React hook for managing search sessions with memory integration.
 * Tracks queries, species focus, AI conversations, and widget interactions.
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export interface SearchSessionContext {
  session_id: string;
  user_id: string;
  duration_seconds: number;
  queries: string[];
  current_species: string | null;
  focused_species: string[];
  explored_topics: string[];
  ai_message_count: number;
  recent_ai: Array<{ role: string; content: string }>;
  voice_linked: boolean;
}

export interface SearchSessionSummary {
  session_id: string;
  duration_seconds: number;
  query_count: number;
  unique_species_explored: number;
  topics_explored: string[];
  ai_message_count: number;
  top_interests: Array<{ species_id: string; score: number }>;
}

export interface SearchHistorySession {
  id: string;
  user_id: string;
  queries: Array<{
    query: string;
    timestamp: string;
    result_count: number;
  }>;
  focused_species: string[];
  explored_topics: string[];
  started_at: string;
  ended_at: string | null;
}

export interface UseSearchMemoryOptions {
  userId: string;
  autoStart?: boolean;
}

export function useSearchMemory({ userId, autoStart = true }: UseSearchMemoryOptions) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [context, setContext] = useState<SearchSessionContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const isInitialized = useRef(false);

  // Start a search session
  const startSession = useCallback(async (
    voiceSessionId?: string,
    metadata?: Record<string, unknown>
  ): Promise<string | null> => {
    if (!userId) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/search/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          user_id: userId,
          voice_session_id: voiceSessionId,
          metadata,
        }),
      });
      
      const result = await response.json();
      
      if (result.session_id) {
        setSessionId(result.session_id);
        return result.session_id;
      }
      
      setError(result.error || 'Failed to start session');
      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start session');
      return null;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Record a search query
  const recordQuery = useCallback(async (
    query: string,
    resultCount: number = 0,
    resultTypes?: Record<string, number>,
    source: 'text' | 'voice' | 'suggestion' = 'text'
  ): Promise<boolean> => {
    if (!sessionId) {
      // Auto-start session if not started
      const newSessionId = await startSession();
      if (!newSessionId) return false;
    }
    
    try {
      const response = await fetch('/api/search/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'query',
          session_id: sessionId,
          query,
          result_count: resultCount,
          result_types: resultTypes,
          source,
        }),
      });
      
      const result = await response.json();
      return !!result.query_id;
    } catch (err) {
      console.error('Failed to record query:', err);
      return false;
    }
  }, [sessionId, startSession]);

  // Record focusing on a species
  const recordFocus = useCallback(async (
    speciesId: string,
    topic?: string
  ): Promise<boolean> => {
    if (!sessionId) return false;
    
    try {
      const response = await fetch('/api/search/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'focus',
          session_id: sessionId,
          species_id: speciesId,
          topic,
        }),
      });
      
      const result = await response.json();
      return result.success === true;
    } catch (err) {
      console.error('Failed to record focus:', err);
      return false;
    }
  }, [sessionId]);

  // Record clicking a search result
  const recordClick = useCallback(async (
    resultId: string
  ): Promise<boolean> => {
    if (!sessionId) return false;
    
    try {
      const response = await fetch('/api/search/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'click',
          session_id: sessionId,
          result_id: resultId,
        }),
      });
      
      const result = await response.json();
      return result.success === true;
    } catch (err) {
      console.error('Failed to record click:', err);
      return false;
    }
  }, [sessionId]);

  // Record AI conversation turn
  const recordAITurn = useCallback(async (
    role: 'user' | 'assistant',
    content: string,
    topic?: string
  ): Promise<boolean> => {
    if (!sessionId) return false;
    
    try {
      const response = await fetch('/api/search/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ai',
          session_id: sessionId,
          role,
          content,
          topic,
        }),
      });
      
      const result = await response.json();
      return !!result.message_id;
    } catch (err) {
      console.error('Failed to record AI turn:', err);
      return false;
    }
  }, [sessionId]);

  // Record widget interaction
  const recordWidgetInteraction = useCallback(async (
    widget: string,
    speciesId?: string
  ): Promise<boolean> => {
    if (!sessionId) return false;
    
    try {
      const response = await fetch('/api/search/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'widget',
          session_id: sessionId,
          widget,
          species_id: speciesId,
        }),
      });
      
      const result = await response.json();
      return result.success === true;
    } catch (err) {
      console.error('Failed to record widget interaction:', err);
      return false;
    }
  }, [sessionId]);

  // Get session context
  const getContext = useCallback(async (): Promise<SearchSessionContext | null> => {
    if (!sessionId) return null;
    
    try {
      const response = await fetch(`/api/search/memory/session/${sessionId}`);
      const result = await response.json();
      
      if (result.error) {
        return null;
      }
      
      setContext(result);
      return result;
    } catch (err) {
      console.error('Failed to get context:', err);
      return null;
    }
  }, [sessionId]);

  // End the session
  const endSession = useCallback(async (): Promise<SearchSessionSummary | null> => {
    if (!sessionId) return null;
    
    setLoading(true);
    
    try {
      const response = await fetch(`/api/search/memory/session/${sessionId}`, {
        method: 'POST',
      });
      
      const summary = await response.json();
      
      if (summary.error) {
        setError(summary.error);
        return null;
      }
      
      // Clear local state
      setSessionId(null);
      setContext(null);
      
      return summary;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end session');
      return null;
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Get search history
  const getHistory = useCallback(async (
    limit: number = 10
  ): Promise<SearchHistorySession[]> => {
    if (!userId) return [];
    
    try {
      const response = await fetch(
        `/api/search/history?user_id=${encodeURIComponent(userId)}&limit=${limit}`
      );
      const result = await response.json();
      return result.sessions || [];
    } catch (err) {
      console.error('Failed to get history:', err);
      return [];
    }
  }, [userId]);

  // Enrich MINDEX with search data
  const enrichMindex = useCallback(async (
    query: string,
    taxonIds: number[]
  ): Promise<boolean> => {
    if (!userId) return false;
    
    try {
      const response = await fetch('/api/search/mindex-enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          user_id: userId,
          taxon_ids: taxonIds,
        }),
      });
      
      const result = await response.json();
      return result.success === true;
    } catch (err) {
      console.error('Failed to enrich MINDEX:', err);
      return false;
    }
  }, [userId]);

  // Check for active session on mount
  useEffect(() => {
    if (!autoStart || isInitialized.current || !userId) return;
    isInitialized.current = true;
    
    // Check if user has active session
    fetch(`/api/search/memory?user_id=${encodeURIComponent(userId)}`)
      .then(res => res.json())
      .then(result => {
        if (result.active && result.session_id) {
          setSessionId(result.session_id);
        }
      })
      .catch(console.error);
  }, [autoStart, userId]);

  return {
    // State
    sessionId,
    context,
    loading,
    error,
    isActive: !!sessionId,
    
    // Actions
    startSession,
    recordQuery,
    recordFocus,
    recordClick,
    recordAITurn,
    recordWidgetInteraction,
    getContext,
    endSession,
    getHistory,
    enrichMindex,
  };
}

export default useSearchMemory;
