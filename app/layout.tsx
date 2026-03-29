import type React from "react"
import type { Viewport } from "next"
import { GeistSans } from "geist/font/sans"
import { ThemeProvider } from "@/components/theme-provider"
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
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
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
          <AuthProvider>
            <AppShellProviders>{children}</AppShellProviders>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
