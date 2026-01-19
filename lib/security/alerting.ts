/**
 * Mycosoft Security Alerting Library
 * 
 * Multi-channel alerting system for security events.
 * Supports dashboard notifications, email, and escalation chains.
 */

import type { ThreatLevel } from './threat-intel';

export type AlertChannel = 'dashboard' | 'email' | 'webhook';
export type AlertStatus = 'pending' | 'sent' | 'failed' | 'acknowledged' | 'escalated';

export interface SecurityAlert {
  id: string;
  title: string;
  message: string;
  severity: ThreatLevel;
  source: string;
  sourceIp?: string;
  targetIp?: string;
  category: string;
  timestamp: string;
  channels: AlertChannel[];
  status: AlertStatus;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface AlertRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: {
    severity?: ThreatLevel[];
    source?: string[];
    category?: string[];
  };
  channels: AlertChannel[];
  recipients?: string[];
  cooldownSeconds: number;
  escalationMinutes?: number;
  escalationRecipients?: string[];
}

export interface EmailConfig {
  to: string[];
  cc?: string[];
  subject: string;
  template: string;
}

// In-memory alert storage
const alerts: SecurityAlert[] = [];
const alertCooldowns = new Map<string, number>();

// Default alert rules
const DEFAULT_RULES: AlertRule[] = [
  {
    id: 'rule-critical-all',
    name: 'Critical Alerts - All Channels',
    enabled: true,
    conditions: { severity: ['critical'] },
    channels: ['dashboard', 'email'],
    cooldownSeconds: 0,
    escalationMinutes: 15,
  },
  {
    id: 'rule-high-dashboard',
    name: 'High Alerts - Dashboard + Email',
    enabled: true,
    conditions: { severity: ['high'] },
    channels: ['dashboard', 'email'],
    cooldownSeconds: 300,
  },
  {
    id: 'rule-medium-dashboard',
    name: 'Medium Alerts - Dashboard Only',
    enabled: true,
    conditions: { severity: ['medium'] },
    channels: ['dashboard'],
    cooldownSeconds: 600,
  },
];

/**
 * Generate unique alert ID
 */
