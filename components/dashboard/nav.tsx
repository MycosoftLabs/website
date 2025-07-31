"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  Bug,
  Cloud,
  Code,
  Database,
  FileText,
  Gauge,
  Globe,
  Home,
  LineChart,
  Microscope,
  MouseIcon,
  Network,
  PipetteIcon,
  Settings,
  Zap,
} from "lucide-react"
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar"

export function DashboardNav() {
  const pathname = usePathname()
  const isOpen = true // Assuming isOpen is always true for this example.  In a real scenario, this would be managed by state.

  const isActive = (path: string) => {
    return pathname === path
  }

  return (
    <div className="flex flex-col gap-4 py-2">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild isActive={isActive("/natureos")} tooltip="Home">
            <Link href="/natureos">
              <Home className="h-4 w-4" />
              <span className="transition-all duration-300">{isOpen ? "Home" : ""}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton asChild isActive={isActive("/natureos/mycelium-network")} tooltip="Mycelium Network">
            <Link href="/natureos/mycelium-network">
              <Network className="h-4 w-4" />
              <span className="transition-all duration-300">{isOpen ? "Mycelium Network" : ""}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton asChild isActive={isActive("/natureos/devices")} tooltip="Devices">
            <Link href="/natureos/devices">
              <MouseIcon className="h-4 w-4" />
              <span className="transition-all duration-300">{isOpen ? "Devices" : ""}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton asChild isActive={isActive("/natureos/analytics")} tooltip="Analytics">
            <Link href="/natureos/analytics">
              <BarChart3 className="h-4 w-4" />
              <span className="transition-all duration-300">{isOpen ? "Analytics" : ""}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>

      <div className="px-3 py-2">
        <h3 className="mb-2 text-xs font-medium text-gray-400">Applications</h3>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive("/natureos/apps/petri-dish-sim")}
              tooltip="Petri Dish Simulator"
            >
              <Link href="/natureos/apps/petri-dish-sim">
                <PipetteIcon className="h-4 w-4" />
                <span className="transition-all duration-300">{isOpen ? "Petri Dish Simulator" : ""}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/natureos/apps/fungal-database")} tooltip="Fungal Database">
              <Link href="/natureos/apps/fungal-database">
                <Database className="h-4 w-4" />
                <span className="transition-all duration-300">{isOpen ? "Fungal Database" : ""}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/natureos/apps/mushroom-sim")} tooltip="Mushroom Simulator">
              <Link href="/natureos/apps/mushroom-sim">
                <Microscope className="h-4 w-4" />
                <span className="transition-all duration-300">{isOpen ? "Mushroom Simulator" : ""}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/natureos/apps/compound-sim")} tooltip="Compound Analyzer">
              <Link href="/natureos/apps/compound-sim">
                <Bug className="h-4 w-4" />
                <span className="transition-all duration-300">{isOpen ? "Compound Analyzer" : ""}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/natureos/apps/spore-tracker")} tooltip="Spore Tracker">
              <Link href="/natureos/apps/spore-tracker">
                <Globe className="h-4 w-4" />
                <span className="transition-all duration-300">{isOpen ? "Spore Tracker" : ""}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/natureos/apps/ancestry")} tooltip="Ancestry Database">
              <Link href="/natureos/apps/ancestry">
                <Database className="h-4 w-4" />
                <span className="transition-all duration-300">{isOpen ? "Ancestry Database" : ""}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive("/natureos/apps/growth-analytics")}
              tooltip="Growth Analytics"
            >
              <Link href="/natureos/apps/growth-analytics">
                <LineChart className="h-4 w-4" />
                <span className="transition-all duration-300">{isOpen ? "Growth Analytics" : ""}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </div>

      <div className="px-3 py-2">
        <h3 className="mb-2 text-xs font-medium text-gray-400">System</h3>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/natureos/api-console")} tooltip="API Console">
              <Link href="/natureos/api-console">
                <Code className="h-4 w-4" />
                <span className="transition-all duration-300">{isOpen ? "API Console" : ""}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/natureos/cloud-storage")} tooltip="Cloud Storage">
              <Link href="/natureos/cloud-storage">
                <Cloud className="h-4 w-4" />
                <span className="transition-all duration-300">{isOpen ? "Cloud Storage" : ""}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/natureos/performance")} tooltip="Performance">
              <Link href="/natureos/performance">
                <Gauge className="h-4 w-4" />
                <span className="transition-all duration-300">{isOpen ? "Performance" : ""}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/natureos/energy")} tooltip="Energy Usage">
              <Link href="/natureos/energy">
                <Zap className="h-4 w-4" />
                <span className="transition-all duration-300">{isOpen ? "Energy Usage" : ""}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/natureos/documentation")} tooltip="Documentation">
              <Link href="/natureos/documentation">
                <FileText className="h-4 w-4" />
                <span className="transition-all duration-300">{isOpen ? "Documentation" : ""}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/natureos/settings")} tooltip="Settings">
              <Link href="/natureos/settings">
                <Settings className="h-4 w-4" />
                <span className="transition-all duration-300">{isOpen ? "Settings" : ""}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </div>
    </div>
  )
}
