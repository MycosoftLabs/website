"use client"

import { useState, useEffect, useCallback } from "react"
import { DashboardHeader } from "@/components/dashboard/header"
import { DashboardShell } from "@/components/dashboard/shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Settings,
  Bot,
  Shield,
  Bell,
  Database,
  Terminal,
  Layers,
  Network,
  Save,
  RefreshCw,
  Check,
  X,
  AlertTriangle,
  Eye,
  EyeOff,
  History,
  Sparkles,
  Loader2,
  ChevronRight,
  Clock,
  User,
  Cpu,
  Globe,
  Lock,
  Zap,
  HardDrive,
  Webhook,
  MessageSquare,
  Mail,
  Volume2,
  Code,
  Palette,
  Monitor,
  Wifi,
  Radio,
  Activity,
  FileText,
  Download,
  Upload,
  Trash2,
  Copy,
  ExternalLink,
  Info,
} from "lucide-react"

interface SettingsData {
  system: SystemSettings
  myca: MycaSettings
  integrations: IntegrationSettings
  devices: DeviceSettings
  security: SecuritySettings
  notifications: NotificationSettings
  storage: StorageSettings
  shell: ShellSettings
}

interface SystemSettings {
  name: string
  version: string
  environment: string
  debugMode: boolean
  logLevel: string
  timezone: string
  language: string
  autoUpdate: boolean
  telemetryEnabled: boolean
}

interface MycaSettings {
  enabled: boolean
  model: string
  temperature: number
  maxTokens: number
  learningEnabled: boolean
  voiceEnabled: boolean
  voiceId: string
  autoResponse: boolean
  contextMemory: number
  trainingDataCollection: boolean
  approvalRequired: {
    codeExecution: boolean
    systemChanges: boolean
    integrations: boolean
    deviceControl: boolean
  }
}

interface IntegrationSettings {
  n8n: {
    enabled: boolean
    localUrl: string
    cloudUrl: string
    useCloud: boolean
    apiKey: string
    webhookSecret: string
  }
  openai: {
    enabled: boolean
    apiKey: string
    organization: string
    model: string
  }
  elevenlabs: {
    enabled: boolean
    apiKey: string
    voiceId: string
  }
  anthropic: {
    enabled: boolean
    apiKey: string
    model: string
  }
  google: {
    enabled: boolean
    mapsApiKey: string
    driveEnabled: boolean
    calendarEnabled: boolean
  }
}

interface DeviceSettings {
  autoDiscovery: boolean
  scanInterval: number
  offlineThreshold: number
  mycoBrainEnabled: boolean
  loraFrequency: number
  meshNetworkEnabled: boolean
  telemetryInterval: number
}

interface SecuritySettings {
  mfaEnabled: boolean
  sessionTimeout: number
  apiRateLimit: number
  corsOrigins: string[]
  encryptionEnabled: boolean
  auditLogging: boolean
}

interface NotificationSettings {
  email: {
    enabled: boolean
    address: string
    digestFrequency: string
  }
  push: {
    enabled: boolean
    critical: boolean
    warnings: boolean
    info: boolean
  }
  slack: {
    enabled: boolean
    webhookUrl: string
    channel: string
  }
}

interface StorageSettings {
  primaryBackend: string
  localPath: string
  cloudSync: boolean
  compressionEnabled: boolean
  retentionDays: number
  maxStorageGb: number
}

interface ShellSettings {
  theme: string
  fontSize: number
  fontFamily: string
  historySize: number
  autocomplete: boolean
  syntaxHighlighting: boolean
  aiAssist: boolean
}

interface ChangeLogEntry {
  id: string
  timestamp: string
  category: string
  key: string
  oldValue: any
  newValue: any
  source: "user" | "myca" | "system" | "api" | "shell"
  approved: boolean
  approvedBy?: string
  description?: string
  impact?: "low" | "medium" | "high" | "critical"
}

