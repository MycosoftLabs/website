/**
 * Floating Control Panel - MYCA Consciousness Integration & Settings
 * Updated: Feb 10, 2026
 */

"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { SDRFilterPanel } from "./sdr-filter-panel"
import { StimulationPanel } from "./stimulation-panel"
import {
  ChevronLeft,
  ChevronRight,
  Brain,
  Settings,
  FileText,
  MessageCircle,
  Link2,
  Sparkles,
  Save,
  Download,
  Upload,
  Waves,
  Zap,
} from "lucide-react"

interface ControlPanelProps {
  deviceId?: string | null
}

export function ControlPanel({ deviceId }: ControlPanelProps) {
  const [isOpen, setIsOpen] = useState(false) // Start closed to prevent popup on load
  const [tab, setTab] = useState<"notes" | "myca" | "settings">("notes")
  const [experimentNotes, setExperimentNotes] = useState("")
  const [mycaQuery, setMycaQuery] = useState("")
  const [mycaResponse, setMycaResponse] = useState("")
  const [mycaLoading, setMycaLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle")
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Integration health status
  const [integrations, setIntegrations] = useState({
    crep: "checking" as "connected" | "offline" | "checking",
    earth2: "checking" as "connected" | "offline" | "checking",
    petriDish: "checking" as "synced" | "offline" | "checking",
    mindex: "checking" as "connected" | "offline" | "checking",
  })
  
  // Check integration health on mount
  useEffect(() => {
    const checkIntegrations = async () => {
      // Check CREP health
      try {
        const crepRes = await fetch("/api/crep/health", { signal: AbortSignal.timeout(3000) })
        setIntegrations(prev => ({ ...prev, crep: crepRes.ok ? "connected" : "offline" }))
      } catch {
        setIntegrations(prev => ({ ...prev, crep: "offline" }))
      }
      
      // Check Earth2 health
      try {
        const earth2Res = await fetch("/api/earth2/health", { signal: AbortSignal.timeout(3000) })
        setIntegrations(prev => ({ ...prev, earth2: earth2Res.ok ? "connected" : "offline" }))
      } catch {
        setIntegrations(prev => ({ ...prev, earth2: "offline" }))
      }
      
      // Check Petri Dish health (via MAS)
      try {
        const petriRes = await fetch("/api/simulation/petri-dish/health", { signal: AbortSignal.timeout(3000) })
        setIntegrations(prev => ({ ...prev, petriDish: petriRes.ok ? "synced" : "offline" }))
      } catch {
        setIntegrations(prev => ({ ...prev, petriDish: "offline" }))
      }
      
      // Check MINDEX health
      try {
        const mindexRes = await fetch("/api/mindex/health", { signal: AbortSignal.timeout(3000) })
        setIntegrations(prev => ({ ...prev, mindex: mindexRes.ok ? "connected" : "offline" }))
      } catch {
        setIntegrations(prev => ({ ...prev, mindex: "offline" }))
      }
    }
    
    checkIntegrations()
  }, [])
  
  // Save notes to local storage and optionally to backend
  const handleSaveNotes = useCallback(async () => {
    setSaveStatus("saving")
    try {
      // Save to localStorage immediately
      const noteData = {
        deviceId: deviceId || "no-device",
        notes: experimentNotes,
        timestamp: new Date().toISOString(),
      }
      localStorage.setItem(`fci-notes-${deviceId || "default"}`, JSON.stringify(noteData))
      
      // Also try to save to backend
      if (deviceId) {
        await fetch("/api/fci/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(noteData),
        }).catch(() => {
          // Silently fail for backend - localStorage is the primary
        })
      }
      
      setSaveStatus("saved")
      setTimeout(() => setSaveStatus("idle"), 2000)
    } catch (error) {
      console.error("Failed to save notes:", error)
      setSaveStatus("idle")
    }
  }, [deviceId, experimentNotes])
  
  // Export notes and session data as JSON file
  const handleExport = useCallback(() => {
    const exportData = {
      deviceId: deviceId || "no-device",
      notes: experimentNotes,
      exportedAt: new Date().toISOString(),
      version: "1.0",
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `fci-session-${deviceId || "unknown"}-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [deviceId, experimentNotes])
  
  // Import notes from JSON file
  const handleImport = useCallback(() => {
    fileInputRef.current?.click()
  }, [])
  
  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        if (data.notes) {
          setExperimentNotes(data.notes)
        }
      } catch (error) {
        console.error("Failed to parse imported file:", error)
      }
    }
    reader.readAsText(file)
    
    // Reset file input
    event.target.value = ""
  }, [])
  
  const askMyca = async () => {
    if (!mycaQuery.trim() || mycaLoading) return
    
    setMycaLoading(true)
    setMycaResponse("Processing...")
    
    try {
      // Try consciousness API first
      const response = await fetch("/api/myca/consciousness/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `[FCI Context: Device ${deviceId || "unknown"}] ${mycaQuery}`,
          session_id: `fci-${Date.now()}`,
        }),
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.reply) {
          setMycaResponse(data.reply)
          setMycaQuery("")
          setMycaLoading(false)
          return
        }
      }
      
      // Fallback to NLQ
      const nlqResponse = await fetch("/api/myca/nlq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: mycaQuery,
          context: { currentPage: "fungi-compute", deviceId },
          options: { maxResults: 3 },
        }),
      })
      
      if (nlqResponse.ok) {
        const nlqData = await nlqResponse.json()
        setMycaResponse(nlqData.text || "I understand. How can I help with FCI analysis?")
      } else {
        setMycaResponse("MYCA is currently unavailable. Please try again.")
      }
    } catch (error) {
      setMycaResponse(`Error: ${error instanceof Error ? error.message : "Connection failed"}`)
    } finally {
      setMycaQuery("")
      setMycaLoading(false)
    }
  }
  
  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed left-2 top-20 z-50 h-12 w-12 rounded-xl backdrop-blur-2xl bg-black/60 border border-cyan-500/30 hover:border-cyan-400/50 shadow-[0_8px_32px_0_rgba(6,182,212,0.2)] transition-all duration-300"
      >
        <ChevronRight className="h-5 w-5 text-cyan-400" />
      </Button>
    )
  }
  
  return (
    <div className="fixed left-2 top-16 bottom-2 w-80 z-50 flex flex-col gap-2 animate-in slide-in-from-left duration-300">
      {/* Glass Panel */}
      <div className="flex-1 backdrop-blur-2xl bg-gradient-to-br from-black/80 via-black/70 to-black/80 rounded-2xl border border-cyan-500/30 shadow-[0_8px_48px_0_rgba(6,182,212,0.25),inset_0_1px_0_0_rgba(255,255,255,0.05)] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-cyan-500/20 bg-black/40">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/30">
              <Brain className="h-4 w-4 text-cyan-400" />
            </div>
            <span className="text-sm font-semibold text-cyan-300">Control Center</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="h-7 w-7 text-cyan-400 hover:bg-cyan-500/10"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-1 p-2 bg-black/20 border-b border-cyan-500/10">
          <button
            onClick={() => setTab("notes")}
            className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
              tab === "notes"
                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                : "text-cyan-400/50 hover:text-cyan-400"
            }`}
          >
            <FileText className="h-3 w-3 inline mr-1" />
            Notes
          </button>
          <button
            onClick={() => setTab("myca")}
            className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
              tab === "myca"
                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                : "text-cyan-400/50 hover:text-cyan-400"
            }`}
          >
            <Sparkles className="h-3 w-3 inline mr-1" />
            MYCA
          </button>
          <button
            onClick={() => setTab("settings")}
            className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
              tab === "settings"
                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                : "text-cyan-400/50 hover:text-cyan-400"
            }`}
          >
            <Settings className="h-3 w-3 inline mr-1" />
            Controls
          </button>
        </div>
        
        {/* Content */}
        <ScrollArea className="flex-1 p-3">
          {tab === "notes" && (
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-cyan-400/70 font-semibold">Experiment Notes</label>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 text-xs text-cyan-400"
                    onClick={handleSaveNotes}
                    disabled={saveStatus === "saving"}
                  >
                    <Save className="h-3 w-3 mr-1" />
                    {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved!" : "Save"}
                  </Button>
                </div>
                <Textarea
                  value={experimentNotes}
                  onChange={(e) => setExperimentNotes(e.target.value)}
                  placeholder="Document your observations, probe placement, substrate conditions..."
                  className="min-h-[120px] bg-black/40 border-cyan-500/20 text-cyan-100 text-xs placeholder:text-cyan-400/30"
                />
              </div>
              
              <Separator className="bg-cyan-500/10" />
              
              <div>
                <label className="text-xs text-cyan-400/70 font-semibold mb-2 block">Active Device</label>
                <Badge variant="outline" className="w-full justify-start text-xs border-emerald-500/30 text-emerald-400">
                  {deviceId || "No device selected"}
                </Badge>
              </div>
              
              <div>
                <label className="text-xs text-cyan-400/70 font-semibold mb-2 block">Quick Actions</label>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-xs border-cyan-500/20 text-cyan-400"
                    onClick={handleExport}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Export
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-xs border-cyan-500/20 text-cyan-400"
                    onClick={handleImport}
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    Import
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </div>
            </div>
          )}
          
          {tab === "myca" && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-cyan-400/70 font-semibold mb-2 block flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Ask MYCA About Signals
                </label>
                <Textarea
                  value={mycaQuery}
                  onChange={(e) => setMycaQuery(e.target.value)}
                  placeholder="What pattern is this? Why is the spike rate increasing? Correlate with weather..."
                  className="min-h-[80px] bg-black/40 border-cyan-500/20 text-cyan-100 text-xs placeholder:text-cyan-400/30"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.ctrlKey) {
                      askMyca()
                    }
                  }}
                />
                <Button
                  onClick={askMyca}
                  className="w-full mt-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/40"
                  size="sm"
                >
                  <MessageCircle className="h-3 w-3 mr-2" />
                  Ask MYCA
                </Button>
              </div>
              
              {mycaResponse && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-emerald-400">MYCA</span>
                  </div>
                  <p className="text-xs text-cyan-100/90 leading-relaxed">{mycaResponse}</p>
                </div>
              )}
            </div>
          )}
          
          {tab === "settings" && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-cyan-400/70 font-semibold mb-2 block flex items-center gap-1">
                  <Waves className="h-3 w-3" />
                  SDR Filtering
                </label>
                <div className="p-3 rounded-lg bg-black/40 border border-cyan-500/10">
                  <SDRFilterPanel deviceId={deviceId} />
                </div>
              </div>
              
              <Separator className="bg-cyan-500/10" />
              
              <div>
                <label className="text-xs text-cyan-400/70 font-semibold mb-2 block flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  Stimulation
                </label>
                <div className="p-3 rounded-lg bg-black/40 border border-cyan-500/10">
                  <StimulationPanel deviceId={deviceId} />
                </div>
              </div>
              
              <Separator className="bg-cyan-500/10" />
              
              <div>
                <label className="text-xs text-cyan-400/70 font-semibold mb-2 block">Display</label>
                <div className="space-y-2">
                  <SettingRow label="Show Grid" value="On" />
                  <SettingRow label="Persistence" value="Medium" />
                  <SettingRow label="CRT Effect" value="Enabled" />
                </div>
              </div>
              
              <Separator className="bg-cyan-500/10" />
              
              <div>
                <label className="text-xs text-cyan-400/70 font-semibold mb-2 block flex items-center gap-1">
                  <Link2 className="h-3 w-3" />
                  Integrations
                </label>
                <div className="space-y-1.5">
                  <IntegrationBadge name="CREP" status={integrations.crep} />
                  <IntegrationBadge name="Earth2" status={integrations.earth2} />
                  <IntegrationBadge name="Petri Dish" status={integrations.petriDish} />
                  <IntegrationBadge name="MINDEX" status={integrations.mindex} />
                </div>
              </div>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  )
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-black/30 border border-cyan-500/10">
      <span className="text-xs text-cyan-400/60">{label}</span>
      <span className="text-xs text-cyan-400 font-mono">{value}</span>
    </div>
  )
}

function IntegrationBadge({ name, status }: { name: string; status: string }) {
  const colors: Record<string, string> = {
    connected: "border-emerald-500/30 text-emerald-400",
    synced: "border-cyan-500/30 text-cyan-400",
    offline: "border-red-500/30 text-red-400",
    checking: "border-yellow-500/30 text-yellow-400 animate-pulse",
  }
  
  const displayStatus = status === "checking" ? "..." : status
  
  return (
    <div className={`flex items-center justify-between p-2 rounded-lg border backdrop-blur-sm bg-black/30 ${colors[status] || colors.offline}`}>
      <span className="text-xs font-medium">{name}</span>
      <Badge variant="outline" className={`text-[8px] px-1.5 py-0 h-4 ${colors[status] || colors.offline}`}>
        {displayStatus}
      </Badge>
    </div>
  )
}
