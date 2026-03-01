/**
 * Scientific Data SSE Proxy - Feb 28, 2026
 *
 * Proxies MAS /ws/scientific/data to SSE for browser consumption.
 * NO MOCK DATA - Live MAS stream only.
 */

import { NextRequest } from 'next/server';
import { createSseProxy } from '../_proxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return createSseProxy(request, {
    wsPath: '/ws/scientific/data',
    connectedMessage: 'Scientific data SSE connected',
    disconnectedMessage: 'Scientific data SSE disconnected',
    logLabel: 'Scientific Data SSE',
  });
}