interface PendingChange {
  id: string
  category: string
  key: string
  oldValue: any
  newValue: any
  source: string
  requestedAt: string
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData | null>(null)
  const [changeLog, setChangeLog] = useState<ChangeLogEntry[]>([])
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("system")
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})
  const [unsavedChanges, setUnsavedChanges] = useState<Record<string, any>>({})
  const [showApprovalDialog, setShowApprovalDialog] = useState(false)
  const [pendingApproval, setPendingApproval] = useState<PendingChange | null>(null)
  const [showChangeLog, setShowChangeLog] = useState(false)
  const [mycaMessage, setMycaMessage] = useState<string | null>(null)

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const [settingsRes, logRes] = await Promise.all([
        fetch("/api/natureos/settings?includeLog=true&logLimit=50"),
        fetch("/api/natureos/settings/changelog?limit=20"),
      ])
      
      const settingsData = await settingsRes.json()
      const logData = await logRes.json()
      
      setSettings(settingsData.settings)
      setPendingChanges(settingsData.pendingChanges || [])
      setChangeLog(logData.changes || [])
    } catch (error) {
      console.error("Failed to fetch settings:", error)
    } finally {
      setLoading(false)
    }
  }

  const updateSetting = useCallback(async (
    category: string,
    key: string,
    value: any,
    requireApproval = false
  ) => {
    try {
      setSaving(true)
      
      // Optimistic update
      setSettings(prev => {
        if (!prev) return prev
        const updated = { ...prev }
        const parts = key.split(".")
        let target: any = updated[category as keyof SettingsData]
        for (let i = 0; i < parts.length - 1; i++) {
          target = target[parts[i]]
        }
        target[parts[parts.length - 1]] = value
        return updated
      })
      
      const response = await fetch("/api/natureos/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          key,
          value,
          source: "user",
          requireApproval,
        }),
      })
      
      const result = await response.json()
      
      if (result.requiresApproval) {
        setMycaMessage(`Change to ${category}.${key} requires approval. MYCA has been notified.`)
        setTimeout(() => setMycaMessage(null), 5000)
        
        // Revert optimistic update
        fetchSettings()
      } else if (result.success) {
        setMycaMessage(`Setting updated: ${category}.${key}`)
        setTimeout(() => setMycaMessage(null), 3000)
        
        // Add to local change log
        setChangeLog(prev => [{
          id: result.changeId,
          timestamp: result.appliedAt,
          category,
          key,
          oldValue: result.oldValue,
          newValue: value,
          source: "user",
          approved: true,
        }, ...prev.slice(0, 19)])
      }
    } catch (error) {
      console.error("Failed to update setting:", error)
      setMycaMessage("Failed to update setting. Please try again.")
      setTimeout(() => setMycaMessage(null), 5000)
      fetchSettings() // Revert
    } finally {
      setSaving(false)
    }
  }, [])

  const approveChange = async (changeId: string, action: "approve" | "reject") => {
    try {
      const response = await fetch("/api/natureos/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          changeId,
          action,
          approvedBy: "admin",
        }),
      })
      
      const result = await response.json()
      
      if (result.success) {
        setMycaMessage(`Change ${action}d successfully.`)
        setTimeout(() => setMycaMessage(null), 3000)
        fetchSettings()
      }
    } catch (error) {
      console.error("Failed to process approval:", error)
    }
    
    setShowApprovalDialog(false)
    setPendingApproval(null)
  }

  const toggleSecret = (key: string) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const getImpactBadge = (impact?: string) => {
    switch (impact) {
      case "critical":
        return <Badge variant="destructive">Critical</Badge>
      case "high":
        return <Badge className="bg-orange-500">High</Badge>
      case "medium":
        return <Badge className="bg-yellow-500 text-black">Medium</Badge>
      default:
        return <Badge variant="secondary">Low</Badge>
    }
  }

  const getSourceIcon = (source: string) => {
    switch (source) {
      case "myca":
        return <Bot className="h-4 w-4 text-purple-500" />
      case "shell":
        return <Terminal className="h-4 w-4 text-green-500" />
      case "system":
        return <Settings className="h-4 w-4 text-blue-500" />
      case "api":
        return <Code className="h-4 w-4 text-orange-500" />
      default:
        return <User className="h-4 w-4 text-gray-500" />
    }
  }

  if (loading || !settings) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell>
      <DashboardHeader 
        heading="System Settings" 
        text="Configure NatureOS, MYCA AI, integrations, and system preferences"
      >
        <div className="flex items-center gap-2">
          {mycaMessage && (
            <Badge variant="outline" className="text-purple-500 border-purple-500 animate-pulse">
              <Sparkles className="h-3 w-3 mr-1" />
              {mycaMessage}
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={() => setShowChangeLog(true)}>
            <History className="h-4 w-4 mr-2" />
            Change Log
          </Button>
          <Button variant="outline" size="sm" onClick={fetchSettings}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </DashboardHeader>

      {/* Pending Approvals Banner */}
      {pendingChanges.length > 0 && (
        <Card className="mb-6 border-yellow-500/50 bg-yellow-500/10">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="font-medium">{pendingChanges.length} pending change(s) require approval</p>
                  <p className="text-sm text-muted-foreground">
                    Review and approve changes before they take effect
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setPendingApproval(pendingChanges[0])
                  setShowApprovalDialog(true)
                }}
              >
                Review Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-4 lg:grid-cols-8 gap-1">
          <TabsTrigger value="system" className="flex items-center gap-1">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">System</span>
          </TabsTrigger>
          <TabsTrigger value="myca" className="flex items-center gap-1">
            <Bot className="h-4 w-4" />
            <span className="hidden sm:inline">MYCA</span>
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-1">
            <Layers className="h-4 w-4" />
            <span className="hidden sm:inline">Integrations</span>
          </TabsTrigger>
          <TabsTrigger value="devices" className="flex items-center gap-1">
            <Network className="h-4 w-4" />
            <span className="hidden sm:inline">Devices</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-1">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-1">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="storage" className="flex items-center gap-1">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">Storage</span>
          </TabsTrigger>
          <TabsTrigger value="shell" className="flex items-center gap-1">
            <Terminal className="h-4 w-4" />
            <span className="hidden sm:inline">Shell</span>
          </TabsTrigger>
        </TabsList>

        {/* System Settings */}
        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                System Configuration
              </CardTitle>
              <CardDescription>
                Core NatureOS system settings and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="system-name">System Name</Label>
                  <Input
                    id="system-name"
                    value={settings.system.name}
                    onChange={(e) => updateSetting("system", "name", e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="environment">Environment</Label>
                  <Select
                    value={settings.system.environment}
                    onValueChange={(v) => updateSetting("system", "environment", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="development">Development</SelectItem>
                      <SelectItem value="staging">Staging</SelectItem>
                      <SelectItem value="production">Production</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="log-level">Log Level</Label>
                  <Select
                    value={settings.system.logLevel}
                    onValueChange={(v) => updateSetting("system", "logLevel", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="debug">Debug</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warn">Warning</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={settings.system.timezone}
                    onValueChange={(v) => updateSetting("system", "timezone", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time</SelectItem>
                      <SelectItem value="America/Chicago">Central Time</SelectItem>
                      <SelectItem value="America/New_York">Eastern Time</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">System Behavior</h4>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Debug Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable detailed logging and debugging features
                    </p>
                  </div>
                  <Switch
                    checked={settings.system.debugMode}
                    onCheckedChange={(v) => updateSetting("system", "debugMode", v)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto Updates</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically install system updates
                    </p>
                  </div>
                  <Switch
                    checked={settings.system.autoUpdate}
                    onCheckedChange={(v) => updateSetting("system", "autoUpdate", v)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Telemetry</Label>
                    <p className="text-sm text-muted-foreground">
                      Send anonymous usage data to improve NatureOS
                    </p>
                  </div>
                  <Switch
                    checked={settings.system.telemetryEnabled}
                    onCheckedChange={(v) => updateSetting("system", "telemetryEnabled", v)}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="text-sm text-muted-foreground">
              <Info className="h-4 w-4 mr-2" />
              Version {settings.system.version}
            </CardFooter>
          </Card>
        </TabsContent>

        {/* MYCA AI Settings */}
        <TabsContent value="myca" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-purple-500" />
                MYCA AI Configuration
              </CardTitle>
              <CardDescription>
                Configure MYCA&apos;s behavior, learning, and permissions. All changes are logged for training.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-lg border bg-purple-500/10 border-purple-500/30">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-6 w-6 text-purple-500" />
                  <div>
                    <p className="font-medium">MYCA AI Assistant</p>
                    <p className="text-sm text-muted-foreground">
                      {settings.myca.enabled ? "Active and learning from interactions" : "Disabled"}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.myca.enabled}
                  onCheckedChange={(v) => updateSetting("myca", "enabled", v)}
                />
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="myca-model">AI Model</Label>
                  <Select
                    value={settings.myca.model}
                    onValueChange={(v) => updateSetting("myca", "model", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-4-turbo-preview">GPT-4 Turbo</SelectItem>
                      <SelectItem value="gpt-4">GPT-4</SelectItem>
                      <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                      <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
                      <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Temperature: {settings.myca.temperature}</Label>
                  <Slider
                    value={[settings.myca.temperature]}
                    min={0}
                    max={1}
                    step={0.1}
                    onValueChange={([v]) => updateSetting("myca", "temperature", v)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Lower = more focused, Higher = more creative
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-tokens">Max Tokens</Label>
                  <Input
                    id="max-tokens"
                    type="number"
                    value={settings.myca.maxTokens}
                    onChange={(e) => updateSetting("myca", "maxTokens", parseInt(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Context Memory: {settings.myca.contextMemory} messages</Label>
                  <Slider
                    value={[settings.myca.contextMemory]}
                    min={10}
                    max={100}
                    step={5}
                    onValueChange={([v]) => updateSetting("myca", "contextMemory", v)}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Volume2 className="h-4 w-4" />
                  Voice Settings
                </h4>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Voice Output</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable MYCA voice responses via ElevenLabs
                    </p>
                  </div>
                  <Switch
                    checked={settings.myca.voiceEnabled}
                    onCheckedChange={(v) => updateSetting("myca", "voiceEnabled", v)}
                  />
                </div>

                {settings.myca.voiceEnabled && (
                  <div className="space-y-2">
                    <Label htmlFor="voice-id">Voice ID</Label>
                    <Input
                      id="voice-id"
                      value={settings.myca.voiceId}
                      onChange={(e) => updateSetting("myca", "voiceId", e.target.value)}
                    />
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Cpu className="h-4 w-4" />
                  Learning & Training
                </h4>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Learning Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      MYCA learns from all interactions to improve responses
                    </p>
                  </div>
                  <Switch
                    checked={settings.myca.learningEnabled}
                    onCheckedChange={(v) => updateSetting("myca", "learningEnabled", v)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Training Data Collection</Label>
                    <p className="text-sm text-muted-foreground">
                      Collect interaction data for model fine-tuning
                    </p>
                  </div>
                  <Switch
                    checked={settings.myca.trainingDataCollection}
                    onCheckedChange={(v) => updateSetting("myca", "trainingDataCollection", v)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto Response</Label>
                    <p className="text-sm text-muted-foreground">
                      MYCA can respond automatically to system events
                    </p>
                  </div>
                  <Switch
                    checked={settings.myca.autoResponse}
                    onCheckedChange={(v) => updateSetting("myca", "autoResponse", v)}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  MYCA Permissions (Require Approval)
                </h4>
                <p className="text-sm text-muted-foreground">
                  When enabled, MYCA will request your approval before performing these actions
                </p>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-2">
                      <Code className="h-4 w-4" />
                      <span className="text-sm">Code Execution</span>
                    </div>
                    <Switch
                      checked={settings.myca.approvalRequired.codeExecution}
                      onCheckedChange={(v) => updateSetting("myca", "approvalRequired.codeExecution", v)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      <span className="text-sm">System Changes</span>
                    </div>
                    <Switch
                      checked={settings.myca.approvalRequired.systemChanges}
                      onCheckedChange={(v) => updateSetting("myca", "approvalRequired.systemChanges", v)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      <span className="text-sm">Integrations</span>
                    </div>
                    <Switch
                      checked={settings.myca.approvalRequired.integrations}
                      onCheckedChange={(v) => updateSetting("myca", "approvalRequired.integrations", v)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-2">
                      <Network className="h-4 w-4" />
                      <span className="text-sm">Device Control</span>
                    </div>
                    <Switch
                      checked={settings.myca.approvalRequired.deviceControl}
                      onCheckedChange={(v) => updateSetting("myca", "approvalRequired.deviceControl", v)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integration Settings */}
        <TabsContent value="integrations" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* n8n */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Webhook className="h-5 w-5 text-orange-500" />
                    n8n Workflows
                  </div>
                  <Switch
                    checked={settings.integrations.n8n.enabled}
                    onCheckedChange={(v) => updateSetting("integrations", "n8n.enabled", v)}
                  />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Use Cloud Instance</Label>
                  <Switch
                    checked={settings.integrations.n8n.useCloud}
                    onCheckedChange={(v) => updateSetting("integrations", "n8n.useCloud", v)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Local URL</Label>
                  <Input
                    value={settings.integrations.n8n.localUrl}
                    onChange={(e) => updateSetting("integrations", "n8n.localUrl", e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Cloud URL</Label>
                  <Input
                    value={settings.integrations.n8n.cloudUrl}
                    onChange={(e) => updateSetting("integrations", "n8n.cloudUrl", e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <div className="flex gap-2">
                    <Input
                      type={showSecrets["n8n-api"] ? "text" : "password"}
                      value={settings.integrations.n8n.apiKey}
                      onChange={(e) => updateSetting("integrations", "n8n.apiKey", e.target.value)}
                      placeholder="Enter API key..."
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => toggleSecret("n8n-api")}
                    >
                      {showSecrets["n8n-api"] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* OpenAI */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-green-500" />
                    OpenAI
                  </div>
                  <Switch
                    checked={settings.integrations.openai.enabled}
                    onCheckedChange={(v) => updateSetting("integrations", "openai.enabled", v)}
                  />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <div className="flex gap-2">
                    <Input
                      type={showSecrets["openai-api"] ? "text" : "password"}
                      value={settings.integrations.openai.apiKey}
                      onChange={(e) => updateSetting("integrations", "openai.apiKey", e.target.value)}
                      placeholder="sk-..."
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => toggleSecret("openai-api")}
                    >
                      {showSecrets["openai-api"] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Organization ID</Label>
                  <Input
                    value={settings.integrations.openai.organization}
                    onChange={(e) => updateSetting("integrations", "openai.organization", e.target.value)}
                    placeholder="org-..."
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Default Model</Label>
                  <Select
                    value={settings.integrations.openai.model}
                    onValueChange={(v) => updateSetting("integrations", "openai.model", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-4-turbo-preview">GPT-4 Turbo</SelectItem>
                      <SelectItem value="gpt-4">GPT-4</SelectItem>
                      <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* ElevenLabs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-5 w-5 text-purple-500" />
                    ElevenLabs Voice
                  </div>
                  <Switch
                    checked={settings.integrations.elevenlabs.enabled}
                    onCheckedChange={(v) => updateSetting("integrations", "elevenlabs.enabled", v)}
                  />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <div className="flex gap-2">
                    <Input
                      type={showSecrets["eleven-api"] ? "text" : "password"}
                      value={settings.integrations.elevenlabs.apiKey}
                      onChange={(e) => updateSetting("integrations", "elevenlabs.apiKey", e.target.value)}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => toggleSecret("eleven-api")}
                    >
                      {showSecrets["eleven-api"] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Voice ID</Label>
                  <Input
                    value={settings.integrations.elevenlabs.voiceId}
                    onChange={(e) => updateSetting("integrations", "elevenlabs.voiceId", e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Google */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-blue-500" />
                    Google APIs
                  </div>
                  <Switch
                    checked={settings.integrations.google.enabled}
                    onCheckedChange={(v) => updateSetting("integrations", "google.enabled", v)}
                  />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Maps API Key</Label>
                  <div className="flex gap-2">
                    <Input
                      type={showSecrets["google-maps"] ? "text" : "password"}
                      value={settings.integrations.google.mapsApiKey}
                      onChange={(e) => updateSetting("integrations", "google.mapsApiKey", e.target.value)}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => toggleSecret("google-maps")}
                    >
                      {showSecrets["google-maps"] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <Label>Google Drive</Label>
                  <Switch
                    checked={settings.integrations.google.driveEnabled}
                    onCheckedChange={(v) => updateSetting("integrations", "google.driveEnabled", v)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label>Google Calendar</Label>
                  <Switch
                    checked={settings.integrations.google.calendarEnabled}
                    onCheckedChange={(v) => updateSetting("integrations", "google.calendarEnabled", v)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Device Settings */}
        <TabsContent value="devices" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="h-5 w-5" />
                Device Network Configuration
              </CardTitle>
              <CardDescription>
                Configure MycoBrain devices, mesh network, and telemetry
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="space-y-0.5">
                    <Label>Auto Discovery</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically discover new devices on the network
                    </p>
                  </div>
                  <Switch
                    checked={settings.devices.autoDiscovery}
                    onCheckedChange={(v) => updateSetting("devices", "autoDiscovery", v)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="space-y-0.5">
                    <Label>MycoBrain Protocol</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable MycoBrain LoRa mesh network
                    </p>
                  </div>
                  <Switch
                    checked={settings.devices.mycoBrainEnabled}
                    onCheckedChange={(v) => updateSetting("devices", "mycoBrainEnabled", v)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="space-y-0.5">
                    <Label>Mesh Network</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable device-to-device mesh routing
                    </p>
                  </div>
                  <Switch
                    checked={settings.devices.meshNetworkEnabled}
                    onCheckedChange={(v) => updateSetting("devices", "meshNetworkEnabled", v)}
                  />
                </div>
              </div>

              <Separator />

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Scan Interval: {settings.devices.scanInterval}s</Label>
                  <Slider
                    value={[settings.devices.scanInterval]}
                    min={10}
                    max={120}
                    step={5}
                    onValueChange={([v]) => updateSetting("devices", "scanInterval", v)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Offline Threshold: {settings.devices.offlineThreshold}s</Label>
                  <Slider
                    value={[settings.devices.offlineThreshold]}
                    min={60}
                    max={600}
                    step={30}
                    onValueChange={([v]) => updateSetting("devices", "offlineThreshold", v)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Telemetry Interval: {settings.devices.telemetryInterval}s</Label>
                  <Slider
                    value={[settings.devices.telemetryInterval]}
                    min={10}
                    max={300}
                    step={10}
                    onValueChange={([v]) => updateSetting("devices", "telemetryInterval", v)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>LoRa Frequency</Label>
                  <Select
                    value={settings.devices.loraFrequency.toString()}
                    onValueChange={(v) => updateSetting("devices", "loraFrequency", parseFloat(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="868.0">868 MHz (EU)</SelectItem>
                      <SelectItem value="915.0">915 MHz (US)</SelectItem>
                      <SelectItem value="923.0">923 MHz (AS)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-red-500" />
                Security Configuration
              </CardTitle>
              <CardDescription>
                Manage authentication, authorization, and security policies.
                Changes require approval.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10">
                <div className="flex items-center gap-2 text-yellow-500">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Security settings changes require admin approval
                  </span>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="space-y-0.5">
                    <Label>Multi-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">
                      Require MFA for all users
                    </p>
                  </div>
                  <Switch
                    checked={settings.security.mfaEnabled}
                    onCheckedChange={(v) => updateSetting("security", "mfaEnabled", v)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="space-y-0.5">
                    <Label>Encryption</Label>
                    <p className="text-sm text-muted-foreground">
                      Encrypt all data at rest and in transit
                    </p>
                  </div>
                  <Switch
                    checked={settings.security.encryptionEnabled}
                    onCheckedChange={(v) => updateSetting("security", "encryptionEnabled", v)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="space-y-0.5">
                    <Label>Audit Logging</Label>
                    <p className="text-sm text-muted-foreground">
                      Log all security-related events
                    </p>
                  </div>
                  <Switch
                    checked={settings.security.auditLogging}
                    onCheckedChange={(v) => updateSetting("security", "auditLogging", v)}
                  />
                </div>
              </div>

              <Separator />

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Session Timeout (seconds)</Label>
                  <Input
                    type="number"
                    value={settings.security.sessionTimeout}
                    onChange={(e) => updateSetting("security", "sessionTimeout", parseInt(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>API Rate Limit (req/min)</Label>
                  <Input
                    type="number"
                    value={settings.security.apiRateLimit}
                    onChange={(e) => updateSetting("security", "apiRateLimit", parseInt(e.target.value))}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>CORS Origins</Label>
                  <Textarea
                    value={settings.security.corsOrigins.join("\n")}
                    onChange={(e) => updateSetting("security", "corsOrigins", e.target.value.split("\n").filter(Boolean))}
                    placeholder="One origin per line..."
                    rows={3}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Email Notifications
                  </div>
                  <Switch
                    checked={settings.notifications.email.enabled}
                    onCheckedChange={(v) => updateSetting("notifications", "email.enabled", v)}
                  />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input
                    type="email"
                    value={settings.notifications.email.address}
                    onChange={(e) => updateSetting("notifications", "email.address", e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Digest Frequency</Label>
                  <Select
                    value={settings.notifications.email.digestFrequency}
                    onValueChange={(v) => updateSetting("notifications", "email.digestFrequency", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="realtime">Real-time</SelectItem>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Push Notifications
                  </div>
                  <Switch
                    checked={settings.notifications.push.enabled}
                    onCheckedChange={(v) => updateSetting("notifications", "push.enabled", v)}
                  />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Critical Alerts</Label>
                  <Switch
                    checked={settings.notifications.push.critical}
                    onCheckedChange={(v) => updateSetting("notifications", "push.critical", v)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label>Warnings</Label>
                  <Switch
                    checked={settings.notifications.push.warnings}
                    onCheckedChange={(v) => updateSetting("notifications", "push.warnings", v)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label>Info Messages</Label>
                  <Switch
                    checked={settings.notifications.push.info}
                    onCheckedChange={(v) => updateSetting("notifications", "push.info", v)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Slack Integration
                  </div>
                  <Switch
                    checked={settings.notifications.slack.enabled}
                    onCheckedChange={(v) => updateSetting("notifications", "slack.enabled", v)}
                  />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Webhook URL</Label>
                    <div className="flex gap-2">
                      <Input
                        type={showSecrets["slack-webhook"] ? "text" : "password"}
                        value={settings.notifications.slack.webhookUrl}
                        onChange={(e) => updateSetting("notifications", "slack.webhookUrl", e.target.value)}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => toggleSecret("slack-webhook")}
                      >
                        {showSecrets["slack-webhook"] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Channel</Label>
                    <Input
                      value={settings.notifications.slack.channel}
                      onChange={(e) => updateSetting("notifications", "slack.channel", e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Storage Settings */}
        <TabsContent value="storage" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5" />
                Storage Configuration
              </CardTitle>
              <CardDescription>
                Configure data storage, backup, and retention policies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Primary Backend</Label>
                  <Select
                    value={settings.storage.primaryBackend}
                    onValueChange={(v) => updateSetting("storage", "primaryBackend", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="local">Local Storage</SelectItem>
                      <SelectItem value="s3">Amazon S3</SelectItem>
                      <SelectItem value="azure">Azure Blob</SelectItem>
                      <SelectItem value="gcs">Google Cloud Storage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Local Path</Label>
                  <Input
                    value={settings.storage.localPath}
                    onChange={(e) => updateSetting("storage", "localPath", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Retention Days</Label>
                  <Input
                    type="number"
                    value={settings.storage.retentionDays}
                    onChange={(e) => updateSetting("storage", "retentionDays", parseInt(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Max Storage (GB)</Label>
                  <Input
                    type="number"
                    value={settings.storage.maxStorageGb}
                    onChange={(e) => updateSetting("storage", "maxStorageGb", parseInt(e.target.value))}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Cloud Sync</Label>
                    <p className="text-sm text-muted-foreground">
                      Sync data to cloud storage
                    </p>
                  </div>
                  <Switch
                    checked={settings.storage.cloudSync}
                    onCheckedChange={(v) => updateSetting("storage", "cloudSync", v)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Compression</Label>
                    <p className="text-sm text-muted-foreground">
                      Compress stored data to save space
                    </p>
                  </div>
                  <Switch
                    checked={settings.storage.compressionEnabled}
                    onCheckedChange={(v) => updateSetting("storage", "compressionEnabled", v)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Shell Settings */}
        <TabsContent value="shell" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="h-5 w-5 text-green-500" />
                Shell Configuration
              </CardTitle>
              <CardDescription>
                Customize the NatureOS Cloud Shell appearance and behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <Select
                    value={settings.shell.theme}
                    onValueChange={(v) => updateSetting("shell", "theme", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="monokai">Monokai</SelectItem>
                      <SelectItem value="dracula">Dracula</SelectItem>
                      <SelectItem value="nord">Nord</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Font Family</Label>
                  <Select
                    value={settings.shell.fontFamily}
                    onValueChange={(v) => updateSetting("shell", "fontFamily", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="JetBrains Mono">JetBrains Mono</SelectItem>
                      <SelectItem value="Fira Code">Fira Code</SelectItem>
                      <SelectItem value="Monaco">Monaco</SelectItem>
                      <SelectItem value="Consolas">Consolas</SelectItem>
                      <SelectItem value="monospace">System Mono</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Font Size: {settings.shell.fontSize}px</Label>
                  <Slider
                    value={[settings.shell.fontSize]}
                    min={10}
                    max={24}
                    step={1}
                    onValueChange={([v]) => updateSetting("shell", "fontSize", v)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>History Size: {settings.shell.historySize} commands</Label>
                  <Slider
                    value={[settings.shell.historySize]}
                    min={100}
                    max={5000}
                    step={100}
                    onValueChange={([v]) => updateSetting("shell", "historySize", v)}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Autocomplete</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable command autocomplete suggestions
                    </p>
                  </div>
                  <Switch
                    checked={settings.shell.autocomplete}
                    onCheckedChange={(v) => updateSetting("shell", "autocomplete", v)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Syntax Highlighting</Label>
                    <p className="text-sm text-muted-foreground">
                      Highlight code syntax in output
                    </p>
                  </div>
                  <Switch
                    checked={settings.shell.syntaxHighlighting}
                    onCheckedChange={(v) => updateSetting("shell", "syntaxHighlighting", v)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>AI Assist</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable MYCA AI assistance in shell
                    </p>
                  </div>
                  <Switch
                    checked={settings.shell.aiAssist}
                    onCheckedChange={(v) => updateSetting("shell", "aiAssist", v)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Change Log Dialog */}
      <Dialog open={showChangeLog} onOpenChange={setShowChangeLog}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Settings Change Log
            </DialogTitle>
            <DialogDescription>
              All settings changes are logged here and sent to MYCA for training
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-3">
              {changeLog.map((entry) => (
                <div
                  key={entry.id}
                  className="p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getSourceIcon(entry.source)}
                      <span className="font-medium">
                        {entry.category}.{entry.key}
                      </span>
                      {entry.impact && getImpactBadge(entry.impact)}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-red-400 line-through">
                      {JSON.stringify(entry.oldValue)}
                    </span>
                    <ChevronRight className="h-4 w-4" />
                    <span className="text-green-400">
                      {JSON.stringify(entry.newValue)}
                    </span>
                  </div>
                  {entry.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {entry.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => fetchSettings()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" asChild>
              <a href="/api/natureos/settings/changelog?format=training" target="_blank">
                <Download className="h-4 w-4 mr-2" />
                Export for Training
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval Dialog */}
      <AlertDialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Approval Required
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingApproval && (
                <div className="space-y-3 mt-2">
                  <p>
                    The following change requires your approval:
                  </p>
                  <div className="p-3 rounded-lg border bg-card">
                    <p className="font-medium">
                      {pendingApproval.category}.{pendingApproval.key}
                    </p>
                    <div className="flex items-center gap-2 text-sm mt-1">
                      <span className="text-red-400">
                        {JSON.stringify(pendingApproval.oldValue)}
                      </span>
                      <ChevronRight className="h-4 w-4" />
                      <span className="text-green-400">
                        {JSON.stringify(pendingApproval.newValue)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Requested by: {pendingApproval.source} at{" "}
                      {new Date(pendingApproval.requestedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => pendingApproval && approveChange(pendingApproval.id, "reject")}>
              <X className="h-4 w-4 mr-2" />
              Reject
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => pendingApproval && approveChange(pendingApproval.id, "approve")}>
              <Check className="h-4 w-4 mr-2" />
              Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardShell>
  )
}
