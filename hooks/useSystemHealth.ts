/**
 * System Health SSE Hook - Feb 28, 2026
 */

'use client';

import { useSseStream, MasStreamEvent, UseSseStreamResult } from './use-sse-stream';

export interface UseSystemHealthOptions {
  url?: string;
  isEnabled?: boolean;
  autoReconnect?: boolean;
  reconnectDelayMs?: number;
}

export interface UseSystemHealthResult extends UseSseStreamResult<MasStreamEvent> {}

export function useSystemHealth(
  options: UseSystemHealthOptions = {}
): UseSystemHealthResult {
  const {
    url = '/api/sse/health',
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
