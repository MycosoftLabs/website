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

const UnifiedMYCAFAB = dynamic(
  () => import("@/components/myca/UnifiedMYCAFAB").then((m) => ({ default: m.UnifiedMYCAFAB })),
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
const MYCA_PREFIXES = ["/search", "/myca", "/natureos", "/dashboard", "/defense", "/test-voice", "/apps", "/scientific", "/admin"]
const VOICE_PREFIXES = ["/search", "/myca", "/natureos", "/test-voice", "/apps"]
const APP_STATE_PREFIXES = ["/search", "/myca", "/natureos", "/dashboard", "/defense", "/test-voice", "/apps", "/protocols", "/scientific", "/admin"]

function startsWithAny(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

/** Page context for MYCA — improves replies when Morgan is on specific surfaces. */
function getPageContextForMYCA(pathname: string): string {
  const p = pathname || ""
  if (p.startsWith("/dashboard/morgan")) return "User is on Morgan Oversight (MYCA control, grounding, tasks)."
  if (p.startsWith("/dashboard/crep")) return "User is viewing the CREP dashboard (global situational awareness)."
  if (p.startsWith("/dashboard/devices")) return "User is viewing the Device Dashboard (network devices, MycoBrain)."
  if (p.startsWith("/dashboard/grounding")) return "User is viewing the Grounding dashboard (EP stream, ThoughtObjects)."
  if (p.startsWith("/dashboard/soc")) return "User is viewing the SOC (Security Operations) dashboard."
  if (p.startsWith("/dashboard")) return "User is on the main dashboard."
  if (p.startsWith("/search")) return "User is on Fluid Search (species, compounds, genetics, research)."
  if (p.startsWith("/myca")) return "User is on the MYCA agent interface."
  if (p.startsWith("/natureos")) return "User is on NatureOS (workflows, devices, lab tools)."
  if (p.startsWith("/defense")) return "User is viewing defense/FUSARIUM surfaces."
  if (p.startsWith("/test-voice")) return "User is on the voice test page."
  if (p.startsWith("/apps")) return "User is in the apps section."
  if (p.startsWith("/scientific")) return "User is in the scientific dashboards."
  if (p.startsWith("/admin")) return "User is in the admin control panel."
  return ""
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

  const pageContext = getPageContextForMYCA(pathname)
  const getContextText = pageContext
    ? () => `[Context: ${pageContext}]`
    : undefined

  // Build the page layout (MYCAFloatingButton goes inside MYCAProvider below)
  const pageLayout = (
    <>
      {/* suppressHydrationWarning: Cursor IDE browser may inject attributes into the DOM */}
      <div className="min-h-dvh flex flex-col relative" suppressHydrationWarning>
        <Header />
        <main className="flex-1 relative w-full overflow-x-hidden">{content}</main>
        <Footer />
      </div>
      {showFloating && enableVoice ? (
        <UnifiedMYCAFAB title="MYCA" showVoice getContextText={getContextText} />
      ) : showFloating ? (
        <MYCAFloatingButton title="MYCA" getContextText={getContextText} />
      ) : null}
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
        <PersonaPlexProvider renderFloatingWidget={!showFloating}>
          {shell}
        </PersonaPlexProvider>
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
