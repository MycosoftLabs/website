"use client"

import type React from "react"
import { useEffect, useMemo } from "react"
import dynamic from "next/dynamic"
import { usePathname } from "next/navigation"
import { PresenceProvider } from "@/contexts/presence-context"
import { AppStateProvider } from "@/contexts/app-state-context"
import { MYCAProvider } from "@/contexts/myca-context"
import { AvaniProvider } from "@/contexts/avani-context"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { SiteVoiceStubProvider } from "@/components/voice/UnifiedVoiceProvider"
import { Toaster } from "sonner"

const MYCAFloatingButton = dynamic(
  () => import("@/components/myca/MYCAFloatingButton").then((m) => ({ default: m.MYCAFloatingButton })),
  { ssr: false }
)

/** Routes that actually render MYCA-dependent UI. Keep this tight so NatureOS/Defense/CREP hubs do not mount MYCA + voice stubs until the user opens these surfaces. */
const MYCA_PREFIXES = [
  "/search",
  "/myca",
  "/test-voice",
  "/test-fluid-search",
  "/natureos/ai-studio",
  "/scientific",
  "/dashboard",
  "/admin",
]

/**
 * AppStateProvider syncs tool state to Supabase — currently unused by pages (no useToolState consumers).
 * Keep empty to avoid extra client work on NatureOS/Defense/marketing paths. When a route uses useToolState,
 * add its prefix here.
 */
const APP_STATE_PREFIXES: string[] = []
const NATIVE_MYCA_INTERFACE_PREFIXES = [
  "/test-voice",
  "/search",
  "/dashboard/crep",
  "/myca",
  "/natureos/ai-studio",
]

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

function hasNativeMycaInterface(pathname: string): boolean {
  return startsWithAny(pathname, NATIVE_MYCA_INTERFACE_PREFIXES)
}

export function AppShellProviders({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/"

  useEffect(() => {
    document.body.classList.remove("hub-silo")
  }, [])

  const { enableMyca, showFloating, enableAppState, mycaAlwaysActive } = useMemo(() => {
    const routeWantsMyca = startsWithAny(pathname, MYCA_PREFIXES)
    const routeNeedsAppState = startsWithAny(pathname, APP_STATE_PREFIXES)

    const nativeMycaInterface = hasNativeMycaInterface(pathname)
    return {
      enableMyca: routeWantsMyca,
      showFloating: routeWantsMyca && !nativeMycaInterface,
      enableAppState: routeNeedsAppState,
      mycaAlwaysActive:
        pathname.startsWith("/search") ||
        pathname.startsWith("/myca") ||
        pathname.startsWith("/test-voice") ||
        pathname.startsWith("/test-fluid-search") ||
        pathname.startsWith("/natureos/ai-studio"),
    }
  }, [pathname])

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
      {showFloating ? (
        <MYCAFloatingButton title="MYCA" getContextText={getContextText} />
      ) : null}
      <Toaster richColors position="top-right" />
    </>
  )

  // MYCAProvider must wrap MYCAFloatingButton (which calls useMYCA internally)
  let shell: React.ReactNode = pageLayout

  if (enableMyca) {
    shell = (
      <SiteVoiceStubProvider>
        <AvaniProvider>
          <MYCAProvider initialConsciousnessActive={mycaAlwaysActive}>{pageLayout}</MYCAProvider>
        </AvaniProvider>
      </SiteVoiceStubProvider>
    )
  }

  const shellWithProviders = shell

  return (
    <PresenceProvider>
      {enableAppState ? <AppStateProvider>{shellWithProviders}</AppStateProvider> : shellWithProviders}
    </PresenceProvider>
  )
}
