/**
 * Agent Incident Reporter
 * 
 * Standardized interface for all agents to report security incidents.
 * Provides a consistent API for detection, investigation, remediation, and logging.
 * 
 * @version 1.0.0
 * @date January 24, 2026
 */

import { createIncident, updateIncident, type Incident } from './database';
import { logIncidentEvent, logAgentAction } from './incident-chain';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type AgentSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';
export type AgentCategory = 'security' | 'infrastructure' | 'data' | 'communication' | 'core';

export type IncidentCategory = 
  | 'intrusion'
  | 'malware'
  | 'anomaly'
  | 'policy_violation'
  | 'data_breach'
  | 'denial_of_service'
  | 'unauthorized_access'
  | 'configuration_drift'
  | 'system_failure'
  | 'network_issue'
  | 'authentication_failure'
  | 'vulnerability'
  | 'compliance_violation'
  | 'other';

export interface AgentIncidentReport {
  // Agent identification
  agent_id: string;
  agent_name: string;
  agent_category: AgentCategory;
  
  // Detection details
  detected_at: string;
  severity: AgentSeverity;
  category: IncidentCategory;
  
  // Incident description
  title: string;
  description: string;
  
  // Impact assessment
  affected_systems: string[];
  affected_users?: string[];
  potential_impact: string;
  
  // Evidence and context
  source_data: Record<string, unknown>;
  indicators: string[];  // IOCs, signatures, etc.
  
  // Recommendations
  recommended_action?: string;
  auto_remediate?: boolean;
  remediation_steps?: string[];
  
  // Classification
  tags?: string[];
  related_events?: string[];  // Related event IDs
  
  // Compliance mappings
  compliance_controls?: string[];  // e.g., ['AU-6', 'IR-4']
}

export interface AgentAction {
  agent_id: string;
  agent_name: string;
  agent_category: AgentCategory;
  incident_id: string;
  action_type: 'detected' | 'investigated' | 'analyzed' | 'fixed' | 'escalated' | 'logged' | 'resolved' | 'notified' | 'monitored';
  description: string;
  result: 'success' | 'partial' | 'failed' | 'pending';
  data?: Record<string, unknown>;
}

export interface AgentReporterConfig {
  auto_create_incident: boolean;
  notify_on_high_severity: boolean;
  notify_on_critical: boolean;
  default_assignee?: string;
  escalation_threshold: AgentSeverity;
}

// ═══════════════════════════════════════════════════════════════
// AGENT REGISTRY
// ═══════════════════════════════════════════════════════════════

interface RegisteredAgent {
  id: string;
  name: string;
  category: AgentCategory;
  description: string;
  capabilities: string[];
  status: 'active' | 'inactive' | 'error';
  last_activity?: string;
  incidents_reported: number;
  actions_taken: number;
}

const agentRegistry = new Map<string, RegisteredAgent>();

/**
 * Register an agent with the incident system
 */
export function registerAgent(agent: Omit<RegisteredAgent, 'incidents_reported' | 'actions_taken' | 'last_activity'>): void {
  agentRegistry.set(agent.id, {
    ...agent,
    incidents_reported: 0,
    actions_taken: 0,
    last_activity: new Date().toISOString(),
  });
  console.log(`[AgentReporter] Registered agent: ${agent.name} (${agent.id})`);
}

/**
 * Get all registered agents
 */
export function getRegisteredAgents(): RegisteredAgent[] {
  return Array.from(agentRegistry.values());
}

/**
 * Get agent by ID
 */
export function getAgent(agentId: string): RegisteredAgent | undefined {
  return agentRegistry.get(agentId);
}

/**
 * Update agent status
 */
export function updateAgentStatus(agentId: string, status: RegisteredAgent['status']): void {
  const agent = agentRegistry.get(agentId);
  if (agent) {
    agent.status = status;
    agent.last_activity = new Date().toISOString();
  }
}

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const defaultConfig: AgentReporterConfig = {
  auto_create_incident: true,
  notify_on_high_severity: true,
  notify_on_critical: true,
  escalation_threshold: 'high',
};

