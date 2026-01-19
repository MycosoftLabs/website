import { baseTemplate } from './base'
import type { DeviceNotificationData } from '../mailer'

const eventIcons: Record<string, string> = {
  online: '🟢',
  offline: '🔴',
  alert: '⚠️',
  update: '🔄',
}

const eventColors: Record<string, { bg: string; border: string }> = {
  online: { bg: '#f0fdf4', border: '#86efac' },
  offline: { bg: '#fef2f2', border: '#fca5a5' },
  alert: { bg: '#fefce8', border: '#fde047' },
  update: { bg: '#eff6ff', border: '#93c5fd' },
}

export function deviceNotificationTemplate(data: DeviceNotificationData): string {
  const icon = eventIcons[data.eventType] || '📱'
  const colors = eventColors[data.eventType] || eventColors.update
  
  const eventTitle: Record<string, string> = {
    online: 'Device Online',
    offline: 'Device Offline',
    alert: 'Device Alert',
    update: 'Device Update',
  }
  
  const content = `
    <h1>${icon} MycoBrain ${eventTitle[data.eventType]}</h1>
    
    <div style="background-color: ${colors.bg}; border: 1px solid ${colors.border}; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <table style="width: 100%; font-size: 14px;">
        <tr>
          <td style="padding: 4px 0; color: #6b7280; width: 100px;">Device:</td>
          <td style="font-weight: 500;">${data.deviceName}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #6b7280;">Device ID:</td>
          <td style="font-family: monospace; font-size: 13px;">${data.deviceId}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #6b7280;">Time:</td>
          <td>${data.timestamp}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #6b7280;">Status:</td>
          <td>
            <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; background-color: ${colors.border}; font-size: 12px; font-weight: 500;">
              ${data.eventType.toUpperCase()}
            </span>
          </td>
        </tr>
      </table>
    </div>
    
    <p>${data.message}</p>
    
    <p class="text-center">
      <a href="https://mycosoft.com/devices/${data.deviceId}" class="button button-secondary">View Device</a>
    </p>
    
    <div class="divider"></div>
    
    <p class="text-small">You can manage your device notification preferences in your <a href="https://mycosoft.com/account/notifications">account settings</a>.</p>
  `

  return baseTemplate({
    title: `MycoBrain: ${data.deviceName} - ${eventTitle[data.eventType]}`,
    preheader: `${data.deviceName}: ${data.message}`,
    content,
    footerText: 'You received this email because you have device notifications enabled.',
  })
}
