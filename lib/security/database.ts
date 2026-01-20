/**
 * Security Database Layer
 * Provides persistence for security events, incidents, and audit logs
 * Uses Supabase for storage with fallback to in-memory when unavailable
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface SecurityEvent {
  id: string;
  timestamp: string;
  event_type: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  source_ip: string | null;
  destination_ip: string | null;
  description: string;
  geo_location: {
    country: string;
    country_code: string;
    city: string;
    region: string;
    lat: number;
    lon: number;
  } | null;
  metadata: Record<string, unknown>;
  resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'contained' | 'resolved' | 'closed';
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  events: string[]; // Array of event IDs
  tags: string[];
  timeline: IncidentTimelineEntry[];
}

export interface IncidentTimelineEntry {
  timestamp: string;
  action: string;
  actor: string;
  details: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  target_type: string;
  target_id: string;
  details: Record<string, unknown>;
  ip_address: string | null;
}

export interface ScanResult {
  id: string;
  timestamp: string;
  scan_type: 'nmap' | 'masscan' | 'vulnerability';
  target: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  results: Record<string, unknown>;
  vulnerabilities_found: number;
  hosts_discovered: number;
}

export interface PlaybookExecution {
  id: string;
  playbook_id: string;
  playbook_name: string;
  triggered_by: string;
  trigger_event_id: string | null;
  started_at: string;
  completed_at: string | null;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  actions_executed: PlaybookActionResult[];
  error: string | null;
}

export interface PlaybookActionResult {
  action_type: string;
  target: string;
  success: boolean;
  timestamp: string;
  result: string;
}

// ═══════════════════════════════════════════════════════════════
// IN-MEMORY FALLBACK STORAGE
// ═══════════════════════════════════════════════════════════════

const inMemoryStore = {
  events: new Map<string, SecurityEvent>(),
  incidents: new Map<string, Incident>(),
  auditLogs: new Map<string, AuditLog>(),
  scanResults: new Map<string, ScanResult>(),
  playbookExecutions: new Map<string, PlaybookExecution>(),
};

// ═══════════════════════════════════════════════════════════════
// DATABASE CLIENT
// ═══════════════════════════════════════════════════════════════

async function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.warn('[SecurityDB] Supabase not configured, using in-memory storage');
    return null;
  }

  try {
    const cookieStore = await cookies();
    return createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, { ...options, path: '/' });
            });
          } catch { /* Ignore in Server Component */ }
        },
      },
    });
  } catch (error) {
    console.warn('[SecurityDB] Failed to create Supabase client:', error);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// SECURITY EVENTS
// ═══════════════════════════════════════════════════════════════

export async function createSecurityEvent(event: Omit<SecurityEvent, 'id'>): Promise<SecurityEvent> {
  const id = `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const fullEvent: SecurityEvent = { id, ...event };
  
  const supabase = await getSupabaseClient();
  
  if (supabase) {
    try {
      const { error } = await supabase
        .from('security_events')
        .insert({
          id,
          timestamp: event.timestamp,
          event_type: event.event_type,
          severity: event.severity,
          source_ip: event.source_ip,
          destination_ip: event.destination_ip,
          description: event.description,
          geo_location: event.geo_location,
          metadata: event.metadata,
          resolved: event.resolved,
          resolved_at: event.resolved_at,
          resolved_by: event.resolved_by,
        });
      
      if (error) {
        console.error('[SecurityDB] Error creating event:', error);
        inMemoryStore.events.set(id, fullEvent);
      }
    } catch (err) {
      console.error('[SecurityDB] Exception creating event:', err);
      inMemoryStore.events.set(id, fullEvent);
    }
  } else {
    inMemoryStore.events.set(id, fullEvent);
  }
  
  return fullEvent;
}

export async function getSecurityEvents(options: {
  limit?: number;
  severity?: string;
  since?: string;
  eventType?: string;
}): Promise<SecurityEvent[]> {
  const { limit = 100, severity, since, eventType } = options;
  
  const supabase = await getSupabaseClient();
  
  if (supabase) {
    try {
      let query = supabase
        .from('security_events')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);
      
      if (severity) query = query.eq('severity', severity);
      if (eventType) query = query.eq('event_type', eventType);
      if (since) query = query.gte('timestamp', since);
      
      const { data, error } = await query;
      
      if (error) {
        console.error('[SecurityDB] Error fetching events:', error);
      } else if (data) {
        return data as SecurityEvent[];
      }
    } catch (err) {
      console.error('[SecurityDB] Exception fetching events:', err);
    }
  }
  
  // Fallback to in-memory
  let events = Array.from(inMemoryStore.events.values());
  if (severity) events = events.filter(e => e.severity === severity);
  if (eventType) events = events.filter(e => e.event_type === eventType);
  if (since) events = events.filter(e => e.timestamp >= since);
  return events.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, limit);
}

export async function getEventStats(): Promise<{
  total: number;
  last_hour: number;
  last_day: number;
  by_severity: Record<string, number>;
}> {
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  
  const supabase = await getSupabaseClient();
  
  if (supabase) {
    try {
      const [totalResult, hourResult, dayResult] = await Promise.all([
        supabase.from('security_events').select('id', { count: 'exact', head: true }),
        supabase.from('security_events').select('id', { count: 'exact', head: true }).gte('timestamp', hourAgo),
        supabase.from('security_events').select('id', { count: 'exact', head: true }).gte('timestamp', dayAgo),
      ]);
      
      const severityResult = await supabase
        .from('security_events')
        .select('severity');
      
      const bySeverity: Record<string, number> = {};
      if (severityResult.data) {
        severityResult.data.forEach((e: { severity: string }) => {
          bySeverity[e.severity] = (bySeverity[e.severity] || 0) + 1;
        });
      }
      
      return {
        total: totalResult.count || 0,
        last_hour: hourResult.count || 0,
        last_day: dayResult.count || 0,
        by_severity: bySeverity,
      };
    } catch (err) {
      console.error('[SecurityDB] Exception getting stats:', err);
    }
  }
  
  // Fallback
  const events = Array.from(inMemoryStore.events.values());
  const bySeverity: Record<string, number> = {};
  events.forEach(e => {
    bySeverity[e.severity] = (bySeverity[e.severity] || 0) + 1;
  });
  
  return {
    total: events.length,
    last_hour: events.filter(e => e.timestamp >= hourAgo).length,
    last_day: events.filter(e => e.timestamp >= dayAgo).length,
    by_severity: bySeverity,
  };
}

// ═══════════════════════════════════════════════════════════════
// INCIDENTS
// ═══════════════════════════════════════════════════════════════

export async function createIncident(incident: Omit<Incident, 'id' | 'created_at' | 'updated_at'>): Promise<Incident> {
  const id = `inc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();
  const fullIncident: Incident = {
    id,
    ...incident,
    created_at: now,
    updated_at: now,
  };
  
  const supabase = await getSupabaseClient();
  
  if (supabase) {
    try {
      const { error } = await supabase.from('incidents').insert({
        id,
        title: incident.title,
        description: incident.description,
        severity: incident.severity,
        status: incident.status,
        assigned_to: incident.assigned_to,
        created_at: now,
        updated_at: now,
        resolved_at: incident.resolved_at,
        events: incident.events,
        tags: incident.tags,
        timeline: incident.timeline,
      });
      
      if (error) {
        console.error('[SecurityDB] Error creating incident:', error);
        inMemoryStore.incidents.set(id, fullIncident);
      }
    } catch (err) {
      console.error('[SecurityDB] Exception creating incident:', err);
      inMemoryStore.incidents.set(id, fullIncident);
    }
  } else {
    inMemoryStore.incidents.set(id, fullIncident);
  }
  
  return fullIncident;
}

export async function getIncidents(options: {
  status?: string;
  severity?: string;
  limit?: number;
}): Promise<Incident[]> {
  const { status, severity, limit = 50 } = options;
  
  const supabase = await getSupabaseClient();
  
  if (supabase) {
    try {
      let query = supabase
        .from('incidents')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (status) query = query.eq('status', status);
      if (severity) query = query.eq('severity', severity);
      
      const { data, error } = await query;
      
      if (error) {
        console.error('[SecurityDB] Error fetching incidents:', error);
      } else if (data) {
        return data as Incident[];
      }
    } catch (err) {
      console.error('[SecurityDB] Exception fetching incidents:', err);
    }
  }
  
  // Fallback
  let incidents = Array.from(inMemoryStore.incidents.values());
  if (status) incidents = incidents.filter(i => i.status === status);
  if (severity) incidents = incidents.filter(i => i.severity === severity);
  return incidents.sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit);
}

