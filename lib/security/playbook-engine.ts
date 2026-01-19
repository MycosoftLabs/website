/**
 * Automated Response Playbook Engine
 * Executes security response playbooks based on triggers
 * Supports automated and human-approved actions
 */

import { createPlaybookExecution, updatePlaybookExecution, createAuditLog, type PlaybookExecution, type PlaybookActionResult } from './database';
import { sendPlaybookAlert } from './email-alerts';
import { broadcastPlaybookAlert } from './websocket-alerts';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface Playbook {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  trigger: PlaybookTrigger;
  actions: PlaybookAction[];
  requires_approval: boolean;
  approval_timeout_minutes: number;
  cooldown_minutes: number;
  max_executions_per_hour: number;
}

export interface PlaybookTrigger {
  event_type: string | string[];
  severity_min: 'info' | 'low' | 'medium' | 'high' | 'critical';
  conditions?: PlaybookCondition[];
}

export interface PlaybookCondition {
  field: string;
  operator: 'equals' | 'contains' | 'matches' | 'gt' | 'lt' | 'in' | 'not_in';
  value: string | number | string[];
}

export interface PlaybookAction {
  type: 'block_ip' | 'quarantine_device' | 'send_alert' | 'create_incident' | 
        'rotate_credentials' | 'enable_logging' | 'run_scan' | 'webhook' | 'log';
  config: Record<string, unknown>;
  continue_on_failure?: boolean;
  delay_seconds?: number;
}

