import { baseTemplate } from './base'
import type { PasswordResetData } from '../mailer'

export function passwordResetTemplate(data: PasswordResetData): string {
  const content = `
    <h1>Reset Your Password</h1>
    
    <p>Hi ${data.userName},</p>
    
    <p>We received a request to reset your password. Click the button below to create a new password:</p>
    
    <p class="text-center">
      <a href="${data.resetUrl}" class="button">Reset Password</a>
    </p>
    
    <div class="warning-box">
      <p style="margin: 0;"><strong>⏰ This link expires in ${data.expiresIn}</strong></p>
      <p style="margin: 8px 0 0 0; font-size: 14px;">For security reasons, this password reset link will only work for a limited time.</p>
    </div>
    
    <div class="divider"></div>
    
    <p class="text-small">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
    
    <p class="text-small">If you're having trouble clicking the button, copy and paste this URL into your browser:</p>
    <p class="text-small" style="word-break: break-all;">${data.resetUrl}</p>
  `

  return baseTemplate({
    title: 'Reset Your Mycosoft Password',
    preheader: 'Reset your password to regain access to your account.',
    content,
    footerText: 'You received this email because a password reset was requested for your account.',
  })
}
