/**
 * Security WebSocket Hook
 * 
 * React hook for connecting to MAS security WebSocket stream for real-time events.
 * Falls back to SSE if WebSocket is unavailable.
 * 
 * @version 1.0.0
 * @date February 12, 2026
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface SecurityEvent {
  event_type: string;
  timestamp: string;
  source: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  data: Record<string, unknown>;
}

interface UseSecurityWebSocketOptions {
  /** URL to connect to (defaults to MAS WS endpoint) */
  url?: string;
  /** Event types to filter (empty = all) */
  eventTypes?: string[];
  /** Severity levels to filter (empty = all) */
  severities?: string[];
  /** Auto-reconnect on disconnect */
  autoReconnect?: boolean;
  /** Reconnect interval in ms */
  reconnectInterval?: number;
  /** Maximum reconnect attempts */
  maxReconnectAttempts?: number;
  /** Enable debug logging */
  debug?: boolean;
  /** Use SSE fallback instead of WebSocket */
  useSseFallback?: boolean;
}

interface UseSecurityWebSocketReturn {
  /** Latest event received */
  event: SecurityEvent | null;
  /** All events received (most recent first, max 100) */
  events: SecurityEvent[];
  /** Connection status */
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  /** Error message if any */
  error: string | null;
  /** Number of events received */
  eventCount: number;
  /** Manually reconnect */
  reconnect: () => void;
  /** Disconnect */
  disconnect: () => void;
  /** Update filters */
  setFilters: (filters: { eventTypes?: string[]; severities?: string[] }) => void;
}

const MAS_WS_URL = process.env.NEXT_PUBLIC_MAS_WS_URL || 'ws://192.168.0.188:8001';
const MAX_EVENTS = 100;