export async function updateIncident(id: string, updates: Partial<Incident>): Promise<Incident | null> {
  const supabase = await getSupabaseClient();
  const now = new Date().toISOString();
  
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('incidents')
        .update({ ...updates, updated_at: now })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('[SecurityDB] Error updating incident:', error);
      } else if (data) {
        return data as Incident;
      }
    } catch (err) {
      console.error('[SecurityDB] Exception updating incident:', err);
    }
  }
  
  // Fallback
  const existing = inMemoryStore.incidents.get(id);
  if (existing) {
    const updated = { ...existing, ...updates, updated_at: now };
    inMemoryStore.incidents.set(id, updated);
    return updated;
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════
// AUDIT LOGS
// ═══════════════════════════════════════════════════════════════

export async function createAuditLog(log: Omit<AuditLog, 'id'>): Promise<AuditLog> {
  const id = `aud-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const fullLog: AuditLog = { id, ...log };
  
  const supabase = await getSupabaseClient();
  
  if (supabase) {
    try {
      const { error } = await supabase.from('audit_logs').insert({
        id,
        timestamp: log.timestamp,
        action: log.action,
        actor: log.actor,
        target_type: log.target_type,
        target_id: log.target_id,
        details: log.details,
        ip_address: log.ip_address,
      });
      
      if (error) {
        console.error('[SecurityDB] Error creating audit log:', error);
        inMemoryStore.auditLogs.set(id, fullLog);
      }
    } catch (err) {
      console.error('[SecurityDB] Exception creating audit log:', err);
      inMemoryStore.auditLogs.set(id, fullLog);
    }
  } else {
    inMemoryStore.auditLogs.set(id, fullLog);
  }
  
  return fullLog;
}

export async function getAuditLogs(options: {
  limit?: number;
  actor?: string;
  action?: string;
}): Promise<AuditLog[]> {
  const { limit = 100, actor, action } = options;
  
  const supabase = await getSupabaseClient();
  
  if (supabase) {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);
      
      if (actor) query = query.eq('actor', actor);
      if (action) query = query.eq('action', action);
      
      const { data, error } = await query;
      
      if (error) {
        console.error('[SecurityDB] Error fetching audit logs:', error);
      } else if (data) {
        return data as AuditLog[];
      }
    } catch (err) {
      console.error('[SecurityDB] Exception fetching audit logs:', err);
    }
  }
  
  // Fallback
  let logs = Array.from(inMemoryStore.auditLogs.values());
  if (actor) logs = logs.filter(l => l.actor === actor);
  if (action) logs = logs.filter(l => l.action === action);
  return logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, limit);
}

// ═══════════════════════════════════════════════════════════════
// SCAN RESULTS
// ═══════════════════════════════════════════════════════════════

export async function createScanResult(scan: Omit<ScanResult, 'id'>): Promise<ScanResult> {
  const id = `scan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const fullScan: ScanResult = { id, ...scan };
  
  const supabase = await getSupabaseClient();
  
  if (supabase) {
    try {
      const { error } = await supabase.from('scan_results').insert(fullScan);
      if (error) {
        console.error('[SecurityDB] Error creating scan result:', error);
        inMemoryStore.scanResults.set(id, fullScan);
      }
    } catch (err) {
      console.error('[SecurityDB] Exception creating scan result:', err);
      inMemoryStore.scanResults.set(id, fullScan);
    }
  } else {
    inMemoryStore.scanResults.set(id, fullScan);
  }
  
  return fullScan;
}

export async function updateScanResult(id: string, updates: Partial<ScanResult>): Promise<ScanResult | null> {
  const supabase = await getSupabaseClient();
  
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('scan_results')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (!error && data) return data as ScanResult;
    } catch (err) {
      console.error('[SecurityDB] Exception updating scan:', err);
    }
  }
  
  const existing = inMemoryStore.scanResults.get(id);
  if (existing) {
    const updated = { ...existing, ...updates };
    inMemoryStore.scanResults.set(id, updated);
    return updated;
  }
  return null;
}

