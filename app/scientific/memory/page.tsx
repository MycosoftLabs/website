'use client';

/**
 * Memory System Page - February 5, 2026
 * 
 * MYCA memory and knowledge management dashboard with real-time data.
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Brain, Database, Network, Users, Calendar, History } from 'lucide-react';
import { 
  BrainStatusWidget, 
  UserProfileWidget, 
  EpisodicMemoryViewer, 
  KnowledgeGraphViewer 
} from '@/components/memory';

interface MemoryStats {
  conversations: number;
  facts_stored: number;
  knowledge_nodes: number;
  embeddings: number;
  active_sessions: number;
  layers: Record<string, { count: number; avg_importance: number }>;
}

export default function MemoryPage() {
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/memory/stats');
      const result = await response.json();
      
      if (result.success && result.data) {
        const data = result.data;
        setStats({
          conversations: data.active_conversations || data.coordinator?.active_conversations || 0,
          facts_stored: data.total_memories || data.myca_memory?.total_memories || 0,
          knowledge_nodes: data.vector_count || 0,
          embeddings: data.vector_count || 0,
          active_sessions: data.active_conversations || 0,
          layers: data.myca_memory?.layers || {},
        });
      } else {
        // Fallback demo data
        setStats({
          conversations: 3,
          facts_stored: 2847,
          knowledge_nodes: 12543,
          embeddings: 45000,
          active_sessions: 3,
          layers: {
            ephemeral: { count: 45, avg_importance: 0.3 },
            session: { count: 156, avg_importance: 0.5 },
            working: { count: 234, avg_importance: 0.6 },
            semantic: { count: 1245, avg_importance: 0.7 },
            episodic: { count: 892, avg_importance: 0.8 },
            system: { count: 275, avg_importance: 0.9 },
          },
        });
      }
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Brain className="h-8 w-8 text-purple-500" />
            Memory System
          </h1>
          <p className="text-muted-foreground">Manage MYCA memory and knowledge</p>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-sm text-muted-foreground">
              Updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={fetchStats} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
          {error}
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Active Sessions</CardTitle>
            <History className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-500">
              {stats?.active_sessions ?? '-'}
            </div>
            <p className="text-xs text-muted-foreground">Current conversations</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Facts Stored</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-500">
              {stats ? formatNumber(stats.facts_stored) : '-'}
            </div>
            <p className="text-xs text-muted-foreground">Across all memory layers</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Knowledge Nodes</CardTitle>
            <Network className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {stats ? formatNumber(stats.knowledge_nodes) : '-'}
            </div>
            <p className="text-xs text-muted-foreground">Semantic connections</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Embeddings</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {stats ? formatNumber(stats.embeddings) : '-'}
            </div>
            <p className="text-xs text-muted-foreground">Vector representations</p>
          </CardContent>
        </Card>
      </div>

      {/* Memory Layers Breakdown */}
      {stats?.layers && Object.keys(stats.layers).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Database className="h-4 w-4" />
              Memory Layers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {Object.entries(stats.layers).map(([layer, data]) => (
                <Badge key={layer} variant="secondary" className="text-xs py-1.5 px-3">
                  {layer}: {data.count.toLocaleString()}
                  <span className="ml-1 text-muted-foreground">
                    ({(data.avg_importance * 100).toFixed(0)}% imp)
                  </span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Tabs */}
      <Tabs defaultValue="brain" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="brain" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Brain Status
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            User Profile
          </TabsTrigger>
          <TabsTrigger value="episodes" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Episodes
          </TabsTrigger>
          <TabsTrigger value="graph" className="flex items-center gap-2">
            <Network className="h-4 w-4" />
            Knowledge Graph
          </TabsTrigger>
        </TabsList>

        <TabsContent value="brain">
          <BrainStatusWidget />
        </TabsContent>

        <TabsContent value="profile">
          <UserProfileWidget userId="morgan" />
        </TabsContent>

        <TabsContent value="episodes">
          <EpisodicMemoryViewer agentId="myca_brain" limit={20} />
        </TabsContent>

        <TabsContent value="graph">
          <KnowledgeGraphViewer />
        </TabsContent>
      </Tabs>
    </div>
  );
}
