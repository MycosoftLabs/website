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
    document.body.classList.add("dashboard-fullscreen")
    
    return () => {
      // Remove class when leaving dashboard
      document.body.classList.remove("dashboard-fullscreen")
    }
  }, [])

  return (
    <div className="dashboard-container h-screen w-screen overflow-hidden">
      {children}
    </div>
  )
}
