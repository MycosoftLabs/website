/**
 * useAgentMemory Hook - February 6, 2026
 * 
 * Hook for agent memory operations.
 */

import { useState, useCallback, useEffect } from 'react';
import useSWR from 'swr';

const MAS_API_BASE = process.env.NEXT_PUBLIC_MAS_API_URL || 'http://localhost:8000';

// ============================================
// TYPES
// ============================================

export interface KnowledgeNode {
  id: string;
  node_type: string;
  name: string;
  description?: string;
  properties?: Record<string, any>;
  importance?: number;
}

export interface SemanticSearchResult {
  id: string;
  node_type: string;
  name: string;
  description?: string;
  similarity: number;
}

export interface UserContext {
  user_id: string;
  display_name?: string;
  language: string;
  timezone: string;
  preferred_layers: string[];
  recent_entities: Array<{
    entity_id: string;
    entity_type: string;
    entity_name: string;
    viewed_at: string;
  }>;
  recent_queries: string[];
  saved_views: Array<{
    id: string;
    name: string;
  }>;
}

export interface SessionContext {
  session_id: string;
  user_id?: string;
  current_entities: Array<{
    id: string;
    type: string;
    name: string;
  }>;
  current_region?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  current_layers: string[];
  working_memory: Array<{
    content: string;
    relevance: number;
  }>;
  is_active: boolean;
}

// ============================================
// FETCHER
// ============================================

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Request failed');
  return res.json();
};

// ============================================
// SEMANTIC SEARCH HOOK
// ============================================

export function useSemanticSearch() {
  const [results, setResults] = useState<SemanticSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (
    query: string,
    options?: {
      nodeType?: string;
      limit?: number;
      minSimilarity?: number;
    }
  ) => {
    setIsSearching(true);
    setError(null);

    try {
      const res = await fetch(`${MAS_API_BASE}/api/graph/memory/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          node_type: options?.nodeType,
          limit: options?.limit || 10,
          min_similarity: options?.minSimilarity || 0.5,
        }),
      });

      if (!res.ok) throw new Error('Search failed');

      const data = await res.json();
      setResults(data.results || []);
      return data.results;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
      return [];
    } finally {
      setIsSearching(false);
    }
  }, []);

  return { search, results, isSearching, error };
}

// ============================================
// MEMORY STORE HOOK
// ============================================

export function useMemoryStore() {
  const [isStoring, setIsStoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const storeFact = useCallback(async (
    fact: string,
    options?: {
      entityId?: string;
      importance?: number;
    }
  ) => {
    setIsStoring(true);
    setError(null);

    try {
      const res = await fetch(`${MAS_API_BASE}/api/graph/memory/store`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fact,
          entity_id: options?.entityId,
          importance: options?.importance || 0.5,
        }),
      });

      if (!res.ok) throw new Error('Store failed');

      const data = await res.json();
      return data;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
      return null;
    } finally {
      setIsStoring(false);
    }
  }, []);

  return { storeFact, isStoring, error };
}

// ============================================
// GRAPH LOOKUP HOOK
// ============================================

export function useGraphLookup(nodeId?: string) {
  const { data, error, isLoading, mutate } = useSWR(
    nodeId ? `${MAS_API_BASE}/api/graph/node/${nodeId}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  return {
    node: data as KnowledgeNode | undefined,
    isLoading,
    error,
    refresh: mutate,
  };
}

// ============================================
// GRAPH TRAVERSAL HOOK
// ============================================

export function useGraphTraversal() {
  const [nodes, setNodes] = useState<KnowledgeNode[]>([]);
  const [isTraversing, setIsTraversing] = useState(false);

  const traverse = useCallback(async (
    fromId: string,
    options?: {
      depth?: number;
      edgeType?: string;
    }
  ) => {
    setIsTraversing(true);

    try {
      const params = new URLSearchParams({
        from: fromId,
        depth: String(options?.depth || 2),
      });
      if (options?.edgeType) {
        params.set('edge_type', options.edgeType);
      }

      const res = await fetch(`${MAS_API_BASE}/api/graph/traverse?${params}`);
      if (!res.ok) throw new Error('Traversal failed');

      const data = await res.json();
      setNodes(data.neighbors || []);
      return data;
    } catch (e) {
      console.error('Traverse error:', e);
      return null;
    } finally {
      setIsTraversing(false);
    }
  }, []);

  return { traverse, nodes, isTraversing };
}

// ============================================
// USER CONTEXT HOOK
// ============================================

export function useUserContext(userId?: string) {
  const { data, error, isLoading, mutate } = useSWR(
    userId ? `${MAS_API_BASE}/api/graph/context/user/${userId}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const updateContext = useCallback(async (updates: Partial<UserContext>) => {
    if (!userId) return;

    try {
      const res = await fetch(`${MAS_API_BASE}/api/graph/context/user/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!res.ok) throw new Error('Update failed');

      mutate();
    } catch (e) {
      console.error('Update context error:', e);
    }
  }, [userId, mutate]);

  return {
    context: data as UserContext | undefined,
    isLoading,
    error,
    updateContext,
    refresh: mutate,
  };
}

// ============================================
// SESSION CONTEXT HOOK
// ============================================

export function useSessionContext(sessionId?: string) {
  const { data, error, isLoading, mutate } = useSWR(
    sessionId ? `${MAS_API_BASE}/api/graph/context/session/${sessionId}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  return {
    session: data as SessionContext | undefined,
    isLoading,
    error,
    refresh: mutate,
  };
}

// ============================================
// COMBINED HOOK
// ============================================

export function useAgentMemory(userId?: string) {
  const semanticSearch = useSemanticSearch();
  const memoryStore = useMemoryStore();
  const graphTraversal = useGraphTraversal();
  const userContext = useUserContext(userId);

  return {
    // Semantic search
    search: semanticSearch.search,
    searchResults: semanticSearch.results,
    isSearching: semanticSearch.isSearching,

    // Memory storage
    storeFact: memoryStore.storeFact,
    isStoring: memoryStore.isStoring,

    // Graph traversal
    traverse: graphTraversal.traverse,
    graphNodes: graphTraversal.nodes,
    isTraversing: graphTraversal.isTraversing,

    // User context
    context: userContext.context,
    updateContext: userContext.updateContext,

    // Combined loading state
    isLoading: semanticSearch.isSearching || memoryStore.isStoring || graphTraversal.isTraversing,
  };
}

export default useAgentMemory;