export async function getScanResults(limit = 20): Promise<ScanResult[]> {
  const supabase = await getSupabaseClient();
  
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('scan_results')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);
      
      if (!error && data) return data as ScanResult[];
    } catch (err) {
      console.error('[SecurityDB] Exception fetching scans:', err);
    }
  }
  
  return Array.from(inMemoryStore.scanResults.values())
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, limit);
}

// ═══════════════════════════════════════════════════════════════
// PLAYBOOK EXECUTIONS
// ═══════════════════════════════════════════════════════════════

export async function createPlaybookExecution(exec: Omit<PlaybookExecution, 'id'>): Promise<PlaybookExecution> {
  const id = `pb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const fullExec: PlaybookExecution = { id, ...exec };
  
  const supabase = await getSupabaseClient();
  
  if (supabase) {
    try {
      const { error } = await supabase.from('playbook_executions').insert(fullExec);
      if (error) {
        console.error('[SecurityDB] Error creating playbook execution:', error);
        inMemoryStore.playbookExecutions.set(id, fullExec);
      }
    } catch (err) {
      console.error('[SecurityDB] Exception creating playbook execution:', err);
      inMemoryStore.playbookExecutions.set(id, fullExec);
    }
  } else {
    inMemoryStore.playbookExecutions.set(id, fullExec);
  }
  
  return fullExec;
}

export async function updatePlaybookExecution(id: string, updates: Partial<PlaybookExecution>): Promise<PlaybookExecution | null> {
  const supabase = await getSupabaseClient();
  
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('playbook_executions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (!error && data) return data as PlaybookExecution;
    } catch (err) {
      console.error('[SecurityDB] Exception updating playbook execution:', err);
    }
  }
  
  const existing = inMemoryStore.playbookExecutions.get(id);
  if (existing) {
    const updated = { ...existing, ...updates };
    inMemoryStore.playbookExecutions.set(id, updated);
    return updated;
  }
  return null;
}

export async function getPlaybookExecutions(limit = 20): Promise<PlaybookExecution[]> {
  const supabase = await getSupabaseClient();
  
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('playbook_executions')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(limit);
      
      if (!error && data) return data as PlaybookExecution[];
    } catch (err) {
      console.error('[SecurityDB] Exception fetching playbook executions:', err);
    }
  }
  
  return Array.from(inMemoryStore.playbookExecutions.values())
    .sort((a, b) => b.started_at.localeCompare(a.started_at))
    .slice(0, limit);
}

// ═══════════════════════════════════════════════════════════════
// SCAN SCHEDULES
// ═══════════════════════════════════════════════════════════════

export interface ScanSchedule {
  id: string;
  name: string;
  target: string;
  scanType: 'ping' | 'syn' | 'version' | 'vuln';
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
  dayOfWeek?: number;
  hourOfDay: number;
  enabled: boolean;
  lastRun?: string;
  nextRun: string;
  createdAt: string;
}

// In-memory store for schedules (until we create a DB table)
const scanScheduleStore = new Map<string, ScanSchedule>();

function calculateNextRun(schedule: Omit<ScanSchedule, 'id' | 'nextRun' | 'createdAt'>): string {
  const now = new Date();
  const next = new Date();
  
  // Set the hour
  next.setHours(schedule.hourOfDay, 0, 0, 0);
  
  switch (schedule.frequency) {
    case 'hourly':
      if (now.getMinutes() > 0) {
        next.setHours(now.getHours() + 1, 0, 0, 0);
      }
      break;
    case 'daily':
      if (now > next) {
        next.setDate(next.getDate() + 1);
      }
      break;
    case 'weekly':
      const daysUntilTarget = ((schedule.dayOfWeek || 0) - now.getDay() + 7) % 7;
      next.setDate(now.getDate() + (daysUntilTarget === 0 && now > next ? 7 : daysUntilTarget));
      break;
    case 'monthly':
      if (now > next) {
        next.setMonth(next.getMonth() + 1);
      }
      next.setDate(1);
      break;
  }
  
  return next.toISOString();
}

export async function getScanSchedules(): Promise<ScanSchedule[]> {
  // In-memory only for now
  return Array.from(scanScheduleStore.values()).sort((a, b) => 
    a.createdAt.localeCompare(b.createdAt)
  );
}

export async function createScanSchedule(schedule: Omit<ScanSchedule, 'id' | 'nextRun' | 'createdAt'>): Promise<ScanSchedule> {
  const id = `sched-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();
  
  const newSchedule: ScanSchedule = {
    id,
    ...schedule,
    nextRun: calculateNextRun(schedule),
    createdAt: now,
  };
  
  scanScheduleStore.set(id, newSchedule);
  console.log(`[SecurityDB] Created scan schedule: ${newSchedule.name}`);
  
  return newSchedule;
}

export async function updateScanSchedule(id: string, updates: Partial<ScanSchedule>): Promise<ScanSchedule | null> {
  const existing = scanScheduleStore.get(id);
  if (!existing) return null;
  
  const updated: ScanSchedule = {
    ...existing,
    ...updates,
    nextRun: updates.enabled !== undefined 
      ? calculateNextRun({ ...existing, ...updates })
      : existing.nextRun,
  };
  
  scanScheduleStore.set(id, updated);
  return updated;
}

export async function deleteScanSchedule(id: string): Promise<boolean> {
  return scanScheduleStore.delete(id);
}

// ═══════════════════════════════════════════════════════════════
// COMPLIANCE CONTROLS & AUDIT LOGS
// Multi-Framework Support: NIST 800-53, NIST 800-171, CMMC 2.0
// ═══════════════════════════════════════════════════════════════

import {
  ComplianceFramework,
  ComplianceControl,
  ExostarIntegration,
  DEFAULT_NIST_171_CONTROLS,
  DEFAULT_CMMC_L2_CONTROLS,
  DEFAULT_NISPOM_CONTROLS,
  DEFAULT_FOCI_CONTROLS,
  DEFAULT_SBIR_CONTROLS,
  DEFAULT_ITAR_CONTROLS,
  DEFAULT_EAR_CONTROLS,
  DEFAULT_ICD_503_CONTROLS,
  DEFAULT_CNSSI_1253_CONTROLS,
  DEFAULT_FEDRAMP_HIGH_CONTROLS,
  CDSE_TRAINING_REQUIREMENTS,
  DEFAULT_EXOSTAR_CONFIG,
  FRAMEWORKS,
  CMMCLevel,
  ClearanceLevel,
  SBIRPhase,
  FacilityClearance,
  PersonnelClearance,
  FOCIMitigation,
  SBIRSTTRProgram,
  CDSETrainingRequirement,
  ImpactLevel,
  NSSCategorization,
} from './compliance-frameworks';

