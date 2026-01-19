/**
 * Base email template wrapper
 * Provides consistent styling and structure for all email templates
 */

export interface BaseTemplateOptions {
  title: string
  preheader?: string
  content: string
  footerText?: string
}

export function baseTemplate({ title, preheader, content, footerText }: BaseTemplateOptions): string {
  const year = new Date().getFullYear()
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  <!--[if mso]>
  <style type="text/css">
    table { border-collapse: collapse; }
    td { font-family: Arial, sans-serif; }
  </style>
  <![endif]-->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #1a1a2e;
      background-color: #f4f4f8;
    }
    
    .email-wrapper {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    
    .email-container {
      background-color: #ffffff;
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
      overflow: hidden;
    }
    
    .email-header {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      padding: 32px;
      text-align: center;
    }
    
    .logo {
      font-size: 28px;
      font-weight: 700;
      color: #ffffff;
      text-decoration: none;
      letter-spacing: -0.5px;
    }
    
    .logo span {
      color: #4ade80;
    }
    
    .email-body {
      padding: 40px 32px;
    }
    
    .email-footer {
      background-color: #f8f9fa;
      padding: 24px 32px;
      text-align: center;
      font-size: 13px;
      color: #6b7280;
      border-top: 1px solid #e5e7eb;
    }
    
    h1 {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 16px;
      color: #1a1a2e;
    }
    
    p {
      margin-bottom: 16px;
      color: #4b5563;
    }
    
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 15px;
      margin: 16px 0;
      transition: transform 0.2s;
    }
    
    .button:hover {
      transform: translateY(-2px);
    }
    
    .button-secondary {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    }
    
    .button-warning {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    }
    
    .button-danger {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    }
    
    .info-box {
      background-color: #f0fdf4;
      border: 1px solid #86efac;
      border-radius: 8px;
      padding: 16px;
      margin: 20px 0;
    }
    
    .warning-box {
      background-color: #fefce8;
      border: 1px solid #fde047;
      border-radius: 8px;
      padding: 16px;
      margin: 20px 0;
    }
    
    .danger-box {
      background-color: #fef2f2;
      border: 1px solid #fca5a5;
      border-radius: 8px;
      padding: 16px;
      margin: 20px 0;
    }
    
    .divider {
      height: 1px;
      background-color: #e5e7eb;
      margin: 24px 0;
    }
    
    .text-small {
      font-size: 13px;
      color: #9ca3af;
    }
    
    .text-muted {
      color: #6b7280;
    }
    
    .text-center {
      text-align: center;
    }
    
    .social-links {
      margin-top: 16px;
    }
    
    .social-links a {
      display: inline-block;
      margin: 0 8px;
      color: #6b7280;
      text-decoration: none;
    }
    
    /* Preheader styles (hidden preview text) */
    .preheader {
      display: none !important;
      max-height: 0;
      max-width: 0;
      opacity: 0;
      overflow: hidden;
      mso-hide: all;
      visibility: hidden;
      width: 0;
    }
    
    @media only screen and (max-width: 480px) {
      .email-wrapper {
        padding: 10px;
      }
      
      .email-body {
        padding: 24px 20px;
      }
      
      .email-header {
        padding: 24px 20px;
      }
      
      h1 {
        font-size: 20px;
      }
      
      .button {
        display: block;
        text-align: center;
      }
    }
  </style>
</head>
<body>
  ${preheader ? `<span class="preheader">${preheader}</span>` : ''}
  
  <div class="email-wrapper">
    <div class="email-container">
      <div class="email-header">
        <a href="https://mycosoft.com" class="logo">Myco<span>soft</span></a>
      </div>
      
      <div class="email-body">
        ${content}
      </div>
      
      <div class="email-footer">
        <p>${footerText || 'This email was sent by Mycosoft.'}</p>
        <p class="text-small">
          &copy; ${year} Mycosoft. All rights reserved.<br>
          <a href="https://mycosoft.com/privacy" style="color: #6b7280;">Privacy Policy</a> &bull;
          <a href="https://mycosoft.com/unsubscribe" style="color: #6b7280;">Unsubscribe</a>
        </p>
        <div class="social-links">
          <a href="https://github.com/MycosoftLabs">GitHub</a>
          <a href="https://twitter.com/mycosoft">Twitter</a>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim()
}
