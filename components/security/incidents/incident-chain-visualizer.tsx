'use client';

/**
 * Incident Chain Visualizer
 * 
 * Mempool.space-inspired 3D block chain visualization for security incidents.
 * Shows cryptographic chain blocks with severity-based coloring and
 * treemap transaction visualization.
 * 
 * Inspired by: https://mempool.space/
 * 
 * @version 1.0.0
 * @date January 24, 2026
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Hash,
  Clock,
  Link2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Bot,
  User,
  Activity,
  Zap,
  X,
  ExternalLink,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface ChainBlock {
  id: string;
  sequence_number: number;
  event_hash: string;
  previous_hash: string;
  merkle_root: string | null;
  event_type: string;
  reporter_type: 'agent' | 'service' | 'user' | 'system';
  reporter_id: string;
  reporter_name: string;
  created_at: string;
  incident_id: string;
  incident_title: string;
  incident_severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  incident_status: string;
  events_count: number;
}

interface IncidentEvent {
  id: string;
  type: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  size: number; // For treemap sizing
  hash: string;
  timestamp: string;
  agent?: string;
}

interface IncidentChainVisualizerProps {
  className?: string;
  onBlockClick?: (block: ChainBlock) => void;
}

// ═══════════════════════════════════════════════════════════════
// SEVERITY COLORS (Mempool-style gradient)
// ═══════════════════════════════════════════════════════════════

const severityColors = {
  critical: {
    bg: 'from-red-600 to-red-800',
    border: 'border-red-500',
    fill: '#ef4444',
    glow: 'shadow-red-500/50',
  },
  high: {
    bg: 'from-orange-500 to-orange-700',
    border: 'border-orange-500',
    fill: '#f97316',
    glow: 'shadow-orange-500/50',
  },
  medium: {
    bg: 'from-yellow-500 to-yellow-700',
    border: 'border-yellow-500',
    fill: '#eab308',
    glow: 'shadow-yellow-500/30',
  },
  low: {
    bg: 'from-green-500 to-green-700',
    border: 'border-green-500',
    fill: '#22c55e',
    glow: '',
  },
  info: {
    bg: 'from-slate-500 to-slate-700',
    border: 'border-slate-500',
    fill: '#64748b',
    glow: '',
  },
};

// ═══════════════════════════════════════════════════════════════
// 3D BLOCK COMPONENT (Mempool-style)
// ═══════════════════════════════════════════════════════════════

function Block3D({
  block,
  isSelected,
  isPending,
  onClick,
}: {
  block: ChainBlock;
  isSelected: boolean;
  isPending?: boolean;
  onClick: () => void;
}) {
  const colors = severityColors[block.incident_severity];
  
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -5 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'relative cursor-pointer transition-all duration-200',
        isSelected && 'z-10'
      )}
      style={{ perspective: '1000px' }}
    >
      {/* 3D Block Container */}
      <div
        className={cn(
          'relative w-32 h-40',
          'transform-gpu',
          isSelected && 'ring-2 ring-cyan-400'
        )}
        style={{
          transformStyle: 'preserve-3d',
          transform: 'rotateX(10deg) rotateY(-15deg)',
        }}
      >
        {/* Front face */}
        <div
          className={cn(
            'absolute inset-0 rounded-lg border-2 p-3 flex flex-col',
            'bg-gradient-to-br',
            colors.bg,
            colors.border,
            isPending && 'animate-pulse opacity-75'
          )}
          style={{
            transformStyle: 'preserve-3d',
            transform: 'translateZ(10px)',
            boxShadow: isSelected ? `0 0 30px ${colors.fill}40` : `0 10px 30px rgba(0,0,0,0.5)`,
          }}
        >
          {/* Block number */}
          <div className="text-white font-mono text-xs mb-1">
            #{block.sequence_number}
          </div>
          
          {/* Severity indicator */}
          <div className="text-white/80 text-xs uppercase font-bold">
            {block.incident_severity}
          </div>
          
          {/* Hash preview */}
          <div className="mt-auto">
            <div className="font-mono text-[10px] text-white/60 truncate">
              {block.event_hash.slice(0, 12)}...
            </div>
            
            {/* Events count */}
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-white/80">
                {block.events_count} events
              </span>
              <span className="text-[10px] text-white/60">
                {getTimeSince(block.created_at)}
              </span>
            </div>
          </div>
          
          {/* Reporter badge */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-0.5 bg-slate-900 rounded-full text-[10px]">
            {block.reporter_type === 'agent' ? (
              <Bot className="h-3 w-3 text-cyan-400" />
            ) : (
              <User className="h-3 w-3 text-slate-400" />
            )}
            <span className="text-white/80 truncate max-w-16">
              {block.reporter_name}
            </span>
          </div>
        </div>
        
        {/* Top face (3D effect) */}
        <div
          className={cn(
            'absolute left-0 right-0 h-4 rounded-t-lg',
            'bg-gradient-to-br',
            colors.bg,
            'opacity-50'
          )}
          style={{
            transform: 'translateZ(10px) translateY(-10px) rotateX(90deg)',
            transformOrigin: 'bottom',
          }}
        />
        
        {/* Side face (3D effect) */}
        <div
          className={cn(
            'absolute top-0 bottom-0 w-4 rounded-r-lg',
            'bg-gradient-to-br',
            colors.bg,
            'opacity-30'
          )}
          style={{
            transform: 'translateZ(0px) translateX(128px) rotateY(90deg)',
            transformOrigin: 'left',
          }}
        />
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PENDING BLOCK (Unconfirmed incidents)
// ═══════════════════════════════════════════════════════════════

function PendingBlock({
  severity,
  eventsCount,
  estimatedTime,
}: {
  severity: 'critical' | 'high' | 'medium' | 'low';
  eventsCount: number;
  estimatedTime: string;
}) {
  const colors = severityColors[severity];
  
  return (
    <div
      className="relative w-32 h-40 opacity-60"
      style={{ perspective: '1000px' }}
    >
      <div
        className={cn(
          'absolute inset-0 rounded-lg border-2 border-dashed p-3 flex flex-col',
          'bg-slate-900/80',
          colors.border
        )}
        style={{
          transformStyle: 'preserve-3d',
          transform: 'rotateX(10deg) rotateY(-15deg) translateZ(10px)',
        }}
      >
        <div className="text-slate-400 font-mono text-xs mb-1">
          ~Pending
        </div>
        <div className={cn('text-xs uppercase font-bold', `text-${severity}-400`)}>
          {severity}
        </div>
        <div className="mt-auto text-center">
          <div className="text-lg font-bold text-white/60">{eventsCount}</div>
          <div className="text-[10px] text-slate-500">events</div>
          <div className="text-[10px] text-slate-400 mt-1">In ~{estimatedTime}</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TREEMAP VISUALIZATION (Transaction squares)
// ═══════════════════════════════════════════════════════════════

interface TreemapItem {
  id: string;
  value: number;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  label: string;
  hash: string;
}

function calculateTreemap(items: TreemapItem[], width: number, height: number) {
  // Simple squarified treemap algorithm
  const totalValue = items.reduce((sum, item) => sum + item.value, 0);
  if (totalValue === 0) return [];
  
  const rects: Array<TreemapItem & { x: number; y: number; w: number; h: number }> = [];
  let x = 0, y = 0, remainingWidth = width, remainingHeight = height;
  
  // Sort by value descending
  const sorted = [...items].sort((a, b) => b.value - a.value);
  
  sorted.forEach((item, i) => {
    const ratio = item.value / totalValue;
    const area = width * height * ratio;
    
    // Alternate between horizontal and vertical splits
    if (i % 2 === 0 || remainingWidth < 30) {
      const h = Math.min(remainingHeight, area / remainingWidth);
      rects.push({ ...item, x, y, w: remainingWidth, h });
      y += h;
      remainingHeight -= h;
    } else {
      const w = Math.min(remainingWidth, area / remainingHeight);
      rects.push({ ...item, x, y, w, h: remainingHeight });
      x += w;
      remainingWidth -= w;
    }
  });
  
  return rects;
}

function Treemap({
  items,
  width = 500,
  height = 300,
  onItemClick,
}: {
  items: TreemapItem[];
  width?: number;
  height?: number;
  onItemClick?: (item: TreemapItem) => void;
}) {
  const rects = calculateTreemap(items, width, height);
  
  return (
    <svg width={width} height={height} className="rounded-lg overflow-hidden">
      <defs>
        {/* Glow filters for each severity */}
        <filter id="glow-critical" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feFlood floodColor="#ef4444" floodOpacity="0.5" />
          <feComposite in2="blur" operator="in" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="glow-high" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feFlood floodColor="#f97316" floodOpacity="0.4" />
          <feComposite in2="blur" operator="in" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      
      {rects.map((rect, i) => {
        const colors = severityColors[rect.severity];
        const hasGlow = rect.severity === 'critical' || rect.severity === 'high';
        
        return (
          <g key={rect.id}>
            <motion.rect
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.02 }}
              x={rect.x + 1}
              y={rect.y + 1}
              width={Math.max(0, rect.w - 2)}
              height={Math.max(0, rect.h - 2)}
              fill={colors.fill}
              rx={2}
              className="cursor-pointer hover:brightness-125 transition-all"
              filter={hasGlow ? `url(#glow-${rect.severity})` : undefined}
              onClick={() => onItemClick?.(rect)}
            />
            {rect.w > 40 && rect.h > 20 && (
              <text
                x={rect.x + rect.w / 2}
                y={rect.y + rect.h / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-[10px] fill-white font-mono pointer-events-none"
              >
                {rect.hash.slice(0, 6)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// BLOCK DETAIL MODAL
// ═══════════════════════════════════════════════════════════════

function BlockDetailModal({
  block,
  events,
  onClose,
}: {
  block: ChainBlock;
  events: IncidentEvent[];
  onClose: () => void;
}) {
  const colors = severityColors[block.incident_severity];
  
  const treemapItems: TreemapItem[] = events.map(e => ({
    id: e.id,
    value: e.size,
    severity: e.severity,
    label: e.type,
    hash: e.hash,
  }));
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-4xl bg-slate-900 rounded-xl border border-slate-700 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={cn(
          'flex items-center justify-between p-4 border-b border-slate-700',
          'bg-gradient-to-r',
          colors.bg
        )}>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-white/80">Block</span>
              <ChevronLeft className="h-4 w-4 text-white/60" />
              <span className="text-2xl font-bold text-white">
                {block.sequence_number}
              </span>
              <ChevronRight className="h-4 w-4 text-white/60" />
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-white" />
          </button>
        </div>
        
        {/* Block info grid */}
        <div className="grid grid-cols-2 gap-4 p-4 border-b border-slate-700">
          <InfoRow label="Hash" value={block.event_hash} mono copyable />
          <InfoRow label="Severity" value={block.incident_severity.toUpperCase()} />
          <InfoRow label="Timestamp" value={new Date(block.created_at).toLocaleString()} />
          <InfoRow label="Status" value={block.incident_status} />
          <InfoRow label="Previous Hash" value={block.previous_hash} mono />
          <InfoRow label="Events" value={`${block.events_count} events`} />
          <InfoRow 
            label="Reporter" 
            value={block.reporter_name} 
            icon={block.reporter_type === 'agent' ? <Bot className="h-4 w-4 text-cyan-400" /> : undefined}
          />
          {block.merkle_root && (
            <InfoRow label="Merkle Root" value={block.merkle_root} mono />
          )}
        </div>
        
        {/* Treemap visualization */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">
              Events in Block
            </h3>
            <div className="flex items-center gap-4 text-xs">
              {['critical', 'high', 'medium', 'low'].map(sev => (
                <div key={sev} className="flex items-center gap-1">
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: severityColors[sev as keyof typeof severityColors].fill }}
                  />
                  <span className="text-slate-400 capitalize">{sev}</span>
                </div>
              ))}
            </div>
          </div>
          
          {treemapItems.length > 0 ? (
            <Treemap
              items={treemapItems}
              width={800}
              height={300}
            />
          ) : (
            <div className="h-40 flex items-center justify-center text-slate-500">
              No events to display
            </div>
          )}
        </div>
        
        {/* Transaction list */}
        <div className="border-t border-slate-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">
              {events.length} Events
            </h3>
          </div>
          
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {events.map(event => (
              <div
                key={event.id}
                className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: severityColors[event.severity].fill }}
                  />
                  <span className="font-mono text-sm text-cyan-400">
                    {event.hash.slice(0, 16)}...
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-slate-400">{event.type}</span>
                  <span className="text-xs text-slate-500">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function InfoRow({
  label,
  value,
  mono,
  copyable,
  icon,
}: {
  label: string;
  value: string;
  mono?: boolean;
  copyable?: boolean;
  icon?: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    if (copyable) {
      navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  return (
    <div className="flex flex-col">
      <span className="text-xs text-slate-500 mb-1">{label}</span>
      <div className="flex items-center gap-2">
        {icon}
        <span
          onClick={handleCopy}
          className={cn(
            'text-sm text-white truncate',
            mono && 'font-mono',
            copyable && 'cursor-pointer hover:text-cyan-400'
          )}
          title={value}
        >
          {mono && value.length > 40 ? `${value.slice(0, 20)}...${value.slice(-20)}` : value}
        </span>
        {copied && <span className="text-xs text-green-400">✓</span>}
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

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function IncidentChainVisualizer({
  className,
  onBlockClick,
}: IncidentChainVisualizerProps) {
  const [blocks, setBlocks] = useState<ChainBlock[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<ChainBlock | null>(null);
  const [blockEvents, setBlockEvents] = useState<IncidentEvent[]>([]);
  const [pendingIncidents, setPendingIncidents] = useState({
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  });
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Fetch chain blocks
  useEffect(() => {
    const fetchBlocks = async () => {
      try {
        const res = await fetch('/api/security/incidents/chain?action=blocks&limit=15');
        if (res.ok) {
          const data = await res.json();
          setBlocks(data.blocks || []);
        }
      } catch (error) {
        console.error('Failed to fetch blocks:', error);
      }
    };
    
    fetchBlocks();
    const interval = setInterval(fetchBlocks, 5000);
    return () => clearInterval(interval);
  }, []);
  
  // Fetch pending incidents count
  useEffect(() => {
    const fetchPending = async () => {
      try {
        const res = await fetch('/api/security/incidents?status=open&stats=true');
        if (res.ok) {
          const data = await res.json();
          const incidents = data.incidents || [];
          
          setPendingIncidents({
            critical: incidents.filter((i: { severity: string }) => i.severity === 'critical').length,
            high: incidents.filter((i: { severity: string }) => i.severity === 'high').length,
            medium: incidents.filter((i: { severity: string }) => i.severity === 'medium').length,
            low: incidents.filter((i: { severity: string }) => i.severity === 'low').length,
          });
        }
      } catch (error) {
        console.error('Failed to fetch pending:', error);
      }
    };
    
    fetchPending();
    const interval = setInterval(fetchPending, 10000);
    return () => clearInterval(interval);
  }, []);
  
  // Fetch events when a block is selected
  useEffect(() => {
    if (!selectedBlock) {
      setBlockEvents([]);
      return;
    }
    
    const fetchEvents = async () => {
      try {
        const res = await fetch(`/api/security/incidents/chain?action=events&block=${selectedBlock.id}`);
        if (res.ok) {
          const data = await res.json();
          setBlockEvents(data.events || []);
        }
      } catch (error) {
        console.error('Failed to fetch block events:', error);
        // Mock data for demonstration
        setBlockEvents([
          { id: '1', type: 'detection', severity: 'high', size: 100, hash: 'abc123def456', timestamp: selectedBlock.created_at },
          { id: '2', type: 'analysis', severity: 'medium', size: 80, hash: 'def456ghi789', timestamp: selectedBlock.created_at },
          { id: '3', type: 'response', severity: 'low', size: 60, hash: 'ghi789jkl012', timestamp: selectedBlock.created_at },
        ]);
      }
    };
    
    fetchEvents();
  }, [selectedBlock]);
  
  const handleBlockClick = (block: ChainBlock) => {
    setSelectedBlock(block);
    onBlockClick?.(block);
  };
  
  const handleScroll = (direction: 'left' | 'right') => {
    if (containerRef.current) {
      const scrollAmount = 300;
      containerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };
  
  return (
    <div className={cn('relative', className)}>
      {/* Scroll buttons */}
      <button
        onClick={() => handleScroll('left')}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-slate-800/80 rounded-full hover:bg-slate-700 transition-colors"
      >
        <ChevronLeft className="h-5 w-5 text-white" />
      </button>
      
      <button
        onClick={() => handleScroll('right')}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-slate-800/80 rounded-full hover:bg-slate-700 transition-colors"
      >
        <ChevronRight className="h-5 w-5 text-white" />
      </button>
      
      {/* Chain visualizer */}
      <div
        ref={containerRef}
        className="flex items-center gap-2 px-12 py-8 overflow-x-auto scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* Pending blocks (mempool) */}
        <div className="flex items-center gap-2 pr-4 border-r border-dashed border-slate-600">
          {pendingIncidents.critical > 0 && (
            <PendingBlock severity="critical" eventsCount={pendingIncidents.critical} estimatedTime="5m" />
          )}
          {pendingIncidents.high > 0 && (
            <PendingBlock severity="high" eventsCount={pendingIncidents.high} estimatedTime="10m" />
          )}
          {pendingIncidents.medium > 0 && (
            <PendingBlock severity="medium" eventsCount={pendingIncidents.medium} estimatedTime="30m" />
          )}
          {pendingIncidents.low > 0 && (
            <PendingBlock severity="low" eventsCount={pendingIncidents.low} estimatedTime="1h" />
          )}
        </div>
        
        {/* Divider */}
        <div className="flex items-center gap-2 px-4">
          <div className="h-16 w-px bg-gradient-to-b from-transparent via-slate-500 to-transparent" />
          <div className="flex flex-col items-center gap-1">
            <ChevronLeft className="h-4 w-4 text-slate-500" />
            <ChevronLeft className="h-4 w-4 text-slate-500" />
          </div>
        </div>
        
        {/* Confirmed blocks */}
        <div className="flex items-center gap-3">
          {blocks.map((block, index) => (
            <Block3D
              key={block.id}
              block={block}
              isSelected={selectedBlock?.id === block.id}
              onClick={() => handleBlockClick(block)}
            />
          ))}
        </div>
        
        {/* Empty state */}
        {blocks.length === 0 && (
          <div className="flex items-center justify-center w-full py-12 text-slate-500">
            <Activity className="h-6 w-6 mr-2 animate-pulse" />
            Loading chain blocks...
          </div>
        )}
      </div>
      
      {/* Block detail modal */}
      <AnimatePresence>
        {selectedBlock && (
          <BlockDetailModal
            block={selectedBlock}
            events={blockEvents}
            onClose={() => setSelectedBlock(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// EXPORTED BLOCK CHAIN 3D COMPONENT (Standalone)
// ═══════════════════════════════════════════════════════════════

interface BlockChain3DBlock {
  id: string;
  sequenceNumber: number;
  eventHash: string;
  previousHash: string;
  eventType: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  incidentCount: number;
  timestamp: Date;
}

interface BlockChain3DProps {
  blocks: BlockChain3DBlock[];
  onBlockClick?: (block: BlockChain3DBlock) => void;
  className?: string;
}

export function BlockChain3D({ blocks, onBlockClick, className }: BlockChain3DProps) {
  return (
    <div className={cn('flex items-center gap-3 overflow-x-auto py-4', className)}>
      {blocks.map((block, index) => {
        const colors = severityColors[block.severity];
        
        return (
          <motion.div
            key={block.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.05, y: -5 }}
            onClick={() => onBlockClick?.(block)}
            className={cn(
              'relative flex-shrink-0 w-28 h-32 cursor-pointer',
              'transform-gpu'
            )}
            style={{ perspective: '1000px' }}
          >
            <div
              className={cn(
                'absolute inset-0 rounded-lg border-2 p-2 flex flex-col',
                'bg-gradient-to-br',
                colors.bg,
                colors.border,
              )}
              style={{
                transformStyle: 'preserve-3d',
                transform: 'rotateX(8deg) rotateY(-12deg)',
                boxShadow: `0 8px 24px rgba(0,0,0,0.5), 0 0 15px ${colors.fill}30`,
              }}
            >
              <div className="text-white font-mono text-xs font-bold">
                #{block.sequenceNumber}
              </div>
              
              <div className="text-white/80 text-[10px] uppercase mt-1">
                {block.severity}
              </div>
              
              <div className="mt-auto">
                <div className="font-mono text-[9px] text-white/60 truncate">
                  {block.eventHash.slice(0, 10)}...
                </div>
                <div className="text-[10px] text-white/80 mt-1">
                  {block.incidentCount} incidents
                </div>
              </div>
            </div>
            
            {/* Chain link */}
            {index < blocks.length - 1 && (
              <div className="absolute -right-4 top-1/2 -translate-y-1/2 flex items-center">
                <Link2 className="h-4 w-4 text-slate-600" />
              </div>
            )}
          </motion.div>
        );
      })}
      
      {blocks.length === 0 && (
        <div className="flex items-center justify-center w-full py-8 text-slate-500">
          <Activity className="h-5 w-5 mr-2 animate-pulse" />
          <span className="text-sm">Loading chain blocks...</span>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// EXPORTED INCIDENT TREEMAP COMPONENT (Standalone)
// ═══════════════════════════════════════════════════════════════

interface TreemapIncident {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: string;
  created_at: string;
}

interface IncidentTreemapProps {
  incidents: TreemapIncident[];
  onIncidentClick?: (id: string) => void;
  className?: string;
}

export function IncidentTreemap({ incidents, onIncidentClick, className }: IncidentTreemapProps) {
  // Calculate treemap layout using simple squarify algorithm
  const calculateTreemap = useCallback((items: TreemapIncident[], width: number, height: number) => {
    if (items.length === 0) return [];
    
    // Assign sizes based on severity and recency
    const sizedItems = items.map(item => {
      let size = 1;
      if (item.severity === 'critical') size = 4;
      else if (item.severity === 'high') size = 3;
      else if (item.severity === 'medium') size = 2;
      return { ...item, size };
    });
    
    const totalSize = sizedItems.reduce((sum, i) => sum + i.size, 0);
    
    // Simple row-based layout
    const result: Array<TreemapIncident & { x: number; y: number; w: number; h: number }> = [];
    let currentY = 0;
    let remaining = [...sizedItems];
    
    while (remaining.length > 0 && currentY < height) {
      // Take items for this row
      const rowItems: typeof sizedItems = [];
      let rowSize = 0;
      const targetRowSize = totalSize / Math.ceil(remaining.length / 4);
      
      while (remaining.length > 0 && rowSize < targetRowSize) {
        const item = remaining.shift()!;
        rowItems.push(item);
        rowSize += item.size;
      }
      
      // Layout row
      const rowHeight = Math.min((rowSize / totalSize) * height * 3, height - currentY);
      let currentX = 0;
      
      for (const item of rowItems) {
        const itemWidth = (item.size / rowSize) * width;
        result.push({
          ...item,
          x: currentX,
          y: currentY,
          w: itemWidth - 2,
          h: rowHeight - 2,
        });
        currentX += itemWidth;
      }
      
      currentY += rowHeight;
    }
    
    return result;
  }, []);
  
  const [dimensions] = useState({ width: 800, height: 250 });
  const layoutItems = calculateTreemap(incidents, dimensions.width, dimensions.height);
  
  const getColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#dc2626';
      case 'high': return '#ea580c';
      case 'medium': return '#ca8a04';
      case 'low': return '#16a34a';
      default: return '#475569';
    }
  };
  
  return (
    <div className={cn('relative bg-slate-900/50 rounded-lg overflow-hidden', className)}>
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        preserveAspectRatio="xMidYMid slice"
      >
        {layoutItems.map((item) => (
          <motion.g
            key={item.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => onIncidentClick?.(item.id)}
            style={{ cursor: 'pointer' }}
          >
            <rect
              x={item.x + 1}
              y={item.y + 1}
              width={Math.max(item.w, 0)}
              height={Math.max(item.h, 0)}
              fill={getColor(item.severity)}
              rx={4}
              className="transition-all duration-200 hover:opacity-80"
            />
            {item.w > 60 && item.h > 30 && (
              <text
                x={item.x + item.w / 2}
                y={item.y + item.h / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize="11"
                fontWeight="bold"
                className="pointer-events-none"
              >
                {item.title.slice(0, 15)}...
              </text>
            )}
          </motion.g>
        ))}
        
        {layoutItems.length === 0 && (
          <text
            x={dimensions.width / 2}
            y={dimensions.height / 2}
            textAnchor="middle"
            fill="#64748b"
            fontSize="14"
          >
            No incidents to display
          </text>
        )}
      </svg>
      
      {/* Legend */}
      <div className="absolute bottom-2 right-2 flex items-center gap-3 text-xs">
        {['critical', 'high', 'medium', 'low'].map(sev => (
          <div key={sev} className="flex items-center gap-1">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: getColor(sev) }}
            />
            <span className="text-slate-400 capitalize">{sev}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// EXPORTED BLOCK DETAIL MODAL (Standalone)
// ═══════════════════════════════════════════════════════════════

export { BlockDetailModal };

export default IncidentChainVisualizer;
