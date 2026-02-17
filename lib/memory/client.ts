/**
 * Memory Client - February 3, 2026
 * TypeScript client for the unified memory system.
 * Used across AI Studio, NatureOS, CREP, Earth Simulator and all dashboards.
 */

export type MemoryScope = 
  | 'conversation' 
  | 'user' 
  | 'agent' 
  | 'system' 
  | 'ephemeral' 
  | 'device' 
  | 'experiment' 
  | 'workflow';

export type MemorySource = 
  | 'personaplex'
  | 'natureos'
  | 'orchestrator'
  | 'agent'
  | 'n8n'
  | 'mindex'
  | 'device'
  | 'dashboard'
  | 'system';

export interface MemoryEntry {
  id: string;
  scope: MemoryScope;
  namespace: string;
  key: string;
  value: unknown;
  source: MemorySource;
  confidence: number;
  accessCount: number;
  metadata: Record<string, unknown>;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryWriteRequest {
  scope: MemoryScope;
  namespace: string;
  key: string;
  value: unknown;
  ttlSeconds?: number;
  metadata?: Record<string, unknown>;
}

export interface MemoryReadRequest {
  scope: MemoryScope;
  namespace: string;
  key?: string;
  semanticQuery?: string;
}

export interface MemoryResponse {
  success: boolean;
  scope: string;
  namespace: string;
  key: string | null;
  value: unknown;
  metadata: Record<string, unknown> | null;
  timestamp: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  layout: 'default' | 'compact' | 'expanded';
  favoriteDevices: string[];
  favoriteAgents: string[];
  dashboardWidgets: string[];
  notifications: {
    email: boolean;
    push: boolean;
    voice: boolean;
  };
  voiceSettings: {
    mode: 'personaplex' | 'elevenlabs' | 'whisper';
    persona: string;
    autoListen: boolean;
  };
}

const DEFAULT_API_URL = '/api/memory';
const MAS_ORCHESTRATOR_URL = process.env.NEXT_PUBLIC_MAS_URL || 'http://192.168.0.188:8001';

class MemoryClient {
  private apiUrl: string;

  constructor(apiUrl: string = DEFAULT_API_URL) {
    this.apiUrl = apiUrl;
  }

  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'DELETE' = 'GET',
    body?: unknown
  ): Promise<T> {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(this.apiUrl + endpoint, options);
    
    if (!response.ok) {
      throw new Error('Memory API error: ' + response.status + ' ' + response.statusText);
    }

    return response.json();
  }

  async write(request: MemoryWriteRequest): Promise<MemoryResponse> {
    return this.request<MemoryResponse>('/write', 'POST', request);
  }

  async read(request: MemoryReadRequest): Promise<MemoryResponse> {
    return this.request<MemoryResponse>('/read', 'POST', request);
  }

  async delete(scope: MemoryScope, namespace: string, key: string): Promise<MemoryResponse> {
    return this.request<MemoryResponse>('/delete', 'POST', { scope, namespace, key });
  }

  async listKeys(scope: MemoryScope, namespace: string): Promise<string[]> {
    const result = await this.request<{ keys: string[] }>('/list/' + scope + '/' + namespace);
    return result.keys;
  }

