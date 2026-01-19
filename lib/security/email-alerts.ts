/**
 * Email Alert System
 * Provides email notifications for security events
 * Supports multiple email providers: Resend, SendGrid, SMTP
 */

import { createAuditLog } from './database';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface EmailAlert {
  id: string;
  timestamp: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  subject: string;
  body: string;
  htmlBody?: string;
  recipients: string[];
  status: 'pending' | 'sent' | 'failed';
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface EmailConfig {
  provider: 'resend' | 'sendgrid' | 'smtp' | 'console';
  apiKey?: string;
  fromEmail: string;
  fromName: string;
  defaultRecipients: string[];
  smtpConfig?: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
  };
}

export interface SecurityAlertTemplate {
  type: string;
  subjectTemplate: string;
  bodyTemplate: string;
  htmlTemplate?: string;
}

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

function getEmailConfig(): EmailConfig {
  const resendApiKey = process.env.RESEND_API_KEY;
  const sendgridApiKey = process.env.SENDGRID_API_KEY;
  
  // Default recipients from authorized users config
  const defaultRecipients = [
    'morgan@mycosoft.com',
    'chris@mycosoft.com',
    'garrett@mycosoft.com',
    'rj@mycosoft.com',
  ];
  
  if (resendApiKey) {
    return {
      provider: 'resend',
      apiKey: resendApiKey,
      fromEmail: process.env.EMAIL_FROM || 'security@mycosoft.com',
      fromName: 'Mycosoft SOC',
      defaultRecipients,
    };
  }
  
  if (sendgridApiKey) {
    return {
      provider: 'sendgrid',
      apiKey: sendgridApiKey,
      fromEmail: process.env.EMAIL_FROM || 'security@mycosoft.com',
      fromName: 'Mycosoft SOC',
      defaultRecipients,
    };
  }
  
  // Console fallback for development
  return {
    provider: 'console',
    fromEmail: 'security@mycosoft.com',
    fromName: 'Mycosoft SOC',
    defaultRecipients,
  };
}

// ═══════════════════════════════════════════════════════════════
// EMAIL TEMPLATES
// ═══════════════════════════════════════════════════════════════

