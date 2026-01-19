/**
 * Security Alerts SSE Stream
 * Provides real-time security alerts via Server-Sent Events
 */

import { NextRequest } from 'next/server';
import { createAlertStream } from '@/lib/security/websocket-alerts';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  // Parse filters from query params
  const severitiesParam = searchParams.get('severities');
  const typesParam = searchParams.get('types');
  
  const options = {
    severities: severitiesParam ? severitiesParam.split(',') : undefined,
    types: typesParam ? typesParam.split(',') : undefined,
  };
  
  // Create the SSE stream
  const stream = createAlertStream(options);
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
