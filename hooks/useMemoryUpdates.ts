/**
 * Memory Updates SSE Hook - Feb 28, 2026
 */

'use client';

import { useSseStream, MasStreamEvent, UseSseStreamResult } from './use-sse-stream';

export interface UseMemoryUpdatesOptions {
  url?: string;
  isEnabled?: boolean;
  autoReconnect?: boolean;
  reconnectDelayMs?: number;
}

export interface UseMemoryUpdatesResult extends UseSseStreamResult<MasStreamEvent> {}

export function useMemoryUpdates(
  options: UseMemoryUpdatesOptions = {}
): UseMemoryUpdatesResult {
  const {
    url = '/api/sse/memory',
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
