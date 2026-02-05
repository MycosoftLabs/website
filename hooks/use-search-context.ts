'use client';

/**
 * useSearchContext Hook - February 5, 2026
 * 
 * React Context provider and hook for search session state.
 * Provides centralized search memory state across components.
 */

import React, {
  createContext,
  useContext,
  useCallback,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import useSWR from 'swr';

// Types
export interface SearchContextState {
  sessionId: string | null;
  userId: string;
  isActive: boolean;
  queries: string[];
  currentSpecies: string | null;
  focusedSpecies: string[];
  exploredTopics: string[];
  aiMessageCount: number;
  durationSeconds: number;
  voiceLinked: boolean;
}

export interface SearchContextActions {
  startSession: () => Promise<void>;
  endSession: () => Promise<void>;
  recordQuery: (query: string, resultCount?: number) => Promise<void>;
  recordFocus: (speciesId: string, topic?: string) => Promise<void>;
  recordClick: (resultId: string) => Promise<void>;
  recordAIMessage: (role: 'user' | 'assistant', content: string) => Promise<void>;
  recordWidget: (widget: string, speciesId?: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export interface SearchContextValue extends SearchContextState, SearchContextActions {}

// Default context value
const defaultContextValue: SearchContextValue = {
  sessionId: null,
  userId: '',
  isActive: false,
  queries: [],
  currentSpecies: null,
  focusedSpecies: [],
  exploredTopics: [],
  aiMessageCount: 0,
  durationSeconds: 0,
  voiceLinked: false,
  startSession: async () => {},
  endSession: async () => {},
  recordQuery: async () => {},
  recordFocus: async () => {},
  recordClick: async () => {},
  recordAIMessage: async () => {},
  recordWidget: async () => {},
  refresh: async () => {},
};

// Create context
const SearchContext = createContext<SearchContextValue>(defaultContextValue);

// Fetcher for SWR
const fetcher = (url: string) => fetch(url).then(res => res.json());

// Provider component
export interface SearchContextProviderProps {
  children: ReactNode;
  userId: string;
  autoStart?: boolean;
}

export function SearchContextProvider({
  children,
  userId,
  autoStart = true,
}: SearchContextProviderProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [state, setState] = useState<Omit<SearchContextState, 'sessionId' | 'userId' | 'isActive'>>({
    queries: [],
    currentSpecies: null,
    focusedSpecies: [],
    exploredTopics: [],
    aiMessageCount: 0,
    durationSeconds: 0,
    voiceLinked: false,
  });

  const isInitialized = useRef(false);

  // SWR for active session check
  const { data: activeSession, mutate: mutateActive } = useSWR(
    userId ? `/api/search/memory?user_id=${encodeURIComponent(userId)}` : null,
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: true,
    }
  );

  // SWR for session context (only if session is active)
  const { data: sessionContext, mutate: mutateContext } = useSWR(
    sessionId ? `/api/search/memory/session/${sessionId}` : null,
    fetcher,
    {
      refreshInterval: 10000, // Refresh every 10 seconds
    }
  );

  // Update state from session context
  useEffect(() => {
    if (sessionContext && !sessionContext.error) {
      setState({
        queries: sessionContext.queries || [],
        currentSpecies: sessionContext.current_species || null,
        focusedSpecies: sessionContext.focused_species || [],
        exploredTopics: sessionContext.explored_topics || [],
        aiMessageCount: sessionContext.ai_message_count || 0,
        durationSeconds: sessionContext.duration_seconds || 0,
        voiceLinked: sessionContext.voice_linked || false,
      });
    }
  }, [sessionContext]);

  // Check for active session on mount
  useEffect(() => {
    if (activeSession?.active && activeSession.session_id) {
      setSessionId(activeSession.session_id);
    }
  }, [activeSession]);

  // Auto-start session if configured
  useEffect(() => {
    if (!autoStart || isInitialized.current || !userId) return;
    isInitialized.current = true;

    if (!activeSession?.active) {
      // Start new session
      fetch('/api/search/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          user_id: userId,
        }),
      })
        .then(res => res.json())
        .then(result => {
          if (result.session_id) {
            setSessionId(result.session_id);
          }
        })
        .catch(console.error);
    }
  }, [autoStart, userId, activeSession]);

  // Actions
  const startSession = useCallback(async () => {
    const response = await fetch('/api/search/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'start',
        user_id: userId,
      }),
    });
    const result = await response.json();
    if (result.session_id) {
      setSessionId(result.session_id);
      mutateActive();
    }
  }, [userId, mutateActive]);

  const endSession = useCallback(async () => {
    if (!sessionId) return;
    
    await fetch(`/api/search/memory/session/${sessionId}`, {
      method: 'POST',
    });
    
    setSessionId(null);
    setState({
      queries: [],
      currentSpecies: null,
      focusedSpecies: [],
      exploredTopics: [],
      aiMessageCount: 0,
      durationSeconds: 0,
      voiceLinked: false,
    });
    mutateActive();
  }, [sessionId, mutateActive]);

  const recordQuery = useCallback(async (query: string, resultCount: number = 0) => {
    if (!sessionId) return;
    
    await fetch('/api/search/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'query',
        session_id: sessionId,
        query,
        result_count: resultCount,
      }),
    });
    
    // Optimistic update
    setState(prev => ({
      ...prev,
      queries: [...prev.queries, query].slice(-10),
    }));
    
    mutateContext();
  }, [sessionId, mutateContext]);

  const recordFocus = useCallback(async (speciesId: string, topic?: string) => {
    if (!sessionId) return;
    
    await fetch('/api/search/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'focus',
        session_id: sessionId,
        species_id: speciesId,
        topic,
      }),
    });
    
    // Optimistic update
    setState(prev => ({
      ...prev,
      currentSpecies: speciesId,
      focusedSpecies: prev.focusedSpecies.includes(speciesId)
        ? prev.focusedSpecies
        : [...prev.focusedSpecies, speciesId],
      exploredTopics: topic && !prev.exploredTopics.includes(topic)
        ? [...prev.exploredTopics, topic]
        : prev.exploredTopics,
    }));
    
    mutateContext();
  }, [sessionId, mutateContext]);

  const recordClick = useCallback(async (resultId: string) => {
    if (!sessionId) return;
    
    await fetch('/api/search/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'click',
        session_id: sessionId,
        result_id: resultId,
      }),
    });
  }, [sessionId]);

  const recordAIMessage = useCallback(async (role: 'user' | 'assistant', content: string) => {
    if (!sessionId) return;
    
    await fetch('/api/search/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'ai',
        session_id: sessionId,
        role,
        content,
      }),
    });
    
    // Optimistic update
    setState(prev => ({
      ...prev,
      aiMessageCount: prev.aiMessageCount + 1,
    }));
    
    mutateContext();
  }, [sessionId, mutateContext]);

  const recordWidget = useCallback(async (widget: string, speciesId?: string) => {
    if (!sessionId) return;
    
    await fetch('/api/search/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'widget',
        session_id: sessionId,
        widget,
        species_id: speciesId,
      }),
    });
    
    mutateContext();
  }, [sessionId, mutateContext]);

  const refresh = useCallback(async () => {
    await mutateActive();
    await mutateContext();
  }, [mutateActive, mutateContext]);

  const contextValue: SearchContextValue = {
    sessionId,
    userId,
    isActive: !!sessionId,
    ...state,
    startSession,
    endSession,
    recordQuery,
    recordFocus,
    recordClick,
    recordAIMessage,
    recordWidget,
    refresh,
  };

  return React.createElement(SearchContext.Provider, { value: contextValue }, children);
}

// Hook to use search context
export function useSearchContext(): SearchContextValue {
  const context = useContext(SearchContext);
  
  if (!context) {
    throw new Error('useSearchContext must be used within a SearchContextProvider');
  }
  
  return context;
}

export default useSearchContext;
