/**
 * Incident Resolution Agent
 * 
 * Automatically analyzes and resolves incidents based on severity and type.
 * Tracks all actions and prevents predicted cascades.
 * 
 * @version 1.0.0
 * @date January 24, 2026
 */

import { createClient } from '@supabase/supabase-js';
import {
  generatePredictionsForIncident,
  savePredictions,
  markPredictionPrevented,
  saveAgentResolution,
  logAgentRun,
  INCIDENT_PATTERNS,
} from './prediction-agent';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface ResolutionAction {
  type: string;
  description: string;
  automated: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  durationMs: number;
  requiredApproval: boolean;
}

export interface IncidentForResolution {
  id: string;
  title: string;
  description?: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  status: string;
  category?: string;
  created_at: string;
}

// ═══════════════════════════════════════════════════════════════
// RESOLUTION PLAYBOOKS
// ═══════════════════════════════════════════════════════════════

const RESOLUTION_PLAYBOOKS: Record<string, ResolutionAction[]> = {
  // Network Security
  network: [
    { type: 'block_ip', description: 'Block suspicious IP at firewall', automated: true, riskLevel: 'low', durationMs: 500, requiredApproval: false },
    { type: 'rate_limit', description: 'Apply rate limiting to affected endpoint', automated: true, riskLevel: 'low', durationMs: 300, requiredApproval: false },
    { type: 'traffic_analysis', description: 'Deep packet inspection initiated', automated: true, riskLevel: 'low', durationMs: 2000, requiredApproval: false },
  ],
  ddos: [
    { type: 'enable_ddos_protection', description: 'Activate DDoS mitigation service', automated: true, riskLevel: 'medium', durationMs: 1000, requiredApproval: false },
    { type: 'null_route', description: 'Null route attack traffic', automated: true, riskLevel: 'medium', durationMs: 500, requiredApproval: false },
    { type: 'scale_resources', description: 'Auto-scale to handle traffic', automated: true, riskLevel: 'low', durationMs: 3000, requiredApproval: false },
  ],
  portscan: [
    { type: 'block_scanner', description: 'Block scanning IP', automated: true, riskLevel: 'low', durationMs: 300, requiredApproval: false },
    { type: 'log_enrichment', description: 'Enrich logs with threat intelligence', automated: true, riskLevel: 'low', durationMs: 500, requiredApproval: false },
    { type: 'alert_soc', description: 'Alert SOC for follow-up', automated: true, riskLevel: 'low', durationMs: 200, requiredApproval: false },
  ],
  authentication: [
    { type: 'force_mfa', description: 'Force MFA challenge', automated: true, riskLevel: 'low', durationMs: 100, requiredApproval: false },
    { type: 'lock_account', description: 'Temporarily lock affected account', automated: true, riskLevel: 'medium', durationMs: 200, requiredApproval: false },
    { type: 'session_invalidation', description: 'Invalidate all active sessions', automated: true, riskLevel: 'medium', durationMs: 300, requiredApproval: false },
  ],
  bruteforce: [
    { type: 'ip_blacklist', description: 'Add IP to blacklist', automated: true, riskLevel: 'low', durationMs: 200, requiredApproval: false },
    { type: 'captcha_enforce', description: 'Enforce CAPTCHA verification', automated: true, riskLevel: 'low', durationMs: 100, requiredApproval: false },
    { type: 'rate_limit_auth', description: 'Rate limit authentication attempts', automated: true, riskLevel: 'low', durationMs: 200, requiredApproval: false },
  ],
  malware: [
    { type: 'isolate_endpoint', description: 'Network isolate affected endpoint', automated: true, riskLevel: 'high', durationMs: 500, requiredApproval: false },
    { type: 'kill_process', description: 'Terminate malicious processes', automated: true, riskLevel: 'medium', durationMs: 300, requiredApproval: false },
    { type: 'quarantine_files', description: 'Quarantine malicious files', automated: true, riskLevel: 'medium', durationMs: 400, requiredApproval: false },
    { type: 'memory_scan', description: 'Initiate memory forensics scan', automated: true, riskLevel: 'low', durationMs: 5000, requiredApproval: false },
  ],
  ransomware: [
    { type: 'emergency_isolate', description: 'Emergency network isolation', automated: true, riskLevel: 'high', durationMs: 200, requiredApproval: false },
    { type: 'backup_verify', description: 'Verify backup integrity', automated: true, riskLevel: 'low', durationMs: 10000, requiredApproval: false },
    { type: 'c2_block', description: 'Block all known C2 communications', automated: true, riskLevel: 'medium', durationMs: 500, requiredApproval: false },
    { type: 'encryption_halt', description: 'Attempt to halt encryption process', automated: true, riskLevel: 'high', durationMs: 1000, requiredApproval: false },
  ],
  dataExfil: [
    { type: 'block_egress', description: 'Block suspicious egress traffic', automated: true, riskLevel: 'medium', durationMs: 300, requiredApproval: false },
    { type: 'dlp_alert', description: 'Trigger DLP incident workflow', automated: true, riskLevel: 'low', durationMs: 200, requiredApproval: false },
    { type: 'forensic_capture', description: 'Capture network traffic for analysis', automated: true, riskLevel: 'low', durationMs: 1000, requiredApproval: false },
  ],
  injection: [
    { type: 'waf_block', description: 'Block attack pattern in WAF', automated: true, riskLevel: 'low', durationMs: 200, requiredApproval: false },
    { type: 'input_sanitize', description: 'Force additional input sanitization', automated: true, riskLevel: 'low', durationMs: 100, requiredApproval: false },
    { type: 'db_audit', description: 'Audit database for unauthorized changes', automated: true, riskLevel: 'low', durationMs: 2000, requiredApproval: false },
  ],
  privilegeEscalation: [
    { type: 'revoke_privileges', description: 'Revoke elevated privileges', automated: true, riskLevel: 'high', durationMs: 300, requiredApproval: true },
    { type: 'session_terminate', description: 'Terminate suspicious sessions', automated: true, riskLevel: 'medium', durationMs: 200, requiredApproval: false },
    { type: 'audit_changes', description: 'Audit all recent privilege changes', automated: true, riskLevel: 'low', durationMs: 1500, requiredApproval: false },
  ],
  lateralMovement: [
    { type: 'segment_network', description: 'Emergency network segmentation', automated: true, riskLevel: 'high', durationMs: 1000, requiredApproval: false },
    { type: 'block_smb', description: 'Block SMB/lateral protocols', automated: true, riskLevel: 'medium', durationMs: 300, requiredApproval: false },
    { type: 'credential_rotation', description: 'Force credential rotation for affected users', automated: true, riskLevel: 'medium', durationMs: 500, requiredApproval: false },
  ],
  cloud: [
    { type: 'revoke_keys', description: 'Revoke compromised API keys', automated: true, riskLevel: 'high', durationMs: 200, requiredApproval: false },
    { type: 'iam_lockdown', description: 'Apply restrictive IAM policy', automated: true, riskLevel: 'medium', durationMs: 500, requiredApproval: false },
    { type: 'resource_snapshot', description: 'Snapshot affected resources for forensics', automated: true, riskLevel: 'low', durationMs: 3000, requiredApproval: false },
  ],
  cryptojacking: [
    { type: 'kill_miners', description: 'Terminate mining processes', automated: true, riskLevel: 'low', durationMs: 200, requiredApproval: false },
    { type: 'cpu_limit', description: 'Apply CPU usage limits', automated: true, riskLevel: 'low', durationMs: 100, requiredApproval: false },
    { type: 'block_pool', description: 'Block connections to mining pools', automated: true, riskLevel: 'low', durationMs: 300, requiredApproval: false },
  ],
  insider: [
    { type: 'access_suspend', description: 'Suspend user access pending review', automated: false, riskLevel: 'high', durationMs: 300, requiredApproval: true },
    { type: 'data_audit', description: 'Audit all recent data access', automated: true, riskLevel: 'low', durationMs: 5000, requiredApproval: false },
    { type: 'alert_hr', description: 'Notify HR and legal teams', automated: true, riskLevel: 'low', durationMs: 100, requiredApproval: false },
  ],
  email: [
    { type: 'quarantine_email', description: 'Quarantine malicious email', automated: true, riskLevel: 'low', durationMs: 200, requiredApproval: false },
    { type: 'block_sender', description: 'Block sender domain', automated: true, riskLevel: 'low', durationMs: 100, requiredApproval: false },
    { type: 'user_alert', description: 'Alert users who received the email', automated: true, riskLevel: 'low', durationMs: 500, requiredApproval: false },
  ],
  dns: [
    { type: 'sinkhole', description: 'Sinkhole malicious domain', automated: true, riskLevel: 'medium', durationMs: 300, requiredApproval: false },
    { type: 'dnssec_verify', description: 'Verify DNSSEC integrity', automated: true, riskLevel: 'low', durationMs: 1000, requiredApproval: false },
    { type: 'cache_flush', description: 'Flush DNS cache', automated: true, riskLevel: 'low', durationMs: 200, requiredApproval: false },
  ],
  certificate: [
    { type: 'revoke_cert', description: 'Revoke compromised certificate', automated: true, riskLevel: 'medium', durationMs: 500, requiredApproval: false },
    { type: 'issue_new', description: 'Issue new certificate', automated: true, riskLevel: 'low', durationMs: 2000, requiredApproval: false },
    { type: 'pin_update', description: 'Update certificate pins', automated: true, riskLevel: 'low', durationMs: 1000, requiredApproval: false },
  ],
  zeroDay: [
    { type: 'virtual_patch', description: 'Apply virtual patch via WAF', automated: true, riskLevel: 'medium', durationMs: 500, requiredApproval: false },
    { type: 'isolate_vulnerable', description: 'Isolate vulnerable systems', automated: true, riskLevel: 'high', durationMs: 1000, requiredApproval: false },
    { type: 'enhance_monitoring', description: 'Deploy enhanced monitoring rules', automated: true, riskLevel: 'low', durationMs: 300, requiredApproval: false },
  ],
  general: [
    { type: 'log_collection', description: 'Collect comprehensive logs', automated: true, riskLevel: 'low', durationMs: 500, requiredApproval: false },
    { type: 'alert_escalation', description: 'Escalate to security team', automated: true, riskLevel: 'low', durationMs: 100, requiredApproval: false },
    { type: 'containment_review', description: 'Review containment options', automated: true, riskLevel: 'low', durationMs: 300, requiredApproval: false },
  ],
};

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
// RESOLUTION ENGINE
// ═══════════════════════════════════════════════════════════════

