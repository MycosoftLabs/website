"use client"

import React, { useState } from "react"
import { cn } from "@/lib/utils"
import { DashboardSidebar } from "./dashboard-sidebar"
import { DashboardHeader } from "./dashboard-header"
import { Menu } from "lucide-react"

export type DashboardModule =
  | "overview"
  | "security"
  | "users"
  | "agents"
  | "services"
  | "access"
  | "api-keys"
  | "billing"
  | "database"
  | "settings"

interface DashboardShellProps {
  activeModule: DashboardModule
  onModuleChange: (module: DashboardModule) => void
  isSuperAdmin: boolean
  user: { email: string; displayName: string; avatarUrl: string | null; role: string; tier: string }
  onSignOut: () => void
  children: React.ReactNode
}

export function DashboardShell({
  activeModule,
  onModuleChange,
  isSuperAdmin,
  user,
  onSignOut,
  children,
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-dvh bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col">
      <DashboardHeader
        user={user}
        onSignOut={onSignOut}
        onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      <div className="flex flex-1 overflow-hidden">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <DashboardSidebar
          activeModule={activeModule}
          onModuleChange={(m) => {
            onModuleChange(m)
            setSidebarOpen(false)
          }}
          isSuperAdmin={isSuperAdmin}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
