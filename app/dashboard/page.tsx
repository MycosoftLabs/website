"use client"

export const dynamic = "force-dynamic"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSupabaseUser, useProfile } from "@/hooks/use-supabase-user"
import { createClient } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"
import { DashboardShell, type DashboardModule } from "@/components/dashboard/dashboard-shell"
import { OverviewModule } from "@/components/dashboard/modules/overview-module"
import { SecurityModule } from "@/components/dashboard/modules/security-module"
import { UsersModule } from "@/components/dashboard/modules/users-module"
import { AgentsModule } from "@/components/dashboard/modules/agents-module"
import { ServicesModule } from "@/components/dashboard/modules/services-module"
import { AccessModule } from "@/components/dashboard/modules/access-module"
import { APIKeysModule } from "@/components/dashboard/modules/api-keys-module"
import { BillingModule } from "@/components/dashboard/modules/billing-module"
import { DatabaseModule } from "@/components/dashboard/modules/database-module"
import { SettingsModule } from "@/components/dashboard/modules/settings-module"
import { MYCAFloatingButton } from "@/components/myca/MYCAFloatingButton"

export default function DashboardPage() {
  const { user, loading: authLoading } = useSupabaseUser()
  const { profile, loading: profileLoading } = useProfile()
  const router = useRouter()
  const [activeModule, setActiveModule] = useState<DashboardModule>("overview")

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [authLoading, user, router])

  const handleSignOut = async () => {
    try {
      const supabase = createClient()
      if (supabase) await supabase.auth.signOut()
    } finally {
      router.push("/")
    }
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
  const isSuperAdmin = role === "super_admin" && user?.email === "morgan@mycosoft.org"

  const renderModule = () => {
    // Non-admin users only see overview
    if (!isSuperAdmin && activeModule !== "overview") {
      return <OverviewModule />
    }

    switch (activeModule) {
      case "overview":
        return <OverviewModule />
      case "security":
        return <SecurityModule />
      case "users":
        return <UsersModule />
      case "agents":
        return <AgentsModule />
      case "services":
        return <ServicesModule />
      case "access":
        return <AccessModule />
      case "api-keys":
        return <APIKeysModule />
      case "billing":
        return <BillingModule />
      case "database":
        return <DatabaseModule />
      case "settings":
        return <SettingsModule />
      default:
        return <OverviewModule />
    }
  }

  return (
    <>
      <DashboardShell
        activeModule={activeModule}
        onModuleChange={setActiveModule}
        isSuperAdmin={isSuperAdmin}
        user={{ email: user.email || "", displayName, avatarUrl, role, tier }}
        onSignOut={handleSignOut}
      >
        {renderModule()}
      </DashboardShell>
      <MYCAFloatingButton title="MYCA Assistant" className="right-20" />
    </>
  )
}
