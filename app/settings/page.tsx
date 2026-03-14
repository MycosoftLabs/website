"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { useAuth } from "@/contexts/auth-context"
import { Bell, Shield, Laptop, Globe, Brain, Lock, User } from "lucide-react"
import Link from "next/link"

const GROUNDING_PREF_KEY = "myca_grounded_cognition_enabled"

export default function SettingsPage() {
  const { user, isLoading } = useAuth()
  const [isSaving, setIsSaving] = useState(false)
  const [groundingEnabled, setGroundingEnabled] = useState(true)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(GROUNDING_PREF_KEY)
      setGroundingEnabled(stored !== "false")
    } catch {
      setGroundingEnabled(true)
    }
  }, [])

  const handleGroundingChange = (checked: boolean) => {
    setGroundingEnabled(checked)
    try {
      localStorage.setItem(GROUNDING_PREF_KEY, String(checked))
    } catch {
      // ignore
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsSaving(false)
  }

  if (isLoading) {
    return (
      <div className="container py-16 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  // Logged-out view: show limited public settings
  if (!user) {
    return (
      <div className="container py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground">Preferences and display options</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Display Preferences</CardTitle>
              <CardDescription>These settings are saved locally in your browser</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="language">Language</Label>
                <select
                  id="language"
                  className="flex h-12 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-base file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="timezone">Timezone</Label>
                <select
                  id="timezone"
                  className="flex h-12 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-base file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="utc">UTC</option>
                  <option value="pst">Pacific Time</option>
                  <option value="est">Eastern Time</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Compact Mode</Label>
                  <p className="text-sm text-muted-foreground">Make the interface more compact</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center py-8 text-center">
              <Lock className="h-8 w-8 text-muted-foreground mb-3" />
              <h3 className="font-semibold text-lg">Sign in for more settings</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                Sign in to access notifications, security, integrations, and account management settings.
              </p>
              <Button asChild>
                <Link href="/login?redirectTo=/settings">Sign In</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const isCompanyUser = user.email?.endsWith("@mycosoft.org")

  // Logged-in view: full settings
  return (
    <div className="container py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground">Manage your account settings and preferences</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            {user.email}
          </div>
        </div>

        <Tabs defaultValue="general">
          <div className="overflow-x-auto">
          <TabsList className="w-full min-w-max sm:w-auto">
            <TabsTrigger value="general" className="min-h-[44px] whitespace-nowrap">
              <Laptop className="w-4 h-4 mr-2" />
              General
            </TabsTrigger>
            <TabsTrigger value="notifications" className="min-h-[44px] whitespace-nowrap">
              <Bell className="w-4 h-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="security" className="min-h-[44px] whitespace-nowrap">
              <Shield className="w-4 h-4 mr-2" />
              Security
            </TabsTrigger>
            <TabsTrigger value="integrations" className="min-h-[44px] whitespace-nowrap">
              <Globe className="w-4 h-4 mr-2" />
              Integrations
            </TabsTrigger>
          </TabsList>
          </div>

          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>Update your basic account preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="language">Language</Label>
                  <select
                    id="language"
                    className="flex h-12 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-base file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <select
                    id="timezone"
                    className="flex h-12 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-base file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="utc">UTC</option>
                    <option value="pst">Pacific Time</option>
                    <option value="est">Eastern Time</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Compact Mode</Label>
                    <p className="text-sm text-muted-foreground">Make the interface more compact</p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Brain className="h-4 w-4 text-violet-500" />
                      <Label>Enable Grounded Cognition</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Use grounded cognition (ThoughtObjects, EP) when available. Backend must have MYCA_GROUNDED_COGNITION=1 for full behavior.
                    </p>
                  </div>
                  <Switch checked={groundingEnabled} onCheckedChange={handleGroundingChange} />
                </div>
              </CardContent>
            </Card>

            {isCompanyUser && (
              <Card>
                <CardHeader>
                  <CardTitle>Platform Access</CardTitle>
                  <CardDescription>Company account features</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Platform Admin Access</Label>
                      <p className="text-sm text-muted-foreground">
                        You have company email access to the platform admin panel.
                      </p>
                    </div>
                    <Button variant="outline" asChild>
                      <Link href="/platform">Open Platform</Link>
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Default Experiment Visibility</Label>
                      <p className="text-sm text-muted-foreground">Set default visibility for new experiments</p>
                    </div>
                    <select className="flex h-10 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                      <option value="private">Private</option>
                      <option value="team">Team Only</option>
                      <option value="org">Organization</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Federation Data Sharing</Label>
                      <p className="text-sm text-muted-foreground">Allow your data to be shared with federation peers</p>
                    </div>
                    <Switch />
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Choose what notifications you want to receive</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  "Email notifications",
                  "Push notifications",
                  "Device alerts",
                  "Weekly reports",
                  "Security alerts",
                ].map((item) => (
                  <div key={item} className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>{item}</Label>
                      <p className="text-sm text-muted-foreground">Receive notifications about {item.toLowerCase()}</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                ))}
                {isCompanyUser && (
                  <>
                    <div className="border-t pt-4 mt-2">
                      <p className="text-sm font-medium text-muted-foreground mb-4">Company Notifications</p>
                    </div>
                    {[
                      "Platform audit alerts",
                      "Team member activity",
                      "Federation sync updates",
                      "Billing notifications",
                    ].map((item) => (
                      <div key={item} className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>{item}</Label>
                          <p className="text-sm text-muted-foreground">Receive notifications about {item.toLowerCase()}</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                    ))}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>Manage your security preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input id="current-password" type="password" className="text-base h-12" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input id="new-password" type="password" className="text-base h-12" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input id="confirm-password" type="password" className="text-base h-12" />
                </div>
                <Button className="h-12">Update Password</Button>
              </CardContent>
            </Card>

            {isCompanyUser && (
              <Card>
                <CardHeader>
                  <CardTitle>Company Security</CardTitle>
                  <CardDescription>Additional security options for company accounts</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Two-Factor Authentication</Label>
                      <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
                    </div>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Login Notifications</Label>
                      <p className="text-sm text-muted-foreground">Get notified when your account is accessed from a new device</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Session Management</Label>
                      <p className="text-sm text-muted-foreground">View and manage active sessions</p>
                    </div>
                    <Button variant="outline" size="sm">View Sessions</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="integrations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Connected Services</CardTitle>
                <CardDescription>Manage your connected services and APIs</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {["GitHub Integration", "iNaturalist API", "Google Cloud", "Azure Maps"].map((service) => (
                  <div key={service} className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>{service}</Label>
                      <p className="text-sm text-muted-foreground">Connect your {service} account</p>
                    </div>
                    <Switch />
                  </div>
                ))}
              </CardContent>
            </Card>

            {isCompanyUser && (
              <Card>
                <CardHeader>
                  <CardTitle>Platform Integrations</CardTitle>
                  <CardDescription>Company-managed service connections</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {["Supabase Database", "Anthropic API", "Federation Network", "Internal MYCA API"].map((service) => (
                    <div key={service} className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>{service}</Label>
                        <p className="text-sm text-muted-foreground">Managed by your organization</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving} className="h-12 px-8 w-full sm:w-auto">
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  )
}
