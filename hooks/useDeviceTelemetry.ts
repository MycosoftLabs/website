/**
 * Device Telemetry SSE Hook - Feb 28, 2026
 */

'use client';

import { useSseStream, MasStreamEvent, UseSseStreamResult } from './use-sse-stream';

export interface UseDeviceTelemetryOptions {
  url?: string;
  isEnabled?: boolean;
  autoReconnect?: boolean;
  reconnectDelayMs?: number;
}

export interface UseDeviceTelemetryResult extends UseSseStreamResult<MasStreamEvent> {}

export function useDeviceTelemetry(
  options: UseDeviceTelemetryOptions = {}
): UseDeviceTelemetryResult {
  const {
    url = '/api/sse/devices',
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