// Re-export the ComplianceControl type for backward compatibility
export type { 
  ComplianceControl, 
  ComplianceFramework, 
  CMMCLevel, 
  ClearanceLevel,
  SBIRPhase,
  ExostarIntegration,
  FacilityClearance,
  PersonnelClearance,
  FOCIMitigation,
  SBIRSTTRProgram,
  CDSETrainingRequirement,
  ImpactLevel,
  NSSCategorization,
};

// Export training requirements
export { CDSE_TRAINING_REQUIREMENTS };

export interface ComplianceAuditLog {
  id: string;
  timestamp: string;
  action: string;
  user: string;
  resource: string;
  resource_type: 'control' | 'report' | 'scan' | 'incident' | 'config';
  result: 'success' | 'failure';
  ip: string;
  details: Record<string, unknown>;
}

// In-memory store for compliance - now supports multiple frameworks
const complianceStore = new Map<string, ComplianceControl>();
const complianceAuditStore: ComplianceAuditLog[] = [];
let exostarConfig: ExostarIntegration = { ...DEFAULT_EXOSTAR_CONFIG };

// Initialize default NIST 800-53 controls (backward compatible)
const defaultNIST53Controls: ComplianceControl[] = [
  { id: 'AC-1', framework: 'NIST-800-53', family: 'AC', name: 'Access Control Policy and Procedures', description: 'Develop, document, and disseminate an access control policy', status: 'compliant', evidence: ['Security policy document', 'SOC procedures'], lastAudit: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], lastAuditBy: 'System', priority: 'high', notes: 'Automated policy check passed', mappings: { 'NIST-800-171': ['3.1.1'], 'CMMC-L2': ['AC.L1-3.1.1'] } },
  { id: 'AC-2', framework: 'NIST-800-53', family: 'AC', name: 'Account Management', description: 'Manage system accounts, including establishing, activating, modifying, reviewing, disabling, and removing accounts', status: 'compliant', evidence: ['User management procedures', 'Automated account provisioning'], lastAudit: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], lastAuditBy: 'Morgan', priority: 'high', notes: 'Reviewed account lifecycle processes', mappings: { 'NIST-800-171': ['3.1.1', '3.1.2'], 'CMMC-L2': ['AC.L1-3.1.1', 'AC.L1-3.1.2'] } },
  { id: 'AC-3', framework: 'NIST-800-53', family: 'AC', name: 'Access Enforcement', description: 'Enforce approved authorizations for logical access to information and system resources', status: 'compliant', evidence: ['RBAC implementation', 'UniFi network segmentation'], lastAudit: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], lastAuditBy: 'System', priority: 'high', notes: 'RBAC enforced via Supabase RLS', mappings: { 'NIST-800-171': ['3.1.1', '3.1.2'], 'CMMC-L2': ['AC.L1-3.1.1', 'AC.L1-3.1.2'] } },
  { id: 'AC-4', framework: 'NIST-800-53', family: 'AC', name: 'Information Flow Enforcement', description: 'Enforce approved authorizations for controlling the flow of information within the system and between interconnected systems', status: 'partial', evidence: ['Network segmentation', 'Data classification in progress'], lastAudit: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], lastAuditBy: 'Morgan', priority: 'high', notes: 'CUI flow mapping in progress', mappings: { 'NIST-800-171': ['3.1.3'], 'CMMC-L2': ['AC.L2-3.1.3'] } },
  { id: 'AU-2', framework: 'NIST-800-53', family: 'AU', name: 'Audit Events', description: 'Determine and document events to be audited', status: 'compliant', evidence: ['Audit logging enabled', 'Suricata IDS logs', 'Security event store'], lastAudit: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], lastAuditBy: 'System', priority: 'high', notes: 'All security events logged to database', mappings: { 'NIST-800-171': ['3.3.1'], 'CMMC-L2': ['AU.L2-3.3.1'] } },
  { id: 'AU-6', framework: 'NIST-800-53', family: 'AU', name: 'Audit Review, Analysis, and Reporting', description: 'Review and analyze system audit records for indications of inappropriate or unusual activity', status: 'compliant', evidence: ['SOC dashboard', 'Automated alerting', 'Daily security reviews'], lastAudit: new Date().toISOString().split('T')[0], lastAuditBy: 'System', priority: 'high', notes: 'Automated analysis via MYCA-SEC', mappings: { 'NIST-800-171': ['3.3.1', '3.3.2'], 'CMMC-L2': ['AU.L2-3.3.1', 'AU.L2-3.3.2'] } },
  { id: 'CM-2', framework: 'NIST-800-53', family: 'CM', name: 'Baseline Configuration', description: 'Develop, document, and maintain a current baseline configuration of the information system', status: 'partial', evidence: ['Docker configurations', 'Infrastructure as code'], lastAudit: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], lastAuditBy: 'Morgan', priority: 'medium', notes: 'Baseline documented in docker-compose files' },
  { id: 'IR-4', framework: 'NIST-800-53', family: 'IR', name: 'Incident Handling', description: 'Implement an incident handling capability for security incidents', status: 'compliant', evidence: ['Incident management system', 'Response playbooks', 'Escalation procedures'], lastAudit: new Date().toISOString().split('T')[0], lastAuditBy: 'System', priority: 'high', notes: 'Incident system fully operational', mappings: { 'NIST-800-171': ['3.6.1'], 'CMMC-L2': ['IR.L2-3.6.1'] } },
  { id: 'IR-5', framework: 'NIST-800-53', family: 'IR', name: 'Incident Monitoring', description: 'Track and document security incidents', status: 'compliant', evidence: ['Security event logging', 'Incident database', 'Timeline tracking'], lastAudit: new Date().toISOString().split('T')[0], lastAuditBy: 'System', priority: 'high', notes: '24/7 monitoring active', mappings: { 'NIST-800-171': ['3.6.1', '3.6.2'], 'CMMC-L2': ['IR.L2-3.6.1', 'IR.L2-3.6.2'] } },
  { id: 'IR-6', framework: 'NIST-800-53', family: 'IR', name: 'Incident Reporting', description: 'Require personnel to report suspected security incidents to the organizational incident response capability', status: 'compliant', evidence: ['Incident reporting procedures', 'Email notifications', 'Timeline tracking'], lastAudit: new Date().toISOString().split('T')[0], lastAuditBy: 'System', priority: 'high', notes: 'Automated reporting configured', mappings: { 'NIST-800-171': ['3.6.2'], 'CMMC-L2': ['IR.L2-3.6.2'] } },
  { id: 'RA-5', framework: 'NIST-800-53', family: 'RA', name: 'Vulnerability Scanning', description: 'Scan for vulnerabilities in the information system and hosted applications', status: 'compliant', evidence: ['Nmap scanning', 'Red Team dashboard', 'Vulnerability reports'], lastAudit: new Date().toISOString().split('T')[0], lastAuditBy: 'System', priority: 'high', notes: 'Automated scanning configured', mappings: { 'NIST-800-171': ['3.11.2'], 'CMMC-L2': ['RA.L2-3.11.2'] } },
  { id: 'SC-7', framework: 'NIST-800-53', family: 'SC', name: 'Boundary Protection', description: 'Monitor and control communications at the external boundary and at key internal boundaries', status: 'compliant', evidence: ['UniFi Dream Machine Pro', 'Suricata IDS/IPS', 'Cloudflare WAF'], lastAudit: new Date().toISOString().split('T')[0], lastAuditBy: 'System', priority: 'high', notes: 'Multi-layer boundary protection', mappings: { 'NIST-800-171': ['3.13.1', '3.13.5'], 'CMMC-L2': ['SC.L1-3.13.1', 'SC.L2-3.13.5'] } },
  { id: 'SI-2', framework: 'NIST-800-53', family: 'SI', name: 'Flaw Remediation', description: 'Identify, report, and correct information system flaws', status: 'compliant', evidence: ['Vulnerability scanning', 'Patch management', 'Red Team assessments'], lastAudit: new Date().toISOString().split('T')[0], lastAuditBy: 'System', priority: 'high', notes: 'Automated flaw detection active', mappings: { 'NIST-800-171': ['3.14.1'], 'CMMC-L2': ['SI.L1-3.14.1'] } },
  { id: 'SI-4', framework: 'NIST-800-53', family: 'SI', name: 'Information System Monitoring', description: 'Monitor the information system to detect attacks and indicators of potential attacks', status: 'compliant', evidence: ['24/7 SOC monitoring', 'IDS alerts', 'Anomaly detection'], lastAudit: new Date().toISOString().split('T')[0], lastAuditBy: 'System', priority: 'high', notes: 'Real-time monitoring via UniFi + Suricata', mappings: { 'NIST-800-171': ['3.14.6', '3.14.7'], 'CMMC-L2': ['SI.L2-3.14.6', 'SI.L2-3.14.7'] } },
];

