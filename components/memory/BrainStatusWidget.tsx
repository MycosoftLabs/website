'use client';

/**
 * BrainStatusWidget - February 5, 2026
 * 
 * Displays MYCA Brain status including LLM providers and memory coordinator status.
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Brain, Cpu, Database, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface ProviderHealth {
  healthy: boolean;
  last_check?: string;
  error?: string;
}

interface BrainStatus {
  status: string;
  brain: {
    initialized: boolean;
    frontier_router?: boolean;
    memory_coordinator?: boolean;
  };
  providers: Record<string, ProviderHealth>;
  memory?: {
    total_memories?: number;
    active_sessions?: number;
  };
  timestamp: string;
}

export function BrainStatusWidget() {
  const [status, setStatus] = useState<BrainStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/brain?endpoint=status');
      const result = await response.json();
      
      if (result.success && result.data) {
        setStatus(result.data);
      } else {
        setError(result.error || 'Failed to fetch brain status');
        // Set fallback status
        setStatus({
          status: 'unavailable',
          brain: { initialized: false },
          providers: {},
          timestamp: new Date().toISOString(),
        });
      }
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Auto-refresh every 15 seconds
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (healthy: boolean | undefined) => {
    if (healthy === undefined) return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    return healthy ? (
      <CheckCircle2 className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge variant="default" className="bg-green-500">Healthy</Badge>;
      case 'degraded':
        return <Badge variant="secondary" className="bg-yellow-500">Degraded</Badge>;
      case 'unavailable':
        return <Badge variant="destructive">Unavailable</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const providerNames: Record<string, string> = {
    gemini: 'Google Gemini',
    claude: 'Anthropic Claude',
    openai: 'OpenAI GPT-4',
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5" />
            MYCA Brain Status
          </CardTitle>
          <CardDescription>
            LLM providers and memory coordinator health
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={fetchStatus} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="text-sm text-destructive">{error}</div>
        )}
        
        {/* Overall Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Overall Status</span>
          {status && getStatusBadge(status.status)}
        </div>

        {/* Core Components */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground">Core Components</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 text-sm">
              {getStatusIcon(status?.brain?.initialized)}
              <span>Brain Initialized</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {getStatusIcon(status?.brain?.frontier_router)}
              <span>Frontier Router</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {getStatusIcon(status?.brain?.memory_coordinator)}
              <span>Memory Coordinator</span>
            </div>
          </div>
        </div>

        {/* LLM Providers */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground">LLM Providers</div>
          <div className="space-y-2">
            {status?.providers && Object.keys(status.providers).length > 0 ? (
              Object.entries(status.providers).map(([provider, health]) => (
                <div key={provider} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-muted-foreground" />
                    <span>{providerNames[provider] || provider}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(health.healthy)}
                    <Badge variant={health.healthy ? 'default' : 'destructive'} className="text-xs">
                      {health.healthy ? 'Available' : 'Unavailable'}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">
                No provider status available
              </div>
            )}
          </div>
        </div>

        {/* Memory Stats */}
        {status?.memory && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Memory</div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <span>{status.memory.total_memories || 0} memories</span>
              </div>
              <div className="flex items-center gap-2">
                <span>{status.memory.active_sessions || 0} active sessions</span>
              </div>
            </div>
          </div>
        )}

        {/* Last Updated */}
        {lastUpdated && (
          <div className="text-xs text-muted-foreground text-right">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default BrainStatusWidget;
