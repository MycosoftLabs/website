"use client"

import React, { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Users, User, Bot, Loader2, RefreshCw, Shield, Crown,
  Ban, CheckCircle, Search
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface UserAccount {
  id: string
  email: string
  full_name: string | null
  role: string
  subscription_tier: string
  avatar_url: string | null
  created_at: string
  last_sign_in_at: string | null
  is_banned: boolean
  type: "human" | "machine"
}

export function UsersModule() {
  const [users, setUsers] = useState<UserAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [filter, setFilter] = useState<"all" | "human" | "machine">("all")
  const [search, setSearch] = useState("")

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/dashboard/users")
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || [])
      }
    } catch {
      toast.error("Failed to load users")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [])

  const updateUserRole = async (userId: string, newRole: string) => {
    setActionLoading(userId)
    try {
      const res = await fetch(`/api/dashboard/users`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      })
      if (res.ok) {
        setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u))
        toast.success("Role updated")
      } else {
        toast.error("Failed to update role")
      }
    } catch {
      toast.error("Network error")
    } finally {
      setActionLoading(null)
    }
  }

  const toggleBan = async (userId: string, ban: boolean) => {
    setActionLoading(userId)
    try {
      const res = await fetch(`/api/dashboard/users`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, is_banned: ban }),
      })
      if (res.ok) {
        setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, is_banned: ban } : u))
        toast.success(ban ? "User banned" : "User unbanned")
      } else {
        toast.error("Failed to update ban status")
      }
    } catch {
      toast.error("Network error")
    } finally {
      setActionLoading(null)
    }
  }

  const filtered = users
    .filter((u) => filter === "all" || u.type === filter)
    .filter((u) => {
      if (!search) return true
      const s = search.toLowerCase()
      return (u.email?.toLowerCase().includes(s) || u.full_name?.toLowerCase().includes(s))
    })

  const roleColor = (role: string) => {
    switch (role) {
      case "super_admin": return "bg-amber-500/20 text-amber-400"
      case "admin": return "bg-purple-500/20 text-purple-400"
      case "security_admin": return "bg-red-500/20 text-red-400"
      case "premium": return "bg-blue-500/20 text-blue-400"
      default: return "bg-slate-700 text-slate-300"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">User Management</h2>
          <p className="text-slate-400 text-sm">{users.length} total accounts</p>
        </div>
        <button
          onClick={fetchUsers}
          className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
          {(["all", "human", "machine"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded text-sm font-medium transition-colors",
                filter === f ? "bg-emerald-500/20 text-emerald-400" : "text-slate-400 hover:text-white"
              )}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* User List */}
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((user) => (
            <Card key={user.id} className={cn("bg-slate-800/50 border-slate-700", user.is_banned && "opacity-60")}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Icon */}
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                    user.type === "machine" ? "bg-purple-500/20" : "bg-emerald-500/20"
                  )}>
                    {user.type === "machine" ? <Bot className="w-5 h-5 text-purple-400" /> : <User className="w-5 h-5 text-emerald-400" />}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-medium text-sm truncate">{user.full_name || user.email}</span>
                      <Badge className={cn("text-xs", roleColor(user.role))}>{user.role.replace("_", " ").toUpperCase()}</Badge>
                      {user.is_banned && <Badge className="bg-red-500/20 text-red-400 text-xs">BANNED</Badge>}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {user.email} · {user.subscription_tier} · Joined {new Date(user.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <select
                      value={user.role}
                      onChange={(e) => updateUserRole(user.id, e.target.value)}
                      disabled={actionLoading === user.id}
                      className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-300 focus:outline-none"
                    >
                      <option value="user">User</option>
                      <option value="premium">Premium</option>
                      <option value="admin">Admin</option>
                      <option value="security_admin">Security Admin</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                    <button
                      onClick={() => toggleBan(user.id, !user.is_banned)}
                      disabled={actionLoading === user.id}
                      className={cn(
                        "p-1.5 rounded text-xs transition-colors",
                        user.is_banned
                          ? "text-green-400 hover:bg-green-500/20"
                          : "text-red-400 hover:bg-red-500/20"
                      )}
                      title={user.is_banned ? "Unban" : "Ban"}
                    >
                      {user.is_banned ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-8 text-slate-500">No users found</div>
          )}
        </div>
      )}
    </div>
  )
}
