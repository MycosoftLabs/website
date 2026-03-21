"use client"

import { usePathname } from "next/navigation"
import { getRouteAccess, isPublicRoute } from "@/lib/access/routes"
import { AccessGate } from "@/lib/access/types"
import { GateWrapper } from "./gate-wrapper"

export function AutoGateWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  if (!pathname) return <>{children}</>
  
  const routeConfig = getRouteAccess(pathname)
  
  // If no specific gate found or it's public/freemium, just render
  if (!routeConfig || isPublicRoute(pathname) || routeConfig.gate === AccessGate.FREEMIUM) {
    return <>{children}</>
  }

  return (
    <GateWrapper gate={routeConfig.gate} className="h-full w-full">
      {children}
    </GateWrapper>
  )
}
