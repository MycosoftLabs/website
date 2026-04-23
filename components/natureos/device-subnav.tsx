"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  AlertTriangle,
  Boxes,
  Brain,
  ClipboardList,
  Globe2,
  LineChart,
  MapIcon,
  Radio,
  Wrench,
} from "lucide-react"
import type { ComponentType, SVGProps } from "react"

import { cn } from "@/lib/utils"

type NavItem = {
  href: string
  label: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
}

const NAV_ITEMS: NavItem[] = [
  { href: "/natureos/devices", label: "Manager", icon: Wrench },
  { href: "/natureos/devices/registry", label: "Registry", icon: ClipboardList },
  { href: "/natureos/devices/telemetry", label: "Telemetry", icon: LineChart },
  { href: "/natureos/devices/alerts", label: "Alerts", icon: AlertTriangle },
  { href: "/natureos/devices/map", label: "Map", icon: MapIcon },
  { href: "/natureos/devices/insights", label: "Insights", icon: Brain },
  { href: "/natureos/devices/fleet", label: "Fleet", icon: Boxes },
  { href: "/natureos/devices/onsite-ai", label: "On-Site AI", icon: Radio },
  { href: "/natureos/tools/earth-simulator", label: "Earth Sim", icon: Globe2 },
]

export function DeviceSubnav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Device section"
      className="flex flex-wrap gap-2 rounded-lg border bg-background p-2 text-sm"
    >
      {NAV_ITEMS.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== "/natureos/devices" && pathname?.startsWith(item.href))
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm transition-colors",
              active
                ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-200"
                : "hover:bg-muted"
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
