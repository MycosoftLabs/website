'use client';

/**
 * Incident Stats Widgets
 * 
 * Mempool.space-inspired stats widgets including:
 * - Priority fee indicators
 * - Incident queue stats
 * - Incoming incidents chart
 * - Recent activity tables
 * 
 * Inspired by: https://mempool.space/
 * 
 * @version 1.0.0
 * @date January 24, 2026
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Hash,
  Zap,
  Shield,
  RefreshCw,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface PriorityLevel {
  id: string;
  label: string;
  color: string;
  bgColor: string;
  responseTime: string;
  activeCount: number;
}

interface QueueStats {
  pending: number;
  memoryUsage: number;
  maxMemory: number;
  incomingRate: number;
}

interface RecentIncident {
  id: string;
  hash: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: string;
  timestamp: string;
}

interface RecentReplacement {
  id: string;
  hash: string;
  previousStatus: string;
  newStatus: string;
  type: 'escalated' | 'resolved' | 'reassigned';
  timestamp: string;
}

// ═══════════════════════════════════════════════════════════════
// PRIORITY FEE INDICATOR (Like mempool's transaction fees)
// ═══════════════════════════════════════════════════════════════

export function PriorityIndicator({ className }: { className?: string }) {
  const [priorities, setPriorities] = useState<PriorityLevel[]>([
    { id: 'critical', label: 'Critical', color: 'text-red-400', bgColor: 'bg-red-500', responseTime: '< 5m', activeCount: 0 },
    { id: 'high', label: 'High Priority', color: 'text-orange-400', bgColor: 'bg-orange-500', responseTime: '< 15m', activeCount: 0 },
    { id: 'medium', label: 'Medium Priority', color: 'text-yellow-400', bgColor: 'bg-yellow-500', responseTime: '< 1h', activeCount: 0 },
    { id: 'low', label: 'Low Priority', color: 'text-green-400', bgColor: 'bg-green-500', responseTime: '< 4h', activeCount: 0 },
  ]);
  
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/security/incidents?stats=true');
        if (res.ok) {
          const data = await res.json();
          const incidents = data.incidents || [];
          
          setPriorities(prev => prev.map(p => ({
            ...p,
            activeCount: incidents.filter((i: { severity: string; status: string }) => 
              i.severity === p.id && i.status !== 'resolved' && i.status !== 'closed'
            ).length,
          })));
        }
      } catch (error) {
        console.error('Failed to fetch priority stats:', error);
      }
    };
    
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className={cn('bg-slate-800/50 rounded-lg p-4', className)}>
      <div className="text-sm text-slate-400 mb-3">Incident Priorities</div>
      
      {/* Priority bar */}
      <div className="flex rounded-full overflow-hidden h-2 mb-4">
        {priorities.map((p, i) => (
          <div
            key={p.id}
            className={cn('transition-all duration-500', p.bgColor)}
            style={{ width: `${25}%` }}
          />
        ))}
      </div>
      
      {/* Priority details */}
      <div className="grid grid-cols-4 gap-2">
        {priorities.map(p => (
          <div key={p.id} className="text-center">
            <div className={cn('text-xs font-medium mb-1', p.color)}>
              {p.label.split(' ')[0]}
            </div>
            <div className="text-lg font-bold text-white">
              {p.activeCount}
            </div>
            <div className="text-[10px] text-slate-500">
              {p.responseTime}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// QUEUE STATS (Like mempool's memory/unconfirmed stats)
// ═══════════════════════════════════════════════════════════════

export function QueueStatsWidget({ className }: { className?: string }) {
  const [stats, setStats] = useState<QueueStats>({
    pending: 0,
    memoryUsage: 0,
    maxMemory: 100,
    incomingRate: 0,
  });
  
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/security/incidents?status=open&stats=true');
        if (res.ok) {
          const data = await res.json();
          const incidents = data.incidents || [];
          
          setStats({
            pending: incidents.length,
            memoryUsage: Math.min(incidents.length * 2, 100),
            maxMemory: 100,
            incomingRate: Math.floor(Math.random() * 10) + 1, // Mock rate
          });
        }
      } catch (error) {
        console.error('Failed to fetch queue stats:', error);
      }
    };
    
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);
  
  const memoryPercentage = (stats.memoryUsage / stats.maxMemory) * 100;
  
  return (
    <div className={cn('bg-slate-800/50 rounded-lg p-4', className)}>
      <div className="grid grid-cols-3 gap-4">
        {/* Minimum response time */}
        <div>
          <div className="text-xs text-slate-400 mb-1">Min Response</div>
          <div className="text-lg font-bold text-emerald-400">
            &lt; 5 min
          </div>
        </div>
        
        {/* Queue capacity */}
        <div>
          <div className="text-xs text-slate-400 mb-1">Queue Capacity</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${memoryPercentage}%` }}
                className={cn(
                  'h-full rounded-full',
                  memoryPercentage > 80 ? 'bg-red-500' :
                  memoryPercentage > 50 ? 'bg-yellow-500' : 'bg-emerald-500'
                )}
              />
            </div>
            <span className="text-xs text-slate-400">
              {stats.memoryUsage}/{stats.maxMemory}
            </span>
          </div>
        </div>
        
        {/* Pending count */}
        <div>
          <div className="text-xs text-slate-400 mb-1">Pending</div>
          <div className="text-lg font-bold text-orange-400">
            {stats.pending} <span className="text-xs font-normal text-slate-500">incidents</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// INCOMING INCIDENTS CHART (Like mempool's incoming transactions)
// ═══════════════════════════════════════════════════════════════

export function IncomingIncidentsChart({ className }: { className?: string }) {
  const [data, setData] = useState<number[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  
  useEffect(() => {
    // Generate mock historical data
    const now = new Date();
    const newData: number[] = [];
    const newLabels: string[] = [];
    
    for (let i = 23; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 5 * 60000);
      newData.push(Math.floor(Math.random() * 50) + 5);
      newLabels.push(time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    }
    
    setData(newData);
    setLabels(newLabels);
    
    // Add new data point every 5 seconds
    const interval = setInterval(() => {
      setData(prev => {
        const newValue = Math.floor(Math.random() * 50) + 5;
        return [...prev.slice(1), newValue];
      });
      setLabels(prev => {
        const now = new Date();
        return [...prev.slice(1), now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })];
      });
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  const maxValue = Math.max(...data, 1);
  
  return (
    <div className={cn('bg-slate-800/50 rounded-lg p-4', className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-cyan-400 font-medium">Incoming Incidents</div>
        <Activity className="h-4 w-4 text-cyan-400 animate-pulse" />
      </div>
      
      {/* Chart */}
      <div className="relative h-24">
        <svg className="w-full h-full" preserveAspectRatio="none">
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map(y => (
            <line
              key={y}
              x1="0"
              y1={`${y}%`}
              x2="100%"
              y2={`${y}%`}
              stroke="#334155"
              strokeWidth="1"
              strokeDasharray="2,2"
            />
          ))}
          
          {/* Area fill */}
          <path
            d={`
              M 0 100
              ${data.map((v, i) => `L ${(i / (data.length - 1)) * 100}% ${100 - (v / maxValue) * 100}%`).join(' ')}
              L 100% 100
              Z
            `}
            fill="url(#incidentGradient)"
            opacity="0.3"
          />
          
          {/* Line */}
          <path
            d={data.map((v, i) => 
              `${i === 0 ? 'M' : 'L'} ${(i / (data.length - 1)) * 100}% ${100 - (v / maxValue) * 100}%`
            ).join(' ')}
            fill="none"
            stroke="#22d3ee"
            strokeWidth="2"
          />
          
          {/* Gradient definition */}
          <defs>
            <linearGradient id="incidentGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
        
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-[10px] text-slate-500">
          <span>{maxValue}</span>
          <span>{Math.floor(maxValue / 2)}</span>
          <span>0</span>
        </div>
      </div>
      
      {/* X-axis labels */}
      <div className="flex justify-between mt-2 text-[10px] text-slate-500">
        {labels.filter((_, i) => i % 6 === 0).map((label, i) => (
          <span key={i}>{label}</span>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// RECENT INCIDENTS TABLE (Like mempool's recent transactions)
// ═══════════════════════════════════════════════════════════════

export function RecentIncidentsTable({ 
  className,
  limit = 6,
}: { 
  className?: string;
  limit?: number;
}) {
  const [incidents, setIncidents] = useState<RecentIncident[]>([]);
  
  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        const res = await fetch(`/api/security/incidents?limit=${limit}&sort=created_at:desc`);
        if (res.ok) {
          const data = await res.json();
          setIncidents((data.incidents || []).map((i: {
            id: string;
            event_hash?: string;
            severity: 'critical' | 'high' | 'medium' | 'low';
            status: string;
            created_at: string;
          }) => ({
            id: i.id,
            hash: i.event_hash || i.id.slice(0, 16),
            severity: i.severity,
            status: i.status,
            timestamp: i.created_at,
          })));
        }
      } catch (error) {
        console.error('Failed to fetch recent incidents:', error);
      }
    };
    
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 5000);
    return () => clearInterval(interval);
  }, [limit]);
  
  const severityColors: Record<string, string> = {
    critical: 'text-red-400',
    high: 'text-orange-400',
    medium: 'text-yellow-400',
    low: 'text-green-400',
  };
  
  return (
    <div className={cn('bg-slate-800/50 rounded-lg p-4', className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-white font-medium">Recent Incidents</div>
        <a href="/security/incidents" className="text-cyan-400 hover:text-cyan-300">
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
      
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-slate-500">
            <th className="text-left pb-2">ID</th>
            <th className="text-left pb-2">Severity</th>
            <th className="text-left pb-2">Status</th>
            <th className="text-right pb-2">Time</th>
          </tr>
        </thead>
        <tbody className="text-slate-300">
          {incidents.map((incident, i) => (
            <motion.tr
              key={incident.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="border-t border-slate-700/50 hover:bg-slate-700/30 cursor-pointer"
            >
              <td className="py-2">
                <span className="font-mono text-cyan-400 text-xs">
                  {incident.hash.slice(0, 8)}...{incident.hash.slice(-4)}
                </span>
              </td>
              <td className="py-2">
                <span className={cn('uppercase text-xs font-bold', severityColors[incident.severity])}>
                  {incident.severity}
                </span>
              </td>
              <td className="py-2">
                <span className="text-xs text-slate-400">{incident.status}</span>
              </td>
              <td className="py-2 text-right text-xs text-slate-500">
                {getTimeSince(incident.timestamp)}
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
      
      {incidents.length === 0 && (
        <div className="text-center py-4 text-slate-500 text-sm">
          No recent incidents
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// RECENT REPLACEMENTS TABLE (Like mempool's RBF table)
// ═══════════════════════════════════════════════════════════════

export function RecentReplacementsTable({ 
  className,
  limit = 6,
}: { 
  className?: string;
  limit?: number;
}) {
  const [replacements, setReplacements] = useState<RecentReplacement[]>([]);
  
  useEffect(() => {
    // Mock replacements data (status changes, escalations)
    setReplacements([
      { id: '1', hash: 'abc123def456', previousStatus: 'investigating', newStatus: 'contained', type: 'resolved', timestamp: new Date().toISOString() },
      { id: '2', hash: 'def456ghi789', previousStatus: 'open', newStatus: 'investigating', type: 'escalated', timestamp: new Date(Date.now() - 60000).toISOString() },
      { id: '3', hash: 'ghi789jkl012', previousStatus: 'low', newStatus: 'high', type: 'escalated', timestamp: new Date(Date.now() - 120000).toISOString() },
    ]);
  }, []);
  
  const typeColors: Record<string, { bg: string; text: string }> = {
    escalated: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
    resolved: { bg: 'bg-green-500/20', text: 'text-green-400' },
    reassigned: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  };
  
  return (
    <div className={cn('bg-slate-800/50 rounded-lg p-4', className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-white font-medium">Recent Status Changes</div>
        <a href="/security/incidents" className="text-cyan-400 hover:text-cyan-300">
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
      
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-slate-500">
            <th className="text-left pb-2">ID</th>
            <th className="text-left pb-2">Previous</th>
            <th className="text-left pb-2">New</th>
            <th className="text-right pb-2">Type</th>
          </tr>
        </thead>
        <tbody className="text-slate-300">
          {replacements.map((r, i) => {
            const typeStyle = typeColors[r.type];
            return (
              <motion.tr
                key={r.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="border-t border-slate-700/50 hover:bg-slate-700/30 cursor-pointer"
              >
                <td className="py-2">
                  <span className="font-mono text-cyan-400 text-xs">
                    {r.hash.slice(0, 8)}...
                  </span>
                </td>
                <td className="py-2 text-xs text-slate-500">
                  {r.previousStatus}
                </td>
                <td className="py-2 text-xs text-white">
                  {r.newStatus}
                </td>
                <td className="py-2 text-right">
                  <span className={cn(
                    'px-2 py-0.5 rounded text-xs font-medium',
                    typeStyle.bg,
                    typeStyle.text
                  )}>
                    {r.type.toUpperCase()}
                  </span>
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
      
      {replacements.length === 0 && (
        <div className="text-center py-4 text-slate-500 text-sm">
          No recent changes
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DIFFICULTY ADJUSTMENT WIDGET (Like mempool's)
// ═══════════════════════════════════════════════════════════════

export function ResolutionProgressWidget({ className }: { className?: string }) {
  const [stats, setStats] = useState({
    averageResolutionTime: '2.5h',
    resolutionRate: 85,
    previousRate: 82,
    nextReview: '2 days',
    reviewDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString(),
  });
  
  const rateChange = stats.resolutionRate - stats.previousRate;
  const isPositive = rateChange > 0;
  
  return (
    <div className={cn('bg-slate-800/50 rounded-lg p-4', className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-slate-400">Resolution Metrics</div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>rate</span>
          <span>|</span>
          <span>time</span>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="relative h-3 bg-slate-700 rounded-full overflow-hidden mb-4">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${stats.resolutionRate}%` }}
          className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-cyan-500 to-emerald-500"
        />
        <div
          className="absolute top-0 bottom-0 w-1 bg-yellow-500"
          style={{ left: `${stats.previousRate}%` }}
        />
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-lg font-bold text-white">
            ~{stats.averageResolutionTime}
          </div>
          <div className="text-[10px] text-slate-500">Avg Resolution</div>
        </div>
        
        <div>
          <div className="flex items-center justify-center gap-1">
            {isPositive ? (
              <ArrowUpRight className="h-4 w-4 text-green-400" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-red-400" />
            )}
            <span className={cn('text-lg font-bold', isPositive ? 'text-green-400' : 'text-red-400')}>
              {rateChange > 0 ? '+' : ''}{rateChange}%
            </span>
          </div>
          <div className="text-[10px] text-slate-500">
            Previous: {stats.previousRate}%
          </div>
        </div>
        
        <div>
          <div className="text-lg font-bold text-white">
            In ~{stats.nextReview}
          </div>
          <div className="text-[10px] text-slate-500">{stats.reviewDate}</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function getTimeSince(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default {
  PriorityIndicator,
  QueueStatsWidget,
  IncomingIncidentsChart,
  RecentIncidentsTable,
  RecentReplacementsTable,
  ResolutionProgressWidget,
};
