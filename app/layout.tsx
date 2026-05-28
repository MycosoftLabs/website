import type React from "react"
import type { Viewport } from "next"
import Script from "next/script"
import { GeistSans } from "geist/font/sans"

// NOTE: do NOT set `export const revalidate = X` on the root layout.
// In Next.js 15.1, combining layout-level revalidate with statically
// prerendered pages (e.g. `/`) causes a client-router bug where the first
// navigation OUT OF the prerendered page updates the URL but not the
// rendered tree (content freezes until a second click). For CDN cache
// invalidation, use route-level `revalidate` on dynamic pages or rely
// on the per-deploy Cloudflare purge instead.
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

const crepMapLibreDevGuard = `
(function () {
  if (window.__crepMapLibreDevGuard) return;
  window.__crepMapLibreDevGuard = true;
  function isCrepRoute() {
    return /\\/(natureos\\/earth-simulator|natureos\\/crep|dashboard\\/crep)(\\/|$)/.test(window.location.pathname);
  }
  function isNonFatalMapLibreError(message, stack) {
    if (!isCrepRoute()) return false;
    var text = String(message || "") + "\\n" + String(stack || "");
    return (
      (/Cannot read properties of undefined \\(reading 'get'\\)/.test(text) && /maplibre|continuePlacement|_updatePlacement|Map\\._render|new It/i.test(text)) ||
      (/Cannot read properties of undefined \\(reading '_classRegistryKey'\\)/.test(text) && /maplibre|web_worker_transfer|processTask|Worker/i.test(text)) ||
      /feature index out of bounds/i.test(text) ||
      (/AJAXError/i.test(text) && (/(blob:|pmtiles:\\/\\/|https?:\\/\\/|\\/api\\/|\\/data\\/)/i.test(text) || /Failed to fetch/i.test(text)))
    );
  }
  function remember(kind, message, stack) {
    var bucket = window.__crepSilencedErrors || (window.__crepSilencedErrors = []);
    bucket.push({ kind: kind, msg: String(message || ""), stack: String(stack || ""), ts: Date.now(), early: true });
    if (bucket.length > 40) bucket.shift();
  }
  window.addEventListener("error", function (event) {
    var err = event.error || {};
    var message = err.message || event.message || "";
    var stack = err.stack || "";
    if (isNonFatalMapLibreError(message, stack)) {
      remember("early-error", message, stack);
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);
  window.addEventListener("unhandledrejection", function (event) {
    var reason = event.reason || {};
    var message = reason.message || String(reason || "");
    var stack = reason.stack || "";
    if (isNonFatalMapLibreError(message, stack)) {
      remember("early-unhandledrejection", message, stack);
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);
})();
`

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={GeistSans.variable} suppressHydrationWarning>
        <Script
          id="crep-maplibre-dev-guard"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: crepMapLibreDevGuard }}
        />
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
