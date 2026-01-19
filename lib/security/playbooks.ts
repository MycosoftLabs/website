/**
 * Mycosoft Security Playbooks
 * 
 * Automated response playbooks for security incidents.
 * Each playbook defines conditions, actions, and escalation procedures.
 */

import type { ThreatLevel, ThreatType, IPReputation } from './threat-intel';

export type PlaybookAction = 
  | 'block_ip'
  | 'unblock_ip'
  | 'quarantine_device'
  | 'alert_dashboard'
  | 'send_email'
  | 'log_event'
  | 'rate_limit'
  | 'geo_block'
  | 'escalate'
  | 'snapshot_vm'
  | 'restart_service'
  | 'rotate_credentials';

export type PlaybookTrigger =
  | 'brute_force'
  | 'port_scan'
  | 'data_exfil'
  | 'geo_violation'
  | 'malware_detected'
  | 'ids_alert'
  | 'unauthorized_access'
  | 'new_device'
  | 'tor_access'
  | 'high_risk_country';

export interface PlaybookCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in';
  value: string | number | string[];
}

export interface PlaybookStep {
  action: PlaybookAction;
  params: Record<string, unknown>;
  continueOnFailure?: boolean;
  delay?: number; // milliseconds
}

export interface Playbook {
  id: string;
  name: string;
  description: string;
  trigger: PlaybookTrigger;
  enabled: boolean;
  priority: number; // Lower is higher priority
  conditions: PlaybookCondition[];
  steps: PlaybookStep[];
  cooldown: number; // seconds before can trigger again for same target
  maxExecutionsPerHour: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlaybookExecution {
  id: string;
  playbookId: string;
  playbookName: string;
  trigger: PlaybookTrigger;
  targetIp?: string;
  targetDevice?: string;
  startedAt: string;
  completedAt?: string;
  status: 'running' | 'completed' | 'failed' | 'aborted';
  stepsCompleted: number;
  totalSteps: number;
  results: PlaybookStepResult[];
  error?: string;
}

export interface PlaybookStepResult {
  step: number;
  action: PlaybookAction;
  status: 'success' | 'failed' | 'skipped';
  message: string;
  executedAt: string;
  duration: number;
}

// Built-in playbooks
export const BUILTIN_PLAYBOOKS: Playbook[] = [
  {
    id: 'pb-brute-force-001',
    name: 'Brute Force Response',
    description: 'Automatically blocks IPs after multiple failed login attempts',
    trigger: 'brute_force',
    enabled: true,
    priority: 1,
    conditions: [
      { field: 'failed_attempts', operator: 'greater_than', value: 5 },
      { field: 'time_window_minutes', operator: 'less_than', value: 5 },
    ],
    steps: [
      {
        action: 'log_event',
        params: { severity: 'high', message: 'Brute force attack detected' },
      },
      {
        action: 'block_ip',
        params: { duration_hours: 24, reason: 'brute_force_detected' },
      },
      {
        action: 'alert_dashboard',
        params: { severity: 'high', title: 'Brute Force Attack Blocked' },
      },
      {
        action: 'send_email',
        params: { template: 'brute_force_alert' },
        continueOnFailure: true,
      },
    ],
    cooldown: 3600,
    maxExecutionsPerHour: 50,
    createdAt: '2026-01-18T00:00:00Z',
    updatedAt: '2026-01-18T00:00:00Z',
  },
  {
    id: 'pb-port-scan-001',
    name: 'Port Scan Response',
    description: 'Detects and blocks port scanning activity',
    trigger: 'port_scan',
    enabled: true,
    priority: 2,
    conditions: [
      { field: 'unique_ports', operator: 'greater_than', value: 20 },
      { field: 'time_window_minutes', operator: 'less_than', value: 1 },
    ],
    steps: [
      {
        action: 'log_event',
        params: { severity: 'high', message: 'Port scan detected' },
      },
      {
        action: 'rate_limit',
        params: { requests_per_minute: 10 },
      },
      {
        action: 'block_ip',
        params: { duration_hours: 12, reason: 'port_scan_detected' },
        delay: 5000,
      },
      {
        action: 'alert_dashboard',
        params: { severity: 'medium', title: 'Port Scan Blocked' },
      },
    ],
    cooldown: 1800,
    maxExecutionsPerHour: 100,
    createdAt: '2026-01-18T00:00:00Z',
    updatedAt: '2026-01-18T00:00:00Z',
  },
  {
    id: 'pb-geo-block-001',
    name: 'High-Risk Country Block',
    description: 'Blocks access from high-risk countries',
    trigger: 'high_risk_country',
    enabled: true,
    priority: 1,
    conditions: [
      { field: 'country_code', operator: 'in', value: ['CN', 'RU', 'KP', 'IR', 'BY'] },
    ],
    steps: [
      {
        action: 'log_event',
        params: { severity: 'critical', message: 'High-risk country access attempt' },
      },
      {
        action: 'geo_block',
        params: { permanent: true },
      },
      {
        action: 'alert_dashboard',
        params: { severity: 'critical', title: 'High-Risk Country Access Blocked' },
      },
    ],
    cooldown: 0,
    maxExecutionsPerHour: 1000,
    createdAt: '2026-01-18T00:00:00Z',
    updatedAt: '2026-01-18T00:00:00Z',
  },
  {
    id: 'pb-tor-access-001',
    name: 'Tor Exit Node Response',
    description: 'Monitors and optionally blocks Tor exit node access',
    trigger: 'tor_access',
    enabled: true,
    priority: 3,
    conditions: [
      { field: 'is_tor_exit', operator: 'equals', value: 'true' },
    ],
    steps: [
      {
        action: 'log_event',
        params: { severity: 'medium', message: 'Tor exit node access detected' },
      },
      {
        action: 'alert_dashboard',
        params: { severity: 'medium', title: 'Tor Access Detected' },
      },
      {
        action: 'rate_limit',
        params: { requests_per_minute: 20 },
      },
    ],
    cooldown: 300,
    maxExecutionsPerHour: 200,
    createdAt: '2026-01-18T00:00:00Z',
    updatedAt: '2026-01-18T00:00:00Z',
  },
  {
    id: 'pb-data-exfil-001',
    name: 'Data Exfiltration Response',
    description: 'Detects and responds to large outbound data transfers',
    trigger: 'data_exfil',
    enabled: true,
    priority: 1,
    conditions: [
      { field: 'outbound_bytes_per_hour', operator: 'greater_than', value: 524288000 }, // 500MB
    ],
    steps: [
      {
        action: 'log_event',
        params: { severity: 'critical', message: 'Potential data exfiltration detected' },
      },
      {
        action: 'alert_dashboard',
        params: { severity: 'critical', title: 'Data Exfiltration Alert' },
      },
      {
        action: 'send_email',
        params: { template: 'data_exfil_alert', priority: 'high' },
      },
      {
        action: 'rate_limit',
        params: { requests_per_minute: 5 },
      },
      {
        action: 'escalate',
        params: { to: 'security_admin' },
      },
    ],
    cooldown: 3600,
    maxExecutionsPerHour: 10,
    createdAt: '2026-01-18T00:00:00Z',
    updatedAt: '2026-01-18T00:00:00Z',
  },
  {
    id: 'pb-quarantine-001',
    name: 'Device Quarantine',
    description: 'Quarantines suspicious devices to isolated VLAN',
    trigger: 'malware_detected',
    enabled: true,
    priority: 1,
    conditions: [
      { field: 'threat_level', operator: 'in', value: ['high', 'critical'] },
    ],
    steps: [
      {
        action: 'log_event',
        params: { severity: 'critical', message: 'Malware detected - initiating quarantine' },
      },
      {
        action: 'quarantine_device',
        params: { vlan: 99, reason: 'malware_detected' },
      },
      {
        action: 'alert_dashboard',
        params: { severity: 'critical', title: 'Device Quarantined' },
      },
      {
        action: 'send_email',
        params: { template: 'quarantine_alert', priority: 'high' },
      },
      {
        action: 'snapshot_vm',
        params: { reason: 'pre_quarantine_snapshot' },
        continueOnFailure: true,
      },
    ],
    cooldown: 0,
    maxExecutionsPerHour: 20,
    createdAt: '2026-01-18T00:00:00Z',
    updatedAt: '2026-01-18T00:00:00Z',
  },
  {
    id: 'pb-ids-critical-001',
    name: 'IDS Critical Alert Response',
    description: 'Responds to critical IDS/IPS alerts from Suricata',
    trigger: 'ids_alert',
    enabled: true,
    priority: 1,
    conditions: [
      { field: 'severity', operator: 'equals', value: 1 }, // Suricata severity 1 = critical
    ],
    steps: [
      {
        action: 'log_event',
        params: { severity: 'critical', message: 'Critical IDS alert' },
      },
      {
        action: 'block_ip',
        params: { duration_hours: 48, reason: 'ids_critical_alert' },
      },
      {
        action: 'alert_dashboard',
        params: { severity: 'critical', title: 'Critical IDS Alert - IP Blocked' },
      },
      {
        action: 'send_email',
        params: { template: 'ids_critical_alert', priority: 'high' },
      },
      {
        action: 'escalate',
        params: { to: 'security_admin' },
      },
    ],
    cooldown: 0,
    maxExecutionsPerHour: 100,
    createdAt: '2026-01-18T00:00:00Z',
    updatedAt: '2026-01-18T00:00:00Z',
  },
];

// Playbook execution state
const executionHistory: PlaybookExecution[] = [];
const cooldownTracker = new Map<string, number>(); // playbook_id:target -> last_execution_time
const hourlyExecutionCounts = new Map<string, number>(); // playbook_id -> count

/**
 * Check if playbook can execute (respecting cooldown and rate limits)
 */
function canExecutePlaybook(playbook: Playbook, targetKey: string): boolean {
  if (!playbook.enabled) return false;

  // Check cooldown
  const cooldownKey = `${playbook.id}:${targetKey}`;
  const lastExecution = cooldownTracker.get(cooldownKey);
  if (lastExecution && Date.now() - lastExecution < playbook.cooldown * 1000) {
    return false;
  }

  // Check hourly rate limit
  const hourlyCount = hourlyExecutionCounts.get(playbook.id) || 0;
  if (hourlyCount >= playbook.maxExecutionsPerHour) {
    return false;
  }

  return true;
}

/**
 * Execute a single playbook step
 */
async function executeStep(
  step: PlaybookStep,
  context: Record<string, unknown>
): Promise<PlaybookStepResult> {
  const startTime = Date.now();
  
  try {
    // Apply delay if specified
    if (step.delay) {
      await new Promise(resolve => setTimeout(resolve, step.delay));
    }

    // Execute action based on type
    switch (step.action) {
      case 'block_ip':
        console.log(`[Playbook] Blocking IP: ${context.targetIp} for ${step.params.duration_hours}h`);
        // TODO: Call UniFi API to block IP
        break;

      case 'quarantine_device':
        console.log(`[Playbook] Quarantining device to VLAN ${step.params.vlan}`);
        // TODO: Call UniFi API to move device to quarantine VLAN
        break;

      case 'alert_dashboard':
        console.log(`[Playbook] Dashboard alert: ${step.params.title}`);
        // Alert will be pushed via WebSocket
        break;

      case 'send_email':
        console.log(`[Playbook] Sending email: ${step.params.template}`);
        // TODO: Call email service
        break;

      case 'log_event':
        console.log(`[Playbook] Event: ${step.params.message}`);
        break;

      case 'rate_limit':
        console.log(`[Playbook] Rate limiting to ${step.params.requests_per_minute}/min`);
        break;

      case 'geo_block':
        console.log(`[Playbook] Geo-blocking enabled`);
        break;

      case 'escalate':
        console.log(`[Playbook] Escalating to ${step.params.to}`);
        break;

      case 'snapshot_vm':
        console.log(`[Playbook] Creating VM snapshot: ${step.params.reason}`);
        // TODO: Call Proxmox API
        break;

      case 'restart_service':
        console.log(`[Playbook] Restarting service: ${step.params.service}`);
        break;

      case 'rotate_credentials':
        console.log(`[Playbook] Rotating credentials`);
        break;

      default:
        throw new Error(`Unknown action: ${step.action}`);
    }

    return {
      step: 0,
      action: step.action,
      status: 'success',
      message: `${step.action} completed successfully`,
      executedAt: new Date().toISOString(),
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      step: 0,
      action: step.action,
      status: 'failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      executedAt: new Date().toISOString(),
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Execute a playbook
 */
export async function executePlaybook(
  playbook: Playbook,
  context: Record<string, unknown>
): Promise<PlaybookExecution> {
  const targetKey = (context.targetIp as string) || (context.targetDevice as string) || 'global';
  
  if (!canExecutePlaybook(playbook, targetKey)) {
    return {
      id: `exec-${Date.now()}`,
      playbookId: playbook.id,
      playbookName: playbook.name,
      trigger: playbook.trigger,
      targetIp: context.targetIp as string,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      status: 'aborted',
      stepsCompleted: 0,
      totalSteps: playbook.steps.length,
      results: [],
      error: 'Cooldown or rate limit exceeded',
    };
  }

  const execution: PlaybookExecution = {
    id: `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    playbookId: playbook.id,
    playbookName: playbook.name,
    trigger: playbook.trigger,
    targetIp: context.targetIp as string,
    targetDevice: context.targetDevice as string,
    startedAt: new Date().toISOString(),
    status: 'running',
    stepsCompleted: 0,
    totalSteps: playbook.steps.length,
    results: [],
  };

  // Update tracking
  cooldownTracker.set(`${playbook.id}:${targetKey}`, Date.now());
  hourlyExecutionCounts.set(
    playbook.id,
    (hourlyExecutionCounts.get(playbook.id) || 0) + 1
  );

  // Execute steps
  for (let i = 0; i < playbook.steps.length; i++) {
    const step = playbook.steps[i];
    const result = await executeStep(step, context);
    result.step = i + 1;
    execution.results.push(result);

    if (result.status === 'success') {
      execution.stepsCompleted++;
    } else if (!step.continueOnFailure) {
      execution.status = 'failed';
      execution.error = result.message;
      break;
    }
  }

  if (execution.status === 'running') {
    execution.status = 'completed';
  }
  execution.completedAt = new Date().toISOString();

  // Store in history
  executionHistory.unshift(execution);
  if (executionHistory.length > 1000) {
    executionHistory.pop();
  }

  return execution;
}

/**
 * Find and execute matching playbooks for an event
 */
export async function triggerPlaybooks(
  trigger: PlaybookTrigger,
  context: Record<string, unknown>,
  playbooks: Playbook[] = BUILTIN_PLAYBOOKS
): Promise<PlaybookExecution[]> {
  const executions: PlaybookExecution[] = [];

  // Find matching playbooks
  const matchingPlaybooks = playbooks
    .filter(pb => pb.trigger === trigger && pb.enabled)
    .sort((a, b) => a.priority - b.priority);

  // Execute each matching playbook
  for (const playbook of matchingPlaybooks) {
    const execution = await executePlaybook(playbook, context);
    executions.push(execution);
  }

  return executions;
}

/**
 * Get playbook execution history
 */
export function getExecutionHistory(limit = 100): PlaybookExecution[] {
  return executionHistory.slice(0, limit);
}

/**
 * Get all playbooks
 */
export function getPlaybooks(): Playbook[] {
  return BUILTIN_PLAYBOOKS;
}

/**
 * Get playbook by ID
 */
export function getPlaybook(id: string): Playbook | undefined {
  return BUILTIN_PLAYBOOKS.find(pb => pb.id === id);
}

/**
 * Reset hourly counters (should be called every hour)
 */
export function resetHourlyCounters(): void {
  hourlyExecutionCounts.clear();
}

// Reset counters every hour
setInterval(resetHourlyCounters, 60 * 60 * 1000);

export default {
  executePlaybook,
  triggerPlaybooks,
  getExecutionHistory,
  getPlaybooks,
  getPlaybook,
  BUILTIN_PLAYBOOKS,
};
