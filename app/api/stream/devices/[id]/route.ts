/**
 * Device Telemetry Stream API - February 12, 2026
 * 
 * Server-Sent Events (SSE) proxy to MAS WebSocket for device telemetry.
 * Converts WebSocket stream from MAS to SSE for browser consumption.
 * 
 * Real-time data from:
 * - MycoBrain sensors (temperature, humidity, BME688/690)
 * - Lab equipment telemetry
 * - Environmental sensors
 * - Device health and diagnostics
 * 
 * NO MOCK DATA - Proxies Redis pub/sub via MAS WebSocket
 */

import { NextRequest } from 'next/server';

const MAS_API_URL = process.env.MAS_API_URL || 'http://192.168.0.188:8001';
const MAS_WS_URL = MAS_API_URL.replace('http://', 'ws://').replace('https://', 'wss://');

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/stream/devices/[id]
 * 
 * Server-Sent Events endpoint for device telemetry streaming.
 * Connects to MAS WebSocket and converts to SSE for browser.
 * 
 * Path params:
 * - id: Device identifier (e.g., "mushroom1", "sporebase")
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const encoder = new TextEncoder();
  const deviceId = params.id;

  const customReadable = new ReadableStream({
    async start(controller) {
      let ws: WebSocket | null = null;
      let heartbeatInterval: NodeJS.Timeout | null = null;

      try {
        // Connect to MAS WebSocket
        const wsUrl = `${MAS_WS_URL}/ws/devices/${encodeURIComponent(deviceId)}`;
        
        // Use Node.js WebSocket (ws package)
        const WebSocket = (await import('ws')).default;
        ws = new WebSocket(wsUrl);

        // Send initial connection message
        controller.enqueue(
          encoder.encode(`event: connected\ndata: ${JSON.stringify({
            message: `Device stream connected to ${deviceId}`,
            device_id: deviceId,
            timestamp: new Date().toISOString()
          })}\n\n`)
        );

        // WebSocket open handler
        ws.on('open', () => {
          console.log(`[Device Stream] WebSocket connected to ${deviceId}`);

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
            console.error(`[Device Stream ${deviceId}] Message parse error:`, error);
          }
        });

        // WebSocket error handler
        ws.on('error', (error) => {
          console.error(`[Device Stream ${deviceId}] WebSocket error:`, error);
          
          controller.enqueue(
            encoder.encode(`event: error\ndata: ${JSON.stringify({
              error: 'WebSocket error',
              message: error.message || 'Unknown error',
              device_id: deviceId,
              timestamp: new Date().toISOString()
            })}\n\n`)
          );
        });

        // WebSocket close handler
        ws.on('close', () => {
          console.log(`[Device Stream ${deviceId}] WebSocket closed`);
          
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
          }
          
          controller.enqueue(
            encoder.encode(`event: disconnected\ndata: ${JSON.stringify({
              message: `Device stream disconnected from ${deviceId}`,
              device_id: deviceId,
              timestamp: new Date().toISOString()
            })}\n\n`)
          );
          
          controller.close();
        });

        // Handle client disconnect
        request.signal.addEventListener('abort', () => {
          console.log(`[Device Stream ${deviceId}] Client disconnected`);
          
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
          }
          
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.close();
          }
          
          controller.close();
        });
      } catch (error) {
        console.error(`[Device Stream ${deviceId}] Setup error:`, error);
        
        controller.enqueue(
          encoder.encode(`event: error\ndata: ${JSON.stringify({
            error: 'Connection setup failed',
            message: error instanceof Error ? error.message : 'Unknown error',
            device_id: deviceId,
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