let config: AgentReporterConfig = { ...defaultConfig };

/**
 * Configure the agent reporter
 */
export function configureAgentReporter(newConfig: Partial<AgentReporterConfig>): void {
  config = { ...config, ...newConfig };
  console.log('[AgentReporter] Configuration updated:', config);
}

// ═══════════════════════════════════════════════════════════════
// INCIDENT REPORTING
// ═══════════════════════════════════════════════════════════════

/**
 * Report a new incident from an agent
 */
export async function reportIncident(report: AgentIncidentReport): Promise<{
  incident: Incident;
  chain_entry_id: string;
  auto_remediation_triggered: boolean;
}> {
  // Update agent registry
  const agent = agentRegistry.get(report.agent_id);
  if (agent) {
    agent.incidents_reported++;
    agent.last_activity = new Date().toISOString();
  }
  
  // Create the incident
  const incident = await createIncident({
    title: report.title,
    description: report.description,
    severity: report.severity,
    status: 'open',
    assigned_to: config.default_assignee || null,
    resolved_at: null,
    events: report.related_events || [],
    tags: [
      report.category,
      `agent:${report.agent_id}`,
      ...report.affected_systems.map(s => `system:${s}`),
      ...(report.tags || []),
    ],
    timeline: [{
      timestamp: report.detected_at,
      action: 'detected',
      actor: report.agent_name,
      details: `Incident detected by ${report.agent_name}: ${report.description}`,
    }],
  });
  
  // Log to cryptographic chain
  const chainEntry = await logIncidentEvent({
    incident_id: incident.id,
    event_type: 'created',
    event_data: {
      title: report.title,
      severity: report.severity,
      category: report.category,
      affected_systems: report.affected_systems,
      indicators: report.indicators,
      source: report.source_data,
    },
    reporter_type: 'agent',
    reporter_id: report.agent_id,
    reporter_name: report.agent_name,
  });
  
  // Log agent activity
  await logAgentAction({
    agent_id: report.agent_id,
    agent_name: report.agent_name,
    agent_category: report.agent_category,
    incident_id: incident.id,
    action_type: 'detected',
    action_data: {
      category: report.category,
      indicators_count: report.indicators.length,
      affected_systems: report.affected_systems,
    },
    severity: report.severity,
  });
  
  // Check for auto-remediation
  let autoRemediationTriggered = false;
  if (report.auto_remediate && report.remediation_steps && report.remediation_steps.length > 0) {
    autoRemediationTriggered = true;
    console.log(`[AgentReporter] Auto-remediation triggered for incident ${incident.id}`);
    
    // Log auto-remediation action
    await logAgentAction({
      agent_id: report.agent_id,
      agent_name: report.agent_name,
      agent_category: report.agent_category,
      incident_id: incident.id,
      action_type: 'fixed',
      action_data: {
        auto_remediation: true,
        steps: report.remediation_steps,
      },
      severity: report.severity,
    });
    
    // Update incident status to investigating
    await updateIncident(incident.id, {
      status: 'investigating',
      timeline: [
        ...incident.timeline,
        {
          timestamp: new Date().toISOString(),
          action: 'auto_remediation_started',
          actor: report.agent_name,
          details: `Auto-remediation initiated: ${report.remediation_steps.join(', ')}`,
        },
      ],
    });
  }
  
  // Trigger notifications for high/critical
  if (
    (report.severity === 'high' && config.notify_on_high_severity) ||
    (report.severity === 'critical' && config.notify_on_critical)
  ) {
    // This will be handled by the voice-alerts system
    console.log(`[AgentReporter] HIGH/CRITICAL incident requires notification: ${incident.id}`);
  }
  
  console.log(`[AgentReporter] Incident reported: ${incident.id} by ${report.agent_name}`);
  
  return {
    incident,
    chain_entry_id: chainEntry.id,
    auto_remediation_triggered: autoRemediationTriggered,
  };
}

