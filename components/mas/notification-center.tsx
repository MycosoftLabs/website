"use client"

/**
 * Notification Center
 * Real-time alerts and notifications from MYCA and all agents
 */

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Info,
  X,
  RefreshCw,
  Volume2,
  VolumeX,
  Filter,
  Trash2,
  ExternalLink,
} from "lucide-react"

interface Notification {
  id: string
  type: "info" | "success" | "warning" | "error" | "alert"
  title: string
  message: string
  source: string
  timestamp: Date
  read: boolean
  actionUrl?: string
  actionLabel?: string
}

interface NotificationCenterProps {
  className?: string
  maxNotifications?: number
}

const TYPE_CONFIG = {
  info: { icon: Info, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/30" },
  success: { icon: CheckCircle, color: "text-green-500", bg: "bg-green-500/10", border: "border-green-500/30" },
  warning: { icon: AlertTriangle, color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/30" },
  error: { icon: AlertCircle, color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/30" },
  alert: { icon: Bell, color: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/30" },
}

// Simulated notifications - in production these come from the MAS API
const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    type: "success",
    title: "MAS v2 Deployed",
    message: "MYCA Orchestrator is now running on 192.168.0.188:8001",
    source: "System",
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    read: false,
  },
  {
    id: "2",
    type: "info",
    title: "Agent Pool Updated",
    message: "12 agents are now active and processing tasks",
    source: "MYCA Orchestrator",
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
    read: false,
  },
  {
    id: "3",
    type: "warning",
    title: "High Memory Usage",
    message: "MINDEX Agent is using 512MB of memory (threshold: 500MB)",
    source: "Resource Monitor",
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
    read: true,
  },
  {
    id: "4",
    type: "success",
    title: "Workflow Completed",
    message: "MycoBrain Data Sync workflow completed successfully",
    source: "n8n Agent",
    timestamp: new Date(Date.now() - 45 * 60 * 1000),
    read: true,
  },
  {
    id: "5",
    type: "alert",
    title: "Security Scan Complete",
    message: "Weekly security audit completed. No vulnerabilities found.",
    source: "SOC Agent",
    timestamp: new Date(Date.now() - 60 * 60 * 1000),
    read: true,
  },
]

export function NotificationCenter({ className = "", maxNotifications = 50 }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS)
  const [filter, setFilter] = useState<string | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [loading, setLoading] = useState(false)

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      // In production, fetch from /api/mas/notifications
      const res = await fetch("/api/mas/notifications").catch(() => null)
      if (res?.ok) {
        const data = await res.json()
        if (data.notifications) {
          setNotifications(data.notifications.map((n: any) => ({
            ...n,
            timestamp: new Date(n.timestamp)
          })))
        }
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Poll for new notifications
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, read: true } : n
    ))
  }

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const clearAll = () => {
    setNotifications([])
  }

  const filteredNotifications = filter 
    ? notifications.filter(n => n.type === filter)
    : notifications

  const unreadCount = notifications.filter(n => !n.read).length

  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return "Just now"
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="relative">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </div>
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount} new
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? "Mute notifications" : "Unmute notifications"}
            >
              {soundEnabled ? (
                <Volume2 className="h-4 w-4 text-green-500" />
              ) : (
                <VolumeX className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={fetchNotifications}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-1 mt-2">
          <Button
            variant={filter === null ? "default" : "ghost"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setFilter(null)}
          >
            All
          </Button>
          {Object.entries(TYPE_CONFIG).map(([type, config]) => {
            const Icon = config.icon
            const count = notifications.filter(n => n.type === type).length
            return (
              <Button
                key={type}
                variant={filter === type ? "default" : "ghost"}
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => setFilter(type)}
              >
                <Icon className={`h-3 w-3 ${config.color}`} />
                {count}
              </Button>
            )
          })}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Action Bar */}
        {notifications.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllAsRead}>
              Mark all as read
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500 hover:text-red-600" onClick={clearAll}>
              <Trash2 className="h-3 w-3 mr-1" />
              Clear all
            </Button>
          </div>
        )}

        <ScrollArea className="h-[400px]">
          <div className="p-2 space-y-2">
            {filteredNotifications.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No notifications</p>
              </div>
            ) : (
              filteredNotifications.map((notification) => {
                const config = TYPE_CONFIG[notification.type]
                const Icon = config.icon

                return (
                  <div
                    key={notification.id}
                    onClick={() => markAsRead(notification.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all hover:bg-muted/50 ${
                      !notification.read ? config.border + " " + config.bg : "border-transparent"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-1.5 rounded ${config.bg}`}>
                        <Icon className={`h-4 w-4 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className={`font-medium text-sm truncate ${!notification.read ? "" : "text-muted-foreground"}`}>
                            {notification.title}
                          </h4>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 flex-shrink-0 opacity-0 group-hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation()
                              dismissNotification(notification.id)
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{notification.source}</span>
                            <span>•</span>
                            <span>{formatTime(notification.timestamp)}</span>
                          </div>
                          {notification.actionUrl && (
                            <Button variant="ghost" size="sm" className="h-6 text-xs" asChild>
                              <a href={notification.actionUrl} target="_blank" rel="noopener noreferrer">
                                {notification.actionLabel || "View"}
                                <ExternalLink className="h-3 w-3 ml-1" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