  async health(): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>('/health');
  }

  // User preferences helpers
  async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    try {
      const response = await this.read({
        scope: 'user',
        namespace: 'preferences:' + userId,
        key: 'settings',
      });
      return response.value as UserPreferences;
    } catch {
      return null;
    }
  }

  async saveUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<boolean> {
    try {
      const existing = await this.getUserPreferences(userId);
      const merged = { ...existing, ...preferences };
      
      await this.write({
        scope: 'user',
        namespace: 'preferences:' + userId,
        key: 'settings',
        value: merged,
        metadata: { source: 'dashboard', updatedBy: 'user' },
      });
      return true;
    } catch {
      return false;
    }
  }

  // Recent activity helpers
  async logActivity(userId: string, activity: { type: string; details: unknown }): Promise<void> {
    const timestamp = new Date().toISOString();
    await this.write({
      scope: 'user',
      namespace: 'activity:' + userId,
      key: 'activity_' + Date.now(),
      value: { ...activity, timestamp },
      ttlSeconds: 604800, // 7 days
    });
  }

  async getRecentActivity(userId: string, limit: number = 20): Promise<unknown[]> {
    try {
      const keys = await this.listKeys('user', 'activity:' + userId);
      const activities: unknown[] = [];

      for (const key of keys.slice(-limit)) {
        const response = await this.read({
          scope: 'user',
          namespace: 'activity:' + userId,
          key,
        });
        if (response.value) {
          activities.push(response.value);
        }
      }

      return activities.reverse();
    } catch {
      return [];
    }
  }

  // Favorite devices/agents helpers
  async addFavoriteDevice(userId: string, deviceId: string): Promise<boolean> {
    const prefs = await this.getUserPreferences(userId);
    const favorites = new Set(prefs?.favoriteDevices || []);
    favorites.add(deviceId);
    return this.saveUserPreferences(userId, { favoriteDevices: Array.from(favorites) });
  }

  async removeFavoriteDevice(userId: string, deviceId: string): Promise<boolean> {
    const prefs = await this.getUserPreferences(userId);
    const favorites = new Set(prefs?.favoriteDevices || []);
    favorites.delete(deviceId);
    return this.saveUserPreferences(userId, { favoriteDevices: Array.from(favorites) });
  }

  // Search history helpers
  async saveSearchQuery(userId: string, query: string, results: number): Promise<void> {
    await this.write({
      scope: 'user',
      namespace: 'search:' + userId,
      key: 'query_' + Date.now(),
      value: { query, results, timestamp: new Date().toISOString() },
      ttlSeconds: 2592000, // 30 days
    });
  }

  async getSearchHistory(userId: string, limit: number = 10): Promise<string[]> {
    try {
      const keys = await this.listKeys('user', 'search:' + userId);
      const queries: string[] = [];

      for (const key of keys.slice(-limit)) {
        const response = await this.read({
          scope: 'user',
          namespace: 'search:' + userId,
          key,
        });
        const value = response.value as { query: string };
        if (value?.query) {
          queries.push(value.query);
        }
      }

      return queries.reverse();
    } catch {
      return [];
    }
  }

  // Full search result storage (Feb 12, 2026 - MYCA Search Revolution)
  async saveSearchResults(
    userId: string,
    query: string,
    results: {
      species?: Array<{ id: string; name: string; commonName?: string }>;
      compounds?: Array<{ id: string; name: string; formula?: string }>;
      genetics?: Array<{ id: string; accession: string; speciesName?: string }>;
      research?: Array<{ id: string; title: string; doi?: string }>;
    },
    aiAnswer?: string
  ): Promise<void> {
    const searchId = 'search_' + Date.now();
    await this.write({
      scope: 'user',
      namespace: 'search-results:' + userId,
      key: searchId,
      value: {
        query,
        results,
        aiAnswer,
        timestamp: new Date().toISOString(),
        resultCounts: {
          species: results.species?.length || 0,
          compounds: results.compounds?.length || 0,
          genetics: results.genetics?.length || 0,
          research: results.research?.length || 0,
        },
      },
      ttlSeconds: 86400, // 24 hours
      metadata: { source: 'search', type: 'full-results' },
    });
  }

  async getRecentSearchResults(userId: string, limit: number = 5): Promise<Array<{
    query: string;
    results: Record<string, unknown>;
    aiAnswer?: string;
    timestamp: string;
  }>> {
    try {
      const keys = await this.listKeys('user', 'search-results:' + userId);
      const searchResults: Array<{
        query: string;
        results: Record<string, unknown>;
        aiAnswer?: string;
        timestamp: string;
      }> = [];

      for (const key of keys.slice(-limit)) {
        const response = await this.read({
          scope: 'user',
          namespace: 'search-results:' + userId,
          key,
        });
        if (response.value) {
          searchResults.push(response.value as typeof searchResults[0]);
        }
      }

      return searchResults.reverse();
    } catch {
      return [];
    }
  }

  // Share search results across apps (Chemistry, Genetics, AI, etc.)
  async shareSearchContext(
    sessionId: string,
    context: {
      query: string;
      intent?: string;
      entities?: string[];
      topSpecies?: Array<{ id: string; name: string }>;
      topCompounds?: Array<{ id: string; name: string }>;
    }
  ): Promise<void> {
    await this.write({
      scope: 'ephemeral',
      namespace: 'search-context',
      key: sessionId,
      value: {
        ...context,
        timestamp: new Date().toISOString(),
      },
      ttlSeconds: 3600, // 1 hour
      metadata: { source: 'search', shared: true },
    });
  }

  async getSharedSearchContext(sessionId: string): Promise<{
    query: string;
    intent?: string;
    entities?: string[];
    topSpecies?: Array<{ id: string; name: string }>;
    topCompounds?: Array<{ id: string; name: string }>;
    timestamp: string;
  } | null> {
    try {
      const response = await this.read({
        scope: 'ephemeral',
        namespace: 'search-context',
        key: sessionId,
      });
      return response.value as ReturnType<typeof this.getSharedSearchContext> extends Promise<infer T> ? T : never;
    } catch {
      return null;
    }
  }

  // Voice session memory helpers
  async getVoiceSessionContext(conversationId: string): Promise<unknown[]> {
    try {
      const response = await this.read({
        scope: 'conversation',
        namespace: 'voice:' + conversationId,
      });
      return response.value as unknown[] || [];
    } catch {
      return [];
    }
  }
}

// Singleton instance
let memoryClient: MemoryClient | null = null;

export function getMemoryClient(apiUrl?: string): MemoryClient {
  if (!memoryClient) {
    memoryClient = new MemoryClient(apiUrl);
  }
  return memoryClient;
}

export default MemoryClient;
