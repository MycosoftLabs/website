'use client';

/**
 * Agent Activity Stream Component
 * 
 * Real-time visualization of agent actions on incidents.
 * Shows which agents are detecting, investigating, and resolving incidents.
 * 
 * @version 1.0.0
 * @date January 24, 2026
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Shield,
  Search,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Bell,
  Eye,
  ArrowUpRight,
  Activity,
  Zap,
  Clock,
  Hash,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface AgentActivity {
  id: string;
  agent_id: string;
  agent_name: string;
  agent_category: 'security' | 'infrastructure' | 'data' | 'communication' | 'core';
  incident_id: string | null;
  action_type: 'detected' | 'investigated' | 'analyzed' | 'fixed' | 'escalated' | 'logged' | 'resolved' | 'notified' | 'monitored';
  action_data: Record<string, unknown>;
  event_hash: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
}

interface AgentActivityStreamProps {
  className?: string;
  maxItems?: number;
  filterAgents?: string[];
  onActivityClick?: (activity: AgentActivity) => void;
}

// ═══════════════════════════════════════════════════════════════
// ACTION CONFIG
// ═══════════════════════════════════════════════════════════════

const actionConfig = {
  detected: {
    icon: AlertTriangle,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    label: 'Detected',
  },
  investigated: {
    icon: Search,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    label: 'Investigating',
  },
  analyzed: {
    icon: Eye,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    label: 'Analyzed',
  },
  fixed: {
    icon: Wrench,
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    label: 'Fixed',
  },
  escalated: {
    icon: ArrowUpRight,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    label: 'Escalated',
  },
  logged: {
    icon: Hash,
    color: 'text-slate-400',
    bg: 'bg-slate-500/10',
    label: 'Logged',
  },
  resolved: {
    icon: CheckCircle2,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    label: 'Resolved',
  },
  notified: {
    icon: Bell,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    label: 'Notified',
  },
  monitored: {
    icon: Activity,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    label: 'Monitoring',
  },
};

const categoryConfig = {
  security: { color: 'text-red-400', bg: 'bg-red-500/20' },
  infrastructure: { color: 'text-blue-400', bg: 'bg-blue-500/20' },
  data: { color: 'text-purple-400', bg: 'bg-purple-500/20' },
  communication: { color: 'text-green-400', bg: 'bg-green-500/20' },
  core: { color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
};

const severityColors = {
  critical: 'border-l-red-500',
  high: 'border-l-orange-500',
  medium: 'border-l-yellow-500',
  low: 'border-l-blue-500',
  info: 'border-l-slate-500',
};

// ═══════════════════════════════════════════════════════════════
// ACTIVITY CARD
// ═══════════════════════════════════════════════════════════════

function ActivityCard({
  activity,
  isNew,
  onClick,
}: {
  activity: AgentActivity;
  isNew: boolean;
  onClick?: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const action = actionConfig[activity.action_type];
  const category = categoryConfig[activity.agent_category];
  const Icon = action.icon;
  
  const timeSince = getTimeSince(new Date(activity.created_at));
  
  const handleClick = () => {
    setIsExpanded(!isExpanded);
    onClick?.();
  };
  
  return (
    <motion.div
      layout
      initial={isNew ? { opacity: 0, y: -20, scale: 0.95 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn(
        'relative rounded-lg border-l-4 overflow-hidden',
        'bg-slate-800/50 transition-colors',
        severityColors[activity.severity]
      )}
    >
      {/* Main Card Content */}
      <button
        onClick={handleClick}
        className="w-full flex items-start gap-3 p-3 text-left hover:bg-slate-800 transition-colors"
      >
        {/* Action icon */}
        <div className={cn('p-2 rounded-lg flex-shrink-0', action.bg)}>
          <Icon className={cn('h-4 w-4', action.color)} />
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Bot className={cn('h-4 w-4', category.color)} />
            <span className="font-medium text-white text-sm">
              {activity.agent_name}
            </span>
            <span className={cn(
              'px-1.5 py-0.5 rounded text-xs font-medium',
              action.bg,
              action.color
            )}>
              {action.label}
            </span>
          </div>
          
          <p className="text-xs text-slate-400 mt-1 truncate">
            {activity.incident_id ? (
              <>Incident: {activity.incident_id.slice(0, 12)}...</>
            ) : (
              <>System activity</>
            )}
          </p>
          
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {timeSince}
            </span>
            <span className="text-slate-600">•</span>
            <span className="font-mono text-xs text-emerald-400/60">
              {activity.event_hash.slice(0, 8)}...
            </span>
          </div>
        </div>
        
        {/* Expand indicator */}
        <div className="flex-shrink-0 flex items-center gap-2">
          <svg
            className={cn(
              'h-4 w-4 text-slate-400 transition-transform',
              isExpanded && 'rotate-180'
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        
        {/* New indicator */}
        {isNew && (
          <motion.div
            initial={{ opacity: 1, scale: 1 }}
            animate={{ opacity: 0, scale: 0 }}
            transition={{ delay: 2, duration: 0.5 }}
            className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full"
          />
        )}
      </button>
      
      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-1 border-t border-slate-700/50 bg-slate-900/50">
              {/* Agent Details */}
              <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                <div>
                  <span className="text-slate-500">Agent ID</span>
                  <p className="font-mono text-slate-300 truncate">{activity.agent_id}</p>
                </div>
                <div>
                  <span className="text-slate-500">Category</span>
                  <p className={cn('capitalize', category.color)}>{activity.agent_category}</p>
                </div>
                <div>
                  <span className="text-slate-500">Severity</span>
                  <p className={cn(
                    'font-medium capitalize',
                    activity.severity === 'critical' ? 'text-red-400' :
                    activity.severity === 'high' ? 'text-orange-400' :
                    activity.severity === 'medium' ? 'text-yellow-400' :
                    'text-slate-400'
                  )}>{activity.severity}</p>
                </div>
                <div>
                  <span className="text-slate-500">Timestamp</span>
                  <p className="text-slate-300">{new Date(activity.created_at).toLocaleString()}</p>
                </div>
              </div>
              
              {/* Event Hash */}
              <div className="mb-3">
                <span className="text-xs text-slate-500">Event Hash (SHA-256)</span>
                <p className="font-mono text-xs text-emerald-400 bg-slate-800/50 p-2 rounded mt-1 break-all">
                  {activity.event_hash}
                </p>
              </div>
              
              {/* Action Data */}
              {activity.action_data && Object.keys(activity.action_data).length > 0 && (
                <div className="mb-3">
                  <span className="text-xs text-slate-500">Action Data</span>
                  <div className="mt-1 p-2 bg-slate-800/50 rounded text-xs">
                    {Object.entries(activity.action_data).map(([key, value]) => (
                      <div key={key} className="flex items-start gap-2 py-1">
                        <span className="text-slate-500 min-w-[80px]">{key}:</span>
                        <span className="text-slate-300 break-all">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Incident Link */}
              {activity.incident_id && (
                <div className="mb-3">
                  <span className="text-xs text-slate-500">Related Incident</span>
                  <p className="font-mono text-xs text-cyan-400 mt-1">{activity.incident_id}</p>
                </div>
              )}
              
              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-700/50">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(activity.event_hash);
                  }}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Hash
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(JSON.stringify(activity, null, 2));
                  }}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export JSON
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// AGENT STATS
// ═══════════════════════════════════════════════════════════════

interface AgentStats {
  agent_id: string;
  agent_name: string;
  count: number;
}

function AgentStatsBar({ agents }: { agents: AgentStats[] }) {
  const total = agents.reduce((sum, a) => sum + a.count, 0);
  
  return (
    <div className="flex items-center gap-1 h-2 rounded-full overflow-hidden bg-slate-800">
      {agents.map((agent, i) => {
        const width = (agent.count / total) * 100;
        const colors = [
          'bg-cyan-500',
          'bg-blue-500',
          'bg-purple-500',
          'bg-pink-500',
          'bg-orange-500',
        ];
        
        return (
          <motion.div
            key={agent.agent_id}
            initial={{ width: 0 }}
            animate={{ width: `${width}%` }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className={cn('h-full', colors[i % colors.length])}
            title={`${agent.agent_name}: ${agent.count} actions`}
          />
        );
      })}
    </div>
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

export function AgentActivityStream({
  className,
  maxItems = 100,
  filterAgents,
  onActivityClick,
}: AgentActivityStreamProps) {
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [newActivityIds, setNewActivityIds] = useState<Set<string>>(new Set());
  const [isConnected, setIsConnected] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [agentStats, setAgentStats] = useState<AgentStats[]>([]);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  
  // Connect to SSE stream
  useEffect(() => {
    const url = new URL('/api/security/incidents/stream', window.location.origin);
    url.searchParams.set('chain', 'false');
    url.searchParams.set('activity', 'true');
    if (filterAgents) {
      url.searchParams.set('agents', filterAgents.join(','));
    }
    
    const eventSource = new EventSource(url.toString());
    eventSourceRef.current = eventSource;
    
    eventSource.onopen = () => {
      setIsConnected(true);
    };
    
    eventSource.onerror = () => {
      setIsConnected(false);
    };
    
    eventSource.addEventListener('initial_activity', (e) => {
      const data = JSON.parse(e.data) as AgentActivity[];
      setActivities(data);
      updateAgentStats(data);
    });
    
    eventSource.addEventListener('activity', (e) => {
      const activity = JSON.parse(e.data) as AgentActivity;
      
      // Mark as new
      setNewActivityIds(ids => new Set([...ids, activity.id]));
      setTimeout(() => {
        setNewActivityIds(ids => {
          const newIds = new Set(ids);
          newIds.delete(activity.id);
          return newIds;
        });
      }, 3000);
      
      setActivities(prev => {
        const updated = [activity, ...prev.slice(0, maxItems - 1)];
        updateAgentStats(updated);
        return updated;
      });
    });
    
    return () => {
      eventSource.close();
    };
  }, [filterAgents, maxItems]);
  
  // Update agent statistics
  const updateAgentStats = (data: AgentActivity[]) => {
    const counts = new Map<string, { name: string; count: number }>();
    data.forEach(a => {
      const existing = counts.get(a.agent_id);
      if (existing) {
        existing.count++;
      } else {
        counts.set(a.agent_id, { name: a.agent_name, count: 1 });
      }
    });
    
    const stats = Array.from(counts.entries())
      .map(([id, data]) => ({ agent_id: id, agent_name: data.name, count: data.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    setAgentStats(stats);
  };
  
  // Filter activities
  const filteredActivities = activities.filter(activity => {
    if (selectedAgent !== 'all' && activity.agent_id !== selectedAgent) {
      return false;
    }
    return true;
  });
  
  // Get unique agents for filter
  const uniqueAgents = [...new Set(activities.map(a => a.agent_id))];
  
  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between gap-4 p-4 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className={cn(
            'h-3 w-3 rounded-full',
            isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
          )} />
          <h2 className="font-bold text-lg text-white flex items-center gap-2">
            <Bot className="h-5 w-5 text-cyan-400" />
            Agent Activity
          </h2>
        </div>
        
        <select
          value={selectedAgent}
          onChange={(e) => setSelectedAgent(e.target.value)}
          className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:outline-none focus:border-cyan-500"
        >
          <option value="all">All Agents</option>
          {uniqueAgents.map(id => {
            const activity = activities.find(a => a.agent_id === id);
            return (
              <option key={id} value={id}>
                {activity?.agent_name || id}
              </option>
            );
          })}
        </select>
      </div>
      
      {/* Agent stats bar */}
      {agentStats.length > 0 && (
        <div className="px-4 py-2 border-b border-slate-700/50">
          <AgentStatsBar agents={agentStats} />
          <div className="flex items-center justify-between mt-1">
            {agentStats.slice(0, 3).map(agent => (
              <span key={agent.agent_id} className="text-xs text-slate-500">
                {agent.agent_name}: {agent.count}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {/* Activity stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <AnimatePresence mode="popLayout">
          {filteredActivities.map(activity => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              isNew={newActivityIds.has(activity.id)}
              onClick={() => onActivityClick?.(activity)}
            />
          ))}
        </AnimatePresence>
        
        {filteredActivities.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <Bot className="h-12 w-12 mb-4 opacity-50" />
            <p>No agent activity</p>
            <p className="text-sm">Agents are monitoring the system...</p>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-slate-700/50 text-xs text-slate-500">
        <span>{filteredActivities.length} activities</span>
        <span className="flex items-center gap-1">
          <Zap className="h-3 w-3" />
          {agentStats.length} active agents
        </span>
      </div>
    </div>
  );
}

export default AgentActivityStream;
