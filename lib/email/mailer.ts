/**
 * Mycosoft Email Service
 * Wraps nodemailer for transactional emails (notifications, alerts, deployments)
 * Created: February 9, 2026
 */

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface EmailMessage {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface VerifyEmailConfigResult {
  valid: boolean
  error?: string
}

export interface WelcomeEmailData {
  userName: string
  loginUrl: string
}

export interface PasswordResetData {
  userName: string
  resetUrl: string
  expiresIn: string
}

export interface SecurityAlertData {
  userName: string
  alertType: string
  description: string
  timestamp: string
}

export interface ReportDeliveryData {
  userName: string
  reportName: string
  reportDate: string
  downloadUrl: string
}

export interface DeviceNotificationData {
  deviceName: string
  deviceId: string
  eventType: string
  message: string
  timestamp: string
}

// NOTE: nodemailer must be installed: npm install nodemailer @types/nodemailer
// Configuration comes from environment variables, never hardcoded

const defaultConfig: EmailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
};

export async function verifyEmailConfig(): Promise<VerifyEmailConfigResult> {
  const host = process.env.SMTP_HOST || defaultConfig.host
  const port = process.env.SMTP_PORT || String(defaultConfig.port)
  const user = process.env.SMTP_USER || ""
  const pass = process.env.SMTP_PASS || ""

  if (!host) return { valid: false, error: "SMTP_HOST is not set" }
  if (!port || Number.isNaN(Number(port))) return { valid: false, error: "SMTP_PORT is invalid" }
  if (!user) return { valid: false, error: "SMTP_USER is not set" }
  if (!pass) return { valid: false, error: "SMTP_PASS is not set" }

  return { valid: true }
}

export async function sendEmail(message: EmailMessage, config?: Partial<EmailConfig>): Promise<EmailResult> {
  try {
    const nodemailer = await import('nodemailer');
    const mergedConfig = { ...defaultConfig, ...config };
    
    if (!mergedConfig.auth.user || !mergedConfig.auth.pass) {
      return { success: false, error: 'SMTP credentials not configured. Set SMTP_USER and SMTP_PASS env vars.' };
    }
    
    const transporter = nodemailer.createTransport(mergedConfig);
    
    const info = await transporter.sendMail({
      from: message.from || `Mycosoft <${mergedConfig.auth.user}>`,
      to: Array.isArray(message.to) ? message.to.join(', ') : message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown email error' };
  }
}

export async function sendWelcomeEmail(to: string, data: WelcomeEmailData): Promise<EmailResult> {
  return sendEmail({
    to,
    subject: "Welcome to Mycosoft",
    text: `Hi ${data.userName}, welcome to Mycosoft. Login: ${data.loginUrl}`,
    html: `<p>Hi ${data.userName},</p><p>Welcome to Mycosoft.</p><p><a href="${data.loginUrl}">Login</a></p>`,
  })
}

export async function sendPasswordResetEmail(to: string, data: PasswordResetData): Promise<EmailResult> {
  return sendEmail({
    to,
    subject: "Mycosoft password reset",
    text: `Hi ${data.userName}, reset your password here: ${data.resetUrl} (expires in ${data.expiresIn})`,
    html: `<p>Hi ${data.userName},</p><p><a href="${data.resetUrl}">Reset your password</a></p><p>Expires in ${data.expiresIn}.</p>`,
  })
}

export async function sendSecurityAlertEmail(to: string, data: SecurityAlertData): Promise<EmailResult> {
  return sendEmail({
    to,
    subject: `Mycosoft security alert: ${data.alertType}`,
    text: `User: ${data.userName}\nType: ${data.alertType}\nTime: ${data.timestamp}\n\n${data.description}`,
    html: `<h2>Security alert: ${data.alertType}</h2><p><strong>User:</strong> ${data.userName}</p><p><strong>Time:</strong> ${data.timestamp}</p><pre>${data.description}</pre>`,
  })
}

export async function sendReportEmail(to: string, data: ReportDeliveryData): Promise<EmailResult> {
  return sendEmail({
    to,
    subject: `Mycosoft report: ${data.reportName} (${data.reportDate})`,
    text: `Hi ${data.userName}, your report is ready: ${data.downloadUrl}`,
    html: `<p>Hi ${data.userName},</p><p>Your report <strong>${data.reportName}</strong> (${data.reportDate}) is ready.</p><p><a href="${data.downloadUrl}">Download</a></p>`,
  })
}

export async function sendDeviceNotificationEmail(to: string, data: DeviceNotificationData): Promise<EmailResult> {
  return sendEmail({
    to,
    subject: `Device notification: ${data.deviceName} (${data.eventType})`,
    text: `Device: ${data.deviceName} (${data.deviceId})\nEvent: ${data.eventType}\nTime: ${data.timestamp}\n\n${data.message}`,
    html: `<h2>Device notification</h2><p><strong>Device:</strong> ${data.deviceName} (${data.deviceId})</p><p><strong>Event:</strong> ${data.eventType}</p><p><strong>Time:</strong> ${data.timestamp}</p><pre>${data.message}</pre>`,
  })
}

export async function sendDeploymentNotification(service: string, status: 'success' | 'failure', details: string): Promise<EmailResult> {
  const statusEmoji = status === 'success' ? 'Deployed' : 'FAILED';
  return sendEmail({
    to: process.env.DEPLOY_NOTIFY_EMAIL || '',
    subject: `[Mycosoft Deploy] ${service} - ${statusEmoji}`,
    html: `<h2>Deployment ${statusEmoji}: ${service}</h2><pre>${details}</pre><p>Time: ${new Date().toISOString()}</p>`,
  });
}

export async function sendErrorAlert(component: string, error: string): Promise<EmailResult> {
  return sendEmail({
    to: process.env.ALERT_EMAIL || '',
    subject: `[Mycosoft Alert] Error in ${component}`,
    html: `<h2>Error Alert: ${component}</h2><pre>${error}</pre><p>Time: ${new Date().toISOString()}</p>`,
  });
}

export type { EmailConfig, EmailMessage, EmailResult };
