"use client"

import React, { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import {
  Settings, Loader2, Save, RefreshCw, Globe, Shield, Bell,
  Zap, Eye, Bug
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface SiteSettings {
  site_name: string
  site_description: string
  maintenance_message: string
  debug_mode: boolean
  registration_enabled: boolean
  api_rate_limit: number
  max_upload_size_mb: number
  features: {
    voice_enabled: boolean
    web_speech_fallback: boolean
    mas_sse_enabled: boolean
    mas_ws_enabled: boolean
    use_local_gpu: boolean
    worldview_search: boolean
  }
  notifications: {
    email_alerts: boolean
    slack_webhook: boolean
    alert_severity: string
  }
}

const DEFAULT_SETTINGS: SiteSettings = {
  site_name: "Mycosoft",
  site_description: "Mycological Intelligence Platform",
  maintenance_message: "We are currently performing maintenance. Please check back soon.",
  debug_mode: false,
  registration_enabled: true,
  api_rate_limit: 100,
  max_upload_size_mb: 50,
  features: {
    voice_enabled: false,
    web_speech_fallback: true,
    mas_sse_enabled: true,
    mas_ws_enabled: true,
    use_local_gpu: false,
    worldview_search: false,
  },
  notifications: {
    email_alerts: true,
    slack_webhook: false,
    alert_severity: "medium",
  },
}

export function SettingsModule() {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/dashboard/settings")
      if (res.ok) {
        const data = await res.json()
        setSettings({ ...DEFAULT_SETTINGS, ...data.settings })
      }
    } catch {
      // Use defaults
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSettings() }, [])

  const updateField = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
    setDirty(true)
  }

  const updateFeature = (key: keyof SiteSettings["features"], value: boolean) => {
    setSettings((prev) => ({ ...prev, features: { ...prev.features, [key]: value } }))
    setDirty(true)
  }

  const updateNotification = (key: keyof SiteSettings["notifications"], value: boolean | string) => {
    setSettings((prev) => ({ ...prev, notifications: { ...prev.notifications, [key]: value } }))
    setDirty(true)
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/dashboard/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      })
      if (res.ok) {
        toast.success("Settings saved")
        setDirty(false)
      } else {
        toast.error("Failed to save settings")
      }
    } catch {
      toast.error("Network error")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Site Settings</h2>
          <p className="text-slate-400 text-sm">Global configuration for the entire platform</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchSettings}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={saveSettings}
            disabled={!dirty || saving}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              dirty
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-slate-800 text-slate-500 cursor-not-allowed"
            )}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
        </div>
      </div>

      {/* General Settings */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-slate-400" />
            General
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Site Name</label>
            <input
              type="text"
              value={settings.site_name}
              onChange={(e) => updateField("site_name", e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Site Description</label>
            <input
              type="text"
              value={settings.site_description}
              onChange={(e) => updateField("site_description", e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Maintenance Message</label>
            <textarea
              value={settings.maintenance_message}
              onChange={(e) => updateField("maintenance_message", e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-sm focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm text-slate-400 mb-1">API Rate Limit (req/min)</label>
              <input
                type="number"
                value={settings.api_rate_limit}
                onChange={(e) => updateField("api_rate_limit", parseInt(e.target.value) || 100)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Max Upload Size (MB)</label>
              <input
                type="number"
                value={settings.max_upload_size_mb}
                onChange={(e) => updateField("max_upload_size_mb", parseInt(e.target.value) || 50)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Toggles */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-slate-400" />
            System Toggles
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-white">Debug Mode</div>
              <div className="text-xs text-slate-500">Enable verbose logging and debug info</div>
            </div>
            <Switch checked={settings.debug_mode} onCheckedChange={(v) => updateField("debug_mode", v)} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-white">User Registration</div>
              <div className="text-xs text-slate-500">Allow new users to sign up</div>
            </div>
            <Switch checked={settings.registration_enabled} onCheckedChange={(v) => updateField("registration_enabled", v)} />
          </div>
        </CardContent>
      </Card>

      {/* Feature Flags */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-slate-400" />
            Feature Flags
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {([
            { key: "voice_enabled" as const, label: "Voice Features", desc: "Enable PersonaPlex voice system" },
            { key: "web_speech_fallback" as const, label: "Web Speech Fallback", desc: "Fall back to Web Speech API if voice unavailable" },
            { key: "mas_sse_enabled" as const, label: "MAS SSE", desc: "Server-Sent Events for Multi-Agent System" },
            { key: "mas_ws_enabled" as const, label: "MAS WebSocket", desc: "WebSocket support for MAS" },
            { key: "use_local_gpu" as const, label: "Local GPU", desc: "Use local GPU instead of cloud services" },
            { key: "worldview_search" as const, label: "Worldview Search", desc: "Route /api/search to MINDEX" },
          ]).map((flag) => (
            <div key={flag.key} className="flex items-center justify-between">
              <div>
                <div className="text-sm text-white">{flag.label}</div>
                <div className="text-xs text-slate-500">{flag.desc}</div>
              </div>
              <Switch
                checked={settings.features[flag.key]}
                onCheckedChange={(v) => updateFeature(flag.key, v)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-slate-400" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-white">Email Alerts</div>
              <div className="text-xs text-slate-500">Send security alerts via email</div>
            </div>
            <Switch checked={settings.notifications.email_alerts} onCheckedChange={(v) => updateNotification("email_alerts", v)} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-white">Slack Webhook</div>
              <div className="text-xs text-slate-500">Send notifications to Slack</div>
            </div>
            <Switch checked={settings.notifications.slack_webhook} onCheckedChange={(v) => updateNotification("slack_webhook", v)} />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Minimum Alert Severity</label>
            <select
              value={settings.notifications.alert_severity}
              onChange={(e) => updateNotification("alert_severity", e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-slate-700 rounded text-sm text-slate-300 focus:outline-none"
            >
              <option value="info">Info</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