// Initialize default controls if empty - now supports all frameworks
function ensureDefaultControls() {
  if (complianceStore.size === 0) {
    // Add NIST 800-53 controls
    defaultNIST53Controls.forEach(control => complianceStore.set(control.id, control));
    // Add NIST 800-171 controls
    DEFAULT_NIST_171_CONTROLS.forEach(control => complianceStore.set(control.id, control));
    // Add CMMC Level 2 controls
    DEFAULT_CMMC_L2_CONTROLS.forEach(control => complianceStore.set(control.id, control));
    // Add NISPOM controls (32 CFR Part 117, E.O. 12829)
    DEFAULT_NISPOM_CONTROLS.forEach(control => complianceStore.set(control.id, control));
    // Add FOCI controls
    DEFAULT_FOCI_CONTROLS.forEach(control => complianceStore.set(control.id, control));
    // Add SBIR/STTR controls
    DEFAULT_SBIR_CONTROLS.forEach(control => complianceStore.set(control.id, control));
    // Add ITAR controls
    DEFAULT_ITAR_CONTROLS.forEach(control => complianceStore.set(control.id, control));
    // Add EAR controls
    DEFAULT_EAR_CONTROLS.forEach(control => complianceStore.set(control.id, control));
    // Add ICD 503 controls (Intelligence Community)
    DEFAULT_ICD_503_CONTROLS.forEach(control => complianceStore.set(control.id, control));
    // Add CNSSI 1253 controls (National Security Systems)
    DEFAULT_CNSSI_1253_CONTROLS.forEach(control => complianceStore.set(control.id, control));
    // Add FedRAMP High controls
    DEFAULT_FEDRAMP_HIGH_CONTROLS.forEach(control => complianceStore.set(control.id, control));
    
    console.log('[ComplianceDB] Loaded frameworks: NIST 800-53, NIST 800-171, CMMC, NISPOM, FOCI, SBIR/STTR, ITAR, EAR, ICD 503, CNSSI 1253, FedRAMP High');
  }
}

export async function getComplianceControls(options?: {
  framework?: ComplianceFramework;
  family?: string;
  status?: 'compliant' | 'partial' | 'non_compliant' | 'not_applicable';
}): Promise<ComplianceControl[]> {
  ensureDefaultControls();
  let controls = Array.from(complianceStore.values());
  
  if (options?.framework) {
    controls = controls.filter(c => c.framework === options.framework);
  }
  if (options?.family) {
    controls = controls.filter(c => c.family === options.family);
  }
  if (options?.status) {
    controls = controls.filter(c => c.status === options.status);
  }
  
  return controls;
}

// Get compliance controls by framework
export async function getControlsByFramework(framework: ComplianceFramework): Promise<ComplianceControl[]> {
  ensureDefaultControls();
  return Array.from(complianceStore.values()).filter(c => c.framework === framework);
}

