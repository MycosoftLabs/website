import type React from "react"
import { Geist } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/contexts/auth-context"
import { AppStateProvider } from "@/contexts/app-state-context"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { UnifiedVoiceProvider } from "@/components/voice/UnifiedVoiceProvider"
import { PersonaPlexProvider } from "@/components/voice/PersonaPlexProvider"
import { FloatingVoiceButton } from "@/components/voice/VoiceButton"
import { Toaster } from "sonner"
import "./globals.css"

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap", // Prevent font blocking
})

export const metadata = {
  title: "Mycosoft - Building The Earth Intelligence",
  description: "Building The Earth Intelligence - AI-powered mycology research, fungal computing, and environmental monitoring platform",
  generator: 'v0.app'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={geistSans.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <AppStateProvider>
              <UnifiedVoiceProvider defaultMode="web-speech" autoConnect={false}>
                <PersonaPlexProvider>
                  <div className="min-h-screen flex flex-col relative">
                    <Header />
                    <main className="flex-1 relative w-full overflow-x-hidden">{children}</main>
                    <Footer />
                  </div>
                  <FloatingVoiceButton />
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
