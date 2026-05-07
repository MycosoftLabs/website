'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Send,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Cpu,
  Zap,
  Database,
  MessageSquare,
  ChevronRight,
  Server,
} from 'lucide-react';

interface MasStatus {
  status: 'online' | 'offline' | 'degraded' | 'fallback';
  version?: string;
  capabilities?: string[];
  activeNodes?: number;
  systemHealth?: number;
  persona?: string;
  fallback?: boolean;
  error?: string;
}

interface MycaResponse {
  answer: string;
  confidence: number;
  sources: string[];
  suggestedQuestions?: string[];
  fallback?: boolean;
}

const SUGGESTED_QUERIES = [
  'What species are active in the network?',
  'Report MINDEX taxonomy status',
  'Show current MAS orchestrator health',
  'What agents are currently running?',
  'Analyze fungal dispersal patterns',
];

export function MycaMasPanel({ userId }: { userId?: string }) {
  const [masStatus, setMasStatus] = useState<MasStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [queryLoading, setQueryLoading] = useState(false);
  const [response, setResponse] = useState<MycaResponse | null>(null);
  const [history, setHistory] = useState<{ query: string; response: MycaResponse; ts: Date }[]>([]);

  const fetchStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      // Try MAS health endpoint
      const [masRes, mycaRes] = await Promise.allSettled([
        fetch('/api/mas/health', { cache: 'no-store' }),
        fetch('/api/myca?action=context', { cache: 'no-store' }),
      ]);

      let combined: MasStatus = { status: 'offline' };

      if (masRes.status === 'fulfilled' && masRes.value.ok) {
        const data = await masRes.value.json();
        combined = {
          status: data.status === 'online' ? 'online' : data.fallback ? 'fallback' : 'degraded',
          version: data.version,
          fallback: data.fallback,
          ...data,
        };
      } else if (mycaRes.status === 'fulfilled' && mycaRes.value.ok) {
        const data = await mycaRes.value.json();
        combined = {
          status: 'degraded', // MAS offline but MYCA responding
          activeNodes: data.activeNodes,
          systemHealth: data.systemHealth,
          persona: 'MYCA',
          fallback: true,
        };
      }

      setMasStatus(combined);
    } catch {
      setMasStatus({ status: 'offline', error: 'Connection failed' });
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleQuery = async (q?: string) => {
    const question = q || query;
    if (!question.trim()) return;
    setQueryLoading(true);
    setResponse(null);
    try {
      const res = await fetch('/api/myca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, userId, context: { masStatus } }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: MycaResponse = await res.json();
      setResponse(data);
      setHistory(prev => [{ query: question, response: data, ts: new Date() }, ...prev.slice(0, 9)]);
    } catch (e: any) {
      setResponse({
        answer: `Connection error: ${e.message}. MAS/MYCA backend may be offline.`,
        confidence: 0,
        sources: [],
        fallback: true,
      });
    } finally {
      setQueryLoading(false);
      setQuery('');
    }
  };

  const StatusBadge = () => {
    if (statusLoading) return (
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-zinc-600 animate-pulse" />
        <span className="text-[10px] font-mono text-zinc-500 uppercase">CONNECTING TO MAS...</span>
      </div>
    );

    const cfg: Record<string, { dot: string; label: string; textColor: string }> = {
      online:   { dot: 'bg-emerald-500 animate-pulse', label: 'MAS ONLINE',      textColor: 'text-emerald-500' },
      degraded: { dot: 'bg-amber-500 animate-pulse',   label: 'MAS DEGRADED',    textColor: 'text-amber-500'  },
      fallback: { dot: 'bg-amber-500',                 label: 'MAS FALLBACK',    textColor: 'text-amber-500'  },
      offline:  { dot: 'bg-red-500',                   label: 'MAS OFFLINE',     textColor: 'text-red-500'    },
    };
    const s = cfg[masStatus?.status || 'offline'];

    return (
      <div className={`flex items-center gap-2 text-[10px] font-mono ${s.textColor}`}>
        <div className={`w-2 h-2 rounded-full ${s.dot}`} />
        {s.label}
        {masStatus?.fallback && (
          <span className="text-zinc-500">· MYCA MOCK MODE</span>
        )}
        {masStatus?.systemHealth !== undefined && (
          <span className="text-zinc-500">· {masStatus.systemHealth.toFixed(1)}% health</span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-2xl font-bold text-white">MYCA · MAS Interface</h3>
          <p className="text-zinc-500 text-sm">Mycosoft Agent System orchestration and MYCA intelligence query layer.</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge />
          <button
            onClick={fetchStatus}
            disabled={statusLoading}
            className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-zinc-800 text-zinc-400 text-[10px] font-bold uppercase tracking-widest rounded-xl hover:border-zinc-700 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${statusLoading ? 'animate-spin' : ''}`} />
            Sync
          </button>
        </div>
      </div>

      {/* MAS Status Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'MAS Status',
            value: masStatus?.status?.toUpperCase() || '---',
            icon: <Server className="w-4 h-4" />,
            color: masStatus?.status === 'online' ? 'text-emerald-500' : masStatus?.status === 'offline' ? 'text-red-500' : 'text-amber-500',
            bg: masStatus?.status === 'online' ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-zinc-900/40 border-zinc-800',
          },
          {
            label: 'MYCA Persona',
            value: masStatus?.persona || 'MYCA',
            icon: <Brain className="w-4 h-4" />,
            color: 'text-purple-400',
            bg: 'bg-zinc-900/40 border-zinc-800',
          },
          {
            label: 'Active Nodes',
            value: masStatus?.activeNodes !== undefined ? String(masStatus.activeNodes) : '---',
            icon: <Cpu className="w-4 h-4" />,
            color: 'text-blue-400',
            bg: 'bg-zinc-900/40 border-zinc-800',
          },
          {
            label: 'System Health',
            value: masStatus?.systemHealth !== undefined ? `${masStatus.systemHealth.toFixed(1)}%` : '---',
            icon: <Activity className="w-4 h-4" />,
            color: masStatus?.systemHealth && masStatus.systemHealth > 90 ? 'text-emerald-400' : 'text-amber-400',
            bg: 'bg-zinc-900/40 border-zinc-800',
          },
        ].map(({ label, value, icon, color, bg }) => (
          <div key={label} className={`p-4 border rounded-2xl space-y-3 ${bg}`}>
            <div className={`flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-zinc-500`}>
              {icon} {label}
            </div>
            <p className={`text-xl font-mono font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Fallback warning */}
      {masStatus?.fallback && (
        <div className="flex items-center gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <p className="text-xs text-amber-400">
            MAS orchestrator is offline or in fallback mode. MYCA is responding with mock data.
            Deploy the MAS backend or set <code className="text-white font-mono">MAS_API_URL</code> to connect to a live instance.
          </p>
        </div>
      )}

      {/* MYCA Query Interface */}
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-purple-500/10 border border-purple-500/20 rounded-lg flex items-center justify-center">
            <Brain className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">MYCA Intelligence Query</h4>
            <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Mycological Intelligence & Analysis</p>
          </div>
        </div>

        {/* Suggested queries */}
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_QUERIES.map(sq => (
            <button
              key={sq}
              onClick={() => handleQuery(sq)}
              disabled={queryLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800/50 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600 text-[10px] font-mono rounded-lg transition-all disabled:opacity-50"
            >
              <ChevronRight className="w-2.5 h-2.5" />
              {sq}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleQuery()}
              placeholder="Ask MYCA about species, MAS status, or agent performance..."
              className="w-full bg-zinc-800/50 border border-zinc-700 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-zinc-600 transition-all"
            />
          </div>
          <button
            onClick={() => handleQuery()}
            disabled={queryLoading || !query.trim()}
            className="flex items-center gap-2 px-5 py-3.5 bg-purple-500 hover:bg-purple-400 text-black text-[10px] font-bold uppercase tracking-widest rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {queryLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Query
          </button>
        </div>

        {/* Response */}
        <AnimatePresence mode="wait">
          {queryLoading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-3 p-4 bg-zinc-800/50 border border-zinc-700 rounded-2xl"
            >
              <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-zinc-400 font-mono">MYCA processing query...</p>
            </motion.div>
          )}
          {response && !queryLoading && (
            <motion.div
              key="response"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`space-y-4 p-5 border rounded-2xl ${response.fallback ? 'bg-amber-900/5 border-amber-500/20' : 'bg-zinc-800/30 border-zinc-700'}`}
            >
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm text-zinc-200 leading-relaxed flex-1">{response.answer}</p>
                <div className="flex-shrink-0 text-right">
                  <p className="text-[9px] font-mono text-zinc-500 uppercase">Confidence</p>
                  <p className={`text-lg font-mono font-bold ${response.confidence > 0.8 ? 'text-emerald-500' : response.confidence > 0.5 ? 'text-amber-500' : 'text-red-500'}`}>
                    {(response.confidence * 100).toFixed(0)}%
                  </p>
                </div>
              </div>
              {response.sources.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[9px] text-zinc-600 uppercase font-bold tracking-widest">Sources:</span>
                  {response.sources.map(s => (
                    <span key={s} className="text-[9px] px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-400 font-mono">{s}</span>
                  ))}
                </div>
              )}
              {response.fallback && (
                <div className="flex items-center gap-2 text-[9px] text-amber-500/70 font-mono">
                  <AlertTriangle className="w-3 h-3" />
                  MYCA is in mock mode — connect MAS backend for live intelligence
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Query History */}
      {history.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
            <Database className="w-3 h-3" />
            Session Query Log
          </h4>
          <div className="space-y-3">
            {history.map((entry, idx) => (
              <div key={idx} className="p-4 bg-zinc-900/20 border border-zinc-800/50 rounded-xl space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                    <p className="text-[10px] text-zinc-300 font-mono">{entry.query}</p>
                  </div>
                  <span className="text-[9px] text-zinc-600 font-mono flex-shrink-0">{entry.ts.toLocaleTimeString()}</span>
                </div>
                <p className="text-[10px] text-zinc-500 line-clamp-2 pl-5">{entry.response.answer}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