// Get framework summary statistics
export async function getFrameworkStats(framework?: ComplianceFramework): Promise<{
  framework: ComplianceFramework | 'all';
  totalControls: number;
  compliant: number;
  partial: number;
  nonCompliant: number;
  notApplicable: number;
  score: number;
}> {
  ensureDefaultControls();
  let controls = Array.from(complianceStore.values());
  
  if (framework) {
    controls = controls.filter(c => c.framework === framework);
  }
  
  const compliant = controls.filter(c => c.status === 'compliant').length;
  const partial = controls.filter(c => c.status === 'partial').length;
  const nonCompliant = controls.filter(c => c.status === 'non_compliant').length;
  const notApplicable = controls.filter(c => c.status === 'not_applicable').length;
  const countable = controls.length - notApplicable;
  
  return {
    framework: framework || 'all',
    totalControls: controls.length,
    compliant,
    partial,
    nonCompliant,
    notApplicable,
    score: countable > 0 ? Math.round(((compliant + partial * 0.5) / countable) * 100) : 100,
  };
}

export async function updateComplianceControl(
  controlId: string,
  updates: Partial<ComplianceControl>,
  updatedBy: string,
  ipAddress: string = '127.0.0.1'
): Promise<ComplianceControl | null> {
  ensureDefaultControls();
  const existing = complianceStore.get(controlId);
  if (!existing) return null;

  const updated: ComplianceControl = {
    ...existing,
    ...updates,
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: updatedBy,
  };

  complianceStore.set(controlId, updated);

  // Log the audit event
  await createComplianceAuditLog({
    action: 'UPDATE_CONTROL',
    user: updatedBy,
    resource: controlId,
    resource_type: 'control',
    result: 'success',
    ip: ipAddress,
    details: { changes: updates, previousStatus: existing.status, newStatus: updated.status },
  });

  return updated;
}

export async function createComplianceAuditLog(log: Omit<ComplianceAuditLog, 'id' | 'timestamp'>): Promise<ComplianceAuditLog> {
  const newLog: ComplianceAuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    ...log,
  };

  complianceAuditStore.unshift(newLog); // Add to beginning for chronological order

  // Keep only last 1000 logs in memory
  if (complianceAuditStore.length > 1000) {
    complianceAuditStore.pop();
  }

  console.log(`[ComplianceDB] Audit log: ${log.action} by ${log.user} on ${log.resource}`);
  return newLog;
}

export async function getComplianceAuditLogs(options: {
  limit?: number;
  since?: string;
  action?: string;
  user?: string;
}): Promise<ComplianceAuditLog[]> {
  const { limit = 100, since, action, user } = options;

  let logs = [...complianceAuditStore];

  if (since) logs = logs.filter(l => l.timestamp >= since);
  if (action) logs = logs.filter(l => l.action === action);
  if (user) logs = logs.filter(l => l.user === user);

  return logs.slice(0, limit);
}

export async function getComplianceStats(): Promise<{
  totalControls: number;
  compliant: number;
  partial: number;
  nonCompliant: number;
  score: number;
  lastAudit: string;
  auditLogsToday: number;
}> {
  ensureDefaultControls();
  const controls = Array.from(complianceStore.values());
  const today = new Date().toISOString().split('T')[0];

  const compliant = controls.filter(c => c.status === 'compliant').length;
  const partial = controls.filter(c => c.status === 'partial').length;
  const nonCompliant = controls.filter(c => c.status === 'non_compliant').length;

  const auditLogsToday = complianceAuditStore.filter(
    l => l.timestamp.startsWith(today)
  ).length;

  const lastAudit = controls.reduce((latest, c) => 
    c.lastAudit > latest ? c.lastAudit : latest, 
    ''
  );

  return {
    totalControls: controls.length,
    compliant,
    partial,
    nonCompliant,
    score: Math.round(((compliant + partial * 0.5) / controls.length) * 100),
    lastAudit,
    auditLogsToday,
  };
}

// ═══════════════════════════════════════════════════════════════
// EXOSTAR INTEGRATION
// ═══════════════════════════════════════════════════════════════

export async function getExostarConfig(): Promise<ExostarIntegration> {
  return { ...exostarConfig };
}

export async function updateExostarConfig(
  updates: Partial<ExostarIntegration>,
  updatedBy: string
): Promise<ExostarIntegration> {
  exostarConfig = { ...exostarConfig, ...updates };
  
  await createComplianceAuditLog({
    action: 'UPDATE_EXOSTAR_CONFIG',
    user: updatedBy,
    resource: 'exostar-integration',
    resource_type: 'config',
    result: 'success',
    ip: '127.0.0.1',
    details: { updates },
  });
  
  console.log(`[SecurityDB] Exostar config updated by ${updatedBy}`);
  return exostarConfig;
}

export async function syncWithExostar(): Promise<{
  success: boolean;
  message: string;
  lastSync: string;
}> {
  if (!exostarConfig.enabled || !exostarConfig.apiKeyConfigured) {
    return {
      success: false,
      message: 'Exostar integration not configured',
      lastSync: exostarConfig.lastSync || 'never',
    };
  }
  
  // TODO: Implement actual Exostar API sync
  // This would call the Exostar REST API to:
  // 1. Push assessment results
  // 2. Pull supplier risk data
  // 3. Sync credentialing status
  // 4. Report incidents
  
  const now = new Date().toISOString();
  exostarConfig.lastSync = now;
  exostarConfig.syncStatus = 'connected';
  
  await createComplianceAuditLog({
    action: 'EXOSTAR_SYNC',
    user: 'system',
    resource: 'exostar-integration',
    resource_type: 'config',
    result: 'success',
    ip: '127.0.0.1',
    details: { syncTime: now },
  });
  
  return {
    success: true,
    message: 'Exostar sync completed successfully',
    lastSync: now,
  };
}

