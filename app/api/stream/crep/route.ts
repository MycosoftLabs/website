/**
 * CREP/OEI Dashboard Stream API - February 12, 2026
 * 
 * Server-Sent Events (SSE) proxy to MAS WebSocket for CREP dashboard.
 * Converts WebSocket stream from MAS to SSE for browser consumption.
 * 
 * Real-time data from:
 * - Aviation tracking (aircraft positions)
 * - Maritime tracking (vessel positions)
 * - Satellite tracking
 * - Weather updates
 * 
 * NO MOCK DATA - Proxies Redis pub/sub via MAS WebSocket
 */

import { NextRequest } from 'next/server';

const MAS_API_URL = process.env.MAS_API_URL || 'http://192.168.0.188:8001';
const MAS_WS_URL = MAS_API_URL.replace('http://', 'ws://').replace('https://', 'wss://');

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/stream/crep
 * 
 * Server-Sent Events endpoint for CREP/OEI dashboard live data.
 * Connects to MAS WebSocket and converts to SSE for browser.
 * 
 * Query params:
 * - category: Optional filter (aircraft, vessel, satellite, weather)
 */
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');

  const customReadable = new ReadableStream({
    async start(controller) {
      let ws: WebSocket | null = null;
      let heartbeatInterval: NodeJS.Timeout | null = null;

      try {
        // Connect to MAS WebSocket
        let wsUrl = `${MAS_WS_URL}/api/crep/stream`;
        if (category) {
          wsUrl += `?category=${encodeURIComponent(category)}`;
        }
        
        // Use Node.js WebSocket (ws package)
        const WebSocket = (await import('ws')).default;
        ws = new WebSocket(wsUrl);

        // Send initial connection message
        controller.enqueue(
          encoder.encode(`event: connected\ndata: ${JSON.stringify({
            message: 'CREP stream connected',
            category: category || 'all',
            timestamp: new Date().toISOString()
          })}\n\n`)
        );

        // WebSocket open handler
        ws.on('open', () => {
          console.log('[CREP Stream] WebSocket connected', category ? `(filter: ${category})` : '');

          // Start heartbeat
          heartbeatInterval = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'ping' }));
            }
          }, 30000); // 30 seconds
        });

        // WebSocket message handler
        ws.on('message', (data: Buffer) => {
          try {
            const message = JSON.parse(data.toString());
            
            // Forward to SSE client
            const eventType = message.type || 'message';
            const eventData = JSON.stringify(message);
            
            controller.enqueue(
              encoder.encode(`event: ${eventType}\ndata: ${eventData}\n\n`)
            );
          } catch (error) {
            console.error('[CREP Stream] Message parse error:', error);
          }
        });

        // WebSocket error handler
        ws.on('error', (error) => {
          console.error('[CREP Stream] WebSocket error:', error);
          
          controller.enqueue(
            encoder.encode(`event: error\ndata: ${JSON.stringify({
              error: 'WebSocket error',
              message: error.message || 'Unknown error',
              timestamp: new Date().toISOString()
            })}\n\n`)
          );
        });

        // WebSocket close handler
        ws.on('close', () => {
          console.log('[CREP Stream] WebSocket closed');
          
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
          }
          
          controller.enqueue(
            encoder.encode(`event: disconnected\ndata: ${JSON.stringify({
              message: 'CREP stream disconnected',
              timestamp: new Date().toISOString()
            })}\n\n`)
          );
          
          controller.close();
        });

        // Handle client disconnect
        request.signal.addEventListener('abort', () => {
          console.log('[CREP Stream] Client disconnected');
          
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
          }
          
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.close();
          }
          
          controller.close();
        });
      } catch (error) {
        console.error('[CREP Stream] Setup error:', error);
        
        controller.enqueue(
          encoder.encode(`event: error\ndata: ${JSON.stringify({
            error: 'Connection setup failed',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          })}\n\n`)
        );
        
        controller.close();
      }
    }
  });

  return new Response(customReadable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
