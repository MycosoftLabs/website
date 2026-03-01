/**
 * Agents Status SSE Proxy - Feb 28, 2026
 *
 * Proxies MAS /ws/agents/status to SSE for browser consumption.
 * NO MOCK DATA - Live MAS stream only.
 */

import { NextRequest } from 'next/server';
import { createSseProxy } from '../_proxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return createSseProxy(request, {
    wsPath: '/ws/agents/status',
    connectedMessage: 'Agent status SSE connected',
    disconnectedMessage: 'Agent status SSE disconnected',
    logLabel: 'Agent Status SSE',
  });
}
