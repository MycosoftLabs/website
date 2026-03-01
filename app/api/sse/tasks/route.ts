/**
 * Task Progress SSE Proxy - Feb 28, 2026
 *
 * Proxies MAS /ws/tasks/progress to SSE for browser consumption.
 * NO MOCK DATA - Live MAS stream only.
 */

import { NextRequest } from 'next/server';
import { createSseProxy } from '../_proxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return createSseProxy(request, {
    wsPath: '/ws/tasks/progress',
    connectedMessage: 'Task progress SSE connected',
    disconnectedMessage: 'Task progress SSE disconnected',
    logLabel: 'Task Progress SSE',
  });
}
