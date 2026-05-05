"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Activity,
  BarChart3,
  Eye,
  Hash,
  Home,
  Map as MapIcon,
  Radio,
  Settings2,
  Table2,
  Volume2,
  Zap,
} from "lucide-react"
import type { ComponentType, SVGProps } from "react"

import { cn } from "@/lib/utils"

type NavItem = {
  href: string
  label: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
}

const MESH_NAV: NavItem[] = [
  { href: "/natureos/meshtastic", label: "Home", icon: Home },
  { href: "/natureos/meshtastic/packets", label: "Packets", icon: Radio },
  { href: "/natureos/meshtastic/map", label: "Map", icon: MapIcon },
  { href: "/natureos/meshtastic/live", label: "Live", icon: Activity },
  { href: "/natureos/meshtastic/channels", label: "Channels", icon: Hash },
  { href: "/natureos/meshtastic/nodes", label: "Nodes", icon: Table2 },
  { href: "/natureos/meshtastic/tools", label: "Tools", icon: Settings2 },
  { href: "/natureos/meshtastic/observers", label: "Observers", icon: Eye },
  { href: "/natureos/meshtastic/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/natureos/meshtastic/perf", label: "Perf", icon: Zap },
  { href: "/natureos/meshtastic/audio-lab", label: "Audio lab", icon: Volume2 },
]

export function MeshtasticSubnav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Meshtastic mesh"
      className="mb-6 flex flex-wrap gap-2 rounded-lg border border-cyan-500/20 bg-muted/30 p-2 text-sm"
    >
      {MESH_NAV.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== "/natureos/meshtastic" && pathname.startsWith(`${item.href}/`))
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex min-h-[44px] min-w-[44px] items-center gap-1.5 rounded-md border px-3 py-2 text-base transition-colors touch-manipulation sm:text-sm",
              active
                ? "border-cyan-500/60 bg-cyan-500/15 text-cyan-100"
                : "border-transparent hover:bg-muted"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
