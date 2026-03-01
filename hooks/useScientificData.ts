/**
 * Scientific Data SSE Hook - Feb 28, 2026
 */

'use client';

import { useSseStream, MasStreamEvent, UseSseStreamResult } from './use-sse-stream';

export interface UseScientificDataOptions {
  url?: string;
  isEnabled?: boolean;
  autoReconnect?: boolean;
  reconnectDelayMs?: number;
}

export interface UseScientificDataResult extends UseSseStreamResult<MasStreamEvent> {}

export function useScientificData(
  options: UseScientificDataOptions = {}
): UseScientificDataResult {
  const {
    url = '/api/sse/scientific',
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
