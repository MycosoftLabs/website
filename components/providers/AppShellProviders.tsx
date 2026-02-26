"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { usePathname } from "next/navigation"
import { PresenceProvider } from "@/contexts/presence-context"
import { AppStateProvider } from "@/contexts/app-state-context"
import { MYCAProvider } from "@/contexts/myca-context"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { UnifiedVoiceProvider } from "@/components/voice/UnifiedVoiceProvider"
import { PersonaPlexProvider } from "@/components/voice/PersonaPlexProvider"
import { Toaster } from "sonner"

const MYCAFloatingButton = dynamic(
  () => import("@/components/myca/MYCAFloatingButton").then((m) => ({ default: m.MYCAFloatingButton })),
  { ssr: false }
)

const LIGHT_PUBLIC_ROUTES = new Set([
  "/",
  "/about",
  "/devices",
  "/research",
  "/science",
  "/terms",
  "/privacy",
  "/contact",
  "/support",
])

const LIGHT_PUBLIC_PREFIXES = ["/devices/", "/about/", "/research/", "/science/"]
const MYCA_PREFIXES = ["/search", "/myca", "/natureos", "/dashboard", "/defense", "/test-voice", "/apps"]
const VOICE_PREFIXES = ["/search", "/myca", "/natureos", "/test-voice", "/apps"]
const APP_STATE_PREFIXES = ["/search", "/myca", "/natureos", "/dashboard", "/defense", "/test-voice", "/apps", "/protocols"]

function startsWithAny(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

function isLightPublicRoute(pathname: string): boolean {
  return LIGHT_PUBLIC_ROUTES.has(pathname) || startsWithAny(pathname, LIGHT_PUBLIC_PREFIXES)
}

export function AppShellProviders({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/"
  const [hasUsedMyca, setHasUsedMyca] = useState(false)

  useEffect(() => {
    try {
      setHasUsedMyca(window.localStorage.getItem("myca_has_used") === "1")
    } catch {
      setHasUsedMyca(false)
    }
  }, [])

  const { enableMyca, enableVoice, showFloating, enableAppState, mycaAlwaysActive } = useMemo(() => {
    const lightPublic = isLightPublicRoute(pathname)
    const routeWantsMyca = startsWithAny(pathname, MYCA_PREFIXES)
    const routeWantsVoice = startsWithAny(pathname, VOICE_PREFIXES)
    const routeNeedsAppState = startsWithAny(pathname, APP_STATE_PREFIXES)

    const mycaEnabled = routeWantsMyca || (!lightPublic && hasUsedMyca)
    return {
      enableMyca: mycaEnabled,
      enableVoice: mycaEnabled && routeWantsVoice,
      showFloating: mycaEnabled,
      enableAppState: routeNeedsAppState,
      mycaAlwaysActive: pathname.startsWith("/search") || pathname.startsWith("/myca") || pathname.startsWith("/test-voice"),
    }
  }, [pathname, hasUsedMyca])

  let content: React.ReactNode = children

  // Build the page layout (MYCAFloatingButton goes inside MYCAProvider below)
  const pageLayout = (
    <>
      {/* suppressHydrationWarning: Cursor IDE browser may inject attributes into the DOM */}
      <div className="min-h-dvh flex flex-col relative" suppressHydrationWarning>
        <Header />
        <main className="flex-1 relative w-full overflow-x-hidden">{content}</main>
        <Footer />
      </div>
      {showFloating && <MYCAFloatingButton title="MYCA" />}
      <Toaster richColors position="top-right" />
    </>
  )

  // MYCAProvider must wrap MYCAFloatingButton (which calls useMYCA internally)
  let shell: React.ReactNode = pageLayout

  if (enableMyca) {
    shell = <MYCAProvider initialConsciousnessActive={mycaAlwaysActive}>{pageLayout}</MYCAProvider>
  }

  if (enableVoice) {
    shell = (
      <UnifiedVoiceProvider defaultMode="web-speech" autoConnect={false}>
        <PersonaPlexProvider>{shell}</PersonaPlexProvider>
      </UnifiedVoiceProvider>
    )
  }

  const shellWithProviders = shell

  return (
    <PresenceProvider>
      {enableAppState ? <AppStateProvider>{shellWithProviders}</AppStateProvider> : shellWithProviders}
    </PresenceProvider>
  )
}