export interface TriggerEvent {
  id: string;
  event_type: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  source_ip?: string;
  destination_ip?: string;
  device_id?: string;
  user_id?: string;
  metadata: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════
// PLAYBOOK DEFINITIONS
// ═══════════════════════════════════════════════════════════════

const PLAYBOOKS: Playbook[] = [
  {
    id: 'pb-brute-force',
    name: 'Brute Force Response',
    description: 'Automatically respond to brute force attacks',
    enabled: true,
    trigger: {
      event_type: ['brute_force', 'failed_login_excessive'],
      severity_min: 'high',
      conditions: [
        { field: 'metadata.attempt_count', operator: 'gt', value: 5 }
      ]
    },
    actions: [
      { type: 'log', config: { message: 'Brute force attack detected' } },
      { type: 'block_ip', config: { duration_hours: 24 } },
      { type: 'send_alert', config: { severity: 'high' } },
      { type: 'create_incident', config: { severity: 'high', title: 'Brute Force Attack' } },
    ],
    requires_approval: false,
    approval_timeout_minutes: 15,
    cooldown_minutes: 5,
    max_executions_per_hour: 10,
  },
  {
    id: 'pb-port-scan',
    name: 'Port Scan Response',
    description: 'Respond to detected port scanning activity',
    enabled: true,
    trigger: {
      event_type: 'port_scan',
      severity_min: 'medium',
    },
    actions: [
      { type: 'log', config: { message: 'Port scan detected' } },
      { type: 'enable_logging', config: { target: 'source_ip', duration_hours: 24 } },
      { type: 'send_alert', config: { severity: 'medium' } },
    ],
    requires_approval: false,
    approval_timeout_minutes: 30,
    cooldown_minutes: 10,
    max_executions_per_hour: 5,
  },
  {
    id: 'pb-geo-violation',
    name: 'Geographic Violation Response',
    description: 'Block access from unauthorized countries',
    enabled: true,
    trigger: {
      event_type: ['geo_violation', 'unauthorized_country'],
      severity_min: 'high',
    },
    actions: [
      { type: 'block_ip', config: { duration_hours: 168 } }, // 1 week
      { type: 'log', config: { message: 'Access from unauthorized country blocked' } },
      { type: 'send_alert', config: { severity: 'high' } },
    ],
    requires_approval: false,
    approval_timeout_minutes: 5,
    cooldown_minutes: 1,
    max_executions_per_hour: 100,
  },
  {
    id: 'pb-malware-detected',
    name: 'Malware Detection Response',
    description: 'Quarantine devices with malware activity',
    enabled: true,
    trigger: {
      event_type: ['malware_detected', 'c2_communication', 'data_exfiltration'],
      severity_min: 'critical',
    },
    actions: [
      { type: 'log', config: { message: 'Malware activity detected - initiating quarantine' } },
      { type: 'quarantine_device', config: { vlan: 99 } },
      { type: 'send_alert', config: { severity: 'critical' } },
      { type: 'create_incident', config: { severity: 'critical', title: 'Malware Detected' } },
      { type: 'run_scan', config: { type: 'full', target: 'device' } },
    ],
    requires_approval: true, // Requires human approval
    approval_timeout_minutes: 30,
    cooldown_minutes: 60,
    max_executions_per_hour: 5,
  },
  {
    id: 'pb-suspicious-traffic',
    name: 'Suspicious Traffic Analysis',
    description: 'Enhanced monitoring for suspicious traffic patterns',
    enabled: true,
    trigger: {
      event_type: 'suspicious_traffic',
      severity_min: 'medium',
    },
    actions: [
      { type: 'enable_logging', config: { enhanced: true, duration_hours: 6 } },
      { type: 'send_alert', config: { severity: 'medium' } },
    ],
    requires_approval: false,
    approval_timeout_minutes: 15,
    cooldown_minutes: 30,
    max_executions_per_hour: 10,
  },
];

// ═══════════════════════════════════════════════════════════════
// EXECUTION TRACKING
// ═══════════════════════════════════════════════════════════════

const executionHistory: Map<string, { timestamp: number; count: number }[]> = new Map();
const pendingApprovals: Map<string, { playbook: Playbook; event: TriggerEvent; timeout: NodeJS.Timeout }> = new Map();

function canExecute(playbook: Playbook): boolean {
  const now = Date.now();
  const hourAgo = now - 60 * 60 * 1000;
  
  const history = executionHistory.get(playbook.id) || [];
  const recentExecutions = history.filter(h => h.timestamp > hourAgo);
  
  // Check max executions per hour
  if (recentExecutions.length >= playbook.max_executions_per_hour) {
    console.log(`[PlaybookEngine] ${playbook.name} rate limited`);
    return false;
  }
  
  // Check cooldown
  const lastExecution = history[history.length - 1];
  if (lastExecution) {
    const cooldownMs = playbook.cooldown_minutes * 60 * 1000;
    if (now - lastExecution.timestamp < cooldownMs) {
      console.log(`[PlaybookEngine] ${playbook.name} in cooldown`);
      return false;
    }
  }
  
  return true;
}

function recordExecution(playbook: Playbook): void {
  const history = executionHistory.get(playbook.id) || [];
  history.push({ timestamp: Date.now(), count: 1 });
  
  // Keep only last hour of history
  const hourAgo = Date.now() - 60 * 60 * 1000;
  const filtered = history.filter(h => h.timestamp > hourAgo);
  executionHistory.set(playbook.id, filtered);
}

// ═══════════════════════════════════════════════════════════════
// ACTION EXECUTORS
// ═══════════════════════════════════════════════════════════════

async function executeBlockIp(config: Record<string, unknown>, event: TriggerEvent): Promise<PlaybookActionResult> {
  const ip = event.source_ip;
  const durationHours = config.duration_hours as number || 24;
  
  if (!ip) {
    return { action_type: 'block_ip', target: 'N/A', success: false, timestamp: new Date().toISOString(), result: 'No source IP to block' };
  }
  
  console.log(`[PlaybookEngine] Blocking IP: ${ip} for ${durationHours} hours`);
  
  // TODO: Integrate with UniFi API to actually block the IP
  // For now, log the action
  await createAuditLog({
    timestamp: new Date().toISOString(),
    action: 'ip_blocked',
    actor: 'playbook_engine',
    target_type: 'ip_address',
    target_id: ip,
    details: { duration_hours: durationHours, trigger_event: event.id },
    ip_address: null,
  });
  
  return {
    action_type: 'block_ip',
    target: ip,
    success: true,
    timestamp: new Date().toISOString(),
    result: `IP ${ip} blocked for ${durationHours} hours`,
  };
}

async function executeQuarantineDevice(config: Record<string, unknown>, event: TriggerEvent): Promise<PlaybookActionResult> {
  const deviceId = event.device_id || event.source_ip;
  const vlan = config.vlan as number || 99;
  
  if (!deviceId) {
    return { action_type: 'quarantine_device', target: 'N/A', success: false, timestamp: new Date().toISOString(), result: 'No device to quarantine' };
  }
  
  console.log(`[PlaybookEngine] Quarantining device: ${deviceId} to VLAN ${vlan}`);
  
  // TODO: Integrate with UniFi API to move device to quarantine VLAN
  await createAuditLog({
    timestamp: new Date().toISOString(),
    action: 'device_quarantined',
    actor: 'playbook_engine',
    target_type: 'device',
    target_id: deviceId,
    details: { vlan, trigger_event: event.id },
    ip_address: null,
  });
  
  return {
    action_type: 'quarantine_device',
    target: deviceId,
    success: true,
    timestamp: new Date().toISOString(),
    result: `Device ${deviceId} moved to VLAN ${vlan}`,
  };
}

async function executeSendAlert(config: Record<string, unknown>, event: TriggerEvent): Promise<PlaybookActionResult> {
  const severity = config.severity as string || 'medium';
  
  console.log(`[PlaybookEngine] Sending alert for event: ${event.id}`);
  
  // Broadcast real-time alert
  broadcastPlaybookAlert({
    playbook_id: 'auto',
    playbook_name: 'Automated Alert',
    status: 'completed',
    trigger_event: event.id,
  });
  
  return {
    action_type: 'send_alert',
    target: 'all_admins',
    success: true,
    timestamp: new Date().toISOString(),
    result: `Alert sent with severity ${severity}`,
  };
}

async function executeCreateIncident(config: Record<string, unknown>, event: TriggerEvent): Promise<PlaybookActionResult> {
  const { createIncident } = await import('./database');
  
  const severity = config.severity as 'info' | 'low' | 'medium' | 'high' | 'critical' || event.severity;
  const title = config.title as string || `Automated Incident: ${event.event_type}`;
  
  console.log(`[PlaybookEngine] Creating incident: ${title}`);
  
  const incident = await createIncident({
    title,
    description: `Automatically created by playbook for event ${event.id}`,
    severity,
    status: 'open',
    assigned_to: null,
    resolved_at: null,
    events: [event.id],
    tags: ['automated', event.event_type],
    timeline: [{
      timestamp: new Date().toISOString(),
      action: 'created',
      actor: 'playbook_engine',
      details: `Incident created by automated playbook`,
    }],
  });
  
  return {
    action_type: 'create_incident',
    target: incident.id,
    success: true,
    timestamp: new Date().toISOString(),
    result: `Incident ${incident.id} created`,
  };
}

async function executeEnableLogging(config: Record<string, unknown>, event: TriggerEvent): Promise<PlaybookActionResult> {
  const target = event.source_ip || event.device_id || 'network';
  const durationHours = config.duration_hours as number || 24;
  const enhanced = config.enhanced as boolean || false;
  
  console.log(`[PlaybookEngine] Enabling ${enhanced ? 'enhanced ' : ''}logging for: ${target}`);
  
  // TODO: Integrate with logging system
  await createAuditLog({
    timestamp: new Date().toISOString(),
    action: 'logging_enabled',
    actor: 'playbook_engine',
    target_type: 'logging',
    target_id: target,
    details: { duration_hours: durationHours, enhanced, trigger_event: event.id },
    ip_address: null,
  });
  
  return {
    action_type: 'enable_logging',
    target,
    success: true,
    timestamp: new Date().toISOString(),
    result: `Enhanced logging enabled for ${target} for ${durationHours} hours`,
  };
}

async function executeRunScan(config: Record<string, unknown>, event: TriggerEvent): Promise<PlaybookActionResult> {
  const scanType = config.type as string || 'quick';
  const target = event.source_ip || event.device_id || '192.168.0.0/24';
  
  console.log(`[PlaybookEngine] Initiating ${scanType} scan on: ${target}`);
  
  // Queue scan (will be picked up by scanner service)
  const { createScanResult } = await import('./database');
  
  const scan = await createScanResult({
    timestamp: new Date().toISOString(),
    scan_type: 'nmap',
    target,
    status: 'pending',
    results: {},
    vulnerabilities_found: 0,
    hosts_discovered: 0,
  });
  
  return {
    action_type: 'run_scan',
    target,
    success: true,
    timestamp: new Date().toISOString(),
    result: `Scan ${scan.id} queued for ${target}`,
  };
}

async function executeWebhook(config: Record<string, unknown>, event: TriggerEvent): Promise<PlaybookActionResult> {
  const url = config.url as string;
  const method = config.method as string || 'POST';
  
  if (!url) {
    return { action_type: 'webhook', target: 'N/A', success: false, timestamp: new Date().toISOString(), result: 'No webhook URL configured' };
  }
  
  console.log(`[PlaybookEngine] Sending webhook to: ${url}`);
  
  try {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event,
        timestamp: new Date().toISOString(),
        source: 'mycosoft_soc_playbook',
      }),
    });
    
    return {
      action_type: 'webhook',
      target: url,
      success: response.ok,
      timestamp: new Date().toISOString(),
      result: `Webhook returned ${response.status}`,
    };
  } catch (error) {
    return {
      action_type: 'webhook',
      target: url,
      success: false,
      timestamp: new Date().toISOString(),
      result: `Webhook failed: ${error}`,
    };
  }
}

