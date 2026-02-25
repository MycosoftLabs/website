import type React from "react"
import type { Viewport } from "next"
import { Geist } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/contexts/auth-context"
import { AppShellProviders } from "@/components/providers/AppShellProviders"
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
            <AppShellProviders>{children}</AppShellProviders>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
