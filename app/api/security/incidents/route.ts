/**
 * Incidents API Endpoint
 * 
 * RESTful API for incident management with cryptographic logging.
 * 
 * GET: List incidents with filtering
 * POST: Create new incident (with chain logging)
 * PATCH: Update incident status/details
 * 
 * @version 1.0.0
 * @date January 24, 2026
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  getIncidents, 
  createIncident, 
  updateIncident,
  getIncidentLogChain,
  getAgentActivity,
  getAgentActivityStats,
} from '@/lib/security/database';
import { logIncidentEvent, getChainStats, verifyChain } from '@/lib/security/incident-chain';
import { broadcastIncidentEvent } from './stream/route';

export const dynamic = 'force-dynamic';

/**
 * GET /api/security/incidents
 * List incidents with optional filtering
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const status = searchParams.get('status') || undefined;
  const severity = searchParams.get('severity') || undefined;
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const includeChain = searchParams.get('chain') === 'true';
  const includeStats = searchParams.get('stats') === 'true';
  
  try {
    const incidents = await getIncidents({ status, severity, limit });
    
    const response: Record<string, unknown> = { incidents };
    
    if (includeChain) {
      const chainEntries = await getIncidentLogChain({ limit: 50 });
      response.chain = chainEntries;
    }
    
    if (includeStats) {
      const [chainStats, activityStats] = await Promise.all([
        getChainStats(),
        getAgentActivityStats(),
      ]);
      response.stats = {
        chain: chainStats,
        activity: activityStats,
      };
    }
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('[Incidents API] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch incidents' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/security/incidents
 * Create a new incident
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      title,
      description,
      severity = 'medium',
      status = 'open',
      assigned_to = null,
      tags = [],
      source = 'api',
      reporter_id = 'api',
      reporter_name = 'API',
    } = body;
    
    if (!title || !description) {
      return NextResponse.json(
        { error: 'Title and description are required' },
        { status: 400 }
      );
    }
    
    // Create the incident
    const incident = await createIncident({
      title,
      description,
      severity,
      status,
      assigned_to,
      resolved_at: null,
      events: [],
      tags: Array.isArray(tags) ? tags : [tags],
      timeline: [{
        timestamp: new Date().toISOString(),
        action: 'created',
        actor: reporter_name,
        details: `Incident created via ${source}`,
      }],
    });
    
    // Log to cryptographic chain
    await logIncidentEvent({
      incident_id: incident.id,
      event_type: 'created',
      event_data: {
        title,
        description,
        severity,
        tags,
        source,
      },
      reporter_type: source === 'agent' ? 'agent' : source === 'system' ? 'system' : 'user',
      reporter_id,
      reporter_name,
    });
    
    // Broadcast to connected clients
    broadcastIncidentEvent({
      type: 'incident',
      data: incident,
    });
    
    return NextResponse.json({ incident }, { status: 201 });
  } catch (error) {
    console.error('[Incidents API] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create incident' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/security/incidents
 * Update an existing incident
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      id,
      status,
      severity,
      assigned_to,
      tags,
      timeline_entry,
      actor = 'API',
      actor_id = 'api',
    } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Incident ID is required' },
        { status: 400 }
      );
    }
    
    // Build updates object
    const updates: Record<string, unknown> = {};
    if (status) updates.status = status;
    if (severity) updates.severity = severity;
    if (assigned_to !== undefined) updates.assigned_to = assigned_to;
    if (tags) updates.tags = tags;
    
    // Handle resolved status
    if (status === 'resolved' || status === 'closed') {
      updates.resolved_at = new Date().toISOString();
    }
    
    // Update the incident
    const incident = await updateIncident(id, updates);
    
    if (!incident) {
      return NextResponse.json(
        { error: 'Incident not found' },
        { status: 404 }
      );
    }
    
    // Determine event type based on update
    let eventType: 'updated' | 'assigned' | 'escalated' | 'resolved' | 'closed' = 'updated';
    if (status === 'resolved') eventType = 'resolved';
    else if (status === 'closed') eventType = 'closed';
    else if (assigned_to !== undefined) eventType = 'assigned';
    else if (severity && ['high', 'critical'].includes(severity)) eventType = 'escalated';
    
    // Log to cryptographic chain
    await logIncidentEvent({
      incident_id: id,
      event_type: eventType,
      event_data: {
        updates,
        previous_status: timeline_entry?.previous_status,
      },
      reporter_type: 'user',
      reporter_id: actor_id,
      reporter_name: actor,
    });
    
    // Broadcast to connected clients
    broadcastIncidentEvent({
      type: 'incident',
      data: incident,
    });
    
    return NextResponse.json({ incident });
  } catch (error) {
    console.error('[Incidents API] PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update incident' },
      { status: 500 }
    );
  }
}
