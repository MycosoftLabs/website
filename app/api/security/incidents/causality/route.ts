/**
 * Incident Causality API
 * 
 * API for managing incident causality relationships (forking/cascading).
 * Tracks which incidents caused other incidents and which were prevented.
 * Uses the CascadePredictionAgent for real predictions.
 * 
 * @version 2.0.0
 * @date January 24, 2026
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  generatePredictionsForIncident,
  savePredictions,
  getPredictionsForIncident,
  markPredictionPrevented,
  saveAgentResolution,
  logAgentRun,
  type CascadePrediction,
} from '@/lib/security/agents/prediction-agent';

export const dynamic = 'force-dynamic';

// ═══════════════════════════════════════════════════════════════
// SUPABASE CLIENT
// ═══════════════════════════════════════════════════════════════

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    return null;
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

async function getIncidentFromAnySource(incidentId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  
  // Try to get from incidents table
  const { data: incident } = await supabase
    .from('incidents')
    .select('*')
    .eq('id', incidentId)
    .single();
  
  if (incident) return incident;
  
  // Try to get from chain entries
  const { data: chainEntry } = await supabase
    .from('incident_log_chain')
    .select('*')
    .eq('incident_id', incidentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (chainEntry) {
    // Reconstruct incident from chain entry
    return {
      id: chainEntry.incident_id,
      title: chainEntry.event_data?.title || chainEntry.event_data?.description || `Incident ${incidentId}`,
      description: chainEntry.event_data?.description || '',
      severity: chainEntry.event_data?.severity || extractSeverityFromEventType(chainEntry.event_type),
      status: extractStatusFromEventType(chainEntry.event_type),
      category: chainEntry.event_data?.category || 'unknown',
      created_at: chainEntry.created_at,
    };
  }
  
  return null;
}

function extractSeverityFromEventType(eventType: string): string {
  if (eventType.includes('critical')) return 'critical';
  if (eventType.includes('high')) return 'high';
  if (eventType.includes('medium')) return 'medium';
  if (eventType.includes('low')) return 'low';
  return 'medium';
}

function extractStatusFromEventType(eventType: string): string {
  if (eventType.includes('resolved')) return 'resolved';
  if (eventType.includes('contained')) return 'contained';
  if (eventType.includes('investigating')) return 'investigating';
  return 'open';
}

async function getCausalityRelationships(incidentId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { causedBy: [], causes: [], prevented: [] };
  }
  
  try {
    // Get incidents that caused this one
    const { data: causedBy } = await supabase
      .from('incident_causality')
      .select('*')
      .eq('target_incident_id', incidentId);
    
    // Get incidents this one caused
    const { data: causes } = await supabase
      .from('incident_causality')
      .select('*')
      .eq('source_incident_id', incidentId);
    
    // Get prevented cascades
    const { data: prevented } = await supabase
      .from('cascade_predictions')
      .select('*')
      .eq('incident_id', incidentId)
      .eq('status', 'prevented');
    
    return {
      causedBy: (causedBy || []).map(c => ({
        id: c.id,
        source_incident: c.source_incident_id,
        relationship: c.relationship_type || 'causes',
        confidence: c.confidence || 0.8,
        notes: c.notes,
      })),
      causes: (causes || []).map(c => ({
        id: c.id,
        target_incident: c.target_incident_id,
        relationship: c.relationship_type || 'causes',
        confidence: c.confidence || 0.8,
        prevented: c.prevented === true || c.relationship_type === 'prevented',
        prevented_by: c.prevented_by,
        prevented_at: c.prevented_at,
        notes: c.notes,
      })),
      prevented: (prevented || []).map(p => ({
        id: p.id,
        target_incident: p.potential_incident_type,
        prevented_by: p.prevented_by_agent,
        prevention_action: p.prevention_action,
        confidence: p.confidence,
        risk_level: p.risk_level,
      })),
    };
  } catch (error) {
    console.error('[Causality API] Error fetching relationships:', error);
    return { causedBy: [], causes: [], prevented: [] };
  }
}

// ═══════════════════════════════════════════════════════════════
// GET ENDPOINT
// ═══════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const incident_id = searchParams.get('incident_id');
  const action = searchParams.get('action') || 'relationships';
  
  if (!incident_id) {
    return NextResponse.json(
      { error: 'incident_id is required' },
      { status: 400 }
    );
  }
  
  try {
    switch (action) {
      case 'relationships': {
        const relationships = await getCausalityRelationships(incident_id);
        return NextResponse.json(relationships);
      }
      
      case 'predictions': {
        // Get persisted predictions
        const predictions = await getPredictionsForIncident(incident_id);
        return NextResponse.json({ predictions });
      }
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: relationships, predictions' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[Causality API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch causality data' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// POST ENDPOINT
// ═══════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  const startTime = new Date();
  
  try {
    const body = await request.json();
    const { action } = body;
    
    switch (action) {
      case 'create': {
        const {
          source_incident_id,
          target_incident_id,
          relationship_type = 'caused',
          confidence = 0.8,
          predicted_by,
          notes,
        } = body;
        
        if (!source_incident_id || !target_incident_id) {
          return NextResponse.json(
            { error: 'source_incident_id and target_incident_id are required' },
            { status: 400 }
          );
        }
        
        const supabase = getSupabaseClient();
        if (!supabase) {
          return NextResponse.json(
            { error: 'Database not configured' },
            { status: 500 }
          );
        }
        
        const { data, error } = await supabase
          .from('incident_causality')
          .insert([{
            source_incident_id,
            target_incident_id,
            relationship_type,
            confidence,
            predicted_by_agent_id: predicted_by,
            notes,
          }])
          .select()
          .single();
        
        if (error) throw error;
        
        return NextResponse.json({ success: true, causality: data });
      }
      
      case 'prevent': {
        const { prediction_id, agent_id, prevention_action } = body;
        
        if (!prediction_id || !agent_id || !prevention_action) {
          return NextResponse.json(
            { error: 'prediction_id, agent_id, and prevention_action are required' },
            { status: 400 }
          );
        }
        
        const success = await markPredictionPrevented(prediction_id, agent_id, prevention_action);
        
        if (!success) {
          return NextResponse.json(
            { error: 'Failed to mark prediction as prevented' },
            { status: 500 }
          );
        }
        
        return NextResponse.json({ success: true });
      }
      
      case 'resolve': {
        const { incident_id, agent_id, agent_name, resolution_type, action_taken, action_details } = body;
        
        if (!incident_id || !agent_id || !action_taken) {
          return NextResponse.json(
            { error: 'incident_id, agent_id, and action_taken are required' },
            { status: 400 }
          );
        }
        
        const resolution = await saveAgentResolution({
          incident_id,
          agent_id,
          agent_name: agent_name || agent_id,
          resolution_type: resolution_type || 'automatic',
          action_taken,
          action_details: action_details || {},
          success: true,
          started_at: startTime.toISOString(),
        });
        
        if (!resolution) {
          return NextResponse.json(
            { error: 'Failed to save resolution' },
            { status: 500 }
          );
        }
        
        return NextResponse.json({ success: true, resolution });
      }
      
      case 'predict': {
        const { incident_id, agent_id, agent_name, persist = true, incident_data } = body;
        
        if (!incident_id) {
          return NextResponse.json(
            { error: 'incident_id is required' },
            { status: 400 }
          );
        }
        
        // First check for existing predictions (but always generate new if incident_data provided)
        let predictions = incident_data ? [] : await getPredictionsForIncident(incident_id);
        
        if (predictions.length === 0) {
          // Try to get incident data from request, then database, then chain
          let incident = null;
          
          if (incident_data && incident_data.title) {
            // Use provided incident data
            incident = {
              id: incident_id,
              title: incident_data.title,
              description: incident_data.description || '',
              severity: incident_data.severity || 'medium',
              status: 'open',
              category: incident_data.category || 'unknown',
              created_at: new Date().toISOString(),
            };
          } else {
            // Get incident data from database or chain
            incident = await getIncidentFromAnySource(incident_id);
          }
          
          if (!incident) {
            // Create a minimal incident from the ID for prediction
            incident = {
              id: incident_id,
              title: `Incident ${incident_id}`,
              description: '',
              severity: 'medium' as const,
              status: 'open',
              category: 'unknown',
              created_at: new Date().toISOString(),
            };
          }
          
          // Generate predictions using the prediction agent
          predictions = generatePredictionsForIncident(
            {
              id: incident.id,
              title: incident.title || `Incident ${incident_id}`,
              description: incident.description || '',
              severity: incident.severity || 'medium',
              status: incident.status || 'open',
              category: incident.category,
              created_at: incident.created_at,
            },
            agent_name || 'CascadePredictionAgent'
          );
          
          // Persist predictions to database
          if (persist && predictions.length > 0) {
            predictions = await savePredictions(predictions);
          }
        }
        
        // Log agent run
        await logAgentRun(
          agent_id || 'cascade-prediction-agent',
          agent_name || 'CascadePredictionAgent',
          {
            incidentsAnalyzed: 1,
            predictionsGenerated: predictions.length,
            incidentsResolved: 0,
            cascadesPrevented: 0,
            runType: 'triggered',
            status: 'completed',
            startedAt: startTime,
          }
        );
        
        return NextResponse.json({
          success: true,
          incident_id,
          predictions: predictions.map(p => ({
            id: p.id,
            potential_incident_type: p.potential_incident_type,
            confidence: p.confidence,
            risk_level: p.risk_level,
            recommended_action: p.recommended_action,
            prediction_basis: p.prediction_basis,
            status: p.status,
          })),
          agent: agent_name || 'CascadePredictionAgent',
          analyzed_at: new Date().toISOString(),
          persisted: persist,
        });
      }
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: create, prevent, resolve, predict' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[Causality API] Error:', error);
    
    // Log failed run
    await logAgentRun(
      'cascade-prediction-agent',
      'CascadePredictionAgent',
      {
        incidentsAnalyzed: 0,
        predictionsGenerated: 0,
        incidentsResolved: 0,
        cascadesPrevented: 0,
        runType: 'triggered',
        status: 'failed',
        startedAt: startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    );
    
    return NextResponse.json(
      { error: 'Failed to process causality request' },
      { status: 500 }
    );
  }
}
