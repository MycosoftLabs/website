/**
 * Task Progress SSE Hook - Feb 28, 2026
 */

'use client';

import { useSseStream, MasStreamEvent, UseSseStreamResult } from './use-sse-stream';

export interface UseTaskProgressOptions {
  url?: string;
  isEnabled?: boolean;
  autoReconnect?: boolean;
  reconnectDelayMs?: number;
}

export interface UseTaskProgressResult extends UseSseStreamResult<MasStreamEvent> {}

export function useTaskProgress(
  options: UseTaskProgressOptions = {}
): UseTaskProgressResult {
  const {
    url = '/api/sse/tasks',
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
