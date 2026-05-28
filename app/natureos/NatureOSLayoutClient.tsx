"use client"

import type React from "react"
import { DashboardNav } from "@/components/dashboard/nav"
import { TopNav } from "@/components/dashboard/top-nav"
import { NavigationTitle } from "@/components/dashboard/navigation-title"
import { SidebarProvider, Sidebar, SidebarContent, SidebarTrigger } from "@/components/ui/sidebar"
import { AutoGateWrapper } from "@/components/access/auto-gate-wrapper"
import { NeuromorphicProvider } from "@/components/ui/neuromorphic"

export default function NatureOSLayoutClient({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <NeuromorphicProvider>
    <div className="natureos-glass-page min-h-dvh flex flex-col bg-[#eef4f8] text-slate-950 dark:bg-[#0A1929] dark:text-white">
      <TopNav />
      {/*
        defaultOpen={false} → sidebar starts CLOSED on mobile (overlay Sheet),
        open on desktop. Users tap the SidebarTrigger to reveal it.
        This gives full-width content area on phones/tablets by default.
      */}
      <SidebarProvider defaultOpen={false}>
        {/* Use dvh so the panel height is correct when mobile browser chrome shows/hides */}
        <div className="flex flex-1 h-[calc(100dvh-3rem)] md:h-[calc(100dvh-3.5rem)] transition-all duration-300">
          {/* Sidebar — overlays on mobile (Sheet), pushes on desktop */}
          <Sidebar className="natureos-sidebar-shell border-r border-white/30 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/45">
            <div className="flex items-center justify-between p-2">
              <NavigationTitle />
              <SidebarTrigger className="min-h-11 min-w-11" aria-label="Open NatureOS menu" />
            </div>
            <SidebarContent className="h-full">
              <div className="overflow-y-auto h-full">
                <DashboardNav />
              </div>
            </SidebarContent>
          </Sidebar>
          {/* Main content — full width on mobile when sidebar is closed */}
          <div className="flex-1 overflow-hidden transition-all duration-300 w-full min-w-0">
            {/* Compact sidebar trigger — only on tablet (sm-lg), hidden on phone and desktop */}
            <div className="hidden sm:flex lg:hidden items-center gap-2 px-3 py-1.5 border-b border-white/25 bg-white/65 backdrop-blur-xl dark:border-white/10 dark:bg-[#0A1929]/80">
              <SidebarTrigger
                className="text-gray-400 hover:text-white min-h-11 min-w-11"
                aria-label="Toggle NatureOS menu"
              />
              <span className="text-xs text-gray-500">Toggle Menu</span>
            </div>
            <main className="w-full h-full overflow-y-auto">
              <AutoGateWrapper>{children}</AutoGateWrapper>
            </main>
          </div>
        </div>
      </SidebarProvider>
      {/* MYCA chat FAB is rendered by AppShellProviders (MYCAFloatingButton) - no duplicate here */}
    </div>
    </NeuromorphicProvider>
  )
}