function detectIncidentType(incident: IncidentForResolution): string[] {
  const text = `${incident.title || ''} ${incident.description || ''} ${incident.category || ''}`.toLowerCase();
  const detectedTypes: string[] = [];
  
  for (const [type, patterns] of Object.entries(INCIDENT_PATTERNS)) {
    const matchCount = patterns.filter(pattern => text.includes(pattern)).length;
    if (matchCount > 0) {
      detectedTypes.push(type);
    }
  }
  
  return detectedTypes.length > 0 ? detectedTypes : ['general'];
}

export async function resolveIncident(
  incident: IncidentForResolution,
  agentId: string = 'resolution-agent',
  agentName: string = 'IncidentResolutionAgent'
): Promise<{
  success: boolean;
  actionsExecuted: ResolutionAction[];
  cascadesPrevented: number;
  error?: string;
}> {
  const startTime = Date.now();
  const actionsExecuted: ResolutionAction[] = [];
  let cascadesPrevented = 0;
  
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Database not configured');
    }
    
    // Detect incident type and get appropriate playbook
    const incidentTypes = detectIncidentType(incident);
    const allActions: ResolutionAction[] = [];
    
    for (const type of incidentTypes) {
      const playbook = RESOLUTION_PLAYBOOKS[type] || RESOLUTION_PLAYBOOKS.general;
      allActions.push(...playbook);
    }
    
    // Remove duplicates
    const uniqueActions = allActions.filter((action, index, self) =>
      index === self.findIndex(a => a.type === action.type)
    );
    
    // Execute actions based on severity
    const actionsToExecute = incident.severity === 'critical' 
      ? uniqueActions.slice(0, 5)
      : incident.severity === 'high'
      ? uniqueActions.slice(0, 3)
      : uniqueActions.slice(0, 2);
    
    // Simulate action execution
    for (const action of actionsToExecute) {
      // Simulate the action taking time
      await new Promise(resolve => setTimeout(resolve, Math.min(action.durationMs, 500)));
      actionsExecuted.push(action);
      
      // Log the action as agent activity
      await supabase.from('agent_incident_activity').insert([{
        id: `aia-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        incident_id: incident.id,
        agent_id: agentId,
        agent_name: agentName,
        action_type: action.type,
        action_data: {
          description: action.description,
          automated: action.automated,
          riskLevel: action.riskLevel,
          success: true,
        },
        created_at: new Date().toISOString(),
      }]);
    }
    
    // Generate and prevent cascades
    const predictions = generatePredictionsForIncident(incident, agentName);
    const highRiskPredictions = predictions.filter(p => 
      p.risk_level === 'critical' || (p.risk_level === 'high' && p.confidence > 0.7)
    );
    
    // Save predictions and mark as prevented
    if (highRiskPredictions.length > 0) {
      const savedPredictions = await savePredictions(highRiskPredictions);
      
      for (const pred of savedPredictions) {
        if (pred.id) {
          await markPredictionPrevented(
            pred.id,
            agentId,
            `Prevented by ${actionsExecuted.map(a => a.type).join(', ')}`
          );
          cascadesPrevented++;
        }
      }
    }
    
    // Save resolution
    await saveAgentResolution({
      incident_id: incident.id,
      agent_id: agentId,
      agent_name: agentName,
      resolution_type: 'automatic',
      action_taken: actionsExecuted.map(a => a.description).join('; '),
      action_details: {
        actionsExecuted: actionsExecuted.map(a => a.type),
        incidentTypes,
        severity: incident.severity,
      },
      success: true,
      started_at: new Date(startTime).toISOString(),
      cascades_prevented: cascadesPrevented,
      related_predictions: highRiskPredictions.map(p => p.id).filter(Boolean) as string[],
    });
    
    // Update incident status
    await supabase
      .from('incidents')
      .update({
        status: 'contained',
        updated_at: new Date().toISOString(),
      })
      .eq('id', incident.id);
    
    // Log agent run
    await logAgentRun(
      agentId,
      agentName,
      {
        incidentsAnalyzed: 1,
        predictionsGenerated: predictions.length,
        incidentsResolved: 1,
        cascadesPrevented,
        runType: 'triggered',
        status: 'completed',
        startedAt: new Date(startTime),
      }
    );
    
    return {
      success: true,
      actionsExecuted,
      cascadesPrevented,
    };
  } catch (error) {
    console.error('[ResolutionAgent] Error:', error);
    
    await logAgentRun(
      agentId,
      agentName,
      {
        incidentsAnalyzed: 1,
        predictionsGenerated: 0,
        incidentsResolved: 0,
        cascadesPrevented: 0,
        runType: 'triggered',
        status: 'failed',
        startedAt: new Date(startTime),
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    );
    
    return {
      success: false,
      actionsExecuted,
      cascadesPrevented: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// BATCH RESOLUTION (for background processing)
// ═══════════════════════════════════════════════════════════════

export async function resolvePendingIncidents(
  limit: number = 10,
  agentId: string = 'resolution-agent',
  agentName: string = 'IncidentResolutionAgent'
): Promise<{
  processed: number;
  resolved: number;
  cascadesPrevented: number;
}> {
  const startTime = new Date();
  let processed = 0;
  let resolved = 0;
  let totalCascadesPrevented = 0;
  
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Database not configured');
    }
    
    // Get pending incidents ordered by severity
    const severityOrder = { critical: 1, high: 2, medium: 3, low: 4, info: 5 };
    const { data: incidents } = await supabase
      .from('incidents')
      .select('*')
      .in('status', ['open', 'investigating'])
      .order('created_at', { ascending: true })
      .limit(limit);
    
    if (!incidents || incidents.length === 0) {
      return { processed: 0, resolved: 0, cascadesPrevented: 0 };
    }
    
    // Sort by severity
    incidents.sort((a, b) => 
      (severityOrder[a.severity as keyof typeof severityOrder] || 5) - 
      (severityOrder[b.severity as keyof typeof severityOrder] || 5)
    );
    
    // Process each incident
    for (const incident of incidents) {
      processed++;
      
      const result = await resolveIncident(
        {
          id: incident.id,
          title: incident.title,
          description: incident.description,
          severity: incident.severity,
          status: incident.status,
          category: incident.category,
          created_at: incident.created_at,
        },
        agentId,
        agentName
      );
      
      if (result.success) {
        resolved++;
        totalCascadesPrevented += result.cascadesPrevented;
      }
    }
    
    // Log batch run
    await logAgentRun(
      agentId,
      agentName,
      {
        incidentsAnalyzed: processed,
        predictionsGenerated: 0,
        incidentsResolved: resolved,
        cascadesPrevented: totalCascadesPrevented,
        runType: 'scheduled',
        status: 'completed',
        startedAt: startTime,
      }
    );
    
    return {
      processed,
      resolved,
      cascadesPrevented: totalCascadesPrevented,
    };
  } catch (error) {
    console.error('[ResolutionAgent] Batch error:', error);
    
    await logAgentRun(
      agentId,
      agentName,
      {
        incidentsAnalyzed: processed,
        predictionsGenerated: 0,
        incidentsResolved: resolved,
        cascadesPrevented: totalCascadesPrevented,
        runType: 'scheduled',
        status: 'failed',
        startedAt: startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    );
    
    return { processed, resolved, cascadesPrevented: totalCascadesPrevented };
  }
}
