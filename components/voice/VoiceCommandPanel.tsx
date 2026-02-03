"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Mic, MicOff, Volume2, MessageSquare, Zap, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { useVoice } from "./UnifiedVoiceProvider"

interface VoiceCommandPanelProps {
  className?: string
  collapsed?: boolean
  onToggleCollapse?: () => void
}

const QUICK_COMMANDS = [
  { label: "System Status", command: "What's the system status?" },
  { label: "List Agents", command: "List all agents" },
  { label: "Show Workflows", command: "Show active workflows" },
  { label: "Network Status", command: "What's the network status?" },
  { label: "Device Status", command: "Check all devices" },
]

export function VoiceCommandPanel({
  className,
  collapsed = false,
  onToggleCollapse,
}: VoiceCommandPanelProps) {
  const voice = useVoice()
  const [history, setHistory] = useState<Array<{ role: "user" | "assistant", text: string }>>([])
  
  const handleQuickCommand = async (command: string) => {
    setHistory(prev => [...prev, { role: "user", text: command }])
    const response = await voice.sendCommand(command)
    setHistory(prev => [...prev, { role: "assistant", text: response }])
  }
  
  if (collapsed) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader className="py-3 cursor-pointer" onClick={onToggleCollapse}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {voice.isListening ? (
                <Mic className="h-4 w-4 text-red-500 animate-pulse" />
              ) : (
                <MicOff className="h-4 w-4 text-muted-foreground" />
              )}
              <CardTitle className="text-sm">Voice Commands</CardTitle>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
      </Card>
    )
  }
  
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {voice.isListening ? (
              <Mic className="h-5 w-5 text-red-500 animate-pulse" />
            ) : voice.isSpeaking ? (
              <Volume2 className="h-5 w-5 text-blue-500 animate-pulse" />
            ) : (
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
            )}
            <CardTitle className="text-base">Voice Commands</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={voice.isConnected ? "default" : "secondary"} className="text-xs">
              {voice.isConnected ? "Connected" : "Offline"}
            </Badge>
            {onToggleCollapse && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onToggleCollapse}>
                <ChevronUp className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <CardDescription>
          {voice.isListening ? "Listening..." : "Click mic or use quick commands"}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Voice controls */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={voice.isListening ? "destructive" : "default"}
            onClick={voice.isListening ? voice.stopListening : voice.startListening}
            className="flex-1 gap-2"
          >
            {voice.isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            {voice.isListening ? "Stop" : "Start"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={voice.clearTranscript}
          >
            Clear
          </Button>
        </div>
        
        {/* Interim transcript */}
        {voice.interimTranscript && (
          <div className="p-2 bg-muted/50 rounded text-sm italic text-muted-foreground">
            {voice.interimTranscript}
          </div>
        )}
        
        {/* Quick commands */}
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Quick Commands</h4>
          <div className="flex flex-wrap gap-1">
            {QUICK_COMMANDS.map((cmd) => (
              <Button
                key={cmd.label}
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => handleQuickCommand(cmd.command)}
              >
                <Zap className="h-3 w-3 mr-1" />
                {cmd.label}
              </Button>
            ))}
          </div>
        </div>
        
        {/* History */}
        {history.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-2">History</h4>
            <ScrollArea className="h-32">
              <div className="space-y-2">
                {history.slice(-6).map((item, i) => (
                  <div
                    key={i}
                    className={cn(
                      "p-2 rounded text-xs",
                      item.role === "user"
                        ? "bg-primary/10 text-primary"
                        : "bg-muted"
                    )}
                  >
                    <span className="font-medium">
                      {item.role === "user" ? "You: " : "MYCA: "}
                    </span>
                    {item.text}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
