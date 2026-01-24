/**
 * Security Suite Agent Adapters
 * 
 * Adapters for Security Suite agents (170-177 from AGENT_REGISTRY)
 * that integrate with the incident management system.
 * 
 * Agents:
 * - Watchdog: Continuous threat monitoring
 * - Hunter: Proactive threat hunting
 * - Guardian: Automated response
 * - Incident Response: Incident coordination
 * - Compliance Monitor: Compliance checking
 * - Vulnerability Scanner: Vuln scanning
 * - Network Sentinel: Network analysis
 * - Log Analyzer: Log correlation
 * 
 * @version 1.0.0
 * @date January 24, 2026
 */

import { 
  reportIncident, 
  logAction, 
  escalateIncident,
  resolveIncident,
  registerAgent,
  type AgentIncidentReport,
  type AgentAction,
} from '../agent-incident-reporter';
import { announceIncident } from '../voice-alerts';

// ═══════════════════════════════════════════════════════════════
// BASE AGENT ADAPTER
// ═══════════════════════════════════════════════════════════════

export interface SecurityAgentConfig {
  id: string;
  name: string;
  category: 'security' | 'infrastructure' | 'data';
  description: string;
  capabilities: string[];
  auto_remediate: boolean;
  notification_threshold: 'high' | 'critical';
}

export abstract class SecurityAgentAdapter {
  protected config: SecurityAgentConfig;
  protected isActive: boolean = false;
  protected lastActivity: Date = new Date();
  
  constructor(config: SecurityAgentConfig) {
    this.config = config;
  }
  
  /**
   * Initialize the agent
   */
  async initialize(): Promise<void> {
    registerAgent({
      id: this.config.id,
      name: this.config.name,
      category: this.config.category,
      description: this.config.description,
      capabilities: this.config.capabilities,
      status: 'active',
    });
    
    this.isActive = true;
    console.log(`[${this.config.name}] Agent initialized`);
  }
  
  /**
   * Report a detected incident
   */
  async reportDetection(params: {
    title: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: AgentIncidentReport['category'];
    affected_systems: string[];
    indicators: string[];
    source_data: Record<string, unknown>;
    auto_remediate?: boolean;
    remediation_steps?: string[];
  }): Promise<string> {
    this.lastActivity = new Date();
    
    const report: AgentIncidentReport = {
      agent_id: this.config.id,
      agent_name: this.config.name,
      agent_category: this.config.category,
      detected_at: new Date().toISOString(),
      severity: params.severity,
      category: params.category,
      title: params.title,
      description: params.description,
      affected_systems: params.affected_systems,
      potential_impact: this.assessImpact(params.severity, params.affected_systems),
      source_data: params.source_data,
      indicators: params.indicators,
      auto_remediate: params.auto_remediate ?? this.config.auto_remediate,
      remediation_steps: params.remediation_steps,
    };
    
    const result = await reportIncident(report);
    
    // Voice alert for high/critical
    if (params.severity === 'high' || params.severity === 'critical') {
      await announceIncident({
        incident_id: result.incident.id,
        title: params.title,
        description: params.description,
        severity: params.severity,
        reporter: this.config.name,
        timestamp: new Date().toISOString(),
      });
    }
    
    return result.incident.id;
  }
  
  /**
   * Log an action on an incident
   */
  async performAction(params: {
    incident_id: string;
    action_type: AgentAction['action_type'];
    description: string;
    result: 'success' | 'partial' | 'failed' | 'pending';
    data?: Record<string, unknown>;
  }): Promise<void> {
    this.lastActivity = new Date();
    
    await logAction({
      agent_id: this.config.id,
      agent_name: this.config.name,
      agent_category: this.config.category,
      incident_id: params.incident_id,
      action_type: params.action_type,
      description: params.description,
      result: params.result,
      data: params.data,
    });
  }
  
  /**
   * Escalate an incident
   */
  async escalate(
    incidentId: string, 
    reason: string, 
    newSeverity?: 'high' | 'critical'
  ): Promise<void> {
    this.lastActivity = new Date();
    await escalateIncident(incidentId, this.config.id, this.config.name, reason, newSeverity);
  }
  
