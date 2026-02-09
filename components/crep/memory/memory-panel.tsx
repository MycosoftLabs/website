/**
 * Memory Panel - February 6, 2026
 * 
 * UI for agent memory display and interaction.
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  Search, 
  Clock, 
  MapPin, 
  Bookmark, 
  MessageSquare,
  Sparkles,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { useAgentMemory, SemanticSearchResult, UserContext } from '@/hooks/useAgentMemory';

interface MemoryPanelProps {
  userId?: string;
  sessionId?: string;
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export function MemoryPanel({
  userId,
  sessionId,
  isCollapsed = false,
  onToggle,
}: MemoryPanelProps) {
  const {
    search,
    searchResults,
    isSearching,
    context,
    isLoading,
  } = useAgentMemory(userId);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('context');

  const handleSearch = async () => {
    if (searchQuery.trim()) {
      await search(searchQuery);
    }
  };

  if (isCollapsed) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-card border rounded-lg p-2 cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Memory</span>
          <ChevronUp className="h-4 w-4 ml-auto" />
        </div>
      </motion.div>
    );
  }

  return (
    <Card className="w-80 shadow-lg">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            Agent Memory
          </CardTitle>
          {onToggle && (
            <Button variant="ghost" size="sm" onClick={onToggle}>
              <ChevronDown className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-3">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 mb-3">
            <TabsTrigger value="context" className="text-xs">Context</TabsTrigger>
            <TabsTrigger value="search" className="text-xs">Search</TabsTrigger>
            <TabsTrigger value="history" className="text-xs">History</TabsTrigger>
          </TabsList>

          <TabsContent value="context" className="mt-0">
            <ContextView context={context} isLoading={isLoading} />
          </TabsContent>

          <TabsContent value="search" className="mt-0">
            <SearchView
              query={searchQuery}
              setQuery={setSearchQuery}
              onSearch={handleSearch}
              results={searchResults}
              isSearching={isSearching}
            />
          </TabsContent>

          <TabsContent value="history" className="mt-0">
            <HistoryView context={context} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function ContextView({
  context,
  isLoading,
}: {
  context?: UserContext;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Sparkles className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!context) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No context available
      </p>
    );
  }

  return (
    <ScrollArea className="h-48">
      <div className="space-y-3">
        {/* Recent Activity */}
        {context.recent_entities.length > 0 && (
          <div>
            <h4 className="text-xs font-medium mb-2 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Recent Activity
            </h4>
            <div className="space-y-1">
              {context.recent_entities.slice(0, 5).map((entity, i) => (
                <div
                  key={i}
                  className="text-xs bg-muted rounded px-2 py-1 flex items-center gap-2"
                >
                  <Badge variant="outline" className="text-[10px]">
                    {entity.entity_type}
                  </Badge>
                  <span className="truncate">{entity.entity_name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Saved Views */}
        {context.saved_views.length > 0 && (
          <div>
            <h4 className="text-xs font-medium mb-2 flex items-center gap-1">
              <Bookmark className="h-3 w-3" />
              Saved Views
            </h4>
            <div className="flex flex-wrap gap-1">
              {context.saved_views.slice(0, 5).map((view) => (
                <Badge key={view.id} variant="secondary" className="text-[10px]">
                  {view.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Preferred Layers */}
        {context.preferred_layers.length > 0 && (
          <div>
            <h4 className="text-xs font-medium mb-2 flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              Preferred Layers
            </h4>
            <div className="flex flex-wrap gap-1">
              {context.preferred_layers.map((layer, i) => (
                <Badge key={i} variant="outline" className="text-[10px]">
                  {layer}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

function SearchView({
  query,
  setQuery,
  onSearch,
  results,
  isSearching,
}: {
  query: string;
  setQuery: (q: string) => void;
  onSearch: () => void;
  results: SemanticSearchResult[];
  isSearching: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="Search memory..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSearch()}
          className="h-8 text-sm"
        />
        <Button size="sm" onClick={onSearch} disabled={isSearching}>
          <Search className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="h-40">
        <AnimatePresence>
          {results.map((result, i) => (
            <motion.div
              key={result.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-2 mb-2 bg-muted rounded-md"
            >
              <div className="flex items-start justify-between">
                <span className="text-xs font-medium">{result.name}</span>
                <Badge variant="outline" className="text-[10px]">
                  {Math.round(result.similarity * 100)}%
                </Badge>
              </div>
              {result.description && (
                <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                  {result.description}
                </p>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {results.length === 0 && !isSearching && query && (
          <p className="text-xs text-muted-foreground text-center py-4">
            No results found
          </p>
        )}
      </ScrollArea>
    </div>
  );
}

function HistoryView({ context }: { context?: UserContext }) {
  if (!context?.recent_queries.length) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No query history
      </p>
    );
  }

  return (
    <ScrollArea className="h-48">
      <div className="space-y-1">
        {context.recent_queries.slice(0, 15).map((query, i) => (
          <div
            key={i}
            className="text-xs bg-muted rounded px-2 py-1.5 flex items-center gap-2"
          >
            <MessageSquare className="h-3 w-3 text-muted-foreground" />
            <span className="truncate">{query}</span>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

export default MemoryPanel;