'use client';

import { motion } from 'framer-motion';
import { Activity, Clock, MoreVertical, Play, ArrowRight, Zap, Database, Cpu, Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const getStatusStyles = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'training':
      return {
        color: 'text-green-500',
        bg: 'bg-green-500/10',
        border: 'border-green-500/20',
        dot: 'bg-green-500',
        icon: <Zap className="w-4 h-4 animate-pulse" />,
        pulse: true
      };
    case 'mutating':
      return {
        color: 'text-purple-500',
        bg: 'bg-purple-500/10',
        border: 'border-purple-500/20',
        dot: 'bg-purple-500',
        icon: <Cpu className="w-4 h-4 animate-pulse" />,
        pulse: true
      };
    case 'evaluating':
      return {
        color: 'text-blue-500',
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/20',
        dot: 'bg-blue-500',
        icon: <Search className="w-4 h-4 animate-pulse" />,
        pulse: true
      };
    default:
      return {
        color: 'text-zinc-500',
        bg: 'bg-zinc-800/50',
        border: 'border-zinc-700',
        dot: 'bg-zinc-600',
        icon: <Database className="w-4 h-4" />,
        pulse: false
      };
  }
};

export function ModelList({ models, viewMode, onSelect }: { models: any[], viewMode: 'grid' | 'list', onSelect: (id: string) => void }) {
  if (viewMode === 'list') {
    return (
      <div className="space-y-3">
        {models.map((model) => {
          const styles = getStatusStyles(model.status);
          return (
            <motion.div
              key={model.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => onSelect(model.id)}
              className="group flex items-center justify-between p-4 bg-zinc-900/40 border border-zinc-800 rounded-2xl hover:bg-zinc-800/50 hover:border-zinc-700 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${styles.bg} ${styles.color}`}>
                  {styles.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-zinc-100">{model.name}</h4>
                    <div className={`w-1.5 h-1.5 rounded-full ${styles.dot} ${styles.pulse ? 'animate-pulse shadow-[0_0_8px_rgba(var(--color-rgb),0.5)]' : ''}`} />
                  </div>
                  <p className="text-xs text-zinc-500 font-mono uppercase tracking-wider">
                    {model.status || 'idle'} • Updated {model.updatedAt?.seconds ? formatDistanceToNow(new Date(model.updatedAt.seconds * 1000)) : 'Recently'} ago
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-xs text-zinc-500 font-medium uppercase">Last Accuracy</span>
                  <span className="text-sm font-bold text-zinc-200">
                    {model.accuracy ? `${(model.accuracy * 100).toFixed(1)}%` : '---'}
                  </span>
                </div>
                <ArrowRight className="w-5 h-5 text-zinc-600 group-hover:text-white transition-colors" />
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
      {models.map((model, index) => {
        const styles = getStatusStyles(model.status);
        return (
          <motion.div
            key={model.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onSelect(model.id)}
            className="group relative bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-6 hover:bg-zinc-800/40 hover:border-zinc-700 transition-all cursor-pointer overflow-hidden flex flex-col h-full min-h-[300px]"
          >
            {/* Status Indicator */}
            <div className="absolute top-0 right-0 p-6 z-10">
              <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border ${styles.bg} ${styles.color} ${styles.border}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${styles.dot} ${styles.pulse ? 'animate-pulse' : ''}`} />
                {model.status || 'idle'}
              </div>
            </div>

            <div className="space-y-4 flex flex-col flex-1">
              <div className={`w-14 h-14 ${styles.bg} rounded-2xl flex items-center justify-center border ${styles.border} group-hover:scale-110 transition-transform duration-500`}>
                <div className={styles.color}>
                  {styles.icon}
                </div>
              </div>

              <div className="flex-1">
                <h3 className="text-xl font-bold text-white group-hover:text-zinc-100 transition-colors leading-tight">{model.name}</h3>
                <p className="text-zinc-500 text-sm line-clamp-3 mt-2 leading-relaxed">
                  {model.description || "No description provided for this Nature Learning Model instance."}
                </p>
              </div>

              <div className="pt-6 flex items-center justify-between border-t border-zinc-800/50 mt-auto">
                <div className="flex items-center gap-2 text-zinc-500">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-mono uppercase font-medium">
                    {model.createdAt?.seconds ? formatDistanceToNow(new Date(model.createdAt.seconds * 1000)) : 'Recently'} ago
                  </span>
                </div>

                <div className="flex items-center -space-x-2">
                  <div className="px-2 py-0.5 rounded-md bg-zinc-800 text-[10px] font-bold text-zinc-400 border border-zinc-700 uppercase tracking-widest">
                    v{model.version || '1.0'}
                  </div>
                </div>
              </div>
            </div>

            {/* Hover Effect Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          </motion.div>
        );
      })}
    </div>
  );
}
