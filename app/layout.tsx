import type React from "react"
import { Geist } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/contexts/auth-context"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import "./globals.css"
import Script from "next/script"

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
})

// Force dynamic rendering for all pages (client components like useSidebar need runtime)
export const dynamic = 'force-dynamic'

export const metadata = {
  title: "Mycosoft - The Fungal Intelligence Platform",
  description: "Search engine and tools for mycology research and fungal intelligence",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://atlas.microsoft.com/sdk/javascript/mapcontrol/3/atlas.min.css"
          type="text/css"
        />
      </head>
      <body className={geistSans.className}>
        <Script
          src="https://atlas.microsoft.com/sdk/javascript/mapcontrol/3/atlas.min.js"
          strategy="beforeInteractive"
        />
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <div className="min-h-screen flex flex-col relative">
              <Header />
              <main className="flex-1 relative w-full overflow-x-hidden">{children}</main>
              <Footer />
            </div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
