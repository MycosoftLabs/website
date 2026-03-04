"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Box,
  BookOpen,
  BarChart3,
  Eye,
  Plus,
  ArrowLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { title: "Dashboard", href: "/ethics-training", icon: LayoutDashboard },
  { title: "New Sandbox", href: "/ethics-training/sandbox/new", icon: Plus },
  { title: "Scenarios", href: "/ethics-training/scenarios", icon: BookOpen },
  { title: "Analytics", href: "/ethics-training/analytics", icon: BarChart3 },
  { title: "Observations", href: "/ethics-training/observations", icon: Eye },
]

export function ETSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 flex flex-col border-r border-gray-800 bg-[#0A1929] text-white">
      <div className="p-4 border-b border-gray-800">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to site
        </Link>
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Box className="h-6 w-6 text-amber-500" />
          <span className="font-semibold">Ethics Training</span>
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/ethics-training" && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors min-h-[44px]",
                  isActive
                    ? "bg-amber-600/20 text-amber-400"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.title}
              </Link>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
