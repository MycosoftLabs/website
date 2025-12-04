"use client"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"
import {
  Home,
  FlaskConical,
  Microscope,
  Database,
  Globe,
  LineChart,
  Network,
  Bot,
  Boxes,
  Activity,
  PipetteIcon,
  Code,
  Cpu,
  Workflow,
  Binary,
  Braces,
  Terminal,
  Cloud,
  Layers,
  Settings,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSidebar } from "@/components/ui/sidebar"

const navItems = {
  apps: [
    { title: "Overview", href: "/natureos", icon: Home },
    { title: "Petri Dish Simulator", href: "/apps/petri-dish-sim", icon: PipetteIcon },
    { title: "Mushroom Simulator", href: "/apps/mushroom-sim", icon: Microscope },
    { title: "Compound Analyzer", href: "/apps/compound-sim", icon: FlaskConical },
    { title: "Spore Tracker", href: "/apps/spore-tracker", icon: Globe },
    { title: "Ancestry Database", href: "/ancestry", icon: Database },
    { title: "Growth Analytics", href: "/apps/growth-analytics", icon: LineChart },
  ],
  ai: [
    { title: "Myca AI Studio", href: "/natureos/ai-studio", icon: Bot },
    { title: "Model Training", href: "/natureos/model-training", icon: Cpu },
    { title: "Workflows", href: "/natureos/workflows", icon: Workflow },
  ],
  development: [
    { title: "API Gateway", href: "/natureos/api", icon: Code },
    { title: "Functions", href: "/natureos/functions", icon: Binary },
    { title: "SDK", href: "/natureos/sdk", icon: Braces },
    { title: "Cloud Shell", href: "/natureos/shell", icon: Terminal },
  ],
  infrastructure: [
    { title: "Device Network", href: "/natureos/devices", icon: Network },
    { title: "Storage", href: "/natureos/storage", icon: Database },
    { title: "Containers", href: "/natureos/containers", icon: Boxes },
    { title: "Monitoring", href: "/natureos/monitoring", icon: Activity },
  ],
  platform: [
    { title: "Cloud Services", href: "/natureos/cloud", icon: Cloud },
    { title: "Integration Hub", href: "/natureos/integrations", icon: Layers },
    { title: "Settings", href: "/natureos/settings", icon: Settings },
  ],
}

export function DashboardNav() {
  const pathname = usePathname()
  const { isOpen } = useSidebar()

  return (
    <div className="h-full py-4">
      {(Object.keys(navItems) as Array<keyof typeof navItems>).map((section) => (
        <SidebarGroup key={section}>
          {isOpen && <SidebarGroupLabel>{section.charAt(0).toUpperCase() + section.slice(1)}</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems[section].map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.title}>
                    <Link href={item.href} className="flex items-center">
                      <item.icon className="h-4 w-4 mr-2" />
                      {isOpen && <span className="truncate">{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </div>
  )
}
