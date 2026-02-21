"use client"

export const dynamic = "force-dynamic"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useSupabaseUser, useProfile } from "@/hooks/use-supabase-user"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { 
  Loader2, User, Settings, Leaf, Cpu, Database, 
  Activity, TrendingUp, Zap, ExternalLink, Home, 
  Crown, Shield, ArrowLeft, ChevronRight, Bell,
  CreditCard, LogOut, Brain, Globe, Menu
} from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { MemoryHealthWidget } from "@/components/memory"
import { MYCAFloatingButton } from "@/components/myca/MYCAFloatingButton"

export default function DashboardPage() {
  const { user, loading: authLoading } = useSupabaseUser()
  const { profile, loading: profileLoading } = useProfile()
  const router = useRouter()
  const supabase = createClient()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [authLoading, user, router])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  // Loading state
  if (authLoading || profileLoading) {
    return (
      <div className="min-h-dvh bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  const displayName = profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "User"
  const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url || null
  const role = profile?.role || "user"
  const tier = profile?.subscription_tier || "free"
  const isSuperAdmin = role === 'super_admin' && user?.email === 'morgan@mycosoft.org'
  const quickStats = [
    { label: "Your Devices", value: null, caption: "No data available", icon: Cpu, color: "text-emerald-400" },
    { label: "Data Points", value: null, caption: "No data available", icon: Activity, color: "text-blue-400" },
    { label: "Species Tracked", value: null, caption: "No data available", icon: Leaf, color: "text-green-400" },
    { label: "System Health", value: null, caption: "No data available", icon: TrendingUp, color: "text-emerald-500" },
  ]
  const recentActivity: Array<{ time: string; event: string; type: "device" | "sensor" | "account" }> = []

  return (
    <div className="min-h-dvh bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Navigation Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Left: Navigation */}
            <div className="flex items-center gap-4">
              <Link 
                href="/"
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
              >
                <Home className="w-5 h-5" />
                <span className="hidden sm:inline">Home</span>
              </Link>
              <ChevronRight className="w-4 h-4 text-slate-600" />
              <span className="text-white font-medium">User Dashboard</span>
            </div>

            {/* Right: User Menu */}
            <div className="flex items-center gap-4">
              {isSuperAdmin && (
                <Link 
                  href="/admin"
                  className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 rounded-lg transition-colors"
                >
                  <Crown className="w-4 h-4" />
                  <span className="hidden sm:inline">Admin</span>
                </Link>
              )}
              <Link 
                href="/billing"
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
              >
                <CreditCard className="w-4 h-4" />
                <span className="hidden sm:inline">Billing</span>
              </Link>
              <button className="text-slate-400 hover:text-white transition-colors relative min-h-[44px] min-w-[44px] flex items-center justify-center">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full" />
              </button>
              <button 
                onClick={handleSignOut}
                className="flex items-center gap-2 text-slate-400 hover:text-red-400 transition-colors min-h-[44px] px-2"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Welcome Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16 border-2 border-emerald-500/50">
              <AvatarImage src={avatarUrl || undefined} alt={displayName} />
              <AvatarFallback className="text-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                Welcome back, {displayName}!
              </h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge 
                  variant="secondary" 
                  className={cn(
                    role === "super_admin" ? "bg-amber-500/20 text-amber-400" : 
                    role === "admin" ? "bg-purple-500/20 text-purple-400" : 
                    "bg-slate-700 text-slate-300"
                  )}
                >
                  {role.toUpperCase().replace('_', ' ')}
                </Badge>
                <Badge 
                  variant="secondary" 
                  className={cn(
                    tier === "enterprise" ? "bg-purple-500/20 text-purple-400" :
                    tier === "pro" ? "bg-blue-500/20 text-blue-400" :
                    "bg-slate-700 text-slate-300"
                  )}
                >
                  {tier.charAt(0).toUpperCase() + tier.slice(1)} Plan
                </Badge>
                <span className="text-slate-500 text-sm">{user.email}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Purpose Explanation Card - What is this dashboard? */}
        <div className="bg-gradient-to-r from-emerald-500/10 via-transparent to-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
          <p className="text-slate-300 text-sm">
            <strong className="text-emerald-400">User Dashboard:</strong> This is your personal control center for managing devices, viewing data, and accessing Mycosoft services. 
            {isSuperAdmin && (
              <span className="ml-2">
                As a Super Admin, you also have access to the <Link href="/admin" className="text-amber-400 hover:text-amber-300 underline">Admin Control Center</Link>.
              </span>
            )}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickStats.map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.label} className="bg-slate-800/50 border-slate-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-400">{stat.label}</CardTitle>
                  <Icon className={cn("h-4 w-4", stat.color)} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{stat.value ?? "—"}</div>
                  <p className="text-xs text-slate-500">{stat.caption}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Memory & Brain Health */}
        <MemoryHealthWidget />

        {/* Quick Actions */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/natureos/devices" className="block">
            <Card className="bg-slate-800/50 border-slate-700 hover:border-emerald-500/50 transition-colors h-full">
              <CardHeader>
                <Cpu className="w-8 h-8 text-emerald-400 mb-2" />
                <CardTitle className="text-white">MycoBrain Devices</CardTitle>
                <CardDescription className="text-slate-400">
                  Manage sensors and boards
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/mindex" className="block">
            <Card className="bg-slate-800/50 border-slate-700 hover:border-blue-500/50 transition-colors h-full">
              <CardHeader>
                <Database className="w-8 h-8 text-blue-400 mb-2" />
                <CardTitle className="text-white">MINDEX Database</CardTitle>
                <CardDescription className="text-slate-400">
                  Species taxonomy & data
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/natureos" className="block">
            <Card className="bg-slate-800/50 border-slate-700 hover:border-purple-500/50 transition-colors h-full">
              <CardHeader>
                <Brain className="w-8 h-8 text-purple-400 mb-2" />
                <CardTitle className="text-white">NatureOS</CardTitle>
                <CardDescription className="text-slate-400">
                  Earth system simulator
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/profile" className="block">
            <Card className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-colors h-full">
              <CardHeader>
                <Settings className="w-8 h-8 text-slate-400 mb-2" />
                <CardTitle className="text-white">Profile Settings</CardTitle>
                <CardDescription className="text-slate-400">
                  Account & preferences
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>

        {/* Additional Quick Links */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/dashboard/crep" className="block">
            <Card className="bg-slate-800/50 border-slate-700 hover:border-red-500/50 transition-colors">
              <CardHeader className="flex flex-row items-center gap-4">
                <Globe className="w-10 h-10 text-red-400" />
                <div>
                  <CardTitle className="text-white">CREP Dashboard</CardTitle>
                  <CardDescription className="text-slate-400">Global situational awareness</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/myca" className="block">
            <Card className="bg-slate-800/50 border-slate-700 hover:border-amber-500/50 transition-colors">
              <CardHeader className="flex flex-row items-center gap-4">
                <Brain className="w-10 h-10 text-amber-400" />
                <div>
                  <CardTitle className="text-white">MYCA Agent</CardTitle>
                  <CardDescription className="text-slate-400">AI assistant interface</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/dashboard/soc" className="block">
            <Card className="bg-slate-800/50 border-slate-700 hover:border-emerald-500/50 transition-colors">
              <CardHeader className="flex flex-row items-center gap-4">
                <Shield className="w-10 h-10 text-emerald-400" />
                <div>
                  <CardTitle className="text-white">SOC View</CardTitle>
                  <CardDescription className="text-slate-400">Security operations</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
        </div>

        {/* Recent Activity */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Recent Activity</CardTitle>
            <CardDescription className="text-slate-400">Latest events from your devices and system</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div className="text-sm text-slate-500">No activity data available yet.</div>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((item, index) => (
                  <div key={index} className="flex items-center gap-4 text-sm">
                    <span className="text-slate-500 w-24 text-right shrink-0">{item.time}</span>
                    <span className={cn(
                      "h-2 w-2 rounded-full shrink-0",
                      item.type === "device" ? "bg-emerald-500" :
                      item.type === "sensor" ? "bg-blue-500" :
                      "bg-purple-500"
                    )} />
                    <span className="text-slate-300">{item.event}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Footer with Navigation */}
      <footer className="border-t border-slate-800 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-slate-500">
            <div className="flex items-center gap-4">
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              <Link href="/mindex" className="hover:text-white transition-colors">MINDEX</Link>
              <Link href="/natureos" className="hover:text-white transition-colors">NatureOS</Link>
              <Link href="/myca" className="hover:text-white transition-colors">MYCA</Link>
              <Link href="/docs" className="hover:text-white transition-colors">Docs</Link>
            </div>
            <div className="text-slate-600">
              © 2026 Mycosoft. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
      <MYCAFloatingButton title="MYCA Assistant" className="right-20" />
    </div>
  )
}
