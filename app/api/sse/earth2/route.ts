/**
 * Earth2 Predictions SSE Proxy - Feb 28, 2026
 *
 * Proxies MAS /ws/earth2/predictions to SSE for browser consumption.
 * NO MOCK DATA - Live MAS stream only.
 */

import { NextRequest } from 'next/server';
import { createSseProxy } from '../_proxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return createSseProxy(request, {
    wsPath: '/ws/earth2/predictions',
    connectedMessage: 'Earth2 predictions SSE connected',
    disconnectedMessage: 'Earth2 predictions SSE disconnected',
    logLabel: 'Earth2 Predictions SSE',
  });
}
