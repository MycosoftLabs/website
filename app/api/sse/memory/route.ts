/**
 * Memory Updates SSE Proxy - Feb 28, 2026
 *
 * Proxies MAS /ws/memory/updates to SSE for browser consumption.
 * NO MOCK DATA - Live MAS stream only.
 */

import { NextRequest } from 'next/server';
import { createSseProxy } from '../_proxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return createSseProxy(request, {
    wsPath: '/ws/memory/updates',
    connectedMessage: 'Memory updates SSE connected',
    disconnectedMessage: 'Memory updates SSE disconnected',
    logLabel: 'Memory Updates SSE',
  });
}
