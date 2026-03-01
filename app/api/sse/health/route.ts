/**
 * System Health SSE Proxy - Feb 28, 2026
 *
 * Proxies MAS /ws/system/health to SSE for browser consumption.
 * NO MOCK DATA - Live MAS stream only.
 */

import { NextRequest } from 'next/server';
import { createSseProxy } from '../_proxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return createSseProxy(request, {
    wsPath: '/ws/system/health',
    connectedMessage: 'System health SSE connected',
    disconnectedMessage: 'System health SSE disconnected',
    logLabel: 'System Health SSE',
  });
}
