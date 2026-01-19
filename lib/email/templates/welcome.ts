import { baseTemplate } from './base'
import type { WelcomeEmailData } from '../mailer'

export function welcomeTemplate(data: WelcomeEmailData): string {
  const content = `
    <h1>Welcome to Mycosoft, ${data.userName}!</h1>
    
    <p>We're thrilled to have you join our community of researchers, developers, and mycology enthusiasts.</p>
    
    <div class="info-box">
      <p style="margin: 0;"><strong>What you can do with Mycosoft:</strong></p>
      <ul style="margin: 12px 0 0 0; padding-left: 20px; color: #4b5563;">
        <li>Explore the MINDEX species database with 500,000+ species</li>
        <li>Monitor environmental data with CREP dashboard</li>
        <li>Connect MycoBrain IoT devices for real-time sensing</li>
        <li>Access NatureOS Earth simulation platform</li>
        <li>Chat with MYCA, our AI research assistant</li>
      </ul>
    </div>
    
    <p class="text-center">
      <a href="${data.loginUrl}" class="button">Get Started</a>
    </p>
    
    <div class="divider"></div>
    
    <p class="text-muted">Need help getting started? Check out our <a href="https://mycosoft.com/docs">documentation</a> or reach out to our support team.</p>
  `

  return baseTemplate({
    title: 'Welcome to Mycosoft',
    preheader: `Welcome aboard, ${data.userName}! Start exploring the world of mycology.`,
    content,
    footerText: 'You received this email because you signed up for Mycosoft.',
  })
}
