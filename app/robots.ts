import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          // API routes
          '/api/',
          
          // Private/authenticated routes
          '/admin/',
          '/settings/',
          '/profile/',
          '/billing/',
          '/onboarding/',
          '/orders/',
          
          // NatureOS platform (gated)
          '/natureos/',
          
          // Dashboard (authenticated)
          '/dashboard/',
          
          // Development/test routes
          '/dev/',
          '/test-voice/',
          '/preview/',
          
          // Internal security routes
          '/security/forms/',
          '/security/incidents/',
          '/security/network/',
          '/security/redteam/',
        ],
      },
      {
        userAgent: 'GPTBot',
        disallow: ['/'],  // Block OpenAI crawler if desired
      },
    ],
    sitemap: 'https://mycosoft.com/sitemap.xml',
  }
}