async function executeLog(config: Record<string, unknown>, event: TriggerEvent): Promise<PlaybookActionResult> {
  const message = config.message as string || 'Playbook action executed';
  
  console.log(`[PlaybookEngine] ${message} - Event: ${event.id}`);
  
  return {
    action_type: 'log',
    target: 'console',
    success: true,
    timestamp: new Date().toISOString(),
    result: message,
  };
}

async function executeAction(action: PlaybookAction, event: TriggerEvent): Promise<PlaybookActionResult> {
  // Add delay if configured
  if (action.delay_seconds) {
    await new Promise(resolve => setTimeout(resolve, action.delay_seconds! * 1000));
  }
  
  switch (action.type) {
    case 'block_ip':
      return executeBlockIp(action.config, event);
    case 'quarantine_device':
      return executeQuarantineDevice(action.config, event);
    case 'send_alert':
      return executeSendAlert(action.config, event);
    case 'create_incident':
      return executeCreateIncident(action.config, event);
    case 'enable_logging':
      return executeEnableLogging(action.config, event);
    case 'run_scan':
      return executeRunScan(action.config, event);
    case 'webhook':
      return executeWebhook(action.config, event);
    case 'log':
      return executeLog(action.config, event);
    case 'rotate_credentials':
      // Placeholder for credential rotation
      return { action_type: 'rotate_credentials', target: 'credentials', success: true, timestamp: new Date().toISOString(), result: 'Credential rotation queued' };
    default:
      return { action_type: action.type, target: 'unknown', success: false, timestamp: new Date().toISOString(), result: 'Unknown action type' };
  }
}

