"use client"

import type React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  Shield, Network, AlertTriangle, Skull, FileText, 
  ArrowLeft, Home, Settings, Lock
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const securityNavItems = [
  { href: "/security", label: "SOC Dashboard", icon: Shield },
  { href: "/security/network", label: "Network Monitor", icon: Network },
  { href: "/security/incidents", label: "Incidents", icon: AlertTriangle },
  { href: "/security/redteam", label: "Red Team", icon: Skull },
  { href: "/security/compliance", label: "Compliance", icon: FileText },
]

export default function SecurityLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Security Header */}
      <header className="sticky top-0 z-50 bg-slate-900/95 border-b border-slate-700 backdrop-blur">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            {/* Left: Back + Logo */}
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" asChild className="text-slate-400 hover:text-white">
                <Link href="/">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <Link href="/security" className="flex items-center gap-2 text-emerald-400 font-mono font-bold">
                <Shield className="h-5 w-5" />
                <span className="hidden sm:inline">Security Operations Center</span>
                <span className="sm:hidden">SOC</span>
              </Link>
            </div>

            {/* Center: Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {securityNavItems.map((item) => {
                const isActive = pathname === item.href || 
                  (item.href !== "/security" && pathname.startsWith(item.href))
                const Icon = item.icon
                return (
                  <Button
                    key={item.href}
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                    asChild
                    className={isActive ? "bg-emerald-600/20 text-emerald-400" : "text-slate-400 hover:text-white"}
                  >
                    <Link href={item.href}>
                      <Icon className="h-4 w-4 mr-1" />
                      {item.label}
                    </Link>
                  </Button>
                )
              })}
            </nav>

            {/* Right: User */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" asChild className="text-slate-400 hover:text-white">
                <Link href="/">
                  <Home className="h-5 w-5" />
                </Link>
              </Button>
              {user && (
                <div className="flex items-center gap-2 px-2 py-1 bg-slate-800 rounded-lg border border-slate-700">
                  <Lock className="h-3 w-3 text-emerald-400" />
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="text-xs">{user.name?.[0] || "U"}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-mono text-slate-300 hidden sm:inline">{user.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden flex items-center gap-1 pb-2 overflow-x-auto">
            {securityNavItems.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== "/security" && pathname.startsWith(item.href))
              const Icon = item.icon
              return (
                <Button
                  key={item.href}
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  asChild
                  className={`flex-shrink-0 ${isActive ? "bg-emerald-600/20 text-emerald-400" : "text-slate-400"}`}
                >
                  <Link href={item.href}>
                    <Icon className="h-4 w-4 mr-1" />
                    {item.label}
                  </Link>
                </Button>
              )
            })}
          </div>
        </div>
      </header>

      {/* Main Content - Scrollable */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>

      {/* Security Footer */}
      <footer className="bg-slate-900/95 border-t border-slate-700 py-3">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between text-xs font-mono text-slate-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Monitoring Active
              </span>
              <span>SOC v2.0.0</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/security" className="hover:text-emerald-400 transition-colors">Dashboard</Link>
              <Link href="/profile" className="hover:text-emerald-400 transition-colors">Profile</Link>
              <Link href="/" className="hover:text-emerald-400 transition-colors">Home</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