const ALERT_TEMPLATES: Record<string, SecurityAlertTemplate> = {
  security_event: {
    type: 'security_event',
    subjectTemplate: '[{severity}] Security Event: {event_type}',
    bodyTemplate: `
Security Event Detected

Severity: {severity}
Event Type: {event_type}
Timestamp: {timestamp}

Description:
{description}

Source IP: {source_ip}
Destination IP: {destination_ip}

Location:
{location}

Please review this event in the SOC Dashboard.

--
Mycosoft Security Operations Center
    `,
    htmlTemplate: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #e2e8f0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 12px; padding: 24px; }
    .header { border-bottom: 1px solid #334155; padding-bottom: 16px; margin-bottom: 16px; }
    .severity-critical { color: #ef4444; }
    .severity-high { color: #f97316; }
    .severity-medium { color: #eab308; }
    .severity-low { color: #22c55e; }
    .severity-info { color: #3b82f6; }
    .detail { margin: 12px 0; }
    .label { color: #94a3b8; font-size: 12px; text-transform: uppercase; }
    .value { color: #f1f5f9; font-size: 14px; margin-top: 4px; }
    .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 20px; }
    .footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #334155; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 20px;">🔒 Security Alert</h1>
      <p class="severity-{severity_class}" style="margin: 8px 0 0; font-weight: bold;">{severity} SEVERITY</p>
    </div>
    
    <div class="detail">
      <div class="label">Event Type</div>
      <div class="value">{event_type}</div>
    </div>
    
    <div class="detail">
      <div class="label">Timestamp</div>
      <div class="value">{timestamp}</div>
    </div>
    
    <div class="detail">
      <div class="label">Description</div>
      <div class="value">{description}</div>
    </div>
    
    <div class="detail">
      <div class="label">Source IP</div>
      <div class="value">{source_ip}</div>
    </div>
    
    <div class="detail">
      <div class="label">Location</div>
      <div class="value">{location}</div>
    </div>
    
    <a href="{dashboard_url}" class="button">View in SOC Dashboard</a>
    
    <div class="footer">
      Mycosoft Security Operations Center<br>
      This is an automated alert. Do not reply to this email.
    </div>
  </div>
</body>
</html>
    `,
  },
  
  incident_created: {
    type: 'incident_created',
    subjectTemplate: '[INCIDENT] {title}',
    bodyTemplate: `
New Security Incident Created

Title: {title}
Severity: {severity}
Status: {status}
Assigned To: {assigned_to}

Description:
{description}

Related Events: {event_count}

Please review this incident in the SOC Dashboard.

--
Mycosoft Security Operations Center
    `,
  },
  
  playbook_executed: {
    type: 'playbook_executed',
    subjectTemplate: '[PLAYBOOK] {playbook_name} Executed',
    bodyTemplate: `
Playbook Execution Complete

Playbook: {playbook_name}
Status: {status}
Triggered By: {triggered_by}
Duration: {duration}

Actions Executed:
{actions}

--
Mycosoft Security Operations Center
    `,
  },
  
  daily_digest: {
    type: 'daily_digest',
    subjectTemplate: 'Daily Security Digest - {date}',
    bodyTemplate: `
Daily Security Digest for {date}

Summary:
- Total Events: {total_events}
- Critical: {critical_events}
- High: {high_events}
- Medium: {medium_events}
- Open Incidents: {open_incidents}

Top Event Types:
{top_event_types}

Recent Incidents:
{recent_incidents}

--
Mycosoft Security Operations Center
    `,
  },
};

// ═══════════════════════════════════════════════════════════════
// EMAIL SENDING
// ═══════════════════════════════════════════════════════════════

async function sendViaResend(config: EmailConfig, alert: EmailAlert): Promise<boolean> {
  if (!config.apiKey) return false;
  
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${config.fromName} <${config.fromEmail}>`,
        to: alert.recipients,
        subject: alert.subject,
        text: alert.body,
        html: alert.htmlBody,
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('[EmailAlert] Resend error:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('[EmailAlert] Resend exception:', error);
    return false;
  }
}

async function sendViaSendGrid(config: EmailConfig, alert: EmailAlert): Promise<boolean> {
  if (!config.apiKey) return false;
  
  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: alert.recipients.map(email => ({ email })) }],
        from: { email: config.fromEmail, name: config.fromName },
        subject: alert.subject,
        content: [
          { type: 'text/plain', value: alert.body },
          ...(alert.htmlBody ? [{ type: 'text/html', value: alert.htmlBody }] : []),
        ],
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('[EmailAlert] SendGrid error:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('[EmailAlert] SendGrid exception:', error);
    return false;
  }
}

function sendViaConsole(alert: EmailAlert): boolean {
  console.log('\n' + '═'.repeat(60));
  console.log('[EMAIL ALERT - Console Mode]');
  console.log('═'.repeat(60));
  console.log(`To: ${alert.recipients.join(', ')}`);
  console.log(`Subject: ${alert.subject}`);
  console.log(`Severity: ${alert.severity}`);
  console.log('-'.repeat(60));
  console.log(alert.body);
  console.log('═'.repeat(60) + '\n');
  return true;
}

// ═══════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════

/**
 * Send an email alert
 */
export async function sendEmailAlert(alert: Omit<EmailAlert, 'id' | 'timestamp' | 'status'>): Promise<EmailAlert> {
  const config = getEmailConfig();
  const id = `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const timestamp = new Date().toISOString();
  
  const fullAlert: EmailAlert = {
    id,
    timestamp,
    status: 'pending',
    recipients: alert.recipients.length > 0 ? alert.recipients : config.defaultRecipients,
    ...alert,
  };
  
  let success = false;
  
  switch (config.provider) {
    case 'resend':
      success = await sendViaResend(config, fullAlert);
      break;
    case 'sendgrid':
      success = await sendViaSendGrid(config, fullAlert);
      break;
    case 'console':
    default:
      success = sendViaConsole(fullAlert);
      break;
  }
  
  fullAlert.status = success ? 'sent' : 'failed';
  
  // Create audit log
  await createAuditLog({
    timestamp,
    action: 'email_alert_sent',
    actor: 'system',
    target_type: 'alert',
    target_id: id,
    details: {
      subject: alert.subject,
      recipients: fullAlert.recipients,
      severity: alert.severity,
      status: fullAlert.status,
      provider: config.provider,
    },
    ip_address: null,
  });
  
  return fullAlert;
}

/**
 * Send a security event alert
 */
export async function sendSecurityEventAlert(event: {
  event_type: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  description: string;
  source_ip?: string;
  destination_ip?: string;
  location?: string;
  timestamp?: string;
}): Promise<EmailAlert> {
  const template = ALERT_TEMPLATES.security_event;
  const timestamp = event.timestamp || new Date().toISOString();
  const dashboardUrl = process.env.NEXT_PUBLIC_APP_URL 
    ? `${process.env.NEXT_PUBLIC_APP_URL}/security`
    : 'http://localhost:3000/security';
  
  const replacements: Record<string, string> = {
    severity: event.severity.toUpperCase(),
    severity_class: event.severity,
    event_type: event.event_type,
    timestamp: new Date(timestamp).toLocaleString(),
    description: event.description,
    source_ip: event.source_ip || 'N/A',
    destination_ip: event.destination_ip || 'N/A',
    location: event.location || 'Unknown',
    dashboard_url: dashboardUrl,
  };
  
  let subject = template.subjectTemplate;
  let body = template.bodyTemplate;
  let htmlBody = template.htmlTemplate;
  
  Object.entries(replacements).forEach(([key, value]) => {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    subject = subject.replace(regex, value);
    body = body.replace(regex, value);
    if (htmlBody) htmlBody = htmlBody.replace(regex, value);
  });
  
  // Only send emails for medium+ severity
  if (!['medium', 'high', 'critical'].includes(event.severity)) {
    console.log(`[EmailAlert] Skipping email for ${event.severity} severity event`);
    return {
      id: `skip-${Date.now()}`,
      timestamp,
      severity: event.severity,
      subject,
      body,
      recipients: [],
      status: 'sent', // Mark as sent to avoid retries
      metadata: { skipped: true, reason: 'Below severity threshold' },
    };
  }
  
  return sendEmailAlert({
    severity: event.severity,
    subject,
    body,
    htmlBody,
    recipients: [], // Will use default
  });
}

/**
 * Send an incident notification
 */
export async function sendIncidentAlert(incident: {
  title: string;
  description: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  status: string;
  assigned_to?: string;
  event_count?: number;
}): Promise<EmailAlert> {
  const template = ALERT_TEMPLATES.incident_created;
  
  const replacements: Record<string, string> = {
    title: incident.title,
    severity: incident.severity.toUpperCase(),
    status: incident.status,
    assigned_to: incident.assigned_to || 'Unassigned',
    description: incident.description,
    event_count: String(incident.event_count || 0),
  };
  
  let subject = template.subjectTemplate;
  let body = template.bodyTemplate;
  
  Object.entries(replacements).forEach(([key, value]) => {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    subject = subject.replace(regex, value);
    body = body.replace(regex, value);
  });
  
  return sendEmailAlert({
    severity: incident.severity,
    subject,
    body,
    recipients: [], // Will use default
  });
}

/**
 * Send a playbook execution notification
 */
export async function sendPlaybookAlert(execution: {
  playbook_name: string;
  status: string;
  triggered_by: string;
  duration_ms: number;
  actions: { type: string; success: boolean }[];
}): Promise<EmailAlert> {
  const template = ALERT_TEMPLATES.playbook_executed;
  
  const actionsText = execution.actions
    .map(a => `  - ${a.type}: ${a.success ? '✓ Success' : '✗ Failed'}`)
    .join('\n');
  
  const replacements: Record<string, string> = {
    playbook_name: execution.playbook_name,
    status: execution.status,
    triggered_by: execution.triggered_by,
    duration: `${execution.duration_ms}ms`,
    actions: actionsText,
  };
  
  let subject = template.subjectTemplate;
  let body = template.bodyTemplate;
  
  Object.entries(replacements).forEach(([key, value]) => {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    subject = subject.replace(regex, value);
    body = body.replace(regex, value);
  });
  
  return sendEmailAlert({
    severity: execution.status === 'completed' ? 'info' : 'high',
    subject,
    body,
    recipients: [], // Will use default
  });
}

/**
 * Send daily digest email
 */
export async function sendDailyDigest(stats: {
  total_events: number;
  critical_events: number;
  high_events: number;
  medium_events: number;
  open_incidents: number;
  top_event_types: { type: string; count: number }[];
  recent_incidents: { title: string; severity: string }[];
}): Promise<EmailAlert> {
  const template = ALERT_TEMPLATES.daily_digest;
  const date = new Date().toLocaleDateString();
  
  const topTypesText = stats.top_event_types
    .slice(0, 5)
    .map(t => `  - ${t.type}: ${t.count}`)
    .join('\n') || '  None';
  
  const incidentsText = stats.recent_incidents
    .slice(0, 5)
    .map(i => `  - [${i.severity.toUpperCase()}] ${i.title}`)
    .join('\n') || '  None';
  
  const replacements: Record<string, string> = {
    date,
    total_events: String(stats.total_events),
    critical_events: String(stats.critical_events),
    high_events: String(stats.high_events),
    medium_events: String(stats.medium_events),
    open_incidents: String(stats.open_incidents),
    top_event_types: topTypesText,
    recent_incidents: incidentsText,
  };
  
  let subject = template.subjectTemplate;
  let body = template.bodyTemplate;
  
  Object.entries(replacements).forEach(([key, value]) => {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    subject = subject.replace(regex, value);
    body = body.replace(regex, value);
  });
  
  return sendEmailAlert({
    severity: 'info',
    subject,
    body,
    recipients: [], // Will use default
  });
}

/**
 * Get email provider status
 */
export function getEmailProviderStatus(): { provider: string; configured: boolean } {
  const config = getEmailConfig();
  return {
    provider: config.provider,
    configured: config.provider !== 'console',
  };
}
