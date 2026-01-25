'use client';

/**
 * Incident Stream Component
 * 
 * Blockchain-explorer-style real-time incident visualization.
 * Inspired by mempool.space Bitcoin explorer design.
 * 
 * Features:
 * - Live streaming incidents with animations
 * - Color-coded severity indicators
 * - Hash visualization for cryptographic chain
 * - Auto-scrolling with pause on hover
 * - Expandable incident details
 * 
 * @version 1.0.0
 * @date January 24, 2026
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Clock,
  Hash,
  Link2,
  User,
  Bot,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Activity,
  Zap,
  Eye,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Pause,
  Play,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface Incident {
  id: string;
  title: string;
  description: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'contained' | 'resolved' | 'closed';
  created_at: string;
  updated_at: string;
  tags: string[];
  timeline: Array<{
    timestamp: string;
    action: string;
    actor: string;
    details: string;
  }>;
}

interface ChainEntry {
  id: string;
  incident_id: string;
  sequence_number: number;
  event_hash: string;
  previous_hash: string;
  merkle_root: string | null;
  event_type: string;
  reporter_type: string;
  reporter_id: string;
  reporter_name: string;
  created_at: string;
}

interface IncidentStreamProps {
  className?: string;
  maxItems?: number;
  autoScroll?: boolean;
  showChainInfo?: boolean;
  onIncidentClick?: (incident: Incident) => void;
}

// ═══════════════════════════════════════════════════════════════
// SEVERITY CONFIG
// ═══════════════════════════════════════════════════════════════

const severityConfig = {
  critical: {
    bg: 'bg-red-950/80',
    border: 'border-red-500',
    text: 'text-red-400',
    glow: 'shadow-red-500/30',
    icon: ShieldAlert,
    pulse: true,
  },
  high: {
    bg: 'bg-orange-950/80',
    border: 'border-orange-500',
    text: 'text-orange-400',
    glow: 'shadow-orange-500/20',
    icon: AlertTriangle,
    pulse: true,
  },
  medium: {
    bg: 'bg-yellow-950/80',
    border: 'border-yellow-500',
    text: 'text-yellow-400',
    glow: 'shadow-yellow-500/10',
    icon: AlertTriangle,
    pulse: false,
  },
  low: {
    bg: 'bg-blue-950/80',
    border: 'border-blue-500',
    text: 'text-blue-400',
    glow: '',
    icon: ShieldCheck,
    pulse: false,
  },
  info: {
    bg: 'bg-slate-800/80',
    border: 'border-slate-600',
    text: 'text-slate-400',
    glow: '',
    icon: Activity,
    pulse: false,
  },
};

const statusConfig = {
  open: { bg: 'bg-red-600', text: 'Open' },
  investigating: { bg: 'bg-yellow-600', text: 'Investigating' },
  contained: { bg: 'bg-blue-600', text: 'Contained' },
  resolved: { bg: 'bg-green-600', text: 'Resolved' },
  closed: { bg: 'bg-slate-600', text: 'Closed' },
};

// ═══════════════════════════════════════════════════════════════
// HASH DISPLAY COMPONENT
// ═══════════════════════════════════════════════════════════════

function HashDisplay({ hash, label, truncate = true }: { hash: string; label?: string; truncate?: boolean }) {
  const [copied, setCopied] = useState(false);
  
  const displayHash = truncate ? `${hash.slice(0, 8)}...${hash.slice(-8)}` : hash;
  
  const handleCopy = () => {
    navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 font-mono text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
      title={`${label || 'Hash'}: ${hash}`}
    >
      <Hash className="h-3 w-3" />
      <span>{displayHash}</span>
      {copied && <span className="text-green-400 ml-1">✓</span>}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════
// INCIDENT CARD COMPONENT
// ═══════════════════════════════════════════════════════════════

function IncidentCard({ 
  incident, 
  chainEntry,
  isNew,
  onClick,
}: { 
  incident: Incident;
  chainEntry?: ChainEntry;
  isNew: boolean;
  onClick?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const config = severityConfig[incident.severity];
  const status = statusConfig[incident.status];
  const Icon = config.icon;
  
  const timeSince = getTimeSince(new Date(incident.created_at));
  
  // Handle card click - toggle expanded state
  const handleCardClick = () => {
    setExpanded(!expanded);
    // Also call onClick if provided (for selection purposes)
    if (onClick) onClick();
  };
  
  return (
    <motion.div
      layout
      initial={isNew ? { opacity: 0, x: -50, scale: 0.95 } : false}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 50, scale: 0.95 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn(
        'relative border rounded-lg p-4 cursor-pointer transition-all duration-200',
        config.bg,
        config.border,
        config.glow && `shadow-lg ${config.glow}`,
        config.pulse && 'animate-pulse',
        'hover:scale-[1.01] hover:shadow-xl'
      )}
      onClick={handleCardClick}
    >
      {/* Severity indicator bar */}
      <div className={cn(
        'absolute left-0 top-0 bottom-0 w-1 rounded-l-lg',
        config.border.replace('border-', 'bg-')
      )} />
      
      {/* Header */}
      <div className="flex items-start justify-between gap-4 pl-2">
        <div className="flex items-center gap-3">
          <div className={cn(
            'p-2 rounded-lg',
            config.bg,
            config.border,
            'border'
          )}>
            <Icon className={cn('h-5 w-5', config.text)} />
          </div>
          
          <div>
            <h3 className="font-semibold text-white line-clamp-1">
              {incident.title}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn('text-xs uppercase font-bold', config.text)}>
                {incident.severity}
              </span>
              <span className="text-slate-500">•</span>
              <span className={cn(
                'px-2 py-0.5 rounded text-xs font-medium text-white',
                status.bg
              )}>
                {status.text}
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {timeSince}
              </span>
            </div>
          </div>
        </div>
        
        {/* Dropdown indicator - visual only, click handled by card */}
        <div className="p-1 hover:bg-slate-700/50 rounded">
          {expanded ? (
            <ChevronUp className="h-5 w-5 text-slate-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-slate-400" />
          )}
        </div>
      </div>
      
      {/* Chain info */}
      {chainEntry && (
        <div className="flex items-center gap-4 mt-3 pl-2 py-2 border-t border-slate-700/50">
          <div className="flex items-center gap-2">
            <Link2 className="h-3 w-3 text-slate-500" />
            <span className="text-xs text-slate-500">#{chainEntry.sequence_number}</span>
          </div>
          <HashDisplay hash={chainEntry.event_hash} label="Event Hash" />
          <div className="flex items-center gap-1 text-xs text-slate-500">
            {chainEntry.reporter_type === 'agent' ? (
              <Bot className="h-3 w-3 text-cyan-400" />
            ) : (
              <User className="h-3 w-3 text-slate-400" />
            )}
            <span>{chainEntry.reporter_name}</span>
          </div>
        </div>
      )}
      
      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-4 pl-2 space-y-3 border-t border-slate-700/50 pt-3">
              <p className="text-sm text-slate-300">{incident.description}</p>
              
              {/* Tags */}
              {incident.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {incident.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 text-xs bg-slate-700/50 text-slate-400 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              
              {/* Timeline preview */}
              {incident.timeline.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase">
                    Recent Activity
                  </h4>
                  {incident.timeline.slice(-3).reverse().map((entry, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <ArrowRight className="h-3 w-3 text-slate-500 mt-0.5" />
                      <span className="text-slate-400">
                        <span className="text-white">{entry.actor}</span>
                        {' '}{entry.action}: {entry.details}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* New indicator */}
      {isNew && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ delay: 2, duration: 1 }}
          className="absolute -top-2 -right-2 px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded-full"
        >
          NEW
        </motion.div>
      )}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function getTimeSince(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function IncidentStream({
  className,
  maxItems = 50,
  autoScroll = true,
  showChainInfo = true,
  onIncidentClick,
}: IncidentStreamProps) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [chainEntries, setChainEntries] = useState<Map<string, ChainEntry>>(new Map());
  const [newIncidentIds, setNewIncidentIds] = useState<Set<string>>(new Set());
  const [isPaused, setIsPaused] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    lastHour: 0,
    chainSequence: 0,
  });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  
  // Connect to SSE stream
  useEffect(() => {
    const url = new URL('/api/security/incidents/stream', window.location.origin);
    url.searchParams.set('chain', 'true');
    url.searchParams.set('activity', 'false');
    
    const eventSource = new EventSource(url.toString());
    eventSourceRef.current = eventSource;
    
    eventSource.onopen = () => {
      setIsConnected(true);
      console.log('[IncidentStream] Connected to SSE');
    };
    
    eventSource.onerror = () => {
      setIsConnected(false);
      console.error('[IncidentStream] SSE error');
    };
    
    eventSource.addEventListener('connected', () => {
      setIsConnected(true);
    });
    
    eventSource.addEventListener('initial_incidents', (e) => {
      const data = JSON.parse(e.data) as Incident[];
      setIncidents(data);
      setStats(prev => ({ ...prev, total: data.length }));
    });
    
    eventSource.addEventListener('initial_chain', (e) => {
      const data = JSON.parse(e.data) as ChainEntry[];
      const map = new Map<string, ChainEntry>();
      data.forEach(entry => {
        if (entry.incident_id) {
          map.set(entry.incident_id, entry);
        }
      });
      setChainEntries(map);
      if (data.length > 0) {
        setStats(prev => ({ ...prev, chainSequence: data[0].sequence_number }));
      }
    });
    
    eventSource.addEventListener('incident', (e) => {
      if (isPaused) return;
      
      const incident = JSON.parse(e.data) as Incident;
      
      setIncidents(prev => {
        // Check if it's an update or new
        const existingIndex = prev.findIndex(i => i.id === incident.id);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = incident;
          return updated;
        }
        
        // Mark as new
        setNewIncidentIds(ids => new Set([...ids, incident.id]));
        setTimeout(() => {
          setNewIncidentIds(ids => {
            const newIds = new Set(ids);
            newIds.delete(incident.id);
            return newIds;
          });
        }, 3000);
        
        return [incident, ...prev.slice(0, maxItems - 1)];
      });
    });
    
    eventSource.addEventListener('chain', (e) => {
      const entry = JSON.parse(e.data) as ChainEntry;
      setChainEntries(prev => {
        const map = new Map(prev);
        if (entry.incident_id) {
          map.set(entry.incident_id, entry);
        }
        return map;
      });
      setStats(prev => ({ ...prev, chainSequence: entry.sequence_number }));
    });
    
    eventSource.addEventListener('heartbeat', () => {
      // Keep connection alive indicator
    });
    
    return () => {
      eventSource.close();
    };
  }, [isPaused, maxItems]);
  
  // Filter incidents
  const filteredIncidents = incidents.filter(incident => {
    if (filter !== 'all' && incident.severity !== filter && incident.status !== filter) {
      return false;
    }
    if (searchTerm && !incident.title.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });
  
  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between gap-4 p-4 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className={cn(
            'h-3 w-3 rounded-full',
            isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
          )} />
          <h2 className="font-bold text-lg text-white">Live Incident Stream</h2>
          <span className="text-xs text-slate-500">
            Chain #{stats.chainSequence}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
          
          {/* Filter */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="open">Open</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
          </select>
          
          {/* Pause/Play */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={cn(
              'p-2 rounded border transition-colors',
              isPaused
                ? 'bg-yellow-500/10 border-yellow-500 text-yellow-400'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            )}
            title={isPaused ? 'Resume stream' : 'Pause stream'}
          >
            {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </button>
        </div>
      </div>
      
      {/* Stream */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
      >
        <AnimatePresence mode="popLayout">
          {filteredIncidents.map(incident => (
            <IncidentCard
              key={incident.id}
              incident={incident}
              chainEntry={showChainInfo ? chainEntries.get(incident.id) : undefined}
              isNew={newIncidentIds.has(incident.id)}
              onClick={() => onIncidentClick?.(incident)}
            />
          ))}
        </AnimatePresence>
        
        {filteredIncidents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <ShieldCheck className="h-12 w-12 mb-4" />
            <p>No incidents to display</p>
            <p className="text-sm">The stream is active and waiting...</p>
          </div>
        )}
      </div>
      
      {/* Footer stats */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-slate-700/50 text-xs text-slate-500">
        <span>{filteredIncidents.length} incidents</span>
        <span className="flex items-center gap-1">
          <Zap className="h-3 w-3" />
          Real-time • Cryptographically Secured
        </span>
      </div>
    </div>
  );
}

export default IncidentStream;
