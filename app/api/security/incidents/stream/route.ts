/**
 * Incident Stream SSE Endpoint
 * 
 * Provides real-time incident updates and agent activity via Server-Sent Events.
 * Supports filtering by severity, status, agent, and event type.
 * 
 * @version 1.0.0
 * @date January 24, 2026
 */

import { NextRequest } from 'next/server';
import { getIncidents, getIncidentLogChain, getAgentActivity } from '@/lib/security/database';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Track connected clients for broadcasting
const clients = new Set<ReadableStreamDefaultController>();

// Track the last known state for polling
let lastIncidentTimestamp = new Date().toISOString();
let lastChainSequence = 0;
let lastActivityTimestamp = new Date().toISOString();

/**
 * Broadcast an event to all connected clients
 */
export function broadcastIncidentEvent(event: {
  type: 'incident' | 'chain' | 'activity' | 'stats';
  data: unknown;
}): void {
  const message = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
  const encoder = new TextEncoder();
  const encoded = encoder.encode(message);
  
  clients.forEach(controller => {
    try {
      controller.enqueue(encoded);
    } catch {
      // Client disconnected
      clients.delete(controller);
    }
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  // Parse filters from query params
  const severities = searchParams.get('severities')?.split(',');
  const statuses = searchParams.get('statuses')?.split(',');
  const agents = searchParams.get('agents')?.split(',');
  const includeChain = searchParams.get('chain') !== 'false';
  const includeActivity = searchParams.get('activity') !== 'false';
  
  // Polling interval in ms
  const pollInterval = parseInt(searchParams.get('interval') || '2000', 10);
  
  // Create the SSE stream
  const stream = new ReadableStream({
    async start(controller) {
      clients.add(controller);
      
      const encoder = new TextEncoder();
      
      // Send initial connection event
      const connectMessage = `event: connected\ndata: ${JSON.stringify({
        timestamp: new Date().toISOString(),
        filters: { severities, statuses, agents, includeChain, includeActivity },
      })}\n\n`;
      controller.enqueue(encoder.encode(connectMessage));
      
      // Send initial state
      try {
        // Get current incidents
        const incidents = await getIncidents({ limit: 50 });
        const filteredIncidents = incidents.filter(inc => {
          if (severities && !severities.includes(inc.severity)) return false;
          if (statuses && !statuses.includes(inc.status)) return false;
          return true;
        });
        
        controller.enqueue(encoder.encode(
          `event: initial_incidents\ndata: ${JSON.stringify(filteredIncidents)}\n\n`
        ));
        
        // Get chain entries if requested
        if (includeChain) {
          const chainEntries = await getIncidentLogChain({ limit: 20 });
          controller.enqueue(encoder.encode(
            `event: initial_chain\ndata: ${JSON.stringify(chainEntries)}\n\n`
          ));
          if (chainEntries.length > 0) {
            lastChainSequence = chainEntries[0].sequence_number;
          }
        }
        
        // Get agent activity if requested
        if (includeActivity) {
          const agentActivityData = await getAgentActivity({ limit: 20 });
          const filteredActivity = agents 
            ? agentActivityData.filter(a => agents.includes(a.agent_id))
            : agentActivityData;
          controller.enqueue(encoder.encode(
            `event: initial_activity\ndata: ${JSON.stringify(filteredActivity)}\n\n`
          ));
          if (filteredActivity.length > 0) {
            lastActivityTimestamp = filteredActivity[0].created_at;
          }
        }
      } catch (error) {
        console.error('[IncidentStream] Error sending initial state:', error);
      }
      
      // Track if connection is still active
      let isActive = true;
      
      // Helper to safely enqueue data
      const safeEnqueue = (data: Uint8Array): boolean => {
        if (!isActive) return false;
        try {
          controller.enqueue(data);
          return true;
        } catch {
          isActive = false;
          return false;
        }
      };
      
      // Polling loop for updates
      const pollForUpdates = async () => {
        if (!isActive) return;
        
        try {
          // Check for new incidents
          const incidents = await getIncidents({ limit: 10 });
          const newIncidents = incidents.filter(inc => {
            if (inc.updated_at <= lastIncidentTimestamp) return false;
            if (severities && !severities.includes(inc.severity)) return false;
            if (statuses && !statuses.includes(inc.status)) return false;
            return true;
          });
          
          if (newIncidents.length > 0 && isActive) {
            lastIncidentTimestamp = newIncidents[0].updated_at;
            for (const inc of newIncidents) {
              if (!safeEnqueue(encoder.encode(
                `event: incident\ndata: ${JSON.stringify(inc)}\n\n`
              ))) break;
            }
          }
          
          // Check for new chain entries
          if (includeChain && isActive) {
            const chainEntries = await getIncidentLogChain({ limit: 10 });
            const newChainEntries = chainEntries.filter(
              entry => entry.sequence_number > lastChainSequence
            );
            
            if (newChainEntries.length > 0) {
              lastChainSequence = newChainEntries[0].sequence_number;
              for (const entry of newChainEntries) {
                if (!safeEnqueue(encoder.encode(
                  `event: chain\ndata: ${JSON.stringify(entry)}\n\n`
                ))) break;
              }
            }
          }
          
          // Check for new agent activity
          if (includeActivity && isActive) {
            const agentActivityData = await getAgentActivity({ limit: 10 });
            const newActivity = agentActivityData.filter(a => {
              if (a.created_at <= lastActivityTimestamp) return false;
              if (agents && !agents.includes(a.agent_id)) return false;
              return true;
            });
            
            if (newActivity.length > 0) {
              lastActivityTimestamp = newActivity[0].created_at;
              for (const activity of newActivity) {
                if (!safeEnqueue(encoder.encode(
                  `event: activity\ndata: ${JSON.stringify(activity)}\n\n`
                ))) break;
              }
            }
          }
          
          // Send heartbeat
          if (isActive) {
            safeEnqueue(encoder.encode(
              `event: heartbeat\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`
            ));
          }
          
        } catch (error) {
          // Only log if connection is still active (not a disconnect error)
          if (isActive) {
            console.error('[IncidentStream] Polling error:', error);
          }
        }
      };
      
      // Start polling
      const intervalId = setInterval(pollForUpdates, pollInterval);
      
      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        isActive = false;
        clearInterval(intervalId);
        clients.delete(controller);
        try {
          controller.close();
        } catch {
          // Controller already closed
        }
      });
    },
    
    cancel() {
      // Client disconnected
    },
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

// Re-export for use in other modules
export { broadcastIncidentEvent as broadcast };
