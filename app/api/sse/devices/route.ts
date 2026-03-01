/**
 * Devices Telemetry SSE Proxy - Feb 28, 2026
 *
 * Proxies MAS /ws/devices/telemetry to SSE for browser consumption.
 * NO MOCK DATA - Live MAS stream only.
 */

import { NextRequest } from 'next/server';
import { createSseProxy } from '../_proxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return createSseProxy(request, {
    wsPath: '/ws/devices/telemetry',
    connectedMessage: 'Device telemetry SSE connected',
    disconnectedMessage: 'Device telemetry SSE disconnected',
    logLabel: 'Device Telemetry SSE',
  });
}
