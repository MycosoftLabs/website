"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import {
  Search, Bell, HelpCircle, Settings, User, ExternalLink, Cloud,
  LogOut, Shield, Home, ArrowLeft, Loader2, X, BookOpen,
  LifeBuoy, Keyboard, CheckCircle, AlertTriangle, Info, Zap,
  MessageSquare, FileText
} from "lucide-react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useState, useEffect, useCallback, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface Notification {
  id: string
  type: "info" | "success" | "warning" | "error" | "alert"
  title: string
  message: string
  source: string
  timestamp: string
  read: boolean
  actionUrl?: string
  actionLabel?: string
}

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function notificationIcon(type: string) {
  switch (type) {
    case "success": return <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
    case "warning": return <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
    case "error": return <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
    case "alert": return <Shield className="h-4 w-4 text-blue-400 shrink-0" />
    default: return <Info className="h-4 w-4 text-blue-400 shrink-0" />
  }
}

export function TopNav() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, signOut, isLoading } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [showMobileSearch, setShowMobileSearch] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const mobileSearchInputRef = useRef<HTMLInputElement>(null)

  // ── Notifications: fetch from API ──
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [notifLoading, setNotifLoading] = useState(false)

  const fetchNotifications = useCallback(async () => {
    try {
      setNotifLoading(true)
      const res = await fetch("/api/mas/notifications", { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        const items = Array.isArray(data) ? data : (data.notifications || [])
        setNotifications(items)
      }
    } catch {
      // Silently fail - notifications are non-critical
    } finally {
      setNotifLoading(false)
    }
  }, [])

  // Fetch notifications on mount and poll every 30s
  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  const unreadCount = notifications.filter(n => !n.read).length

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [])

  const handleSignOut = async () => {
    await signOut()
    router.push("/")
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
      setShowMobileSearch(false)
    }
  }

  // Keyboard shortcut: Ctrl+K to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        // On mobile, open the mobile search overlay
        if (window.innerWidth < 640) {
          setShowMobileSearch(true)
        } else {
          searchInputRef.current?.focus()
        }
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  // Auto-focus mobile search input when overlay opens
  useEffect(() => {
    if (showMobileSearch) {
      setTimeout(() => mobileSearchInputRef.current?.focus(), 100)
    }
  }, [showMobileSearch])

  return (
    <>
      <header className="h-12 md:h-14 border-b border-gray-800 bg-[#0A1929] sticky top-0 z-40">
        <div className="flex h-full items-center px-3 md:px-4 gap-x-1 md:gap-x-4 container mx-auto">
          {/* Back Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="text-gray-400 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          {/* Logo/Home */}
          <Link href="/natureos" className="flex items-center gap-1 md:gap-2 font-semibold hover:text-blue-400 transition-colors">
            <Cloud className="h-5 w-5 md:h-6 md:w-6" />
            <span className="hidden sm:inline">NatureOS</span>
          </Link>

          {/* Desktop Search Bar */}
          <form onSubmit={handleSearch} className="flex-1 max-w-xl ml-2 md:ml-8 hidden sm:flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                ref={searchInputRef}
                placeholder="Search resources, settings, devices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-20 bg-gray-900 border-gray-800 text-white placeholder:text-gray-500 focus-visible:ring-blue-500"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 text-[10px] text-gray-500 bg-gray-800 border border-gray-700 rounded">
                  Ctrl+K
                </kbd>
                <Button type="submit" variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-blue-400">
                  <Search className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </form>

          {/* Action Buttons */}
          <div className="flex items-center gap-1 md:gap-2 ml-auto">
            {/* Mobile Search Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden text-gray-400 hover:text-white"
              onClick={() => setShowMobileSearch(true)}
            >
              <Search className="h-5 w-5" />
            </Button>

            {/* Notifications - real API data */}
            <DropdownMenu open={showNotifications} onOpenChange={setShowNotifications}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500">
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
                <div className="px-3 py-2 border-b flex items-center justify-between">
                  <h3 className="font-semibold">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                {notifLoading && notifications.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    No notifications
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <DropdownMenuItem
                      key={notif.id}
                      className="flex items-start gap-2 p-3 cursor-pointer"
                      onClick={() => {
                        if (notif.actionUrl) router.push(notif.actionUrl)
                      }}
                    >
                      {notificationIcon(notif.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{notif.title}</span>
                          {!notif.read && <Badge variant="destructive" className="h-2 w-2 p-0 rounded-full shrink-0" />}
                        </div>
                        <span className="text-xs text-muted-foreground line-clamp-2">{notif.message}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-muted-foreground">{notif.source}</span>
                          <span className="text-[10px] text-muted-foreground">{timeAgo(notif.timestamp)}</span>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/natureos/settings" className="w-full text-center text-sm text-blue-400">
                    Notification Settings
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Help Center */}
            <Dialog open={showHelp} onOpenChange={setShowHelp}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <HelpCircle className="h-5 w-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <HelpCircle className="h-5 w-5 text-blue-400" />
                    NatureOS Help Center
                  </DialogTitle>
                  <DialogDescription>
                    Get help with NatureOS features and settings
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 mt-4">
                  {/* Quick Start */}
                  <div className="p-3 border rounded-lg bg-blue-500/5 border-blue-500/20">
                    <h4 className="font-medium flex items-center gap-2 text-blue-400">
                      <Zap className="h-4 w-4" />
                      Quick Start
                    </h4>
                    <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                      <li>1. Use the search bar or <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl+K</kbd> to search across all resources</li>
                      <li>2. Navigate using the sidebar menu to access Apps, AI, Tools, and more</li>
                      <li>3. Check the Settings page to configure your NatureOS environment</li>
                      <li>4. Connect devices via the Devices section for real-time monitoring</li>
                    </ul>
                  </div>

                  {/* Documentation */}
                  <Link
                    href="/docs"
                    className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted transition-colors"
                    onClick={() => setShowHelp(false)}
                  >
                    <BookOpen className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Documentation</h4>
                      <p className="text-sm text-muted-foreground">API guides, platform docs, and integration tutorials</p>
                    </div>
                  </Link>

                  {/* Support */}
                  <Link
                    href="/support"
                    className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted transition-colors"
                    onClick={() => setShowHelp(false)}
                  >
                    <LifeBuoy className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Support & FAQs</h4>
                      <p className="text-sm text-muted-foreground">Browse FAQs, submit support tickets, get help from our team</p>
                    </div>
                  </Link>

                  {/* Contact */}
                  <Link
                    href="/contact"
                    className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted transition-colors"
                    onClick={() => setShowHelp(false)}
                  >
                    <MessageSquare className="h-5 w-5 text-violet-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Contact Us</h4>
                      <p className="text-sm text-muted-foreground">Reach out for enterprise support, partnerships, or feedback</p>
                    </div>
                  </Link>

                  {/* Release Notes */}
                  <Link
                    href="/docs"
                    className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted transition-colors"
                    onClick={() => setShowHelp(false)}
                  >
                    <FileText className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Release Notes</h4>
                      <p className="text-sm text-muted-foreground">Latest updates, features, and changelog</p>
                    </div>
                  </Link>

                  {/* Keyboard Shortcuts */}
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium flex items-center gap-2">
                      <Keyboard className="h-4 w-4" />
                      Keyboard Shortcuts
                    </h4>
                    <div className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Search</span>
                        <kbd className="px-2 py-0.5 bg-muted rounded text-xs">Ctrl + K</kbd>
                      </div>
                      <div className="flex justify-between">
                        <span>Settings</span>
                        <kbd className="px-2 py-0.5 bg-muted rounded text-xs">Ctrl + ,</kbd>
                      </div>
                      <div className="flex justify-between">
                        <span>Help</span>
                        <kbd className="px-2 py-0.5 bg-muted rounded text-xs">Ctrl + /</kbd>
                      </div>
                    </div>
                  </div>

                  {/* Version Info */}
                  <div className="text-center text-xs text-muted-foreground pt-2 border-t">
                    NatureOS v2.1 &middot; MYCA AI Platform &middot; <a href="mailto:support@mycosoft.com" className="text-blue-400 hover:underline">support@mycosoft.com</a>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Settings */}
            <Button variant="ghost" size="icon" className="hidden sm:flex" asChild>
              <Link href="/natureos/settings">
                <Settings className="h-5 w-5" />
              </Link>
            </Button>

            {/* User Menu */}
            {isLoading ? (
              <Button variant="ghost" size="icon" disabled>
                <Loader2 className="h-5 w-5 animate-spin" />
              </Button>
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-2 border-b">
                    <p className="font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="flex items-center">
                      <Home className="h-4 w-4 mr-2" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/natureos/settings" className="flex items-center">
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/security" className="flex items-center">
                      <Shield className="h-4 w-4 mr-2" />
                      Security Center
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/" className="flex items-center">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Mycosoft.com
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-red-400">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login?redirectTo=/natureos">
                  <User className="h-5 w-5 mr-2" />
                  Sign In
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Search Overlay */}
      {showMobileSearch && (
        <div className="fixed inset-0 z-50 bg-[#0A1929] p-4 sm:hidden">
          <div className="flex items-center gap-2">
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  ref={mobileSearchInputRef}
                  placeholder="Search resources, settings, devices..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-gray-900 border-gray-800 text-white placeholder:text-gray-500 focus-visible:ring-blue-500"
                  autoFocus
                />
              </div>
            </form>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowMobileSearch(false)}
              className="text-gray-400 hover:text-white shrink-0"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          {searchQuery.trim() && (
            <div className="mt-4">
              <Button
                onClick={handleSearch as unknown as React.MouseEventHandler}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Search className="h-4 w-4 mr-2" />
                Search &ldquo;{searchQuery}&rdquo;
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
