/**
 * Dashboard Layout
 * 
 * Provides a fullscreen layout for dashboard pages like CREP.
 * Hides the global header and footer using CSS classes on mount.
 */
"use client"

import { useEffect } from "react"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    // Add class to hide header/footer for fullscreen dashboard
    document.documentElement.classList.add("dashboard-fullscreen")
    document.body.classList.add("dashboard-fullscreen")
    
    return () => {
      // Remove class when leaving dashboard
      document.documentElement.classList.remove("dashboard-fullscreen")
      document.body.classList.remove("dashboard-fullscreen")
    }
  }, [])

  // Pass children through directly - CREP page handles its own fullscreen layout
  return <>{children}</>
}
