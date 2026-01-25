/**
 * Security Agents API
 * 
 * API for managing and running security agents including:
 * - CascadePredictionAgent: Predicts incident cascades
 * - IncidentResolutionAgent: Automatically resolves incidents
 * - Background agent runner for continuous operation
 * 
 * @version 1.0.0
 * @date January 24, 2026
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { resolveIncident, resolvePendingIncidents } from '@/lib/security/agents/resolution-agent';
import { generatePredictionsForIncident, savePredictions, logAgentRun } from '@/lib/security/agents/prediction-agent';

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
// GET - Get agent status and activity
// ═══════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'status';
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }
    
    switch (action) {
      case 'status': {
        // Get agent run statistics
        const { data: runs } = await supabase
          .from('agent_run_log')
          .select('*')
          .order('started_at', { ascending: false })
          .limit(100);
        
        const { data: resolutions } = await supabase
          .from('agent_resolutions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
        
        const { data: predictions } = await supabase
          .from('cascade_predictions')
          .select('*')
          .eq('status', 'active')
          .limit(100);
        
        const stats = {
          totalRuns: runs?.length || 0,
          successfulRuns: runs?.filter(r => r.status === 'completed').length || 0,
          failedRuns: runs?.filter(r => r.status === 'failed').length || 0,
          incidentsResolved: resolutions?.length || 0,
          activePredictions: predictions?.length || 0,
          cascadesPrevented: runs?.reduce((sum, r) => sum + (r.cascades_prevented || 0), 0) || 0,
          agents: [
            {
              id: 'cascade-prediction-agent',
              name: 'CascadePredictionAgent',
              status: 'active',
              lastRun: runs?.find(r => r.agent_id === 'cascade-prediction-agent')?.started_at,
              runsToday: runs?.filter(r => 
                r.agent_id === 'cascade-prediction-agent' && 
                new Date(r.started_at).toDateString() === new Date().toDateString()
              ).length || 0,
            },
            {
              id: 'resolution-agent',
              name: 'IncidentResolutionAgent',
              status: 'active',
              lastRun: runs?.find(r => r.agent_id === 'resolution-agent')?.started_at,
              runsToday: runs?.filter(r => 
                r.agent_id === 'resolution-agent' && 
                new Date(r.started_at).toDateString() === new Date().toDateString()
              ).length || 0,
            },
            {
              id: 'watchdog-agent',
              name: 'WatchdogAgent',
              status: 'active',
              lastRun: runs?.find(r => r.agent_id === 'watchdog-agent')?.started_at,
              runsToday: runs?.filter(r => 
                r.agent_id === 'watchdog-agent' && 
                new Date(r.started_at).toDateString() === new Date().toDateString()
              ).length || 0,
            },
          ],
        };
        
        return NextResponse.json(stats);
      }
      
      case 'activity': {
        const { data: activity } = await supabase
          .from('agent_incident_activity')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit);
        
        return NextResponse.json({ activity: activity || [] });
      }
      
      case 'runs': {
        const { data: runs } = await supabase
          .from('agent_run_log')
          .select('*')
          .order('started_at', { ascending: false })
          .limit(limit);
        
        return NextResponse.json({ runs: runs || [] });
      }
      
      case 'resolutions': {
        const { data: resolutions } = await supabase
          .from('agent_resolutions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit);
        
        return NextResponse.json({ resolutions: resolutions || [] });
      }
      
      case 'predictions': {
        const status = searchParams.get('status') || 'active';
        const { data: predictions } = await supabase
          .from('cascade_predictions')
          .select('*')
          .eq('status', status)
          .order('confidence', { ascending: false })
          .limit(limit);
        
        return NextResponse.json({ predictions: predictions || [] });
      }
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: status, activity, runs, resolutions, predictions' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[Agents API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agent data' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// POST - Trigger agent actions
// ═══════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    
    switch (action) {
      case 'run_resolution': {
        const { incident_id } = body;
        
        if (!incident_id) {
          return NextResponse.json(
            { error: 'incident_id is required' },
            { status: 400 }
          );
        }
        
        const supabase = getSupabaseClient();
        if (!supabase) {
          return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
        }
        
        // Get incident
        const { data: incident } = await supabase
          .from('incidents')
          .select('*')
          .eq('id', incident_id)
          .single();
        
        if (!incident) {
          return NextResponse.json(
            { error: 'Incident not found' },
            { status: 404 }
          );
        }
        
        const result = await resolveIncident({
          id: incident.id,
          title: incident.title,
          description: incident.description,
          severity: incident.severity,
          status: incident.status,
          category: incident.category,
          created_at: incident.created_at,
        });
        
        return NextResponse.json({
          success: result.success,
          actionsExecuted: result.actionsExecuted.map(a => ({
            type: a.type,
            description: a.description,
          })),
          cascadesPrevented: result.cascadesPrevented,
          error: result.error,
        });
      }
      
      case 'run_batch_resolution': {
        const { limit = 10 } = body;
        
        const result = await resolvePendingIncidents(limit);
        
        return NextResponse.json({
          success: true,
          ...result,
        });
      }
      
      case 'run_prediction': {
        const { limit = 10 } = body;
        const startTime = new Date();
        
        const supabase = getSupabaseClient();
        if (!supabase) {
          return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
        }
        
        // Get incidents without predictions
        const { data: incidents } = await supabase
          .from('incidents')
          .select('*')
          .in('status', ['open', 'investigating'])
          .order('created_at', { ascending: false })
          .limit(limit);
        
        if (!incidents || incidents.length === 0) {
          return NextResponse.json({
            success: true,
            processed: 0,
            predictionsGenerated: 0,
          });
        }
        
        let totalPredictions = 0;
        
        for (const incident of incidents) {
          const predictions = generatePredictionsForIncident({
            id: incident.id,
            title: incident.title,
            description: incident.description,
            severity: incident.severity,
            status: incident.status,
            category: incident.category,
            created_at: incident.created_at,
          });
          
          if (predictions.length > 0) {
            await savePredictions(predictions);
            totalPredictions += predictions.length;
          }
        }
        
        await logAgentRun(
          'cascade-prediction-agent',
          'CascadePredictionAgent',
          {
            incidentsAnalyzed: incidents.length,
            predictionsGenerated: totalPredictions,
            incidentsResolved: 0,
            cascadesPrevented: 0,
            runType: 'manual',
            status: 'completed',
            startedAt: startTime,
          }
        );
        
        return NextResponse.json({
          success: true,
          processed: incidents.length,
          predictionsGenerated: totalPredictions,
        });
      }
      
      case 'simulate_agent_activity': {
        // Simulate agent activity for testing
        const { count = 5 } = body;
        const startTime = new Date();
        
        const supabase = getSupabaseClient();
        if (!supabase) {
          return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
        }
        
        const agents = [
          { id: 'watchdog-agent', name: 'WatchdogAgent' },
          { id: 'hunter-agent', name: 'ThreatHunterAgent' },
          { id: 'guardian-agent', name: 'GuardianAgent' },
          { id: 'cascade-prediction-agent', name: 'CascadePredictionAgent' },
          { id: 'resolution-agent', name: 'IncidentResolutionAgent' },
        ];
        
        const actionTypes = [
          'threat_scan', 'anomaly_detection', 'log_analysis', 'network_monitor',
          'endpoint_check', 'policy_enforcement', 'vulnerability_scan',
          'credential_audit', 'config_validation', 'integrity_check',
        ];
        
        const activities = [];
        
        for (let i = 0; i < count; i++) {
          const agent = agents[Math.floor(Math.random() * agents.length)];
          const actionType = actionTypes[Math.floor(Math.random() * actionTypes.length)];
          
          activities.push({
            id: `aia-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            incident_id: null,
            agent_id: agent.id,
            agent_name: agent.name,
            action_type: actionType,
            action_data: {
              description: `${agent.name} performed ${actionType.replace(/_/g, ' ')}`,
              automated: true,
              success: Math.random() > 0.1,
              metrics: {
                itemsProcessed: Math.floor(Math.random() * 100) + 1,
                durationMs: Math.floor(Math.random() * 5000) + 100,
              },
            },
            created_at: new Date(Date.now() - Math.random() * 60000).toISOString(),
          });
        }
        
        await supabase.from('agent_incident_activity').insert(activities);
        
        // Also log agent runs
        for (const agent of agents) {
          await logAgentRun(
            agent.id,
            agent.name,
            {
              incidentsAnalyzed: Math.floor(Math.random() * 20),
              predictionsGenerated: Math.floor(Math.random() * 10),
              incidentsResolved: Math.floor(Math.random() * 5),
              cascadesPrevented: Math.floor(Math.random() * 3),
              runType: 'continuous',
              status: 'completed',
              startedAt: startTime,
            }
          );
        }
        
        return NextResponse.json({
          success: true,
          activitiesGenerated: activities.length,
        });
      }
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: run_resolution, run_batch_resolution, run_prediction, simulate_agent_activity' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[Agents API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process agent request' },
      { status: 500 }
    );
  }
}
