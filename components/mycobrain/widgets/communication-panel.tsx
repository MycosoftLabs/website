"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { 
  Radio, 
  Wifi, 
  Bluetooth, 
  Globe,
  Send,
  RefreshCw,
  Loader2,
  Signal,
  SignalHigh,
  SignalLow,
  SignalZero,
  Smartphone,
  Antenna,
  Network,
} from "lucide-react"

interface CommunicationPanelProps {
  deviceId: string
  onCommand?: (cmd: string) => void
}

interface CommLog {
  id: string
  timestamp: string
  direction: "tx" | "rx"
  protocol: string
  message: string
  status: "success" | "error" | "pending"
}

export function CommunicationPanel({ deviceId, onCommand }: CommunicationPanelProps) {
  const [loading, setLoading] = useState(false)
  
  // LoRa state
  const [loraEnabled, setLoraEnabled] = useState(true)
  const [loraMessage, setLoraMessage] = useState("")
  const [loraStatus, setLoraStatus] = useState<{
    connected: boolean
    frequency?: number
    spreadingFactor?: number
    rssi?: number
    snr?: number
  }>({
    connected: true,
    frequency: 915.0,
    spreadingFactor: 7,
    rssi: -85,
    snr: 9.5,
  })
  
  // WiFi state
  const [wifiStatus] = useState<{
    connected: boolean
    ssid?: string
    ip?: string
    rssi?: number
  }>({
    connected: false,
  })
  
  // Bluetooth state
  const [bleStatus, setBleStatus] = useState<{
    enabled: boolean
    advertising: boolean
    connected: boolean
    deviceName?: string
  }>({
    enabled: true,
    advertising: true,
    connected: false,
    deviceName: "MycoBoard",
  })
  
  // ESP-NOW mesh state
  const [meshStatus, setMeshStatus] = useState<{
    enabled: boolean
    peers: number
  }>({
    enabled: false,
    peers: 0,
  })
  
  // Communication log
  const [commLog, setCommLog] = useState<CommLog[]>([])
  
  const addLog = (log: Omit<CommLog, "id" | "timestamp">) => {
    setCommLog(prev => [{
      id: Math.random().toString(36).slice(2),
      timestamp: new Date().toISOString(),
      ...log,
    }, ...prev.slice(0, 49)])
  }
  
  const sendLoraMessage = useCallback(async () => {
    if (!loraMessage.trim()) return
    
    setLoading(true)
    addLog({
      direction: "tx",
      protocol: "LoRa",
      message: loraMessage,
      status: "pending",
    })
    
    try {
      const res = await fetch(`/api/mycobrain/${encodeURIComponent(deviceId)}/control`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          peripheral: "lora",
          action: "send",
          message: loraMessage,
        }),
      })
      
      if (res.ok) {
        addLog({
          direction: "tx",
          protocol: "LoRa",
          message: loraMessage,
          status: "success",
        })
        onCommand?.(`lora send ${loraMessage}`)
        setLoraMessage("")
      } else {
        addLog({
          direction: "tx",
          protocol: "LoRa",
          message: loraMessage,
          status: "error",
        })
      }
    } catch {
      addLog({
        direction: "tx",
        protocol: "LoRa",
        message: loraMessage,
        status: "error",
      })
    } finally {
      setLoading(false)
    }
  }, [deviceId, loraMessage, onCommand])
  
  const refreshLoraStatus = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/mycobrain/${encodeURIComponent(deviceId)}/control`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          peripheral: "lora",
          action: "status",
        }),
      })
      
      if (res.ok) {
        const data = await res.json()
        if (data.lora) {
          setLoraStatus(data.lora)
        }
      }
    } catch { /* ignore */ }
    finally {
      setLoading(false)
    }
  }
  
  const getRssiIcon = (rssi?: number) => {
    if (rssi === undefined) return <SignalZero className="h-4 w-4 text-muted-foreground" />
    if (rssi > -60) return <SignalHigh className="h-4 w-4 text-green-500" />
    if (rssi > -80) return <Signal className="h-4 w-4 text-yellow-500" />
    return <SignalLow className="h-4 w-4 text-red-500" />
  }
  
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Radio className="h-5 w-5 text-blue-500" />
          Communication
          {loading && <Loader2 className="h-4 w-4 animate-spin ml-auto" />}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="lora" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="lora" className="text-xs">
              <Antenna className="h-3 w-3 mr-1" />
              LoRa
            </TabsTrigger>
            <TabsTrigger value="wifi" className="text-xs">
              <Wifi className="h-3 w-3 mr-1" />
              WiFi
            </TabsTrigger>
            <TabsTrigger value="ble" className="text-xs">
              <Bluetooth className="h-3 w-3 mr-1" />
              BLE
            </TabsTrigger>
            <TabsTrigger value="mesh" className="text-xs">
              <Network className="h-3 w-3 mr-1" />
              Mesh
            </TabsTrigger>
          </TabsList>
          
          {/* LoRa Tab */}
          <TabsContent value="lora" className="space-y-4">
            <div className="p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Antenna className="h-5 w-5 text-purple-500" />
                  <span className="font-medium">LoRa Radio</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={loraEnabled} 
                    onCheckedChange={setLoraEnabled}
                  />
                  <Badge variant={loraStatus.connected ? "default" : "secondary"}>
                    {loraStatus.connected ? "Connected" : "Disconnected"}
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Frequency:</span>
                  <span className="ml-2 font-mono">{loraStatus.frequency || "--"} MHz</span>
                </div>
                <div>
                  <span className="text-muted-foreground">SF:</span>
                  <span className="ml-2 font-mono">{loraStatus.spreadingFactor || "--"}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">RSSI:</span>
                  {getRssiIcon(loraStatus.rssi)}
                  <span className="font-mono">{loraStatus.rssi || "--"} dBm</span>
                </div>
                <div>
                  <span className="text-muted-foreground">SNR:</span>
                  <span className="ml-2 font-mono">{loraStatus.snr || "--"} dB</span>
                </div>
              </div>
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="mt-2"
                onClick={refreshLoraStatus}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
            
            <div className="space-y-2">
              <Label>Send LoRa Message</Label>
              <div className="flex gap-2">
                <Input
                  value={loraMessage}
                  onChange={(e) => setLoraMessage(e.target.value)}
                  placeholder="Enter message..."
                  onKeyDown={(e) => e.key === "Enter" && sendLoraMessage()}
                />
                <Button 
                  onClick={sendLoraMessage}
                  disabled={loading || !loraMessage.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Quick Commands */}
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setLoraMessage("PING")
                }}
              >
                Ping
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setLoraMessage("BEACON")
                }}
              >
                Beacon
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setLoraMessage("STATUS?")
                }}
              >
                Query Status
              </Button>
            </div>
          </TabsContent>
          
          {/* WiFi Tab */}
          <TabsContent value="wifi" className="space-y-4">
            <div className="p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Wifi className="h-5 w-5 text-blue-500" />
                  <span className="font-medium">WiFi</span>
                </div>
                <Badge variant={wifiStatus.connected ? "default" : "secondary"}>
                  {wifiStatus.connected ? "Connected" : "Disconnected"}
                </Badge>
              </div>
              
              {wifiStatus.connected ? (
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">SSID:</span>
                    <span className="ml-2 font-medium">{wifiStatus.ssid}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">IP:</span>
                    <span className="ml-2 font-mono">{wifiStatus.ip}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Signal:</span>
                    {getRssiIcon(wifiStatus.rssi)}
                    <span className="font-mono">{wifiStatus.rssi} dBm</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  WiFi not configured on this board
                </p>
              )}
            </div>
            
            <div className="text-center py-4 text-muted-foreground text-sm">
              WiFi configuration coming soon
            </div>
          </TabsContent>
          
          {/* Bluetooth Tab */}
          <TabsContent value="ble" className="space-y-4">
            <div className="p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Bluetooth className="h-5 w-5 text-blue-600" />
                  <span className="font-medium">Bluetooth LE</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={bleStatus.enabled} 
                    onCheckedChange={(v) => setBleStatus(s => ({ ...s, enabled: v }))}
                  />
                  <Badge variant={bleStatus.connected ? "default" : "secondary"}>
                    {bleStatus.connected ? "Paired" : bleStatus.advertising ? "Advertising" : "Off"}
                  </Badge>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Device Name:</span>
                  <span className="ml-2 font-medium">{bleStatus.deviceName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Advertising:</span>
                  <Switch 
                    checked={bleStatus.advertising} 
                    onCheckedChange={(v) => setBleStatus(s => ({ ...s, advertising: v }))}
                    disabled={!bleStatus.enabled}
                  />
                </div>
              </div>
            </div>
            
            <div className="text-center py-4 text-muted-foreground text-sm">
              <Smartphone className="h-8 w-8 mx-auto mb-2 opacity-50" />
              Connect via Bluetooth Serial or Nordic UART Service
            </div>
          </TabsContent>
          
          {/* Mesh Tab */}
          <TabsContent value="mesh" className="space-y-4">
            <div className="p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Network className="h-5 w-5 text-green-500" />
                  <span className="font-medium">ESP-NOW Mesh</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={meshStatus.enabled} 
                    onCheckedChange={(v) => setMeshStatus(s => ({ ...s, enabled: v }))}
                  />
                  <Badge variant={meshStatus.enabled ? "default" : "secondary"}>
                    {meshStatus.enabled ? `${meshStatus.peers} Peers` : "Disabled"}
                  </Badge>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground">
                ESP-NOW allows low-latency, connectionless communication between ESP32 devices.
              </p>
            </div>
            
            <div className="text-center py-4 text-muted-foreground text-sm">
              <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
              Mesh networking coming soon
            </div>
          </TabsContent>
        </Tabs>
        
        <Separator className="my-4" />
        
        {/* Communication Log */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm">Communication Log</Label>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setCommLog([])}
            >
              Clear
            </Button>
          </div>
          
          <ScrollArea className="h-32 rounded border bg-muted/30 p-2">
            {commLog.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                No messages yet
              </p>
            ) : (
              <div className="space-y-1">
                {commLog.map((log) => (
                  <div 
                    key={log.id}
                    className="flex items-center gap-2 text-xs font-mono"
                  >
                    <span className="text-muted-foreground">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <Badge 
                      variant={log.direction === "tx" ? "default" : "secondary"}
                      className="text-[10px] px-1"
                    >
                      {log.direction.toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] px-1">
                      {log.protocol}
                    </Badge>
                    <span className={
                      log.status === "success" ? "text-green-500" :
                      log.status === "error" ? "text-red-500" :
                      "text-yellow-500"
                    }>
                      {log.message}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  )
}

