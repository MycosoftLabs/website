/**
 * Earth2 Predictions SSE Hook - Feb 28, 2026
 */

'use client';

import { useSseStream, MasStreamEvent, UseSseStreamResult } from './use-sse-stream';

export interface UseEarth2PredictionsOptions {
  url?: string;
  isEnabled?: boolean;
  autoReconnect?: boolean;
  reconnectDelayMs?: number;
}

export interface UseEarth2PredictionsResult extends UseSseStreamResult<MasStreamEvent> {}

export function useEarth2Predictions(
  options: UseEarth2PredictionsOptions = {}
): UseEarth2PredictionsResult {
  const {
    url = '/api/sse/earth2',
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
