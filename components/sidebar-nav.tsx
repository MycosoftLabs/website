"use client"

import type React from "react"

import { useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Cloud,
  Menu,
  Home,
  PipetteIcon,
  Microscope,
  FileText,
  Gauge,
  Settings,
  Globe,
  Bug,
  BarChart3,
  MouseIcon,
  Network,
  Code,
  Database,
  LineChart,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface SidebarNavProps {
  className?: string
}

const navItems = [
  { href: "/natureos", label: "Home", icon: Home },
  { href: "/natureos/mycelium-network", label: "Mycelium Network", icon: Network },
  { href: "/natureos/devices", label: "Devices", icon: MouseIcon },
  { href: "/natureos/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/natureos/apps/petri-dish-sim", label: "Petri Dish Simulator", icon: PipetteIcon },
  { href: "/natureos/apps/mushroom-sim", label: "Mushroom Simulator", icon: Microscope },
  { href: "/natureos/apps/compound-sim", label: "Compound Analyzer", icon: Bug },
  { href: "/natureos/apps/spore-tracker", label: "Spore Tracker", icon: Globe },
  { href: "/natureos/apps/fungal-database", label: "Fungal Database", icon: Database },
  { href: "/natureos/apps/ancestry", label: "Ancestry", icon: Database },
  { href: "/natureos/apps/growth-analytics", label: "Growth Analytics", icon: LineChart },
  { href: "/natureos/api-console", label: "API Console", icon: Code },
  { href: "/natureos/cloud-storage", label: "Cloud Storage", icon: Cloud },
  { href: "/natureos/performance", label: "Performance", icon: Gauge },
  { href: "/natureos/documentation", label: "Documentation", icon: FileText },
  { href: "/natureos/settings", label: "Settings", icon: Settings },
]

export function SidebarNav({ className }: SidebarNavProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const router = useRouter()

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed)
  }

  const handleLinkClick = useCallback(
    (href: string, event: React.MouseEvent<HTMLAnchorElement>) => {
      if (isCollapsed) {
        event.preventDefault()
        router.push(href)
      }
    },
    [isCollapsed, router],
  )

  return (
    <div
      className={cn(
        "flex flex-col h-full border-r border-gray-800 transition-all duration-300",
        isCollapsed ? "w-16" : "w-64",
        "md:sticky md:top-14", // Keep sticky positioning but allow width to change
        className,
      )}
    >
      <div className="p-2 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={toggleCollapse}>
          {isCollapsed ? <Menu className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          <span className="sr-only">Toggle Sidebar</span>
        </Button>
      </div>
      <nav className="flex-1 flex flex-col space-y-1 p-2">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className="group" onClick={(e) => handleLinkClick(item.href, e)}>
            <div
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                isCollapsed && "justify-center",
              )}
            >
              <item.icon className="h-4 w-4" />
              {!isCollapsed && <span>{item.label}</span>}
            </div>
          </Link>
        ))}
      </nav>
    </div>
  )
}
