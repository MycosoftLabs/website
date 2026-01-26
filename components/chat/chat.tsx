"use client"

/**
 * Enhanced Chat Component with MYCA NLQ Integration
 * Updated: Jan 26, 2026
 * 
 * Features:
 * - Standard AI chat via Vercel AI SDK
 * - MYCA NLQ mode for system queries
 * - Structured data display
 */

import { useState, useCallback } from "react"
import { useChat } from "ai/react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { 
  Bot, 
  Send, 
  User, 
  Sparkles, 
  Loader2,
  Database,
  FileText,
  Network,
} from "lucide-react"
import type { NLQResponse, NLQDataItem } from "@/lib/services/myca-nlq"

interface NLQMessage {
  id: string
  role: "user" | "assistant"
  content: string
  nlqData?: NLQDataItem[]
  nlqSources?: Array<{ name: string; type: string }>
}

export function Chat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat()
  
  // NLQ mode state
  const [nlqMode, setNlqMode] = useState(false)
  const [nlqMessages, setNlqMessages] = useState<NLQMessage[]>([])
  const [nlqInput, setNlqInput] = useState("")
  const [nlqLoading, setNlqLoading] = useState(false)
  
  // Handle NLQ submission
  const handleNlqSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nlqInput.trim() || nlqLoading) return
    
    const userMessage: NLQMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: nlqInput,
    }
    setNlqMessages(prev => [...prev, userMessage])
    const queryText = nlqInput
    setNlqInput("")
    setNlqLoading(true)
    
    try {
      const response = await fetch("/api/myca/nlq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: queryText,
          context: { currentPage: "chat" },
          options: { maxResults: 5, includeActions: true },
        }),
      })
      
      if (response.ok) {
        const data: NLQResponse = await response.json()
        const assistantMessage: NLQMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: data.text,
          nlqData: data.data,
          nlqSources: data.sources,
        }
        setNlqMessages(prev => [...prev, assistantMessage])
      } else {
        setNlqMessages(prev => [...prev, {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: "Sorry, I couldn't process that query. Please try again.",
        }])
      }
    } catch {
      setNlqMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: "Connection error. Please check your network.",
      }])
    } finally {
      setNlqLoading(false)
    }
  }, [nlqInput, nlqLoading])
  
  // Get icon for data type
  const getDataIcon = (type: string) => {
    if (type === "agent") return <Bot className="h-3 w-3 text-purple-400" />
    if (type === "document") return <FileText className="h-3 w-3 text-blue-400" />
    return <Database className="h-3 w-3 text-cyan-400" />
  }

  return (
    <Card className="flex h-full flex-col">
      {/* Mode Toggle Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <div className="flex items-center gap-2">
          {nlqMode ? (
            <Sparkles className="h-4 w-4 text-purple-500" />
          ) : (
            <Bot className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-sm font-medium">
            {nlqMode ? "MYCA NLQ" : "AI Chat"}
          </span>
          {nlqMode && (
            <Badge variant="secondary" className="text-[10px]">System Query</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">MYCA Mode</span>
          <Switch 
            checked={nlqMode} 
            onCheckedChange={setNlqMode}
            className="data-[state=checked]:bg-purple-500"
          />
        </div>
      </div>
      
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {nlqMode ? (
            // NLQ Messages
            nlqMessages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Sparkles className="h-8 w-8 mx-auto mb-2 text-purple-400" />
                <p className="text-sm">Ask MYCA about the system</p>
                <p className="text-xs mt-1">Try: &quot;Show agent status&quot; or &quot;List errors&quot;</p>
              </div>
            ) : (
              nlqMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex items-start gap-4 ${message.role === "assistant" ? "flex-row" : "flex-row-reverse"}`}
                >
                  <div className={`rounded-full p-2 ${message.role === "assistant" ? "bg-purple-500/20" : "bg-muted"}`}>
                    {message.role === "assistant" ? (
                      <Sparkles className="h-4 w-4 text-purple-400" />
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    
                    {/* NLQ Data */}
                    {message.nlqData && message.nlqData.length > 0 && (
                      <div className="space-y-1 mt-2">
                        {message.nlqData.map((item) => (
                          <div 
                            key={item.id}
                            className="flex items-center gap-2 p-2 rounded bg-muted/50 text-sm"
                          >
                            {getDataIcon(item.type)}
                            <span className="flex-1 truncate">{item.title}</span>
                            {item.subtitle && (
                              <span className="text-xs text-muted-foreground">{item.subtitle}</span>
                            )}
                            <Badge variant="outline" className="text-[9px]">{item.type}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Sources */}
                    {message.nlqSources && message.nlqSources.length > 0 && (
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Network className="h-3 w-3" />
                        {message.nlqSources.map(s => s.name).join(", ")}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )
          ) : (
            // Standard AI Messages
            messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Bot className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">Ask about mycology</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex items-start gap-4 ${message.role === "assistant" ? "flex-row" : "flex-row-reverse"}`}
                >
                  <div className="rounded-full bg-muted p-2">
                    {message.role === "assistant" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="text-sm">{message.content}</p>
                  </div>
                </div>
              ))
            )
          )}
          
          {/* Loading indicator */}
          {(nlqLoading || isLoading) && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Thinking...</span>
            </div>
          )}
        </div>
      </ScrollArea>
      
      {/* Input Form */}
      {nlqMode ? (
        <form onSubmit={handleNlqSubmit} className="border-t p-4">
          <div className="flex gap-4">
            <Textarea 
              value={nlqInput} 
              onChange={(e) => setNlqInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleNlqSubmit(e)
                }
              }}
              placeholder="Ask MYCA about agents, data, workflows..." 
              className="flex-1 min-h-[40px] max-h-[120px]" 
              disabled={nlqLoading}
            />
            <Button 
              type="submit" 
              size="icon" 
              className="bg-purple-600 hover:bg-purple-700"
              disabled={nlqLoading || !nlqInput.trim()}
            >
              {nlqLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span className="sr-only">Send message</span>
            </Button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="border-t p-4">
          <div className="flex gap-4">
            <Textarea 
              value={input} 
              onChange={handleInputChange} 
              placeholder="Ask about mycology..." 
              className="flex-1" 
            />
            <Button type="submit" size="icon" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span className="sr-only">Send message</span>
            </Button>
          </div>
        </form>
      )}
    </Card>
  )
}