// Get CMMC readiness report
export async function getCMMCReadinessReport(targetLevel: CMMCLevel): Promise<{
  targetLevel: CMMCLevel;
  currentLevel: CMMCLevel;
  ready: boolean;
  score: number;
  gaps: ComplianceControl[];
  recommendations: string[];
}> {
  ensureDefaultControls();
  const allControls = Array.from(complianceStore.values());
  
  // Filter for CMMC controls at or below target level
  const cmmcControls = allControls.filter(c => 
    c.framework.startsWith('CMMC') && (c.cmmcLevel || 1) <= targetLevel
  );
  
  const gaps = cmmcControls.filter(c => c.status !== 'compliant');
  const compliant = cmmcControls.filter(c => c.status === 'compliant').length;
  const partial = cmmcControls.filter(c => c.status === 'partial').length;
  const score = Math.round(((compliant + partial * 0.5) / cmmcControls.length) * 100);
  
  // Determine current level
  let currentLevel: CMMCLevel = 1;
  const l1Controls = cmmcControls.filter(c => c.cmmcLevel === 1);
  const l2Controls = cmmcControls.filter(c => c.cmmcLevel === 2);
  const l1Compliant = l1Controls.every(c => c.status === 'compliant');
  const l2Compliant = l2Controls.every(c => c.status === 'compliant');
  
  if (l1Compliant && l2Compliant) currentLevel = 2;
  else if (l1Compliant) currentLevel = 1;
  
  // Generate recommendations based on gaps
  const recommendations: string[] = [];
  if (gaps.length > 0) {
    const criticalGaps = gaps.filter(g => g.priority === 'high');
    if (criticalGaps.length > 0) {
      recommendations.push(`Address ${criticalGaps.length} high-priority control gaps immediately`);
    }
    
    const partialControls = gaps.filter(g => g.status === 'partial');
    if (partialControls.length > 0) {
      recommendations.push(`Complete ${partialControls.length} partially implemented controls`);
    }
    
    // Specific recommendations by domain
    const acGaps = gaps.filter(g => g.family === 'AC');
    if (acGaps.length > 0) {
      recommendations.push('Strengthen access control policies and enforcement');
    }
    
    const auGaps = gaps.filter(g => g.family === 'AU');
    if (auGaps.length > 0) {
      recommendations.push('Enhance audit logging and review processes');
    }
  } else {
    recommendations.push(`Ready for CMMC Level ${targetLevel} assessment`);
    recommendations.push('Schedule C3PAO assessment when ready');
  }
  
  return {
    targetLevel,
    currentLevel,
    ready: gaps.length === 0,
    score,
    gaps,
    recommendations,
  };
}

// Get NIST 800-171 SSP (System Security Plan) data
export async function getNIST171SSPData(): Promise<{
  organizationName: string;
  systemName: string;
  systemDescription: string;
  controls: ComplianceControl[];
  poams: { controlId: string; description: string; targetDate: string }[];
  lastUpdated: string;
}> {
  ensureDefaultControls();
  const nist171Controls = Array.from(complianceStore.values())
    .filter(c => c.framework === 'NIST-800-171');
  
  // Generate POAMs for non-compliant controls
  const poams = nist171Controls
    .filter(c => c.status !== 'compliant' && c.status !== 'not_applicable')
    .map(c => ({
      controlId: c.id,
      description: `Remediation plan for ${c.name}: ${c.notes}`,
      targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    }));
  
  return {
    organizationName: 'Mycosoft',
    systemName: 'Mycosoft MAS Platform',
    systemDescription: 'Multi-Agent System for secure development and operations',
    controls: nist171Controls,
    poams,
    lastUpdated: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════
// FCL (FACILITY CLEARANCE) DATA
// ═══════════════════════════════════════════════════════════════

export interface KeyPersonnel {
  id: string;
  name: string;
  title: string;
  role: 'FSO' | 'AFSO' | 'ISSM' | 'ISSO' | 'KMP' | 'Officer' | 'Director';
  clearanceLevel: 'Pending' | 'Confidential' | 'Secret' | 'Top Secret' | 'TS/SCI';
  clearanceStatus: 'active' | 'pending' | 'expired' | 'suspended';
  clearanceExpiry?: string;
  email: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export interface TrainingRecord {
  id: string;
  courseName: string;
  provider: 'CDSE' | 'Internal' | 'External';
  completedDate: string;
  expirationDate?: string;
  personnel: string; // Name or 'All Personnel'
  certificateUrl?: string;
  status: 'complete' | 'in_progress' | 'expired' | 'pending';
  created_at: string;
  updated_at: string;
}

const inMemoryPersonnel = new Map<string, KeyPersonnel>();
const inMemoryTraining = new Map<string, TrainingRecord>();

// Initialize with default data
const defaultPersonnel: Omit<KeyPersonnel, 'created_at' | 'updated_at'>[] = [
  {
    id: 'KP-001',
    name: 'Michael Chen',
    title: 'Chief Executive Officer',
    role: 'KMP',
    clearanceLevel: 'Pending',
    clearanceStatus: 'pending',
    email: 'michael.chen@mycosoft.com',
    phone: '(555) 123-4567',
  },
  {
    id: 'KP-002',
    name: 'Sarah Johnson',
    title: 'Facility Security Officer',
    role: 'FSO',
    clearanceLevel: 'Secret',
    clearanceStatus: 'pending',
    email: 'sarah.johnson@mycosoft.com',
    phone: '(555) 234-5678',
  },
  {
    id: 'KP-003',
    name: 'Robert Williams',
    title: 'Information System Security Manager',
    role: 'ISSM',
    clearanceLevel: 'Top Secret',
    clearanceStatus: 'pending',
    email: 'robert.williams@mycosoft.com',
    phone: '(555) 345-6789',
  },
  {
    id: 'KP-004',
    name: 'Emily Davis',
    title: 'Assistant Facility Security Officer',
    role: 'AFSO',
    clearanceLevel: 'Secret',
    clearanceStatus: 'pending',
    email: 'emily.davis@mycosoft.com',
    phone: '(555) 456-7890',
  },
];

const defaultTraining: Omit<TrainingRecord, 'created_at' | 'updated_at'>[] = [
  {
    id: 'TR-001',
    courseName: 'Facility Security Officer (FSO) Program Management for Possessing Facilities',
    provider: 'CDSE',
    completedDate: '2026-01-10',
    expirationDate: '2027-01-10',
    personnel: 'Sarah Johnson',
    status: 'complete',
  },
  {
    id: 'TR-002',
    courseName: 'Insider Threat Awareness',
    provider: 'CDSE',
    completedDate: '2026-01-05',
    expirationDate: '2027-01-05',
    personnel: 'All Personnel',
    status: 'complete',
  },
  {
    id: 'TR-003',
    courseName: 'Counterintelligence Awareness',
    provider: 'CDSE',
    completedDate: '2026-01-08',
    expirationDate: '2027-01-08',
    personnel: 'All Personnel',
    status: 'complete',
  },
  {
    id: 'TR-004',
    courseName: 'Derivative Classification Training',
    provider: 'CDSE',
    completedDate: '2026-01-12',
    expirationDate: '2028-01-12',
    personnel: 'Cleared Personnel',
    status: 'complete',
  },
];

function initializeFCLData() {
  if (inMemoryPersonnel.size === 0) {
    const now = new Date().toISOString();
    defaultPersonnel.forEach(p => {
      inMemoryPersonnel.set(p.id, { ...p, created_at: now, updated_at: now });
    });
  }
  
  if (inMemoryTraining.size === 0) {
    const now = new Date().toISOString();
    defaultTraining.forEach(t => {
      inMemoryTraining.set(t.id, { ...t, created_at: now, updated_at: now });
    });
  }
}

export async function getKeyPersonnel(): Promise<KeyPersonnel[]> {
  initializeFCLData();
  const supabase = await getSupabaseClient();
  
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('fcl_personnel')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.warn('[FCL] Failed to fetch personnel from database:', error);
    }
  }
  
  return Array.from(inMemoryPersonnel.values());
}

export async function createKeyPersonnel(
  personnel: Omit<KeyPersonnel, 'id' | 'created_at' | 'updated_at'>
): Promise<KeyPersonnel> {
  initializeFCLData();
  const supabase = await getSupabaseClient();
  
  const now = new Date().toISOString();
  const id = `KP-${Date.now().toString().slice(-6)}`;
  const newPersonnel: KeyPersonnel = {
    ...personnel,
    id,
    created_at: now,
    updated_at: now,
  };
  
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('fcl_personnel')
        .insert(newPersonnel)
        .select()
        .single();
      
      if (error) throw error;
      
      await createComplianceAuditLog({
        action: 'CREATE_KEY_PERSONNEL',
        user: 'system',
        resource: `fcl-personnel-${id}`,
        resource_type: 'fcl',
        result: 'success',
        ip: '127.0.0.1',
        details: { personnel: newPersonnel.name, role: newPersonnel.role },
      });
      
      return data;
    } catch (error) {
      console.warn('[FCL] Failed to create personnel in database:', error);
    }
  }
  
  inMemoryPersonnel.set(id, newPersonnel);
  return newPersonnel;
}