function generateAlertId(): string {
  return `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if alert should be throttled based on cooldown
 */
function shouldThrottle(ruleId: string, cooldownSeconds: number): boolean {
  const lastAlert = alertCooldowns.get(ruleId);
  if (!lastAlert) return false;
  return Date.now() - lastAlert < cooldownSeconds * 1000;
}

/**
 * Send alert to dashboard (WebSocket broadcast)
 */
async function sendDashboardAlert(alert: SecurityAlert): Promise<boolean> {
  // In a real implementation, this would broadcast via WebSocket
  console.log(`[Alert] Dashboard notification: ${alert.title}`);
  
  // Store alert for dashboard polling
  alerts.unshift(alert);
  if (alerts.length > 1000) {
    alerts.pop();
  }
  
  return true;
}

/**
 * Send email alert
 */
async function sendEmailAlert(alert: SecurityAlert, recipients: string[]): Promise<boolean> {
  const sendgridKey = process.env.SENDGRID_API_KEY;
  const alertEmail = process.env.ALERT_EMAIL || 'morgan@mycosoft.com';
  
  if (!sendgridKey) {
    console.log(`[Alert] Email would be sent to: ${recipients.join(', ')}`);
    console.log(`[Alert] Subject: [${alert.severity.toUpperCase()}] ${alert.title}`);
    return true;
  }

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sendgridKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: recipients.map(email => ({ email })),
        }],
        from: { email: 'security@mycosoft.com', name: 'Mycosoft Security' },
        subject: `[${alert.severity.toUpperCase()}] ${alert.title}`,
        content: [{
          type: 'text/html',
          value: `
            <div style="font-family: Arial, sans-serif; max-width: 600px;">
              <div style="background: ${getSeverityColor(alert.severity)}; color: white; padding: 20px;">
                <h1 style="margin: 0;">${alert.title}</h1>
                <p style="margin: 5px 0 0 0;">Severity: ${alert.severity.toUpperCase()}</p>
              </div>
              <div style="padding: 20px; background: #f5f5f5;">
                <p><strong>Message:</strong> ${alert.message}</p>
                <p><strong>Source:</strong> ${alert.source}</p>
                ${alert.sourceIp ? `<p><strong>Source IP:</strong> ${alert.sourceIp}</p>` : ''}
                ${alert.targetIp ? `<p><strong>Target IP:</strong> ${alert.targetIp}</p>` : ''}
                <p><strong>Category:</strong> ${alert.category}</p>
                <p><strong>Time:</strong> ${new Date(alert.timestamp).toLocaleString()}</p>
              </div>
              <div style="padding: 20px; text-align: center;">
                <a href="https://mycosoft.com/security" style="background: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                  View Security Dashboard
                </a>
              </div>
            </div>
          `,
        }],
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('[Alert] Email send failed:', error);
    return false;
  }
}

/**
 * Get color for severity level
 */
function getSeverityColor(severity: ThreatLevel): string {
  switch (severity) {
    case 'critical': return '#dc2626';
    case 'high': return '#ea580c';
    case 'medium': return '#ca8a04';
    case 'low': return '#16a34a';
    default: return '#6b7280';
  }
}

/**
 * Send webhook alert
 */
async function sendWebhookAlert(alert: SecurityAlert, webhookUrl: string): Promise<boolean> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'security_alert',
        alert,
        timestamp: new Date().toISOString(),
      }),
    });
    return response.ok;
  } catch (error) {
    console.error('[Alert] Webhook send failed:', error);
    return false;
  }
}

/**
 * Create and send a security alert
 */
export async function createAlert(params: {
  title: string;
  message: string;
  severity: ThreatLevel;
  source: string;
  sourceIp?: string;
  targetIp?: string;
  category: string;
  metadata?: Record<string, unknown>;
}): Promise<SecurityAlert> {
  const alert: SecurityAlert = {
    id: generateAlertId(),
    ...params,
    timestamp: new Date().toISOString(),
    channels: [],
    status: 'pending',
  };

  // Find matching rules
  for (const rule of DEFAULT_RULES) {
    if (!rule.enabled) continue;
    
    // Check conditions
    if (rule.conditions.severity && !rule.conditions.severity.includes(params.severity)) {
      continue;
    }
    if (rule.conditions.source && !rule.conditions.source.includes(params.source)) {
      continue;
    }
    if (rule.conditions.category && !rule.conditions.category.includes(params.category)) {
      continue;
    }

    // Check cooldown
    if (shouldThrottle(rule.id, rule.cooldownSeconds)) {
      continue;
    }

    // Update cooldown
    alertCooldowns.set(rule.id, Date.now());

    // Send to configured channels
    for (const channel of rule.channels) {
      alert.channels.push(channel);
      
      switch (channel) {
        case 'dashboard':
          await sendDashboardAlert(alert);
          break;
        case 'email':
          const recipients = rule.recipients || [process.env.ALERT_EMAIL || 'morgan@mycosoft.com'];
          await sendEmailAlert(alert, recipients);
          break;
        case 'webhook':
          const webhookUrl = process.env.ALERT_WEBHOOK_URL;
          if (webhookUrl) {
            await sendWebhookAlert(alert, webhookUrl);
          }
          break;
      }
    }

    // Schedule escalation if configured
    if (rule.escalationMinutes && rule.escalationRecipients) {
      setTimeout(() => {
        escalateAlert(alert.id, rule.escalationRecipients!);
      }, rule.escalationMinutes * 60 * 1000);
    }
  }

  alert.status = 'sent';
  return alert;
}

/**
 * Escalate an unacknowledged alert
 */
export async function escalateAlert(alertId: string, recipients: string[]): Promise<void> {
  const alert = alerts.find(a => a.id === alertId);
  if (!alert) return;
  
  if (alert.status === 'acknowledged') return;
  
  alert.status = 'escalated';
  
  // Send escalation email
  await sendEmailAlert(
    { ...alert, title: `[ESCALATED] ${alert.title}` },
    recipients
  );
  
  console.log(`[Alert] Escalated alert ${alertId} to: ${recipients.join(', ')}`);
}

/**
 * Acknowledge an alert
 */
export function acknowledgeAlert(alertId: string, acknowledgedBy: string): SecurityAlert | null {
  const alert = alerts.find(a => a.id === alertId);
  if (!alert) return null;
  
  alert.status = 'acknowledged';
  alert.acknowledgedBy = acknowledgedBy;
  alert.acknowledgedAt = new Date().toISOString();
  
  return alert;
}

/**
 * Get all alerts
 */
export function getAlerts(options?: {
  limit?: number;
  severity?: ThreatLevel[];
  status?: AlertStatus[];
  since?: string;
}): SecurityAlert[] {
  let filtered = [...alerts];
  
  if (options?.severity) {
    filtered = filtered.filter(a => options.severity!.includes(a.severity));
  }
  
  if (options?.status) {
    filtered = filtered.filter(a => options.status!.includes(a.status));
  }
  
  if (options?.since) {
    const sinceTime = new Date(options.since).getTime();
    filtered = filtered.filter(a => new Date(a.timestamp).getTime() >= sinceTime);
  }
  
  if (options?.limit) {
    filtered = filtered.slice(0, options.limit);
  }
  
  return filtered;
}

/**
 * Get alert by ID
 */
export function getAlert(alertId: string): SecurityAlert | null {
  return alerts.find(a => a.id === alertId) || null;
}

/**
 * Get alert statistics
 */
export function getAlertStats(): {
  total: number;
  byStatus: Record<AlertStatus, number>;
  bySeverity: Record<ThreatLevel, number>;
  last24Hours: number;
  unacknowledged: number;
} {
  const now = Date.now();
  const last24h = now - 24 * 60 * 60 * 1000;
  
  const byStatus: Record<AlertStatus, number> = {
    pending: 0,
    sent: 0,
    failed: 0,
    acknowledged: 0,
    escalated: 0,
  };
  
  const bySeverity: Record<ThreatLevel, number> = {
    unknown: 0,
    safe: 0,
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };
  
  let last24Hours = 0;
  let unacknowledged = 0;
  
  for (const alert of alerts) {
    byStatus[alert.status]++;
    bySeverity[alert.severity]++;
    
    if (new Date(alert.timestamp).getTime() >= last24h) {
      last24Hours++;
    }
    
    if (alert.status !== 'acknowledged') {
      unacknowledged++;
    }
  }
  
  return {
    total: alerts.length,
    byStatus,
    bySeverity,
    last24Hours,
    unacknowledged,
  };
}

export default {
  createAlert,
  acknowledgeAlert,
  escalateAlert,
  getAlerts,
  getAlert,
  getAlertStats,
};
