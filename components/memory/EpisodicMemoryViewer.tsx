'use client';

/**
 * EpisodicMemoryViewer - February 5, 2026
 * 
 * Timeline view of significant events from MYCA's episodic memory.
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Calendar, ChevronDown, ChevronRight, Zap, MessageSquare, Wrench, Bot } from 'lucide-react';

interface Episode {
  id: string;
  event_type: string;
  description: string;
  importance: number;
  context?: Record<string, unknown>;
  timestamp: string;
  agent_id?: string;
}

interface EpisodicMemoryViewerProps {
  agentId?: string;
  limit?: number;
}

export function EpisodicMemoryViewer({ agentId = 'myca_brain', limit = 20 }: EpisodicMemoryViewerProps) {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  const fetchEpisodes = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        agent_id: agentId,
        limit: limit.toString(),
        ...(filterType !== 'all' && { event_type: filterType }),
      });
      
      const response = await fetch(`/api/memory/episodes?${params}`);
      const result = await response.json();
      
      if (result.success && result.data) {
        setEpisodes(result.data.episodes || result.data || []);
      } else {
        setError(result.error || 'Failed to fetch episodes');
        setEpisodes([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setEpisodes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEpisodes();
  }, [agentId, filterType]);

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'tool_execution':
        return <Wrench className="h-4 w-4" />;
      case 'agent_invocation':
        return <Bot className="h-4 w-4" />;
      case 'conversation':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <Zap className="h-4 w-4" />;
    }
  };

  const getImportanceBadge = (importance: number) => {
    if (importance >= 0.8) return <Badge className="bg-red-500 text-xs">High</Badge>;
    if (importance >= 0.5) return <Badge className="bg-yellow-500 text-xs">Medium</Badge>;
    return <Badge variant="outline" className="text-xs">Low</Badge>;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const eventTypes = ['all', 'tool_execution', 'agent_invocation', 'conversation', 'system_status', 'memory_insight'];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Episodic Memory
          </CardTitle>
          <CardDescription>
            Timeline of significant events
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              {eventTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type === 'all' ? 'All Events' : type.replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchEpisodes} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="text-sm text-destructive mb-4">{error}</div>
        )}

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading episodes...</div>
        ) : episodes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No episodes recorded</div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {episodes.map((episode) => (
              <div
                key={episode.id}
                className="border rounded-lg p-3 hover:bg-muted/50 cursor-pointer"
                onClick={() => setExpandedId(expandedId === episode.id ? null : episode.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {expandedId === episode.id ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    {getEventIcon(episode.event_type)}
                    <Badge variant="outline" className="text-xs">
                      {episode.event_type.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {getImportanceBadge(episode.importance)}
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(episode.timestamp)}
                    </span>
                  </div>
                </div>
                <div className="mt-2 text-sm">{episode.description}</div>
                
                {expandedId === episode.id && episode.context && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="text-xs font-medium text-muted-foreground mb-2">Context</div>
                    <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                      {JSON.stringify(episode.context, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default EpisodicMemoryViewer;
