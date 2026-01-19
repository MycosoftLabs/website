import nodemailer, { Transporter, SendMailOptions } from 'nodemailer'

// Email configuration interface
export interface EmailConfig {
  host: string
  port: number
  secure: boolean
  auth: {
    user: string
    pass: string
  }
  from: string
}

// Email template data interfaces
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
  ipAddress?: string
  location?: string
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
  eventType: 'online' | 'offline' | 'alert' | 'update'
  message: string
  timestamp: string
}

// Singleton transporter instance
let transporter: Transporter | null = null

/**
 * Get or create the email transporter
 */
function getTransporter(): Transporter {
  if (transporter) return transporter

  const config: EmailConfig = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
    from: process.env.SMTP_FROM || 'Mycosoft <noreply@mycosoft.com>',
  }

  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  })

  return transporter
}

/**
 * Send an email using the configured transporter
 */
export async function sendEmail(options: SendMailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const transport = getTransporter()
    
    // Use default from address if not specified
    if (!options.from) {
      options.from = process.env.SMTP_FROM || 'Mycosoft <noreply@mycosoft.com>'
    }

    const info = await transport.sendMail(options)
    
    return {
      success: true,
      messageId: info.messageId,
    }
  } catch (error) {
    console.error('Failed to send email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Send a welcome email to new users
 */
export async function sendWelcomeEmail(to: string, data: WelcomeEmailData) {
  const { welcomeTemplate } = await import('./templates/welcome')
  
  return sendEmail({
    to,
    subject: 'Welcome to Mycosoft!',
    html: welcomeTemplate(data),
  })
}

/**
 * Send a password reset email
 */
export async function sendPasswordResetEmail(to: string, data: PasswordResetData) {
  const { passwordResetTemplate } = await import('./templates/password-reset')
  
  return sendEmail({
    to,
    subject: 'Reset Your Mycosoft Password',
    html: passwordResetTemplate(data),
  })
}

/**
 * Send a security alert email
 */
export async function sendSecurityAlertEmail(to: string, data: SecurityAlertData) {
  const { securityAlertTemplate } = await import('./templates/security-alert')
  
  return sendEmail({
    to,
    subject: `Security Alert: ${data.alertType}`,
    html: securityAlertTemplate(data),
  })
}

/**
 * Send a report delivery email
 */
export async function sendReportEmail(to: string, data: ReportDeliveryData) {
  const { reportDeliveryTemplate } = await import('./templates/report-delivery')
  
  return sendEmail({
    to,
    subject: `Your Report: ${data.reportName}`,
    html: reportDeliveryTemplate(data),
  })
}

/**
 * Send a device notification email
 */
export async function sendDeviceNotificationEmail(to: string, data: DeviceNotificationData) {
  const { deviceNotificationTemplate } = await import('./templates/device-notification')
  
  return sendEmail({
    to,
    subject: `MycoBrain Device: ${data.deviceName} - ${data.eventType}`,
    html: deviceNotificationTemplate(data),
  })
}

/**
 * Verify the email configuration is working
 */
export async function verifyEmailConfig(): Promise<{ valid: boolean; error?: string }> {
  try {
    const transport = getTransporter()
    await transport.verify()
    return { valid: true }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Close the transporter connection
 */
export function closeTransporter() {
  if (transporter) {
    transporter.close()
    transporter = null
  }
}
