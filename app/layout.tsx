import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Mycosoft - Advanced Mycological Research Platform",
  description:
    "Explore the world of fungi with our comprehensive database, AI-powered identification tools, and cutting-edge research platform.",
  keywords: "mycology, fungi, mushrooms, research, identification, database, AI",
  authors: [{ name: "Mycosoft Research Team" }],
  openGraph: {
    title: "Mycosoft - Advanced Mycological Research Platform",
    description: "Explore the world of fungi with our comprehensive database and AI-powered tools.",
    url: "https://mycosoft.com",
    siteName: "Mycosoft",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Mycosoft - Mycological Research Platform",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mycosoft - Advanced Mycological Research Platform",
    description: "Explore the world of fungi with our comprehensive database and AI-powered tools.",
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <div className="min-h-screen bg-background flex flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
