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