/**
 * Log an agent action on an existing incident
 */
export async function logAction(action: AgentAction): Promise<string> {
  // Update agent registry
  const agent = agentRegistry.get(action.agent_id);
  if (agent) {
    agent.actions_taken++;
    agent.last_activity = new Date().toISOString();
  }
  
  // Log to chain
  const entry = await logIncidentEvent({
    incident_id: action.incident_id,
    event_type: 'action',
    event_data: {
      action_type: action.action_type,
      description: action.description,
      result: action.result,
      data: action.data,
    },
    reporter_type: 'agent',
    reporter_id: action.agent_id,
    reporter_name: action.agent_name,
  });
  
  // Log agent activity
  await logAgentAction({
    agent_id: action.agent_id,
    agent_name: action.agent_name,
    agent_category: action.agent_category,
    incident_id: action.incident_id,
    action_type: action.action_type,
    action_data: {
      description: action.description,
      result: action.result,
      ...action.data,
    },
    severity: 'info',
  });
  
  // Update incident timeline
  const incidents = await import('./database').then(m => m.getIncidents({ limit: 1000 }));
  const incident = incidents.find(i => i.id === action.incident_id);
  
  if (incident) {
    await updateIncident(action.incident_id, {
      timeline: [
        ...incident.timeline,
        {
          timestamp: new Date().toISOString(),
          action: action.action_type,
          actor: action.agent_name,
          details: action.description,
        },
      ],
    });
  }
  
  console.log(`[AgentReporter] Action logged: ${action.action_type} by ${action.agent_name} on ${action.incident_id}`);
  
  return entry.id;
}

/**
 * Escalate an incident
 */
export async function escalateIncident(
  incidentId: string,
  agentId: string,
  agentName: string,
  reason: string,
  newSeverity?: AgentSeverity
): Promise<void> {
  const agent = agentRegistry.get(agentId);
  
  // Log escalation to chain
  await logIncidentEvent({
    incident_id: incidentId,
    event_type: 'escalated',
    event_data: {
      reason,
      new_severity: newSeverity,
      escalated_by: agentId,
    },
    reporter_type: 'agent',
    reporter_id: agentId,
    reporter_name: agentName,
  });
  
  // Log agent activity
  await logAgentAction({
    agent_id: agentId,
    agent_name: agentName,
    agent_category: agent?.category || 'security',
    incident_id: incidentId,
    action_type: 'escalated',
    action_data: { reason, new_severity: newSeverity },
    severity: newSeverity || 'high',
  });
  
  // Update incident
  await updateIncident(incidentId, {
    severity: newSeverity,
    status: 'investigating',
  });
  
  console.log(`[AgentReporter] Incident ${incidentId} escalated by ${agentName}: ${reason}`);
}

/**
 * Resolve an incident
 */
export async function resolveIncident(
  incidentId: string,
  agentId: string,
  agentName: string,
  resolution: string
): Promise<void> {
  const agent = agentRegistry.get(agentId);
  
  // Log resolution to chain
  await logIncidentEvent({
    incident_id: incidentId,
    event_type: 'resolved',
    event_data: {
      resolution,
      resolved_by: agentId,
    },
    reporter_type: 'agent',
    reporter_id: agentId,
    reporter_name: agentName,
  });
  
  // Log agent activity
  await logAgentAction({
    agent_id: agentId,
    agent_name: agentName,
    agent_category: agent?.category || 'security',
    incident_id: incidentId,
    action_type: 'resolved',
    action_data: { resolution },
    severity: 'info',
  });
  
  // Update incident
  await updateIncident(incidentId, {
    status: 'resolved',
    resolved_at: new Date().toISOString(),
  });
  
  console.log(`[AgentReporter] Incident ${incidentId} resolved by ${agentName}: ${resolution}`);
}

