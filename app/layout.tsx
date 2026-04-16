import type React from "react"
import type { Viewport } from "next"
import { GeistSans } from "geist/font/sans"

// CRITICAL: Revalidate every 60s so deploys invalidate CDN cache within 1 minute.
// Default Next.js static caching was `s-maxage=31536000` (1 YEAR on CDN), causing
// production fixes to never reach users because Cloudflare served stale HTML
// from before the deploy. `revalidate = 60` caps cache at 60 seconds. Cascades
// to every route via layout.
export const revalidate = 60
import { ThemeProvider } from "@/components/theme-provider"
import { ThemeColorSync } from "@/components/theme-color-sync"
import { AuthProvider } from "@/contexts/auth-context"
import { AppShellProviders } from "@/components/providers/AppShellProviders"
import "./globals.css"

import { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Mycosoft | Building The Earth Intelligence",
  description: "Building The Earth Intelligence - AI-powered mycology research, fungal computing, and environmental monitoring platform",
  metadataBase: new URL('https://mycosoft.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "Mycosoft | Building The Earth Intelligence",
    description: "Building The Earth Intelligence - AI-powered mycology research, fungal computing, and environmental monitoring platform",
    url: "https://mycosoft.com",
    siteName: "Mycosoft",
    locale: "en_US",
    type: "website",
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'Mycosoft - Fungal Biotechnology' }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mycosoft | Building The Earth Intelligence",
    description: "Building The Earth Intelligence - AI-powered mycology research, fungal computing, and environmental monitoring platform",
    images: ['/og-default.png'],
  },
}

// viewport export (Next.js App Router) — viewport-fit=cover enables iOS safe-area-inset support
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  // Initial paint only; ThemeColorSync replaces with meta matching next-themes after hydrate
  themeColor: "#0a0a0a",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={GeistSans.variable} suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "name": "Mycosoft",
                  "url": "https://mycosoft.com",
                  "logo": "https://mycosoft.com/mycosoft-logo.png",
                  "sameAs": [
                    "https://x.com/Mycosoft",
                    "https://x.com/MycosoftLabs"
                  ]
                },
                {
                  "@type": "WebSite",
                  "name": "Mycosoft",
                  "url": "https://mycosoft.com",
                  "potentialAction": {
                    "@type": "SearchAction",
                    "target": "https://mycosoft.com/search?q={search_term_string}",
                    "query-input": "required name=search_term_string"
                  }
                }
              ]
            })
          }}
        />
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <ThemeColorSync />
          <AuthProvider>
            <AppShellProviders>{children}</AppShellProviders>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
