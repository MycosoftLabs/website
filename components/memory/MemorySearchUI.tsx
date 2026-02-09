'use client';

/**
 * MemorySearchUI - February 9, 2026
 *
 * Search-as-you-type interface for browsing and filtering memories
 * across all memory layers with real-time results.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Search,
  Filter,
  ArrowUpDown,
  Clock,
  Brain,
  Layers,
  Loader2,
  X,
  ChevronDown,
} from 'lucide-react';

interface MemoryResult {
  id: string;
  content: string;
  layer: string;
  timestamp: string;
  relevance: number;
  metadata?: Record<string, unknown>;
}

interface SearchResponse {
  results: MemoryResult[];
  total: number;
  query: string;
}

type MemoryLayer = 'all' | 'ephemeral' | 'session' | 'working' | 'semantic' | 'episodic' | 'system';
type SortOption = 'relevance' | 'newest' | 'oldest';

const LAYER_OPTIONS: Array<{ value: MemoryLayer; label: string }> = [
  { value: 'all', label: 'All Layers' },
  { value: 'ephemeral', label: 'Ephemeral' },
  { value: 'session', label: 'Session' },
  { value: 'working', label: 'Working' },
  { value: 'semantic', label: 'Semantic' },
  { value: 'episodic', label: 'Episodic' },
  { value: 'system', label: 'System' },
];

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
];

const LAYER_COLORS: Record<string, string> = {
  ephemeral: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20',
  session: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  working: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
  semantic: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  episodic: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
  system: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
};

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

function formatTimestamp(ts: string): string {
  try {
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return 'Unknown';
  }
}

function RelevanceBar({ score }: { score: number }) {
  const percentage = Math.round(score * 100);
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground">{percentage}%</span>
    </div>
  );
}

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`Search API error: ${r.status}`);
    return r.json();
  });

export function MemorySearchUI() {
  const [query, setQuery] = useState('');
  const [layer, setLayer] = useState<MemoryLayer>('all');
  const [sort, setSort] = useState<SortOption>('relevance');
  const [showFilters, setShowFilters] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedQuery = useDebounce(query, 300);

  const buildSearchUrl = useCallback(() => {
    if (!debouncedQuery.trim()) return null;
    const params = new URLSearchParams({
      q: debouncedQuery.trim(),
      limit: '20',
      sort,
    });
    if (layer !== 'all') {
      params.set('layer', layer);
    }
    return `/api/memory/search?${params.toString()}`;
  }, [debouncedQuery, layer, sort]);

  const {
    data: searchResponse,
    error: searchError,
    isLoading: isSearching,
  } = useSWR<SearchResponse>(buildSearchUrl(), fetcher, {
    revalidateOnFocus: false,
    keepPreviousData: true,
  });

  const hasQuery = debouncedQuery.trim().length > 0;
  const results = searchResponse?.results ?? [];
  const totalResults = searchResponse?.total ?? 0;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Search className="h-5 w-5" />
          Memory Search
        </CardTitle>
        <CardDescription>Search across all memory layers</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search memories..."
            className="w-full rounded-lg border bg-background py-2.5 pl-10 pr-10 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filters Row */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-1.5"
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
            <ChevronDown
              className={`h-3 w-3 transition-transform ${showFilters ? 'rotate-180' : ''}`}
            />
          </Button>

          {layer !== 'all' && (
            <Badge
              variant="secondary"
              className="cursor-pointer gap-1"
              onClick={() => setLayer('all')}
            >
              {layer}
              <X className="h-3 w-3" />
            </Badge>
          )}

          {sort !== 'relevance' && (
            <Badge
              variant="secondary"
              className="cursor-pointer gap-1"
              onClick={() => setSort('relevance')}
            >
              {SORT_OPTIONS.find((s) => s.value === sort)?.label}
              <X className="h-3 w-3" />
            </Badge>
          )}

          {hasQuery && !isSearching && (
            <span className="ml-auto text-xs text-muted-foreground">
              {totalResults.toLocaleString()} result{totalResults !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="flex flex-wrap gap-4 rounded-lg border bg-muted/30 p-3">
            <div className="space-y-1">
              <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <Layers className="h-3 w-3" />
                Layer
              </label>
              <select
                value={layer}
                onChange={(e) => setLayer(e.target.value as MemoryLayer)}
                className="rounded border bg-background px-2 py-1 text-sm"
              >
                {LAYER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <ArrowUpDown className="h-3 w-3" />
                Sort By
              </label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
                className="rounded border bg-background px-2 py-1 text-sm"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Results */}
        <div className="space-y-2">
          {/* Loading State */}
          {isSearching && hasQuery && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse rounded-lg border p-4">
                  <div className="mb-2 h-4 w-3/4 rounded bg-muted" />
                  <div className="mb-3 h-3 w-1/2 rounded bg-muted" />
                  <div className="flex gap-2">
                    <div className="h-5 w-16 rounded bg-muted" />
                    <div className="h-5 w-12 rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error State */}
          {searchError && hasQuery && !isSearching && (
            <div className="flex items-center justify-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive">
              <Brain className="h-5 w-5" />
              Failed to search memories. Please try again.
            </div>
          )}

          {/* Empty State -- No Query */}
          {!hasQuery && (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
              <Search className="h-8 w-8 opacity-40" />
              <p className="text-sm">Type to search across all memory layers</p>
            </div>
          )}

          {/* Empty State -- No Results */}
          {hasQuery && !isSearching && !searchError && results.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
              <Brain className="h-8 w-8 opacity-40" />
              <p className="text-sm">No memories found for &quot;{debouncedQuery}&quot;</p>
              {layer !== 'all' && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setLayer('all')}
                  className="text-xs"
                >
                  Try searching all layers
                </Button>
              )}
            </div>
          )}

          {/* Results List */}
          {!isSearching &&
            results.map((memory) => (
              <div
                key={memory.id}
                className="group rounded-lg border bg-card p-4 transition-colors hover:bg-accent/50"
              >
                {/* Content Preview */}
                <p className="mb-2 line-clamp-3 text-sm leading-relaxed">
                  {memory.content}
                </p>

                {/* Metadata Row */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Layer Badge */}
                  <Badge
                    variant="outline"
                    className={`text-xs ${LAYER_COLORS[memory.layer] ?? 'bg-muted'}`}
                  >
                    {memory.layer}
                  </Badge>

                  {/* Timestamp */}
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatTimestamp(memory.timestamp)}
                  </span>

                  {/* Relevance */}
                  <div className="ml-auto">
                    <RelevanceBar score={memory.relevance} />
                  </div>
                </div>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}
