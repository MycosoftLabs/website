import { NextRequest } from 'next/server';

const MAS_API_URL = process.env.MAS_API_URL || 'http://localhost:8001';
const MAS_WS_URL = MAS_API_URL.replace('http://', 'ws://').replace('https://', 'wss://');

interface SseProxyOptions {
  wsPath: string;
  connectedMessage: string;
  disconnectedMessage: string;
  logLabel: string;
  initialMessage?: Record<string, unknown>;
  query?: Record<string, string | undefined>;
}

function buildWsUrl(options: SseProxyOptions): string {
  const wsUrl = new URL(options.wsPath, MAS_WS_URL);
  if (options.query) {
    Object.entries(options.query).forEach(([key, value]) => {
      if (value) wsUrl.searchParams.set(key, value);
    });
  }
  return wsUrl.toString();
}

function encodeMessage(encoder: TextEncoder, payload: Record<string, unknown>): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(payload)}\n\n`);
}

export async function createSseProxy(request: NextRequest, options: SseProxyOptions) {
  const encoder = new TextEncoder();

  const customReadable = new ReadableStream({
    async start(controller) {
      let ws: WebSocket | null = null;
      let heartbeatInterval: NodeJS.Timeout | null = null;

      try {
        const wsUrl = buildWsUrl(options);

        const WebSocketClient = (await import('ws')).default;

        // Connection timeout to prevent hanging on tunnel drops (increased to 20s for post-restart recovery)
        const connectTimeout = setTimeout(() => {
          if (ws && ws.readyState === WebSocketClient.CONNECTING) {
            console.error(`[${options.logLabel}] WebSocket connection timeout after 20s`);
            ws.close();
            controller.enqueue(
              encodeMessage(encoder, {
                type: 'error',
                error: 'Connection timeout',
                message: 'Real-time connection timed out. Retrying automatically.',
                timestamp: new Date().toISOString(),
              })
            );
            controller.close();
          }
        }, 20000);

        ws = new WebSocketClient(wsUrl);

        controller.enqueue(
          encodeMessage(encoder, {
            type: 'connected',
            message: options.connectedMessage,
            timestamp: new Date().toISOString(),
          })
        );

        ws.on('open', () => {
          clearTimeout(connectTimeout);
          console.log(`[${options.logLabel}] WebSocket connected`);

          if (options.initialMessage) {
            ws?.send(JSON.stringify(options.initialMessage));
          }

          // Heartbeat every 15s to detect tunnel drops faster
          heartbeatInterval = setInterval(() => {
            if (ws && ws.readyState === WebSocketClient.OPEN) {
              ws.send(JSON.stringify({ type: 'ping' }));
            } else if (ws && ws.readyState !== WebSocketClient.CONNECTING) {
              // Connection lost — clean up
              console.error(`[${options.logLabel}] WebSocket not open (state: ${ws.readyState}), closing`);
              if (heartbeatInterval) clearInterval(heartbeatInterval);
              try { ws.close(); } catch { /* already closing */ }
            }
          }, 15000);
        });

        ws.on('message', (data: Buffer) => {
          try {
            const message = JSON.parse(data.toString());
            controller.enqueue(encodeMessage(encoder, message));
          } catch (error) {
            console.error(`[${options.logLabel}] Message parse error:`, error);
          }
        });

        ws.on('error', (error: { message?: string }) => {
          clearTimeout(connectTimeout);
          console.error(`[${options.logLabel}] WebSocket error:`, error);
          controller.enqueue(
            encodeMessage(encoder, {
              type: 'error',
              error: 'WebSocket error',
              message: error.message || 'Unknown error',
              timestamp: new Date().toISOString(),
            })
          );
        });

        ws.on('close', (code: number, reason: Buffer) => {
          clearTimeout(connectTimeout);
          console.log(`[${options.logLabel}] WebSocket closed (code: ${code}, reason: ${reason?.toString() || 'none'})`);

          if (heartbeatInterval) clearInterval(heartbeatInterval);

          controller.enqueue(
            encodeMessage(encoder, {
              type: 'disconnected',
              message: options.disconnectedMessage,
              code,
              timestamp: new Date().toISOString(),
            })
          );
          controller.close();
        });

        request.signal.addEventListener('abort', () => {
          clearTimeout(connectTimeout);
          console.log(`[${options.logLabel}] Client disconnected`);

          if (heartbeatInterval) clearInterval(heartbeatInterval);
          if (ws && ws.readyState === WebSocketClient.OPEN) {
            ws.close();
          }
          controller.close();
        });
      } catch (error) {
        console.error(`[${options.logLabel}] Setup error:`, error);
        controller.enqueue(
          encodeMessage(encoder, {
            type: 'error',
            error: 'Connection setup failed',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
          })
        );
        controller.close();
      }
    },
  });

  return new Response(customReadable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
