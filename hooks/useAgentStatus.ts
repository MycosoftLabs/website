/**
 * Agent Status SSE Hook - Feb 28, 2026
 */

'use client';

import { useSseStream, MasStreamEvent, UseSseStreamResult } from './use-sse-stream';

export interface UseAgentStatusOptions {
  url?: string;
  isEnabled?: boolean;
  autoReconnect?: boolean;
  reconnectDelayMs?: number;
}

export interface UseAgentStatusResult extends UseSseStreamResult<MasStreamEvent> {}

export function useAgentStatus(options: UseAgentStatusOptions = {}): UseAgentStatusResult {
  const {
    url = '/api/sse/agents',
    isEnabled = true,
    autoReconnect = true,
    reconnectDelayMs = 4000,
  } = options;

  return useSseStream<MasStreamEvent>({
    url,
    isEnabled,
    autoReconnect,
    reconnectDelayMs,
  });
}
