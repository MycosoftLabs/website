/**
 * Context Indicator - February 6, 2026
 * 
 * Visual indicator for agent context awareness.
 */

'use client';

import { motion } from 'framer-motion';
import { Brain, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ContextIndicatorProps {
  isActive?: boolean;
  contextCount?: number;
  className?: string;
}

export function ContextIndicator({
  isActive = false,
  contextCount = 0,
  className = ''
}: ContextIndicatorProps) {
  if (!isActive && contextCount === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex items-center gap-1.5 ${className}`}
    >
      <motion.div
        animate={isActive ? { 
          scale: [1, 1.1, 1],
          opacity: [1, 0.8, 1]
        } : {}}
        transition={{ 
          repeat: isActive ? Infinity : 0,
          duration: 2 
        }}
        className="relative"
      >
        <Brain className={`h-4 w-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
        {isActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute -top-1 -right-1"
          >
            <Sparkles className="h-2.5 w-2.5 text-yellow-500" />
          </motion.div>
        )}
      </motion.div>

      {contextCount > 0 && (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          {contextCount} context{contextCount !== 1 ? 's' : ''}
        </Badge>
      )}
    </motion.div>
  );
}

export default ContextIndicator;