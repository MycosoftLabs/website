"use client"

import type React from "react"
import { DashboardNav } from "@/components/dashboard/nav"
import { TopNav } from "@/components/dashboard/top-nav"
import { NavigationTitle } from "@/components/dashboard/navigation-title"
import { SidebarProvider, Sidebar, SidebarContent, SidebarTrigger } from "@/components/ui/sidebar"

export default function NatureOSLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-dvh flex flex-col bg-[#0A1929] text-white">
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
          <Sidebar className="border-r border-gray-800">
            <div className="flex items-center justify-between p-2">
              <NavigationTitle />
              <SidebarTrigger />
            </div>
            <SidebarContent className="h-full">
              <div className="overflow-y-auto h-full">
                <DashboardNav />
              </div>
            </SidebarContent>
          </Sidebar>
          {/* Main content — full width on mobile when sidebar is closed */}
          <div className="flex-1 overflow-hidden transition-all duration-300 w-full">
            {/* SidebarTrigger visible on mobile as a floating toggle */}
            <div className="md:hidden flex items-center gap-2 px-3 py-2 border-b border-gray-800 bg-[#0A1929]">
              <SidebarTrigger className="text-gray-400 hover:text-white" />
              <span className="text-sm text-gray-400">Menu</span>
            </div>
            <main className="w-full h-full">{children}</main>
          </div>
        </div>
      </SidebarProvider>
    </div>
  )
}
