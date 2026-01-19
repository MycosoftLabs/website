import { baseTemplate } from './base'
import type { SecurityAlertData } from '../mailer'

export function securityAlertTemplate(data: SecurityAlertData): string {
  const content = `
    <h1>🛡️ Security Alert</h1>
    
    <p>Hi ${data.userName},</p>
    
    <p>We detected unusual activity on your Mycosoft account:</p>
    
    <div class="danger-box">
      <p style="margin: 0;"><strong>${data.alertType}</strong></p>
      <p style="margin: 8px 0 0 0;">${data.description}</p>
      <table style="margin-top: 12px; font-size: 14px; color: #4b5563;">
        <tr>
          <td style="padding: 4px 16px 4px 0; color: #6b7280;">Time:</td>
          <td>${data.timestamp}</td>
        </tr>
        ${data.ipAddress ? `
        <tr>
          <td style="padding: 4px 16px 4px 0; color: #6b7280;">IP Address:</td>
          <td>${data.ipAddress}</td>
        </tr>
        ` : ''}
        ${data.location ? `
        <tr>
          <td style="padding: 4px 16px 4px 0; color: #6b7280;">Location:</td>
          <td>${data.location}</td>
        </tr>
        ` : ''}
      </table>
    </div>
    
    <p><strong>Was this you?</strong></p>
    
    <p>If you recognize this activity, you can safely ignore this email.</p>
    
    <p>If you don't recognize this activity, we recommend taking these steps immediately:</p>
    
    <ol style="margin: 16px 0; padding-left: 20px; color: #4b5563;">
      <li>Change your password</li>
      <li>Enable two-factor authentication</li>
      <li>Review your recent account activity</li>
      <li>Contact our security team if needed</li>
    </ol>
    
    <p class="text-center">
      <a href="https://mycosoft.com/account/security" class="button button-danger">Secure My Account</a>
    </p>
    
    <div class="divider"></div>
    
    <p class="text-small">If you have any questions, contact our security team at security@mycosoft.com</p>
  `

  return baseTemplate({
    title: 'Security Alert - Mycosoft',
    preheader: `Security Alert: ${data.alertType} detected on your account.`,
    content,
    footerText: 'This is an automated security notification from Mycosoft.',
  })
}
