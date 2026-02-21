"use client"

import { useState } from "react"
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
  ChevronDown,
  ChevronRight,
  Brain,
  Wrench,
  FileText,
  Wifi,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSidebar } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

interface NavItem {
  title: string
  href: string
  icon: LucideIcon
}

interface NavSection {
  title: string
  key: string
  items: NavItem[]
  defaultOpen?: boolean
}

const navSections: NavSection[] = [
  {
    title: "Apps",
    key: "apps",
    defaultOpen: true,
    items: [
      { title: "Overview", href: "/natureos", icon: Home },
      { title: "Fungi Compute", href: "/natureos/fungi-compute", icon: Brain },
      { title: "Earth Simulator", href: "/apps/earth-simulator", icon: Globe },
      { title: "Petri Dish Simulator", href: "/apps/petri-dish-sim", icon: PipetteIcon },
      { title: "Mushroom Simulator", href: "/apps/mushroom-sim", icon: Microscope },
      { title: "Compound Analyzer", href: "/apps/compound-sim", icon: FlaskConical },
      { title: "Spore Tracker", href: "/apps/spore-tracker", icon: Globe },
      { title: "Ancestry Database", href: "/ancestry", icon: Database },
      { title: "Growth Analytics", href: "/apps/growth-analytics", icon: LineChart },
    ],
  },
  {
    title: "AI",
    key: "ai",
    defaultOpen: true,
    items: [
      { title: "Myca AI Studio", href: "/natureos/ai-studio", icon: Bot },
      { title: "Model Training", href: "/natureos/model-training", icon: Cpu },
      { title: "Workflows", href: "/natureos/workflows", icon: Workflow },
    ],
  },
  {
    title: "Tools",
    key: "tools",
    defaultOpen: false,
    items: [
      { title: "MATLAB Tools", href: "/natureos/tools/matlab", icon: Wrench },
      { title: "Genetics Tools", href: "/natureos/genetics", icon: Microscope },
      { title: "Lab Tools", href: "/natureos/lab-tools", icon: FlaskConical },
      { title: "Data Explorer", href: "/natureos/data-explorer", icon: Database },
      { title: "Simulation", href: "/natureos/simulation", icon: Cpu },
      { title: "Biotech Suite", href: "/natureos/biotech", icon: PipetteIcon },
      { title: "Reports", href: "/natureos/reports", icon: FileText },
      { title: "Smell Training", href: "/natureos/smell-training", icon: Activity },
      { title: "WiFiSense", href: "/natureos/wifisense", icon: Wifi },
      { title: "Innovation: Earth Simulator", href: "/natureos/tools/earth-simulator", icon: Globe },
      { title: "Innovation: Petri Dish", href: "/natureos/tools/petri-dish", icon: PipetteIcon },
      { title: "Innovation: Mushroom Sim", href: "/natureos/tools/mushroom-sim", icon: Microscope },
      { title: "Innovation: Compound Sim", href: "/natureos/tools/compound-sim", icon: FlaskConical },
      { title: "Innovation: Growth Analytics", href: "/natureos/tools/growth-analytics", icon: LineChart },
      { title: "Innovation: Genetic Circuit", href: "/natureos/tools/genetic-circuit", icon: Binary },
      { title: "Innovation: Retrosynthesis", href: "/natureos/tools/retrosynthesis", icon: Braces },
      { title: "Innovation: Alchemy Lab", href: "/natureos/tools/alchemy-lab", icon: FlaskConical },
      { title: "Innovation: Digital Twin", href: "/natureos/tools/digital-twin", icon: Boxes },
      { title: "Innovation: Physics Sim", href: "/natureos/tools/physics-sim", icon: Cpu },
      { title: "Innovation: Symbiosis", href: "/natureos/tools/symbiosis", icon: Layers },
      { title: "Innovation: Spore Tracker", href: "/natureos/tools/spore-tracker", icon: Globe },
      { title: "Innovation: Lifecycle Sim", href: "/natureos/tools/lifecycle-sim", icon: LineChart },
    ],
  },
  {
    title: "Development",
    key: "development",
    defaultOpen: false,
    items: [
      { title: "API Gateway", href: "/natureos/api", icon: Code },
      { title: "Functions", href: "/natureos/functions", icon: Binary },
      { title: "SDK", href: "/natureos/sdk", icon: Braces },
      { title: "Cloud Shell", href: "/natureos/shell", icon: Terminal },
    ],
  },
  {
    title: "Infrastructure",
    key: "infrastructure",
    defaultOpen: false,
    items: [
      { title: "Device Network", href: "/natureos/devices", icon: Network },
      { title: "MINDEX", href: "/natureos/mindex", icon: Database },
      { title: "Storage", href: "/natureos/storage", icon: Layers },
      { title: "Containers", href: "/natureos/containers", icon: Boxes },
      { title: "Monitoring", href: "/natureos/monitoring", icon: Activity },
    ],
  },
  {
    title: "Platform",
    key: "platform",
    defaultOpen: false,
    items: [
      { title: "Cloud Services", href: "/natureos/cloud", icon: Cloud },
      { title: "Integration Hub", href: "/natureos/integrations", icon: Layers },
      { title: "Settings", href: "/natureos/settings", icon: Settings },
    ],
  },
]

function CollapsibleSection({ section, pathname, isOpen: sidebarOpen }: { section: NavSection; pathname: string; isOpen: boolean }) {
  // Check if any item in this section is active
  const hasActiveItem = section.items.some(item => pathname === item.href || pathname.startsWith(item.href + "/"))
  
  // Open by default if section has active item or if defaultOpen is true
  const [isExpanded, setIsExpanded] = useState(section.defaultOpen || hasActiveItem)

  const handleToggle = () => {
    if (sidebarOpen) {
      setIsExpanded(!isExpanded)
    }
  }

  return (
    <SidebarGroup>
      {sidebarOpen ? (
        <button
          onClick={handleToggle}
          className="flex items-center justify-between w-full px-2 py-1.5 text-xs font-medium text-gray-400 uppercase tracking-wider hover:text-gray-200 transition-colors group"
        >
          <span>{section.title}</span>
          <span className="transition-transform duration-200">
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </span>
        </button>
      ) : null}
      
      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          sidebarOpen && !isExpanded ? "max-h-0" : "max-h-[500px]"
        )}
      >
        <SidebarGroupContent>
          <SidebarMenu>
            {section.items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                    <Link href={item.href} className="flex items-center">
                      <item.icon className={cn("h-4 w-4", sidebarOpen ? "mr-2" : "mr-0")} />
                      {sidebarOpen && <span className="truncate">{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </div>
    </SidebarGroup>
  )
}

export function DashboardNav() {
  const pathname = usePathname()
  const { isOpen } = useSidebar()

  return (
    <div className="h-full py-2">
      {navSections.map((section) => (
        <CollapsibleSection
          key={section.key}
          section={section}
          pathname={pathname}
          isOpen={isOpen}
        />
      ))}
    </div>
  )
}
