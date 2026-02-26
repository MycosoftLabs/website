/**
 * Mycorrhizae Protocol Client - TypeScript/JavaScript
 *
 * Subscribe to channels via SSE or WebSocket and publish messages.
 * In browser: uses /api/mycorrhizae proxy when baseUrl not set.
 * In server: uses MYCORRHIZAE_API_URL or localhost:8002.
 */
import { getSecureWebSocketUrl } from "@/lib/utils/websocket-url";

function getDefaultBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/mycorrhizae`;
  }
  return process.env.MYCORRHIZAE_API_URL || 'http://localhost:8002';
}

export interface MycorrhizaeMessage {
  id: string;
  channel: string;
  timestamp: string;
  payload: Record<string, unknown>;
  message_type?: string;
  source?: { type?: string; id?: string; device_serial?: string };
}

export interface MycorrhizaeClientOptions {
  baseUrl?: string;
  apiKey?: string;
}

export class MycorrhizaeClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(options: MycorrhizaeClientOptions = {}) {
    this.baseUrl = (options.baseUrl || getDefaultBaseUrl()).replace(/\/$/, '');
    this.apiKey = options.apiKey || process.env.MYCORRHIZAE_API_KEY || '';
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.apiKey) h['X-API-Key'] = this.apiKey;
    return h;
  }

  async publish(
    channel: string,
    payload: Record<string, unknown>,
    messageType = 'telemetry'
  ): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/channels/${encodeURIComponent(channel)}/publish`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({ payload, message_type: messageType }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  subscribe(
    channelPattern: string,
    callback: (message: MycorrhizaeMessage) => void,
    transport: 'sse' | 'websocket' = 'sse'
  ): () => void {
    if (transport === 'websocket') {
      return this.subscribeWebSocket(channelPattern, callback);
    }
    return this.subscribeSSE(channelPattern, callback);
  }

  private subscribeSSE(
    channelPattern: string,
    callback: (message: MycorrhizaeMessage) => void
  ): () => void {
    const url = `${this.baseUrl}/api/stream/subscribe?channel=${encodeURIComponent(channelPattern)}`;
    const eventSource = new EventSource(url);
    let aborted = false;

    eventSource.onmessage = (e) => {
      if (aborted) return;
      try {
        const data = JSON.parse(e.data);
        if (data.payload) callback(data as MycorrhizaeMessage);
        else callback(data);
      } catch {
        // ignore parse errors
      }
    };

    eventSource.onerror = () => {
      if (!aborted) eventSource.close();
    };

    return () => {
      aborted = true;
      eventSource.close();
    };
  }

  private subscribeWebSocket(
    channelPatterns: string,
    callback: (message: MycorrhizaeMessage) => void
  ): () => void {
    const wsUrl = getSecureWebSocketUrl(this.baseUrl.replace(/^https?:\/\//, "ws://"));
    const ws = new WebSocket(`${wsUrl.replace(/\/$/, "")}/api/ws/subscribe?channels=${encodeURIComponent(channelPatterns)}`);
    let aborted = false;

    ws.onopen = () => {
      if (this.apiKey) {
        ws.send(JSON.stringify({ type: 'auth', api_key: this.apiKey }));
      }
    };

    ws.onmessage = (e) => {
      if (aborted) return;
      try {
        const data = JSON.parse(e.data);
        if (data.event === 'message' && data.data) callback(data.data as MycorrhizaeMessage);
      } catch {
        // ignore
      }
    };

    return () => {
      aborted = true;
      ws.close();
    };
  }
}
