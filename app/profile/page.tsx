"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSupabaseUser, useProfile } from "@/hooks/use-supabase-user"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { useUserSettings } from "@/hooks/use-user-settings"
import { 
  Bell, User, Settings, Shield, LogOut, Crown, Key, Zap, Server, 
  Database, Bot, Loader2, Check, History, RefreshCw 
} from "lucide-react"

export default function ProfilePage() {
  const { user, loading: authLoading, signOut } = useSupabaseUser()
  const { profile, loading: profileLoading, updateProfile } = useProfile()
  const router = useRouter()
  const { toast } = useToast()
  const { 
    settings, 
    loading: settingsLoading, 
    saving, 
    lastSaved,
    updateSetting,
    updateSettings,
    refreshSettings,
    loadChangelog,
    changelog,
  } = useUserSettings()
  
  const [isEditing, setIsEditing] = useState(false)
  const [profileForm, setProfileForm] = useState({
    displayName: "",
    bio: "",
  })
  const [showChangelog, setShowChangelog] = useState(false)

  // Initialize form when profile loads
  useEffect(() => {
    if (profile) {
      setProfileForm({
        displayName: profile.full_name || "",
        bio: settings?.profile?.bio || "",
      })
    } else if (settings?.profile) {
      setProfileForm({
        displayName: settings.profile.displayName || "",
        bio: settings.profile.bio || "",
      })
    }
  }, [profile, settings?.profile])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [authLoading, user, router])

  const handleLogout = async () => {
    await signOut()
    router.push("/login")
  }

  // Handle notification toggle
  const handleNotificationToggle = async (key: keyof NonNullable<typeof settings>["notifications"]) => {
    if (!settings) return
    const newValue = !settings.notifications[key]
    const success = await updateSetting("notifications", key, newValue)
    if (success) {
      toast({
        title: "Setting saved",
        description: `${key.replace(/([A-Z])/g, ' $1').trim()} ${newValue ? 'enabled' : 'disabled'}`,
      })
    }
  }

  // Handle account toggle
  const handleAccountToggle = async (key: keyof NonNullable<typeof settings>["account"]) => {
    if (!settings) return
    const currentValue = settings.account[key]
    if (typeof currentValue !== 'boolean') return
    
    const newValue = !currentValue
    const success = await updateSetting("account", key, newValue)
    if (success) {
      toast({
        title: "Setting saved",
        description: `${key.replace(/([A-Z])/g, ' $1').trim()} ${newValue ? 'enabled' : 'disabled'}`,
      })
    }
  }

  // Handle profile save
  const handleProfileSave = async () => {
    const success = await updateSettings({
      profile: {
        displayName: profileForm.displayName,
        bio: profileForm.bio,
        avatar: settings?.profile.avatar || "",
      }
    })
    if (success) {
      setIsEditing(false)
      toast({
        title: "Profile saved",
        description: "Your profile has been updated",
      })
    }
  }

  // Loading state
  if (authLoading || profileLoading || (user && settingsLoading)) {
    return (
      <div className="container py-8 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  // Not authenticated
  if (!user) {
    return null
  }

  // Build user display data from Supabase user and profile
  const displayUser = {
    id: user.id,
    email: user.email,
    name: profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
    image: profile?.avatar_url || user.user_metadata?.avatar_url || null,
    role: profile?.role || "user",
    title: profile?.organization || null,
  }
  const isOwner = displayUser.role === "owner"
  const isAdmin = displayUser.role === "admin" || isOwner
  const permissions = isOwner ? ["*"] : []

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

        {/* Save indicator */}
        {(saving || lastSaved) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {saving ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Saving...</span>
              </>
            ) : lastSaved && (
              <>
                <Check className="h-3 w-3 text-green-500" />
                <span>Last saved: {lastSaved.toLocaleTimeString()}</span>
              </>
            )}
          </div>
        )}

        <div className="flex items-start gap-4 md:gap-8">
          <Avatar className="w-20 h-20 border-2 border-primary">
            <AvatarImage src={displayUser.image || undefined} alt={displayUser.name || ""} />
            <AvatarFallback className="text-xl bg-primary text-primary-foreground">
              {(displayUser.name || displayUser.email || "U").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold">{displayUser.name || displayUser.email}</h1>
                <p className="text-muted-foreground">{displayUser.email}</p>
                {displayUser.title && (
                  <p className="text-sm text-muted-foreground">{displayUser.title}</p>
                )}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge variant={getRoleBadgeVariant(displayUser.role)} className={isOwner ? "bg-yellow-500 text-black" : ""}>
                    {getRoleIcon(displayUser.role)}
                    {displayUser.role?.toUpperCase() || "USER"}
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
                  <Input 
                    id="name" 
                    value={isEditing ? profileForm.displayName || displayUser.name || "" : (displayUser.name || "")}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, displayName: e.target.value }))}
                    disabled={!isEditing} 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={displayUser.email || ""} disabled />
                </div>
                {displayUser.title && (
                  <div className="grid gap-2">
                    <Label htmlFor="title">Title</Label>
                    <Input id="title" value={displayUser.title} disabled />
                  </div>
                )}
                <div className="grid gap-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea 
                    id="bio" 
                    placeholder="Tell us about yourself..."
                    value={profileForm.bio}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, bio: e.target.value }))}
                    disabled={!isEditing} 
                  />
                </div>
                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <Button onClick={handleProfileSave} disabled={saving}>
                        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                        Save Changes
                      </Button>
                      <Button variant="outline" onClick={() => setIsEditing(false)}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button onClick={() => setIsEditing(true)}>
                      Edit Profile
                    </Button>
                  )}
                </div>
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
                <CardDescription>Current authentication details (Supabase)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">User ID</span>
                    <span className="font-mono text-xs">{displayUser.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Role</span>
                    <span className="font-mono">{displayUser.role}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Auth Provider</span>
                    <span className="font-mono">Supabase</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Manage how you receive notifications. Changes are saved automatically.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {settings && (
                  <>
                    <div className="flex items-center justify-between py-2">
                      <Label htmlFor="emailNotifications">Email notifications</Label>
                      <Switch 
                        id="emailNotifications"
                        checked={settings.notifications.emailNotifications}
                        onCheckedChange={() => handleNotificationToggle("emailNotifications")}
                        disabled={saving}
                      />
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <Label htmlFor="pushNotifications">Push notifications</Label>
                      <Switch 
                        id="pushNotifications"
                        checked={settings.notifications.pushNotifications}
                        onCheckedChange={() => handleNotificationToggle("pushNotifications")}
                        disabled={saving}
                      />
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <Label htmlFor="deviceAlerts">Device alerts</Label>
                      <Switch 
                        id="deviceAlerts"
                        checked={settings.notifications.deviceAlerts}
                        onCheckedChange={() => handleNotificationToggle("deviceAlerts")}
                        disabled={saving}
                      />
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <Label htmlFor="weeklyReports">Weekly reports</Label>
                      <Switch 
                        id="weeklyReports"
                        checked={settings.notifications.weeklyReports}
                        onCheckedChange={() => handleNotificationToggle("weeklyReports")}
                        disabled={saving}
                      />
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <Label htmlFor="securityAlerts">Security alerts</Label>
                      <Switch 
                        id="securityAlerts"
                        checked={settings.notifications.securityAlerts}
                        onCheckedChange={() => handleNotificationToggle("securityAlerts")}
                        disabled={saving}
                      />
                    </div>
                  </>
                )}
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
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Account Settings</CardTitle>
                    <CardDescription>Manage your account preferences. Changes are saved automatically.</CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setShowChangelog(!showChangelog)
                      if (!showChangelog) loadChangelog()
                    }}
                  >
                    <History className="w-4 h-4 mr-2" />
                    {showChangelog ? "Hide History" : "View History"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {settings && (
                  <>
                    <div className="flex items-center justify-between py-2">
                      <Label htmlFor="darkMode">Dark mode</Label>
                      <Switch 
                        id="darkMode"
                        checked={settings.account.darkMode}
                        onCheckedChange={() => handleAccountToggle("darkMode")}
                        disabled={saving}
                      />
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <Label htmlFor="compactView">Compact view</Label>
                      <Switch 
                        id="compactView"
                        checked={settings.account.compactView}
                        onCheckedChange={() => handleAccountToggle("compactView")}
                        disabled={saving}
                      />
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <Label htmlFor="betaFeatures">Beta features</Label>
                      <Switch 
                        id="betaFeatures"
                        checked={settings.account.betaFeatures}
                        onCheckedChange={() => handleAccountToggle("betaFeatures")}
                        disabled={saving}
                      />
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <Label htmlFor="analyticsSharing">Analytics sharing</Label>
                      <Switch 
                        id="analyticsSharing"
                        checked={settings.account.analyticsSharing}
                        onCheckedChange={() => handleAccountToggle("analyticsSharing")}
                        disabled={saving}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Settings Changelog */}
            {showChangelog && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Settings History</CardTitle>
                    <Button variant="ghost" size="sm" onClick={loadChangelog}>
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {changelog.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No changes recorded yet.</p>
                  ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {changelog.map((change) => (
                        <div key={change.id} className="text-sm border-b pb-2">
                          <div className="flex justify-between items-start">
                            <span className="font-medium">
                              {change.category}.{change.key}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(change.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <div className="text-muted-foreground">
                            <span className="text-red-500">{String(change.oldValue)}</span>
                            {" → "}
                            <span className="text-green-500">{String(change.newValue)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
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
