"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Bell, User, Settings, Shield, LogOut, Crown, Key, Zap, Server, Database, Bot, Loader2 } from "lucide-react"

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const [isEditing, setIsEditing] = useState(false)
  const router = useRouter()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" })
  }

  // Loading state
  if (status === "loading") {
    return (
      <div className="container py-8 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  // Not authenticated
  if (!session?.user) {
    return null
  }

  const user = session.user as any
  const isOwner = user.role === "owner" || user.isOwner
  const isAdmin = user.role === "admin" || user.isAdmin || isOwner
  const permissions = user.permissions || []

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "owner": return "default"
      case "admin": return "default"
      case "developer": return "secondary"
      case "ai": return "outline"
      default: return "secondary"
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner": return <Crown className="h-3 w-3 mr-1" />
      case "admin": return <Shield className="h-3 w-3 mr-1" />
      case "developer": return <Zap className="h-3 w-3 mr-1" />
      case "ai": return <Bot className="h-3 w-3 mr-1" />
      default: return <User className="h-3 w-3 mr-1" />
    }
  }

  return (
    <div className="container py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Owner/Admin Banner */}
        {isOwner && (
          <div className="bg-gradient-to-r from-yellow-500/20 via-amber-500/20 to-orange-500/20 border border-yellow-500/50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Crown className="h-6 w-6 text-yellow-500" />
              <div>
                <p className="font-semibold text-yellow-500">Owner Access</p>
                <p className="text-sm text-muted-foreground">You have full super admin access to all Mycosoft systems</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-start gap-4 md:gap-8">
          <Avatar className="w-20 h-20 border-2 border-primary">
            <AvatarImage src={user.image} alt={user.name || ""} />
            <AvatarFallback className="text-xl bg-primary text-primary-foreground">
              {(user.name || user.email || "U").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold">{user.name || user.email}</h1>
                <p className="text-muted-foreground">{user.email}</p>
                {user.title && (
                  <p className="text-sm text-muted-foreground">{user.title}</p>
                )}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge variant={getRoleBadgeVariant(user.role)} className={isOwner ? "bg-yellow-500 text-black" : ""}>
                    {getRoleIcon(user.role)}
                    {user.role?.toUpperCase() || "USER"}
                  </Badge>
                  {isAdmin && !isOwner && (
                    <Badge variant="outline" className="border-blue-500 text-blue-500">
                      <Shield className="h-3 w-3 mr-1" />
                      Admin
                    </Badge>
                  )}
                  {permissions.includes("*") && (
                    <Badge variant="outline" className="border-purple-500 text-purple-500">
                      <Key className="h-3 w-3 mr-1" />
                      All Permissions
                    </Badge>
                  )}
                </div>
              </div>
              <Button variant="destructive" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>

        <Tabs defaultValue="profile">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="profile">
              <User className="w-4 h-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="w-4 h-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="security">
              <Shield className="w-4 h-4 mr-2" />
              Security
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="admin" className="text-yellow-500">
                <Crown className="w-4 h-4 mr-2" />
                Admin
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your profile information and bio</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" defaultValue={user.name || ""} disabled={!isEditing} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" defaultValue={user.email || ""} disabled />
                </div>
                {user.title && (
                  <div className="grid gap-2">
                    <Label htmlFor="title">Title</Label>
                    <Input id="title" defaultValue={user.title} disabled />
                  </div>
                )}
                <div className="grid gap-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea 
                    id="bio" 
                    placeholder="Tell us about yourself..." 
                    disabled={!isEditing} 
                  />
                </div>
                <Button onClick={() => setIsEditing(!isEditing)}>
                  {isEditing ? "Save Changes" : "Edit Profile"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Connected Devices</CardTitle>
                <CardDescription>Manage your connected Mycosoft devices</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4">
                  {["MycoBrain V1", "SporeBase"].map((device) => (
                    <li key={device} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{device}</p>
                        <p className="text-sm text-muted-foreground">Last active: 2 hours ago</p>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <a href="/natureos/devices">Configure</a>
                      </Button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Session Info */}
            <Card>
              <CardHeader>
                <CardTitle>Session Information</CardTitle>
                <CardDescription>Current authentication details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">User ID</span>
                    <span className="font-mono">{user.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Role</span>
                    <span className="font-mono">{user.role}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Session Type</span>
                    <span className="font-mono">JWT</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Manage how you receive notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {["Email notifications", "Push notifications", "Device alerts", "Weekly reports"].map((item) => (
                  <div key={item} className="flex items-center justify-between py-2">
                    <Label htmlFor={item}>{item}</Label>
                    <Switch id={item} defaultChecked />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>Manage your account security preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input id="current-password" type="password" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input id="new-password" type="password" />
                </div>
                <Button>Update Password</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>Manage your account preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {["Dark mode", "Compact view", "Beta features", "Analytics sharing"].map((item) => (
                  <div key={item} className="flex items-center justify-between py-2">
                    <Label htmlFor={item}>{item}</Label>
                    <Switch id={item} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="admin" className="space-y-4">
              <Card className="border-yellow-500/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-yellow-500" />
                    {isOwner ? "Owner Control Panel" : "Admin Control Panel"}
                  </CardTitle>
                  <CardDescription>
                    {isOwner 
                      ? "Full system access - You have god-mode privileges"
                      : "Administrative access to system management"
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Permissions */}
                  <div>
                    <Label className="text-sm font-medium">Your Permissions</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {permissions.includes("*") ? (
                        <Badge className="bg-yellow-500 text-black">ALL PERMISSIONS</Badge>
                      ) : (
                        permissions.map((p: string) => (
                          <Badge key={p} variant="outline">{p}</Badge>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Quick Access */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4">
                    <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
                      <a href="/natureos">
                        <Server className="h-5 w-5" />
                        <span className="text-xs">NatureOS</span>
                      </a>
                    </Button>
                    <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
                      <a href="/natureos/containers">
                        <Database className="h-5 w-5" />
                        <span className="text-xs">Containers</span>
                      </a>
                    </Button>
                    <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
                      <a href="/natureos/devices">
                        <Zap className="h-5 w-5" />
                        <span className="text-xs">Devices</span>
                      </a>
                    </Button>
                    <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
                      <a href="/natureos/settings">
                        <Settings className="h-5 w-5" />
                        <span className="text-xs">Settings</span>
                      </a>
                    </Button>
                  </div>

                  {isOwner && (
                    <>
                      <div className="border-t pt-4 mt-4">
                        <Label className="text-sm font-medium text-yellow-500">Owner-Only Actions</Label>
                        <div className="grid grid-cols-2 gap-3 mt-3">
                          <Button variant="outline" className="border-yellow-500/50" asChild>
                            <a href="/natureos/workflows">Manage Workflows</a>
                          </Button>
                          <Button variant="outline" className="border-yellow-500/50" asChild>
                            <a href="/natureos/ai-studio">AI Studio</a>
                          </Button>
                          <Button variant="outline" className="border-yellow-500/50" asChild>
                            <a href="/natureos/storage">Storage</a>
                          </Button>
                          <Button variant="outline" className="border-yellow-500/50" asChild>
                            <a href="/natureos/monitoring">Monitoring</a>
                          </Button>
                        </div>
                      </div>

                      <div className="border-t pt-4 mt-4">
                        <Label className="text-sm font-medium text-red-500">Danger Zone</Label>
                        <div className="grid grid-cols-2 gap-3 mt-3">
                          <Button variant="outline" className="border-red-500/50 text-red-500 hover:bg-red-500/10">
                            Reset System Cache
                          </Button>
                          <Button variant="outline" className="border-red-500/50 text-red-500 hover:bg-red-500/10">
                            Restart Services
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* System Status */}
              <Card>
                <CardHeader>
                  <CardTitle>System Status</CardTitle>
                  <CardDescription>Quick overview of Mycosoft services</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { name: "Website", status: "online", url: "localhost:3000" },
                      { name: "MAS API", status: "online", url: "localhost:8000" },
                      { name: "N8N Workflows", status: "online", url: "localhost:5678" },
                      { name: "MycoBrain Service", status: "online", url: "localhost:8003" },
                      { name: "MINDEX Database", status: "online", url: "localhost:5432" },
                    ].map(service => (
                      <div key={service.name} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${service.status === "online" ? "bg-green-500" : "bg-red-500"}`} />
                          <span className="font-medium">{service.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">{service.url}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  )
}
