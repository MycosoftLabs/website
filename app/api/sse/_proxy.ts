import { NextRequest } from 'next/server';

const MAS_API_URL = process.env.MAS_API_URL || 'http://192.168.0.188:8001';
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
        ws = new WebSocketClient(wsUrl);

        controller.enqueue(
          encodeMessage(encoder, {
            type: 'connected',
            message: options.connectedMessage,
            timestamp: new Date().toISOString(),
          })
        );

        ws.on('open', () => {
          console.log(`[${options.logLabel}] WebSocket connected`);

          if (options.initialMessage) {
            ws?.send(JSON.stringify(options.initialMessage));
          }

          heartbeatInterval = setInterval(() => {
            if (ws && ws.readyState === WebSocketClient.OPEN) {
              ws.send(JSON.stringify({ type: 'ping' }));
            }
          }, 30000);
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

        ws.on('close', () => {
          console.log(`[${options.logLabel}] WebSocket closed`);

          if (heartbeatInterval) clearInterval(heartbeatInterval);

          controller.enqueue(
            encodeMessage(encoder, {
              type: 'disconnected',
              message: options.disconnectedMessage,
              timestamp: new Date().toISOString(),
            })
          );
          controller.close();
        });

        request.signal.addEventListener('abort', () => {
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
