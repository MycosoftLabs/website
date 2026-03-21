"use client"

import React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import type { DashboardModule } from "./dashboard-shell"
import {
  LayoutDashboard,
  Shield,
  Users,
  Bot,
  Server,
  Lock,
  Key,
  CreditCard,
  Database,
  Settings,
  Globe,
  Brain,
  Cpu,
  Crown,
  X,
  Map,
} from "lucide-react"

interface SidebarItem {
  id: DashboardModule
  label: string
  icon: React.ElementType
  adminOnly?: boolean
}

const MODULES: SidebarItem[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "security", label: "Security", icon: Shield, adminOnly: true },
  { id: "users", label: "Users", icon: Users, adminOnly: true },
  { id: "agents", label: "Agents", icon: Bot, adminOnly: true },
  { id: "services", label: "Services", icon: Server, adminOnly: true },
  { id: "access", label: "Access Gates", icon: Lock, adminOnly: true },
  { id: "api-keys", label: "API Keys", icon: Key, adminOnly: true },
  { id: "billing", label: "Billing", icon: CreditCard, adminOnly: true },
  { id: "database", label: "Database", icon: Database, adminOnly: true },
  { id: "settings", label: "Settings", icon: Settings, adminOnly: true },
]

interface SubDashLink {
  href: string
  label: string
  icon: React.ElementType
  adminOnly?: boolean
}

const SUB_DASHBOARDS: SubDashLink[] = [
  { href: "/dashboard/crep", label: "CREP Map", icon: Map },
  { href: "/dashboard/soc", label: "SOC View", icon: Shield },
  { href: "/dashboard/grounding", label: "Grounding", icon: Brain },
  { href: "/dashboard/devices", label: "Devices", icon: Cpu },
  { href: "/dashboard/morgan", label: "Morgan Oversight", icon: Crown, adminOnly: true },
]

interface DashboardSidebarProps {
  activeModule: DashboardModule
  onModuleChange: (module: DashboardModule) => void
  isSuperAdmin: boolean
  isOpen: boolean
  onClose: () => void
}

export function DashboardSidebar({
  activeModule,
  onModuleChange,
  isSuperAdmin,
  isOpen,
  onClose,
}: DashboardSidebarProps) {
  const visibleModules = MODULES.filter((m) => !m.adminOnly || isSuperAdmin)
  const visibleSubDashboards = SUB_DASHBOARDS.filter((s) => !s.adminOnly || isSuperAdmin)

  return (
    <aside
      className={cn(
        "fixed md:relative z-40 md:z-auto flex-shrink-0 w-64 bg-slate-900/80 border-r border-slate-800 flex flex-col h-[calc(100dvh-4rem)] transition-transform duration-200",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}
    >
      {/* Mobile close button */}
      <div className="flex items-center justify-between px-4 py-3 md:hidden border-b border-slate-800">
        <span className="text-sm font-medium text-white">Navigation</span>
        <button onClick={onClose} className="text-slate-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        <div className="px-2 mb-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Modules</span>
        </div>
        {visibleModules.map((item) => {
          const Icon = item.icon
          const active = activeModule === item.id
          return (
            <button
              key={item.id}
              onClick={() => onModuleChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </button>
          )
        })}

        <div className="my-4 border-t border-slate-800" />

        <div className="px-2 mb-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Dashboards</span>
        </div>
        {visibleSubDashboards.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors"
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="px-4 py-3 border-t border-slate-800">
        <Link
          href="/"
          className="text-xs text-slate-500 hover:text-white transition-colors"
        >
          Back to Site
        </Link>
      </div>
    </aside>
  )
}