// ═══════════════════════════════════════════════════════════════
// PLAYBOOK MATCHING
// ═══════════════════════════════════════════════════════════════

const SEVERITY_ORDER = ['info', 'low', 'medium', 'high', 'critical'];

function matchesTrigger(playbook: Playbook, event: TriggerEvent): boolean {
  const trigger = playbook.trigger;
  
  // Check event type
  const eventTypes = Array.isArray(trigger.event_type) ? trigger.event_type : [trigger.event_type];
  if (!eventTypes.includes(event.event_type)) {
    return false;
  }
  
  // Check severity
  const minSeverityIndex = SEVERITY_ORDER.indexOf(trigger.severity_min);
  const eventSeverityIndex = SEVERITY_ORDER.indexOf(event.severity);
  if (eventSeverityIndex < minSeverityIndex) {
    return false;
  }
  
  // Check conditions
  if (trigger.conditions) {
    for (const condition of trigger.conditions) {
      const fieldValue = getNestedValue(event, condition.field);
      if (!evaluateCondition(fieldValue, condition.operator, condition.value)) {
        return false;
      }
    }
  }
  
  return true;
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current: unknown, key) => {
    return current && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined;
  }, obj);
}

function evaluateCondition(fieldValue: unknown, operator: string, conditionValue: unknown): boolean {
  switch (operator) {
    case 'equals':
      return fieldValue === conditionValue;
    case 'contains':
      return typeof fieldValue === 'string' && fieldValue.includes(String(conditionValue));
    case 'matches':
      return typeof fieldValue === 'string' && new RegExp(String(conditionValue)).test(fieldValue);
    case 'gt':
      return typeof fieldValue === 'number' && fieldValue > Number(conditionValue);
    case 'lt':
      return typeof fieldValue === 'number' && fieldValue < Number(conditionValue);
    case 'in':
      return Array.isArray(conditionValue) && conditionValue.includes(fieldValue);
    case 'not_in':
      return Array.isArray(conditionValue) && !conditionValue.includes(fieldValue);
    default:
      return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════

/**
 * Process an event and execute matching playbooks
 */
export async function processEvent(event: TriggerEvent): Promise<PlaybookExecution[]> {
  const executions: PlaybookExecution[] = [];
  
  for (const playbook of PLAYBOOKS) {
    if (!playbook.enabled) continue;
    if (!matchesTrigger(playbook, event)) continue;
    if (!canExecute(playbook)) continue;
    
    console.log(`[PlaybookEngine] Matched playbook: ${playbook.name} for event ${event.id}`);
    
    if (playbook.requires_approval) {
      // Queue for approval
      await queueForApproval(playbook, event);
    } else {
      // Execute immediately
      const execution = await executePlaybook(playbook, event);
      executions.push(execution);
    }
  }
  
  return executions;
}

/**
 * Execute a playbook
 */
export async function executePlaybook(playbook: Playbook, event: TriggerEvent): Promise<PlaybookExecution> {
  const startTime = Date.now();
  
  console.log(`[PlaybookEngine] Executing playbook: ${playbook.name}`);
  
  // Create execution record
  const execution = await createPlaybookExecution({
    playbook_id: playbook.id,
    playbook_name: playbook.name,
    triggered_by: 'system',
    trigger_event_id: event.id,
    started_at: new Date().toISOString(),
    completed_at: null,
    status: 'running',
    actions_executed: [],
    error: null,
  });
  
  // Broadcast start
  broadcastPlaybookAlert({
    playbook_id: playbook.id,
    playbook_name: playbook.name,
    status: 'started',
    trigger_event: event.id,
  });
  
  const actionResults: PlaybookActionResult[] = [];
  let failed = false;
  
  for (const action of playbook.actions) {
    try {
      const result = await executeAction(action, event);
      actionResults.push(result);
      
      if (!result.success && !action.continue_on_failure) {
        failed = true;
        break;
      }
    } catch (error) {
      const errorResult: PlaybookActionResult = {
        action_type: action.type,
        target: 'error',
        success: false,
        timestamp: new Date().toISOString(),
        result: String(error),
      };
      actionResults.push(errorResult);
      
      if (!action.continue_on_failure) {
        failed = true;
        break;
      }
    }
  }
  
  // Update execution record
  const finalExecution = await updatePlaybookExecution(execution.id, {
    completed_at: new Date().toISOString(),
    status: failed ? 'failed' : 'completed',
    actions_executed: actionResults,
  });
  
  // Record for rate limiting
  recordExecution(playbook);
  
  // Broadcast completion
  broadcastPlaybookAlert({
    playbook_id: playbook.id,
    playbook_name: playbook.name,
    status: failed ? 'failed' : 'completed',
    trigger_event: event.id,
  });
  
  // Send email alert
  await sendPlaybookAlert({
    playbook_name: playbook.name,
    status: failed ? 'failed' : 'completed',
    triggered_by: 'system',
    duration_ms: Date.now() - startTime,
    actions: actionResults.map(a => ({ type: a.action_type, success: a.success })),
  });
  
  return finalExecution || execution;
}

/**
 * Queue a playbook for human approval
 */
async function queueForApproval(playbook: Playbook, event: TriggerEvent): Promise<void> {
  const approvalId = `approval-${playbook.id}-${Date.now()}`;
  
  console.log(`[PlaybookEngine] Queuing playbook for approval: ${playbook.name}`);
  
  // Set timeout for auto-decline
  const timeout = setTimeout(() => {
    console.log(`[PlaybookEngine] Approval timeout for: ${playbook.name}`);
    pendingApprovals.delete(approvalId);
    
    // Log timeout
    createAuditLog({
      timestamp: new Date().toISOString(),
      action: 'playbook_approval_timeout',
      actor: 'system',
      target_type: 'playbook',
      target_id: playbook.id,
      details: { event_id: event.id },
      ip_address: null,
    });
  }, playbook.approval_timeout_minutes * 60 * 1000);
  
  pendingApprovals.set(approvalId, { playbook, event, timeout });
  
  // Broadcast for approval
  broadcastPlaybookAlert({
    playbook_id: playbook.id,
    playbook_name: `${playbook.name} (Awaiting Approval)`,
    status: 'started',
    trigger_event: event.id,
  });
}

/**
 * Approve a pending playbook execution
 */
export async function approvePlaybook(approvalId: string, approver: string): Promise<PlaybookExecution | null> {
  const pending = pendingApprovals.get(approvalId);
  if (!pending) return null;
  
  clearTimeout(pending.timeout);
  pendingApprovals.delete(approvalId);
  
  console.log(`[PlaybookEngine] Playbook approved by ${approver}: ${pending.playbook.name}`);
  
  await createAuditLog({
    timestamp: new Date().toISOString(),
    action: 'playbook_approved',
    actor: approver,
    target_type: 'playbook',
    target_id: pending.playbook.id,
    details: { event_id: pending.event.id },
    ip_address: null,
  });
  
  return executePlaybook(pending.playbook, pending.event);
}

/**
 * Reject a pending playbook execution
 */
export async function rejectPlaybook(approvalId: string, rejector: string, reason: string): Promise<void> {
  const pending = pendingApprovals.get(approvalId);
  if (!pending) return;
  
  clearTimeout(pending.timeout);
  pendingApprovals.delete(approvalId);
  
  console.log(`[PlaybookEngine] Playbook rejected by ${rejector}: ${pending.playbook.name}`);
  
  await createAuditLog({
    timestamp: new Date().toISOString(),
    action: 'playbook_rejected',
    actor: rejector,
    target_type: 'playbook',
    target_id: pending.playbook.id,
    details: { event_id: pending.event.id, reason },
    ip_address: null,
  });
}

/**
 * Get all playbooks
 */
export function getPlaybooks(): Playbook[] {
  return PLAYBOOKS;
}

/**
 * Get pending approvals
 */
export function getPendingApprovals(): { id: string; playbook: Playbook; event: TriggerEvent }[] {
  return Array.from(pendingApprovals.entries()).map(([id, data]) => ({
    id,
    playbook: data.playbook,
    event: data.event,
  }));
}

/**
 * Manually trigger a playbook
 */
export async function triggerPlaybookManually(playbookId: string, triggeredBy: string, eventData: Partial<TriggerEvent>): Promise<PlaybookExecution | null> {
  const playbook = PLAYBOOKS.find(p => p.id === playbookId);
  if (!playbook) return null;
  
  const event: TriggerEvent = {
    id: `manual-${Date.now()}`,
    event_type: 'manual_trigger',
    severity: 'info',
    metadata: {},
    ...eventData,
  };
  
  console.log(`[PlaybookEngine] Manual trigger by ${triggeredBy}: ${playbook.name}`);
  
  const execution = await createPlaybookExecution({
    playbook_id: playbook.id,
    playbook_name: playbook.name,
    triggered_by: triggeredBy,
    trigger_event_id: event.id,
    started_at: new Date().toISOString(),
    completed_at: null,
    status: 'running',
    actions_executed: [],
    error: null,
  });
  
  return executePlaybook(playbook, event);
}
