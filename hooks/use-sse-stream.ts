/**
 * Shared SSE hook for MAS stream proxies - Feb 28, 2026
 *
 * Connects to Next.js SSE proxy endpoints and returns live stream state.
 * NO MOCK DATA - Live MAS stream only.
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface MasStreamEvent {
  type?: string;
  timestamp?: string;
  source?: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface UseSseStreamOptions<T> {
  url: string;
  isEnabled?: boolean;
  autoReconnect?: boolean;
  reconnectDelayMs?: number;
  parse?: (raw: string) => T | null;
}

export interface UseSseStreamResult<T> {
  data: T | null;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  error: string | null;
  eventCount: number;
  lastEventAt: Date | null;
  connect: () => void;
  disconnect: () => void;
}

function parseJson<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function useSseStream<T>({
  url,
  isEnabled = true,
  autoReconnect = true,
  reconnectDelayMs = 4000,
  parse = parseJson,
}: UseSseStreamOptions<T>): UseSseStreamResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>(
    'disconnected'
  );
  const [error, setError] = useState<string | null>(null);
  const [eventCount, setEventCount] = useState(0);
  const [lastEventAt, setLastEventAt] = useState<Date | null>(null);

  const sourceRef = useRef<EventSource | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const disconnect = useCallback(() => {
    if (reconnectRef.current) {
      clearTimeout(reconnectRef.current);
      reconnectRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.close();
      sourceRef.current = null;
    }
    setStatus('disconnected');
  }, []);

  const connect = useCallback(() => {
    if (!isEnabled || sourceRef.current) return;

    setStatus('connecting');
    setError(null);

    try {
      const source = new EventSource(url);
      sourceRef.current = source;

      source.onopen = () => {
        setStatus('connected');
      };

      source.onmessage = (event) => {
        const parsed = parse(event.data);
        if (!parsed) {
          setError('Failed to parse SSE payload');
          return;
        }
        setData(parsed);
        setEventCount((count) => count + 1);
        setLastEventAt(new Date());
      };

      source.onerror = () => {
        setStatus('error');
        setError('SSE connection error');
        source.close();
        sourceRef.current = null;

        if (autoReconnect && isEnabled) {
          reconnectRef.current = setTimeout(connect, reconnectDelayMs);
        }
      };
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to open SSE connection');
    }
  }, [autoReconnect, isEnabled, parse, reconnectDelayMs, url]);

  useEffect(() => {
    if (!isEnabled) {
      disconnect();
      return;
    }

    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect, isEnabled]);

  return {
    data,
    status,
    error,
    eventCount,
    lastEventAt,
    connect,
    disconnect,
  };
}
