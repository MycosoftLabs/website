import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/contexts/auth-context"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Mycosoft - Fungal Intelligence Platform",
  description: "Advanced fungal research and intelligence platform powered by AI and IoT devices",
  keywords: ["fungi", "mushrooms", "research", "AI", "IoT", "mycology", "biotechnology"],
  authors: [{ name: "Mycosoft Team" }],
  creator: "Mycosoft",
  publisher: "Mycosoft",
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://mycosoft.org",
    title: "Mycosoft - Fungal Intelligence Platform",
    description: "Advanced fungal research and intelligence platform powered by AI and IoT devices",
    siteName: "Mycosoft",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mycosoft - Fungal Intelligence Platform",
    description: "Advanced fungal research and intelligence platform powered by AI and IoT devices",
    creator: "@mycosoft",
  },
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <div className="relative flex min-h-screen flex-col">
              <Header />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