// ═══════════════════════════════════════════════════════════════
// AGENT STATISTICS
// ═══════════════════════════════════════════════════════════════

export interface AgentStats {
  total_agents: number;
  active_agents: number;
  total_incidents_reported: number;
  total_actions_taken: number;
  agents_by_category: Record<AgentCategory, number>;
  top_reporters: Array<{ id: string; name: string; count: number }>;
}

/**
 * Get agent statistics
 */
export function getAgentStats(): AgentStats {
  const agents = Array.from(agentRegistry.values());
  
  const byCategory: Record<AgentCategory, number> = {
    security: 0,
    infrastructure: 0,
    data: 0,
    communication: 0,
    core: 0,
  };
  
  let totalIncidents = 0;
  let totalActions = 0;
  
  agents.forEach(agent => {
    byCategory[agent.category]++;
    totalIncidents += agent.incidents_reported;
    totalActions += agent.actions_taken;
  });
  
  const topReporters = agents
    .sort((a, b) => b.incidents_reported - a.incidents_reported)
    .slice(0, 5)
    .map(a => ({ id: a.id, name: a.name, count: a.incidents_reported }));
  
  return {
    total_agents: agents.length,
    active_agents: agents.filter(a => a.status === 'active').length,
    total_incidents_reported: totalIncidents,
    total_actions_taken: totalActions,
    agents_by_category: byCategory,
    top_reporters: topReporters,
  };
}

// ═══════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════

/**
 * Initialize the agent reporter with default Security Suite agents
 */
export function initializeSecurityAgents(): void {
  // Security Suite agents (170-177 from AGENT_REGISTRY)
  const securityAgents: Array<Omit<RegisteredAgent, 'incidents_reported' | 'actions_taken' | 'last_activity'>> = [
    {
      id: 'watchdog',
      name: 'Threat Watchdog',
      category: 'security',
      description: 'Continuous threat monitoring and detection',
      capabilities: ['threat_detection', 'anomaly_detection', 'real_time_monitoring'],
      status: 'active',
    },
    {
      id: 'hunter',
      name: 'Threat Hunter',
      category: 'security',
      description: 'Proactive threat hunting and investigation',
      capabilities: ['threat_hunting', 'ioc_analysis', 'forensics'],
      status: 'active',
    },
    {
      id: 'guardian',
      name: 'System Guardian',
      category: 'security',
      description: 'System protection and automated response',
      capabilities: ['auto_response', 'containment', 'isolation'],
      status: 'active',
    },
    {
      id: 'incident-response',
      name: 'Incident Response',
      category: 'security',
      description: 'Incident coordination and management',
      capabilities: ['incident_management', 'escalation', 'notification'],
      status: 'active',
    },
    {
      id: 'compliance-monitor',
      name: 'Compliance Monitor',
      category: 'security',
      description: 'Continuous compliance monitoring',
      capabilities: ['compliance_check', 'audit_logging', 'policy_enforcement'],
      status: 'active',
    },
    {
      id: 'vulnerability-scanner',
      name: 'Vulnerability Scanner',
      category: 'security',
      description: 'Automated vulnerability scanning and assessment',
      capabilities: ['vuln_scan', 'risk_assessment', 'patch_verification'],
      status: 'active',
    },
    {
      id: 'network-sentinel',
      name: 'Network Sentinel',
      category: 'infrastructure',
      description: 'Network traffic analysis and protection',
      capabilities: ['traffic_analysis', 'intrusion_detection', 'network_monitoring'],
      status: 'active',
    },
    {
      id: 'log-analyzer',
      name: 'Log Analyzer',
      category: 'data',
      description: 'Log correlation and analysis',
      capabilities: ['log_analysis', 'correlation', 'pattern_detection'],
      status: 'active',
    },
  ];
  
  securityAgents.forEach(agent => registerAgent(agent));
  console.log(`[AgentReporter] Initialized ${securityAgents.length} security agents`);
}

// Export types
export type { RegisteredAgent };