  /**
   * Resolve an incident
   */
  async resolve(incidentId: string, resolution: string): Promise<void> {
    this.lastActivity = new Date();
    await resolveIncident(incidentId, this.config.id, this.config.name, resolution);
  }
  
  /**
   * Assess potential impact based on severity and systems
   */
  protected assessImpact(severity: string, systems: string[]): string {
    const severityImpact: Record<string, string> = {
      critical: 'Severe - Immediate action required',
      high: 'Significant - Prompt response needed',
      medium: 'Moderate - Investigation recommended',
      low: 'Minor - Routine handling',
    };
    
    return `${severityImpact[severity] || 'Unknown'}. Affected: ${systems.join(', ') || 'Unknown systems'}`;
  }
  
  /**
   * Get agent status
   */
  getStatus(): { active: boolean; lastActivity: Date; config: SecurityAgentConfig } {
    return {
      active: this.isActive,
      lastActivity: this.lastActivity,
      config: this.config,
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// WATCHDOG AGENT
// ═══════════════════════════════════════════════════════════════

export class WatchdogAgent extends SecurityAgentAdapter {
  constructor() {
    super({
      id: 'watchdog',
      name: 'Threat Watchdog',
      category: 'security',
      description: 'Continuous threat monitoring and detection',
      capabilities: ['threat_detection', 'anomaly_detection', 'real_time_monitoring'],
      auto_remediate: false,
      notification_threshold: 'high',
    });
  }
  
  /**
   * Monitor for threats
   */
  async monitorThreat(params: {
    source: string;
    threat_type: string;
    confidence: number;
    indicators: string[];
    raw_data: Record<string, unknown>;
  }): Promise<string | null> {
    // Only report if confidence is high enough
    if (params.confidence < 0.7) {
      console.log(`[Watchdog] Low confidence threat ignored: ${params.threat_type} (${params.confidence})`);
      return null;
    }
    
    const severity = this.calculateSeverity(params.confidence, params.threat_type);
    
    return this.reportDetection({
      title: `${params.threat_type} detected from ${params.source}`,
      description: `Threat Watchdog detected potential ${params.threat_type} activity. Confidence: ${(params.confidence * 100).toFixed(1)}%`,
      severity,
      category: this.mapThreatCategory(params.threat_type),
      affected_systems: [params.source],
      indicators: params.indicators,
      source_data: params.raw_data,
    });
  }
  
  private calculateSeverity(confidence: number, threatType: string): 'low' | 'medium' | 'high' | 'critical' {
    const criticalThreats = ['ransomware', 'apt', 'data_exfiltration'];
    const highThreats = ['malware', 'intrusion', 'unauthorized_access'];
    
    if (criticalThreats.includes(threatType.toLowerCase())) {
      return confidence > 0.9 ? 'critical' : 'high';
    }
    if (highThreats.includes(threatType.toLowerCase())) {
      return confidence > 0.85 ? 'high' : 'medium';
    }
    return confidence > 0.8 ? 'medium' : 'low';
  }
  
  private mapThreatCategory(threatType: string): AgentIncidentReport['category'] {
    const mapping: Record<string, AgentIncidentReport['category']> = {
      malware: 'malware',
      ransomware: 'malware',
      intrusion: 'intrusion',
      unauthorized_access: 'unauthorized_access',
      data_exfiltration: 'data_breach',
      ddos: 'denial_of_service',
      anomaly: 'anomaly',
    };
    return mapping[threatType.toLowerCase()] || 'other';
  }
}

// ═══════════════════════════════════════════════════════════════
// HUNTER AGENT
// ═══════════════════════════════════════════════════════════════

export class HunterAgent extends SecurityAgentAdapter {
  constructor() {
    super({
      id: 'hunter',
      name: 'Threat Hunter',
      category: 'security',
      description: 'Proactive threat hunting and investigation',
      capabilities: ['threat_hunting', 'ioc_analysis', 'forensics'],
      auto_remediate: false,
      notification_threshold: 'high',
    });
  }
  
  /**
   * Hunt for threats based on IOCs
   */
  async huntThreat(params: {
    hunt_type: 'ioc' | 'behavior' | 'lateral_movement' | 'persistence';
    target: string;
    findings: Array<{ indicator: string; context: string; risk: number }>;
    raw_data: Record<string, unknown>;
  }): Promise<string | null> {
    if (params.findings.length === 0) {
      console.log(`[Hunter] No findings for ${params.hunt_type} hunt on ${params.target}`);
      return null;
    }
    
    const maxRisk = Math.max(...params.findings.map(f => f.risk));
    const severity = maxRisk > 0.8 ? 'critical' : maxRisk > 0.6 ? 'high' : maxRisk > 0.4 ? 'medium' : 'low';
    
    return this.reportDetection({
      title: `Threat Hunt: ${params.hunt_type} detected on ${params.target}`,
      description: `Proactive threat hunt discovered ${params.findings.length} suspicious indicators. Highest risk: ${(maxRisk * 100).toFixed(0)}%`,
      severity,
      category: 'intrusion',
      affected_systems: [params.target],
      indicators: params.findings.map(f => f.indicator),
      source_data: { ...params.raw_data, findings: params.findings },
    });
  }
  
  /**
   * Investigate an existing incident
   */
  async investigateIncident(incidentId: string, findings: {
    scope_expanded: boolean;
    additional_systems: string[];
    timeline: Array<{ time: string; event: string }>;
    root_cause?: string;
  }): Promise<void> {
    await this.performAction({
      incident_id: incidentId,
      action_type: 'investigated',
      description: `Investigation complete. ${findings.scope_expanded ? 'Scope expanded to include additional systems.' : 'Scope confirmed.'} ${findings.root_cause ? `Root cause: ${findings.root_cause}` : ''}`,
      result: findings.root_cause ? 'success' : 'partial',
      data: findings,
    });
    
    // Escalate if scope expanded
    if (findings.scope_expanded && findings.additional_systems.length > 0) {
      await this.escalate(
        incidentId,
        `Investigation revealed ${findings.additional_systems.length} additional affected systems`,
        'high'
      );
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// GUARDIAN AGENT
// ═══════════════════════════════════════════════════════════════

export class GuardianAgent extends SecurityAgentAdapter {
  constructor() {
    super({
      id: 'guardian',
      name: 'System Guardian',
      category: 'security',
      description: 'System protection and automated response',
      capabilities: ['auto_response', 'containment', 'isolation'],
      auto_remediate: true,
      notification_threshold: 'high',
    });
  }
  
  /**
   * Contain a threat
   */
  async containThreat(incidentId: string, params: {
    target: string;
    action: 'isolate' | 'block' | 'quarantine' | 'kill_process';
    success: boolean;
    details: string;
  }): Promise<void> {
    await this.performAction({
      incident_id: incidentId,
      action_type: 'fixed',
      description: `Containment action: ${params.action} on ${params.target}. ${params.details}`,
      result: params.success ? 'success' : 'failed',
      data: params,
    });
    
    if (!params.success) {
      await this.escalate(incidentId, `Containment action failed: ${params.action}`, 'critical');
    }
  }
  
  /**
   * Auto-respond to detected threat
   */
  async autoRespond(params: {
    threat_type: string;
    target: string;
    actions_taken: Array<{ action: string; result: 'success' | 'failed' }>;
    source_data: Record<string, unknown>;
  }): Promise<string> {
    const allSuccess = params.actions_taken.every(a => a.result === 'success');
    
    const incidentId = await this.reportDetection({
      title: `Auto-response: ${params.threat_type} on ${params.target}`,
      description: `Guardian automatically responded to ${params.threat_type}. Actions taken: ${params.actions_taken.map(a => a.action).join(', ')}`,
      severity: 'high',
      category: this.mapThreatToCategory(params.threat_type),
      affected_systems: [params.target],
      indicators: [],
      source_data: params.source_data,
      auto_remediate: true,
      remediation_steps: params.actions_taken.map(a => a.action),
    });
    
    // Log each action
    for (const action of params.actions_taken) {
      await this.performAction({
        incident_id: incidentId,
        action_type: 'fixed',
        description: `Auto-response action: ${action.action}`,
        result: action.result,
        data: { threat_type: params.threat_type },
      });
    }
    
    if (allSuccess) {
      await this.resolve(incidentId, 'Threat contained and remediated automatically by System Guardian');
    }
    
    return incidentId;
  }
  
  private mapThreatToCategory(threatType: string): AgentIncidentReport['category'] {
    const mapping: Record<string, AgentIncidentReport['category']> = {
      malware: 'malware',
      intrusion: 'intrusion',
      dos: 'denial_of_service',
      policy: 'policy_violation',
    };
    return mapping[threatType.toLowerCase()] || 'other';
  }
}

// ═══════════════════════════════════════════════════════════════
// INCIDENT RESPONSE AGENT
// ═══════════════════════════════════════════════════════════════

export class IncidentResponseAgent extends SecurityAgentAdapter {
  constructor() {
    super({
      id: 'incident-response',
      name: 'Incident Response',
      category: 'security',
      description: 'Incident coordination and management',
      capabilities: ['incident_management', 'escalation', 'notification'],
      auto_remediate: false,
      notification_threshold: 'high',
    });
  }
  
  /**
   * Coordinate incident response
   */
  async coordinateResponse(incidentId: string, params: {
    phase: 'identification' | 'containment' | 'eradication' | 'recovery' | 'lessons_learned';
    actions: string[];
    next_steps: string[];
    stakeholders_notified: string[];
  }): Promise<void> {
    await this.performAction({
      incident_id: incidentId,
      action_type: 'investigated',
      description: `Incident response phase: ${params.phase}. Actions: ${params.actions.join(', ')}`,
      result: 'success',
      data: params,
    });
    
    // Notify stakeholders for critical phases
    if (['containment', 'eradication'].includes(params.phase)) {
      await this.performAction({
        incident_id: incidentId,
        action_type: 'notified',
        description: `Stakeholders notified: ${params.stakeholders_notified.join(', ')}`,
        result: 'success',
        data: { stakeholders: params.stakeholders_notified },
      });
    }
  }
  
  /**
   * Create post-incident report
   */
  async createPostIncidentReport(incidentId: string, report: {
    summary: string;
    timeline: Array<{ time: string; event: string }>;
    root_cause: string;
    impact: string;
    lessons_learned: string[];
    recommendations: string[];
  }): Promise<void> {
    await this.performAction({
      incident_id: incidentId,
      action_type: 'logged',
      description: `Post-incident report created. Root cause: ${report.root_cause}`,
      result: 'success',
      data: report,
    });
    
    await this.resolve(incidentId, `Incident closed after post-incident review. Summary: ${report.summary}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// AGENT FACTORY
// ═══════════════════════════════════════════════════════════════

export const securityAgents = {
  watchdog: new WatchdogAgent(),
  hunter: new HunterAgent(),
  guardian: new GuardianAgent(),
  incidentResponse: new IncidentResponseAgent(),
};

/**
 * Initialize all security agents
 */
export async function initializeSecurityAgents(): Promise<void> {
  await Promise.all([
    securityAgents.watchdog.initialize(),
    securityAgents.hunter.initialize(),
    securityAgents.guardian.initialize(),
    securityAgents.incidentResponse.initialize(),
  ]);
  
  console.log('[SecurityAgents] All security suite agents initialized');
}

/**
 * Get agent by ID
 */
export function getSecurityAgent(id: string): SecurityAgentAdapter | undefined {
  const agents: Record<string, SecurityAgentAdapter> = {
    watchdog: securityAgents.watchdog,
    hunter: securityAgents.hunter,
    guardian: securityAgents.guardian,
    'incident-response': securityAgents.incidentResponse,
  };
  return agents[id];
}

/**
 * Get all agent statuses
 */
export function getAllAgentStatuses(): Array<ReturnType<SecurityAgentAdapter['getStatus']>> {
  return [
    securityAgents.watchdog.getStatus(),
    securityAgents.hunter.getStatus(),
    securityAgents.guardian.getStatus(),
    securityAgents.incidentResponse.getStatus(),
  ];
}
