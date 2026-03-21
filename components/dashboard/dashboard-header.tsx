"use client"

import React from "react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Bell, LogOut, Menu, Home } from "lucide-react"
import { cn } from "@/lib/utils"

interface DashboardHeaderProps {
  user: {
    email: string
    displayName: string
    avatarUrl: string | null
    role: string
    tier: string
  }
  onSignOut: () => void
  onMenuToggle: () => void
}

export function DashboardHeader({ user, onSignOut, onMenuToggle }: DashboardHeaderProps) {
  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50 flex items-center px-4 sm:px-6 gap-4">
      {/* Mobile menu button */}
      <button
        onClick={onMenuToggle}
        className="md:hidden text-slate-400 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Logo / Title */}
      <Link href="/" className="flex items-center gap-2 text-white font-semibold">
        <Home className="w-5 h-5 text-emerald-400" />
        <span className="hidden sm:inline">Mycosoft</span>
      </Link>

      <div className="hidden sm:block text-slate-600 mx-1">/</div>
      <span className="hidden sm:inline text-slate-300 font-medium">Command Center</span>

      {/* Spacer */}
      <div className="flex-1" />

      {/* User info */}
      <div className="flex items-center gap-3">
        <Badge
          variant="secondary"
          className={cn(
            "hidden sm:inline-flex text-xs",
            user.role === "super_admin" ? "bg-amber-500/20 text-amber-400" :
            user.role === "admin" ? "bg-purple-500/20 text-purple-400" :
            "bg-slate-700 text-slate-300"
          )}
        >
          {user.role.toUpperCase().replace("_", " ")}
        </Badge>

        <button className="text-slate-400 hover:text-white transition-colors relative min-h-[44px] min-w-[44px] flex items-center justify-center">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full" />
        </button>

        <div className="flex items-center gap-2">
          <Avatar className="w-8 h-8 border border-emerald-500/50">
            <AvatarImage src={user.avatarUrl || undefined} alt={user.displayName} />
            <AvatarFallback className="text-xs bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
              {user.displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="hidden lg:inline text-sm text-slate-300">{user.displayName}</span>
        </div>

        <button
          onClick={onSignOut}
          className="flex items-center gap-2 text-slate-400 hover:text-red-400 transition-colors min-h-[44px] px-2"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
