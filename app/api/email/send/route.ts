import { NextRequest, NextResponse } from 'next/server'
import { 
  sendEmail, 
  sendWelcomeEmail, 
  sendPasswordResetEmail, 
  sendSecurityAlertEmail,
  sendReportEmail,
  sendDeviceNotificationEmail,
  verifyEmailConfig,
  type WelcomeEmailData,
  type PasswordResetData,
  type SecurityAlertData,
  type ReportDeliveryData,
  type DeviceNotificationData,
} from '@/lib/email/mailer'

export const dynamic = 'force-dynamic'

type EmailType = 'welcome' | 'password-reset' | 'security-alert' | 'report' | 'device-notification' | 'custom'

interface SendEmailRequest {
  type: EmailType
  to: string
  data?: WelcomeEmailData | PasswordResetData | SecurityAlertData | ReportDeliveryData | DeviceNotificationData
  // For custom emails
  subject?: string
  html?: string
  text?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: SendEmailRequest = await request.json()
    const { type, to, data, subject, html, text } = body

    if (!to) {
      return NextResponse.json(
        { error: 'Recipient email address is required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(to)) {
      return NextResponse.json(
        { error: 'Invalid email address format' },
        { status: 400 }
      )
    }

    let result

    switch (type) {
      case 'welcome':
        if (!data || !('userName' in data) || !('loginUrl' in data)) {
          return NextResponse.json(
            { error: 'Welcome email requires userName and loginUrl' },
            { status: 400 }
          )
        }
        result = await sendWelcomeEmail(to, data as WelcomeEmailData)
        break

      case 'password-reset':
        if (!data || !('userName' in data) || !('resetUrl' in data) || !('expiresIn' in data)) {
          return NextResponse.json(
            { error: 'Password reset email requires userName, resetUrl, and expiresIn' },
            { status: 400 }
          )
        }
        result = await sendPasswordResetEmail(to, data as PasswordResetData)
        break

      case 'security-alert':
        if (!data || !('userName' in data) || !('alertType' in data) || !('description' in data) || !('timestamp' in data)) {
          return NextResponse.json(
            { error: 'Security alert email requires userName, alertType, description, and timestamp' },
            { status: 400 }
          )
        }
        result = await sendSecurityAlertEmail(to, data as SecurityAlertData)
        break

      case 'report':
        if (!data || !('userName' in data) || !('reportName' in data) || !('reportDate' in data) || !('downloadUrl' in data)) {
          return NextResponse.json(
            { error: 'Report email requires userName, reportName, reportDate, and downloadUrl' },
            { status: 400 }
          )
        }
        result = await sendReportEmail(to, data as ReportDeliveryData)
        break

      case 'device-notification':
        if (!data || !('deviceName' in data) || !('deviceId' in data) || !('eventType' in data) || !('message' in data) || !('timestamp' in data)) {
          return NextResponse.json(
            { error: 'Device notification email requires deviceName, deviceId, eventType, message, and timestamp' },
            { status: 400 }
          )
        }
        result = await sendDeviceNotificationEmail(to, data as DeviceNotificationData)
        break

      case 'custom':
        if (!subject || (!html && !text)) {
          return NextResponse.json(
            { error: 'Custom email requires subject and either html or text content' },
            { status: 400 }
          )
        }
        result = await sendEmail({ to, subject, html, text })
        break

      default:
        return NextResponse.json(
          { error: `Unknown email type: ${type}` },
          { status: 400 }
        )
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
      })
    } else {
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Email API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// Verify email configuration
export async function GET() {
  try {
    const result = await verifyEmailConfig()
    
    if (result.valid) {
      return NextResponse.json({
        status: 'configured',
        message: 'Email service is properly configured',
      })
    } else {
      return NextResponse.json({
        status: 'not_configured',
        message: 'Email service is not properly configured',
        error: result.error,
      })
    }
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Failed to verify email configuration',
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
