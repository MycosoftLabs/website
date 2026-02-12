/**
 * Incident Stream SSE Endpoint
 * 
 * Provides real-time incident updates and agent activity via Server-Sent Events.
 * 
 * UPDATED: February 12, 2026
 * - Converted from polling-based to push-based delivery
 * - Uses IncidentManager singleton for broadcast pattern
 * - Integrates with MAS WebSocket for cross-system events
 * 
 * @version 2.0.0
 */

import { NextRequest } from 'next/server';
import { getIncidents, getIncidentLogChain, getAgentActivity } from '@/lib/security/database';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ═══════════════════════════════════════════════════════════════
// INCIDENT MANAGER (Push-based singleton)
// ═══════════════════════════════════════════════════════════════

interface IncidentEvent {
  type: 'incident' | 'chain' | 'activity' | 'stats' | 'heartbeat';
  timestamp: string;
  data: unknown;
}

interface IncidentSubscriber {
  id: string;
  controller: ReadableStreamDefaultController;
  filters: {
    severities?: string[];
    statuses?: string[];
    agents?: string[];
    includeChain: boolean;
    includeActivity: boolean;
  };
}

class IncidentManager {
  private static instance: IncidentManager;
  private subscribers: Map<string, IncidentSubscriber> = new Map();
  private eventQueue: IncidentEvent[] = [];
  private readonly MAX_QUEUE_SIZE = 100;
  
  private constructor() {}
  
  static getInstance(): IncidentManager {
    if (!IncidentManager.instance) {
      IncidentManager.instance = new IncidentManager();
    }
    return IncidentManager.instance;
  }
  
  subscribe(subscriber: IncidentSubscriber): () => void {
    this.subscribers.set(subscriber.id, subscriber);
    console.log(`[IncidentManager] Subscriber added: ${subscriber.id} (total: ${this.subscribers.size})`);
    
    return () => {
      this.subscribers.delete(subscriber.id);
      console.log(`[IncidentManager] Subscriber removed: ${subscriber.id} (total: ${this.subscribers.size})`);
    };
  }
  
  private shouldSendToSubscriber(subscriber: IncidentSubscriber, event: IncidentEvent): boolean {
    const { filters } = subscriber;
    
    // Filter chain events
    if (event.type === 'chain' && !filters.includeChain) {
      return false;
    }
    
    // Filter activity events
    if (event.type === 'activity' && !filters.includeActivity) {
      return false;
    }
    
    // Filter incidents by severity/status
    if (event.type === 'incident' && event.data) {
      const incData = event.data as { severity?: string; status?: string };
      if (filters.severities && incData.severity && !filters.severities.includes(incData.severity)) {
        return false;
      }
      if (filters.statuses && incData.status && !filters.statuses.includes(incData.status)) {
        return false;
      }
    }
    
    // Filter agent activity by agent ID
    if (event.type === 'activity' && filters.agents && event.data) {
      const actData = event.data as { agent_id?: string };
      if (actData.agent_id && !filters.agents.includes(actData.agent_id)) {
        return false;
      }
    }
    
    return true;
  }
  
  broadcast(event: IncidentEvent): void {
    // Add to queue
    this.eventQueue.push(event);
    if (this.eventQueue.length > this.MAX_QUEUE_SIZE) {
      this.eventQueue.shift();
    }
    
    const encoder = new TextEncoder();
    const message = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
    const encoded = encoder.encode(message);
    
    this.subscribers.forEach((subscriber) => {
      if (!this.shouldSendToSubscriber(subscriber, event)) {
        return;
      }
      
      try {
        subscriber.controller.enqueue(encoded);
      } catch {
        // Client disconnected, will be cleaned up
        this.subscribers.delete(subscriber.id);
      }
    });
  }
  
  getRecentEvents(limit = 20): IncidentEvent[] {
    return this.eventQueue.slice(-limit).reverse();
  }
  
  getSubscriberCount(): number {
    return this.subscribers.size;
  }
}

export const incidentManager = IncidentManager.getInstance();

// ═══════════════════════════════════════════════════════════════
// BROADCAST FUNCTIONS (for external use)
// ═══════════════════════════════════════════════════════════════

/**
 * Broadcast an incident event to all connected clients
 */
export function broadcastIncidentEvent(event: {
  type: 'incident' | 'chain' | 'activity' | 'stats';
  data: unknown;
}): void {
  incidentManager.broadcast({
    type: event.type,
    timestamp: new Date().toISOString(),
    data: event.data,
  });
}

/**
 * Broadcast a new/updated incident
 */
export function broadcastIncident(incident: {
  id: string;
  title: string;
  severity: string;
  status: string;
  action: 'created' | 'updated' | 'escalated' | 'resolved';
}): void {
  broadcastIncidentEvent({
    type: 'incident',
    data: {
      ...incident,
      action: incident.action,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Broadcast agent activity
 */
export function broadcastAgentActivity(activity: {
  agent_id: string;
  agent_name: string;
  action: string;
  details?: string;
}): void {
  broadcastIncidentEvent({
    type: 'activity',
    data: {
      ...activity,
      created_at: new Date().toISOString(),
    },
  });
}

// ═══════════════════════════════════════════════════════════════
// SSE ENDPOINT
// ═══════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  // Parse filters from query params
  const severities = searchParams.get('severities')?.split(',');
  const statuses = searchParams.get('statuses')?.split(',');
  const agents = searchParams.get('agents')?.split(',');
  const includeChain = searchParams.get('chain') !== 'false';
  const includeActivity = searchParams.get('activity') !== 'false';
  
  const subscriberId = `sse-inc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Create the SSE stream
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      
      // Subscribe to incident events
      const unsubscribe = incidentManager.subscribe({
        id: subscriberId,
        controller,
        filters: {
          severities,
          statuses,
          agents,
          includeChain,
          includeActivity,
        },
      });
      
      // Send initial connection event
      const connectMessage = `event: connected\ndata: ${JSON.stringify({
        timestamp: new Date().toISOString(),
        subscriberId,
        filters: { severities, statuses, agents, includeChain, includeActivity },
      })}\n\n`;
      controller.enqueue(encoder.encode(connectMessage));
      
      // Send initial state from database
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
        }
      } catch (error) {
        console.error('[IncidentStream] Error sending initial state:', error);
      }
      
      // Heartbeat to keep connection alive (every 30 seconds)
      const heartbeatInterval = setInterval(() => {
        try {
          const heartbeat = `event: heartbeat\ndata: ${JSON.stringify({ 
            timestamp: new Date().toISOString(),
            subscribers: incidentManager.getSubscriberCount(),
          })}\n\n`;
          controller.enqueue(encoder.encode(heartbeat));
        } catch {
          clearInterval(heartbeatInterval);
          unsubscribe();
        }
      }, 30000);
      
      // Cleanup on abort
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval);
        unsubscribe();
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