export async function updateKeyPersonnel(
  id: string,
  updates: Partial<Omit<KeyPersonnel, 'id' | 'created_at'>>
): Promise<KeyPersonnel> {
  initializeFCLData();
  const supabase = await getSupabaseClient();
  
  const updated_at = new Date().toISOString();
  
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('fcl_personnel')
        .update({ ...updates, updated_at })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      await createComplianceAuditLog({
        action: 'UPDATE_KEY_PERSONNEL',
        user: 'system',
        resource: `fcl-personnel-${id}`,
        resource_type: 'fcl',
        result: 'success',
        ip: '127.0.0.1',
        details: { updates },
      });
      
      return data;
    } catch (error) {
      console.warn('[FCL] Failed to update personnel in database:', error);
    }
  }
  
  const existing = inMemoryPersonnel.get(id);
  if (!existing) throw new Error(`Personnel ${id} not found`);
  
  const updated: KeyPersonnel = { ...existing, ...updates, updated_at };
  inMemoryPersonnel.set(id, updated);
  return updated;
}

export async function deleteKeyPersonnel(id: string): Promise<void> {
  initializeFCLData();
  const supabase = await getSupabaseClient();
  
  if (supabase) {
    try {
      const { error } = await supabase
        .from('fcl_personnel')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      await createComplianceAuditLog({
        action: 'DELETE_KEY_PERSONNEL',
        user: 'system',
        resource: `fcl-personnel-${id}`,
        resource_type: 'fcl',
        result: 'success',
        ip: '127.0.0.1',
        details: { personnel_id: id },
      });
      
      return;
    } catch (error) {
      console.warn('[FCL] Failed to delete personnel from database:', error);
    }
  }
  
  inMemoryPersonnel.delete(id);
}

export async function getTrainingRecords(): Promise<TrainingRecord[]> {
  initializeFCLData();
  const supabase = await getSupabaseClient();
  
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('fcl_training')
        .select('*')
        .order('completedDate', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.warn('[FCL] Failed to fetch training from database:', error);
    }
  }
  
  return Array.from(inMemoryTraining.values());
}

export async function createTrainingRecord(
  training: Omit<TrainingRecord, 'id' | 'created_at' | 'updated_at'>
): Promise<TrainingRecord> {
  initializeFCLData();
  const supabase = await getSupabaseClient();
  
  const now = new Date().toISOString();
  const id = `TR-${Date.now().toString().slice(-6)}`;
  const newTraining: TrainingRecord = {
    ...training,
    id,
    created_at: now,
    updated_at: now,
  };
  
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('fcl_training')
        .insert(newTraining)
        .select()
        .single();
      
      if (error) throw error;
      
      await createComplianceAuditLog({
        action: 'CREATE_TRAINING_RECORD',
        user: 'system',
        resource: `fcl-training-${id}`,
        resource_type: 'fcl',
        result: 'success',
        ip: '127.0.0.1',
        details: { course: newTraining.courseName, personnel: newTraining.personnel },
      });
      
      return data;
    } catch (error) {
      console.warn('[FCL] Failed to create training in database:', error);
    }
  }
  
  inMemoryTraining.set(id, newTraining);
  return newTraining;
}

// ═══════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════

export async function initializeDatabase(): Promise<boolean> {
  const supabase = await getSupabaseClient();
  
  // Initialize compliance controls for all frameworks
  ensureDefaultControls();
  
  // Log system startup
  await createComplianceAuditLog({
    action: 'SYSTEM_STARTUP',
    user: 'system',
    resource: 'security-system',
    resource_type: 'config',
    result: 'success',
    ip: '127.0.0.1',
    details: { 
      message: 'Security Operations Center initialized',
      frameworks: ['NIST-800-53', 'NIST-800-171', 'CMMC-L2'],
      exostarEnabled: exostarConfig.enabled,
    },
  });
  
  if (!supabase) {
    console.log('[SecurityDB] Running in-memory mode (no Supabase configured)');
    return false;
  }
  
  console.log('[SecurityDB] Database connection established');
  console.log('[SecurityDB] Loaded frameworks: NIST 800-53, NIST 800-171, CMMC 2.0');
  return true;
}
