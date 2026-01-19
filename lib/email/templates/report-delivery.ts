import { baseTemplate } from './base'
import type { ReportDeliveryData } from '../mailer'

export function reportDeliveryTemplate(data: ReportDeliveryData): string {
  const content = `
    <h1>📊 Your Report is Ready</h1>
    
    <p>Hi ${data.userName},</p>
    
    <p>Your requested report has been generated and is ready for download.</p>
    
    <div class="info-box">
      <table style="width: 100%; font-size: 14px;">
        <tr>
          <td style="padding: 4px 0; color: #6b7280; width: 120px;">Report Name:</td>
          <td style="font-weight: 500;">${data.reportName}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #6b7280;">Generated:</td>
          <td>${data.reportDate}</td>
        </tr>
      </table>
    </div>
    
    <p class="text-center">
      <a href="${data.downloadUrl}" class="button button-secondary">Download Report</a>
    </p>
    
    <div class="divider"></div>
    
    <p class="text-small">This download link will expire in 7 days. After that, you can regenerate the report from your dashboard.</p>
    
    <p class="text-muted">Need a different format or have questions about the data? <a href="https://mycosoft.com/support">Contact support</a>.</p>
  `

  return baseTemplate({
    title: 'Your Report is Ready - Mycosoft',
    preheader: `Your ${data.reportName} report is ready for download.`,
    content,
    footerText: 'You received this email because you requested a report from Mycosoft.',
  })
}