export function useSecurityWebSocket(
  options: UseSecurityWebSocketOptions = {}
): UseSecurityWebSocketReturn {
  const {
    url = `${MAS_WS_URL}/ws/security/stream`,
    eventTypes = [],
    severities = [],
    autoReconnect = true,
    reconnectInterval = 5000,
    maxReconnectAttempts = 10,
    debug = false,
    useSseFallback = false,
  } = options;

  const [event, setEvent] = useState<SecurityEvent | null>(null);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [eventCount, setEventCount] = useState(0);
  const [filters, setFilters] = useState({ eventTypes, severities });

  const wsRef = useRef<WebSocket | null>(null);
  const sseRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const log = useCallback(
    (message: string, ...args: unknown[]) => {
      if (debug) {
        console.log(`[SecurityWS] ${message}`, ...args);
      }
    },
    [debug]
  );

  const handleEvent = useCallback((eventData: SecurityEvent) => {
    setEvent(eventData);
    setEventCount((c) => c + 1);
    setEvents((prev) => {
      const updated = [eventData, ...prev];
      return updated.slice(0, MAX_EVENTS);
    });
    log('Event received:', eventData.event_type, eventData.severity);
  }, [log]);

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setStatus('connecting');
    setError(null);
    log('Connecting to WebSocket:', url);

    try {
      // Build URL with filter params
      const wsUrl = new URL(url);
      if (filters.severities.length > 0) {
        wsUrl.searchParams.set('severities', filters.severities.join(','));
      }
      if (filters.eventTypes.length > 0) {
        wsUrl.searchParams.set('types', filters.eventTypes.join(','));
      }

      const ws = new WebSocket(wsUrl.toString());
      wsRef.current = ws;

      ws.onopen = () => {
        log('WebSocket connected');
        setStatus('connected');
        setError(null);
        reconnectAttemptsRef.current = 0;

        // Start ping interval
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
      };

      ws.onmessage = (messageEvent) => {
        try {
          const data = JSON.parse(messageEvent.data);
          
          // Handle system messages
          if (data.type === 'connected' || data.type === 'subscribed' || data.type === 'pong') {
            log('System message:', data.type);
            return;
          }

          // Handle security events
          if (data.event_type) {
            handleEvent(data as SecurityEvent);
          }
        } catch (e) {
          log('Failed to parse message:', e);
        }
      };

      ws.onerror = (errorEvent) => {
        log('WebSocket error:', errorEvent);
        setError('WebSocket connection error');
        setStatus('error');
      };

      ws.onclose = (closeEvent) => {
        log('WebSocket closed:', closeEvent.code, closeEvent.reason);
        setStatus('disconnected');
        
        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        // Auto-reconnect if enabled and not max attempts
        if (
          autoReconnect &&
          reconnectAttemptsRef.current < maxReconnectAttempts &&
          !closeEvent.wasClean
        ) {
          reconnectAttemptsRef.current++;
          log(`Scheduling reconnect attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`);
          reconnectTimeoutRef.current = setTimeout(connectWebSocket, reconnectInterval);
        }
      };
    } catch (e) {
      log('Failed to create WebSocket:', e);
      setError(`Failed to connect: ${e instanceof Error ? e.message : 'Unknown error'}`);
      setStatus('error');
    }
  }, [url, filters, autoReconnect, reconnectInterval, maxReconnectAttempts, handleEvent, log]);

  const connectSSE = useCallback(() => {
    setStatus('connecting');
    setError(null);
    log('Connecting to SSE fallback');

    try {
      // Use local SSE endpoint
      const sseUrl = new URL('/api/security/alerts/stream', window.location.origin);
      if (filters.severities.length > 0) {
        sseUrl.searchParams.set('severities', filters.severities.join(','));
      }
      if (filters.eventTypes.length > 0) {
        sseUrl.searchParams.set('types', filters.eventTypes.join(','));
      }

      const eventSource = new EventSource(sseUrl.toString());
      sseRef.current = eventSource;

      eventSource.onopen = () => {
        log('SSE connected');
        setStatus('connected');
        setError(null);
        reconnectAttemptsRef.current = 0;
      };

      eventSource.onerror = () => {
        log('SSE error');
        setError('SSE connection error');
        setStatus('error');
        eventSource.close();

        // Auto-reconnect
        if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          reconnectTimeoutRef.current = setTimeout(connectSSE, reconnectInterval);
        }
      };

      // Listen for alert events
      eventSource.addEventListener('alert', (e) => {
        try {
          const data = JSON.parse(e.data);
          handleEvent({
            event_type: 'alert',
            timestamp: data.timestamp || new Date().toISOString(),
            source: 'sse',
            severity: data.severity || 'info',
            title: data.title || 'Security Alert',
            message: data.message || '',
            data: data,
          });
        } catch (err) {
          log('Failed to parse SSE alert:', err);
        }
      });

    } catch (e) {
      log('Failed to create SSE:', e);
      setError(`Failed to connect: ${e instanceof Error ? e.message : 'Unknown error'}`);
      setStatus('error');
    }
  }, [filters, autoReconnect, reconnectInterval, maxReconnectAttempts, handleEvent, log]);

  const disconnect = useCallback(() => {
    log('Disconnecting');

    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Clear ping interval
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnect');
      wsRef.current = null;
    }

    // Close SSE
    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }

    setStatus('disconnected');
    reconnectAttemptsRef.current = maxReconnectAttempts; // Prevent auto-reconnect
  }, [log, maxReconnectAttempts]);

  const reconnect = useCallback(() => {
    log('Manual reconnect');
    disconnect();
    reconnectAttemptsRef.current = 0;
    
    if (useSseFallback) {
      connectSSE();
    } else {
      connectWebSocket();
    }
  }, [disconnect, useSseFallback, connectSSE, connectWebSocket, log]);

  const updateFilters = useCallback(
    (newFilters: { eventTypes?: string[]; severities?: string[] }) => {
      setFilters((prev) => ({
        eventTypes: newFilters.eventTypes ?? prev.eventTypes,
        severities: newFilters.severities ?? prev.severities,
      }));
    },
    []
  );

  // Connect on mount
  useEffect(() => {
    if (useSseFallback) {
      connectSSE();
    } else {
      connectWebSocket();
    }

    return () => {
      disconnect();
    };
  }, [useSseFallback]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reconnect when filters change
  useEffect(() => {
    if (status === 'connected') {
      // For WebSocket, send subscribe message
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'subscribe',
            severities: filters.severities.length > 0 ? filters.severities : null,
            types: filters.eventTypes.length > 0 ? filters.eventTypes : null,
          })
        );
      } else if (sseRef.current) {
        // For SSE, need to reconnect with new params
        reconnect();
      }
    }
  }, [filters, status, reconnect]);

  return {
    event,
    events,
    status,
    error,
    eventCount,
    reconnect,
    disconnect,
    setFilters: updateFilters,
  };
}

export default useSecurityWebSocket;
