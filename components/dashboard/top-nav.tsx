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
  LogOut, Shield, Home, ArrowLeft, Loader2 
} from "lucide-react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export function TopNav() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, signOut, isLoading } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [showNotifications, setShowNotifications] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    router.push("/")
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  // Mock notifications - in real app, fetch from API
  const notifications = [
    { id: 1, title: "System Update", message: "NatureOS v2.1 available", time: "5m ago", unread: true },
    { id: 2, title: "Security Alert", message: "New login from Portland, OR", time: "1h ago", unread: true },
    { id: 3, title: "Device Connected", message: "MycoBrain V1 is online", time: "2h ago", unread: false },
  ]

  const unreadCount = notifications.filter(n => n.unread).length

  return (
    <header className="h-14 border-b border-gray-800 bg-[#0A1929] sticky top-0 z-40">
      <div className="flex h-full items-center px-4 gap-x-2 md:gap-x-4 container mx-auto">
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

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex-1 max-w-xl ml-2 md:ml-8 hidden sm:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search resources, settings, devices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-900 border-gray-800 focus-visible:ring-blue-500"
            />
          </div>
        </form>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 md:gap-2 ml-auto">
          {/* Notifications */}
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
            <DropdownMenuContent align="end" className="w-80">
              <div className="px-3 py-2 border-b">
                <h3 className="font-semibold">Notifications</h3>
              </div>
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  No notifications
                </div>
              ) : (
                notifications.map((notif) => (
                  <DropdownMenuItem key={notif.id} className="flex flex-col items-start p-3 cursor-pointer">
                    <div className="flex items-center gap-2 w-full">
                      <span className="font-medium">{notif.title}</span>
                      {notif.unread && <Badge variant="destructive" className="h-2 w-2 p-0 rounded-full" />}
                    </div>
                    <span className="text-sm text-muted-foreground">{notif.message}</span>
                    <span className="text-xs text-muted-foreground mt-1">{notif.time}</span>
                  </DropdownMenuItem>
                ))
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="w-full text-center text-sm text-blue-400">
                  Manage Notification Settings
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Help */}
          <Dialog open={showHelp} onOpenChange={setShowHelp}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <HelpCircle className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>NatureOS Help Center</DialogTitle>
                <DialogDescription>
                  Get help with NatureOS features and settings
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <Link href="/docs" className="block p-3 border rounded-lg hover:bg-muted transition-colors">
                  <h4 className="font-medium">Documentation</h4>
                  <p className="text-sm text-muted-foreground">Browse the full NatureOS documentation</p>
                </Link>
                <Link href="/support" className="block p-3 border rounded-lg hover:bg-muted transition-colors">
                  <h4 className="font-medium">Support</h4>
                  <p className="text-sm text-muted-foreground">Contact our support team</p>
                </Link>
                <div className="p-3 border rounded-lg">
                  <h4 className="font-medium">Keyboard Shortcuts</h4>
                  <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Search</span>
                      <kbd className="px-2 py-0.5 bg-muted rounded text-xs">Ctrl + K</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span>Settings</span>
                      <kbd className="px-2 py-0.5 bg-muted rounded text-xs">Ctrl + ,</kbd>
                    </div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Settings */}
          <Button variant="ghost" size="icon" asChild>
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
                  <Link href="/profile" className="flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    Profile & Settings
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
                    <Home className="h-4 w-4 mr-2" />
                    Back to Mycosoft.com
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
              <Link href="/login">
                <User className="h-5 w-5 mr-2" />
                Sign In
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
