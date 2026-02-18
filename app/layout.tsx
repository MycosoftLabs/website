import type React from "react"
import type { Viewport } from "next"
import { Geist } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/contexts/auth-context"
import { AppStateProvider } from "@/contexts/app-state-context"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { UnifiedVoiceProvider } from "@/components/voice/UnifiedVoiceProvider"
import { PersonaPlexProvider } from "@/components/voice/PersonaPlexProvider"
import { Toaster } from "sonner"
import "./globals.css"

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
})

export const metadata = {
  title: "Mycosoft - Building The Earth Intelligence",
  description: "Building The Earth Intelligence - AI-powered mycology research, fungal computing, and environmental monitoring platform",
  generator: 'v0.app'
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
      <body className={geistSans.className} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <AppStateProvider>
              <UnifiedVoiceProvider defaultMode="web-speech" autoConnect={false}>
                <PersonaPlexProvider>
                  {/* suppressHydrationWarning: Cursor IDE browser may inject data-cursor-ref into DOM, causing hydration mismatch only in that environment */}
                  <div className="min-h-dvh flex flex-col relative" suppressHydrationWarning>
                    <Header />
                    <main className="flex-1 relative w-full overflow-x-hidden">{children}</main>
                    <Footer />
                  </div>
                  {/* PersonaPlexProvider renders the ONE floating mic widget (bottom-right).
                      It suppresses itself on /search and /test-voice which have their own mic. */}
                  <Toaster richColors position="top-right" />
                </PersonaPlexProvider>
              </UnifiedVoiceProvider>
            </AppStateProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
