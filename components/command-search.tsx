"use client"

/**
 * Command Search with MYCA NLQ Integration
 * Updated: Jan 26, 2026
 * 
 * Features:
 * - Traditional search mode for fungi, compounds, research
 * - MYCA AI mode for natural language queries
 * - Structured result display with actions
 * - Voice-ready responses
 */

import * as React from "react"
import { useRouter } from "next/navigation"
import type { DialogProps } from "@radix-ui/react-dialog"
import { Command as CommandPrimitive } from "cmdk"
import { 
  Search, 
  Sparkles, 
  Brain,
  Bot,
  Play,
  ArrowRight,
  Loader2,
  Database,
  FileText,
  Cpu,
  Network,
  MemoryStick,
  Workflow,
  AlertCircle,
} from "lucide-react"
import { MouseIcon as Mushroom, FlaskRoundIcon as Flask, Microscope } from "lucide-react"

import { cn } from "@/lib/utils"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useSearch } from "./search/use-search"
import { searchTracker } from "@/lib/services/search-tracker"
import type { NLQResponse, NLQDataItem, NLQAction } from "@/lib/services/myca-nlq"

export function CommandSearch({ ...props }: DialogProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [aiMode, setAiMode] = React.useState(false)
  const [aiQuery, setAiQuery] = React.useState("")
  const [aiResponse, setAiResponse] = React.useState<NLQResponse | null>(null)
  const [aiLoading, setAiLoading] = React.useState(false)
  
  const { query, setQuery, suggestions, isLoading } = useSearch()

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
      // Ctrl/Cmd + Shift + K for AI mode
      if (e.key === "K" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault()
        setOpen(true)
        setAiMode(true)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  // Clear state when dialog closes
  React.useEffect(() => {
    if (!open) {
      setAiResponse(null)
      setAiQuery("")
    }
  }, [open])

  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false)
    command()
  }, [])

  // Execute MYCA NLQ query
  const executeAiQuery = React.useCallback(async () => {
    if (!aiQuery.trim()) return
    
    setAiLoading(true)
    setAiResponse(null)
    
    try {
      const response = await fetch("/api/myca/nlq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: aiQuery,
          context: {
            currentPage: window.location.pathname,
          },
          options: {
            maxResults: 10,
            includeActions: true,
          },
        }),
      })
      
      if (response.ok) {
        const data: NLQResponse = await response.json()
        setAiResponse(data)
      } else {
        setAiResponse({
          type: "error",
          text: "Failed to process query. Please try again.",
        })
      }
    } catch (error) {
      setAiResponse({
        type: "error",
        text: "Connection error. Please check your network.",
      })
    } finally {
      setAiLoading(false)
    }
  }, [aiQuery])

  // Handle AI query input key events
  const handleAiKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      executeAiQuery()
    }
  }

  // Execute an action from NLQ response
  const executeAction = async (action: NLQAction) => {
    if (action.method === "GET") {
      // Navigation action
      runCommand(() => router.push(action.endpoint))
      return
    }
    
    // Confirm if required
    if (action.requiresConfirmation) {
      const confirmed = window.confirm(`Execute action: ${action.label}?`)
      if (!confirmed) return
    }
    
    try {
      const response = await fetch(action.endpoint, {
        method: action.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action.params),
      })
      
      if (response.ok) {
        const result = await response.json()
        setAiResponse({
          type: "answer",
          text: result.message || "Action completed successfully.",
        })
      }
    } catch {
      setAiResponse({
        type: "error",
        text: "Action failed. Please try again.",
      })
    }
  }

  // Get icon for data item type
  const getDataIcon = (type: string) => {
    switch (type) {
      case "agent": return <Bot className="h-4 w-4 text-purple-500" />
      case "document": return <FileText className="h-4 w-4 text-blue-500" />
      case "telemetry": return <Cpu className="h-4 w-4 text-green-500" />
      case "memory": return <MemoryStick className="h-4 w-4 text-cyan-500" />
      case "workflow": return <Workflow className="h-4 w-4 text-orange-500" />
      default: return <Database className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <>
      <Button
        variant="outline"
        className="relative h-10 w-full justify-start rounded-[0.5rem] bg-background text-sm font-normal text-muted-foreground shadow-none sm:pr-12 md:w-96 lg:w-[30rem]"
        onClick={() => setOpen(true)}
        {...props}
      >
        <span className="inline-flex">
          <Search className="mr-2 h-4 w-4" />
          Search or ask MYCA...
        </span>
        <kbd className="pointer-events-none absolute right-[0.3rem] top-[0.3rem] hidden h-8 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="overflow-hidden p-0 shadow-lg max-w-2xl">
          <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
            {/* Mode Toggle Header */}
            <div className="flex items-center justify-between border-b px-3 py-2 bg-muted/30">
              <div className="flex items-center gap-2">
                {aiMode ? (
                  <Brain className="h-4 w-4 text-purple-500" />
                ) : (
                  <Search className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-sm font-medium">
                  {aiMode ? "MYCA AI" : "Search"}
                </span>
                {aiMode && (
                  <Badge variant="secondary" className="text-[10px]">NLQ</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">AI Mode</span>
                <Switch 
                  checked={aiMode} 
                  onCheckedChange={setAiMode}
                  className="data-[state=checked]:bg-purple-500"
                />
              </div>
            </div>
            
            {/* Search/Query Input */}
            <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
              {aiMode ? (
                <Sparkles className="mr-2 h-4 w-4 shrink-0 text-purple-500" />
              ) : (
                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              )}
              {aiMode ? (
                <input
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  onKeyDown={handleAiKeyDown}
                  placeholder="Ask MYCA... (e.g., 'Show all agents', 'System health')"
                  className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  autoFocus
                />
              ) : (
                <CommandInput
                  value={query}
                  onValueChange={setQuery}
                  placeholder="Search fungi, compounds, research..."
                  className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                />
              )}
              {aiMode && aiQuery && (
                <Button 
                  size="sm" 
                  className="ml-2 h-7 bg-purple-500 hover:bg-purple-600"
                  onClick={executeAiQuery}
                  disabled={aiLoading}
                >
                  {aiLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <ArrowRight className="h-3 w-3" />
                  )}
                </Button>
              )}
            </div>
            
            {/* AI Mode Results */}
            {aiMode && (
              <ScrollArea className="max-h-[400px]">
                {aiLoading && (
                  <div className="py-8 text-center text-sm">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-purple-500" />
                    <span className="text-muted-foreground">MYCA is thinking...</span>
                  </div>
                )}
                
                {!aiLoading && aiResponse && (
                  <div className="p-4 space-y-4">
                    {/* Response Text */}
                    <div className={cn(
                      "p-3 rounded-lg text-sm",
                      aiResponse.type === "error" ? "bg-red-500/10 text-red-500" :
                      aiResponse.type === "action" ? "bg-orange-500/10" :
                      "bg-muted"
                    )}>
                      {aiResponse.type === "error" && (
                        <AlertCircle className="h-4 w-4 inline mr-2" />
                      )}
                      <span className="whitespace-pre-wrap">{aiResponse.text}</span>
                    </div>
                    
                    {/* Data Results */}
                    {aiResponse.data && aiResponse.data.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground mb-2">
                          Results ({aiResponse.data.length})
                        </div>
                        {aiResponse.data.map((item: NLQDataItem) => (
                          <button
                            key={item.id}
                            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors text-left"
                            onClick={() => {
                              if (item.onClick) {
                                if (item.onClick.action === "selectAgent") {
                                  runCommand(() => router.push(`/natureos/mas/topology?agent=${item.onClick?.params.agentId}`))
                                } else if (item.onClick.action === "openDocument") {
                                  runCommand(() => router.push(String(item.onClick?.params.path)))
                                }
                              }
                            }}
                          >
                            {getDataIcon(item.type)}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{item.title}</div>
                              {item.subtitle && (
                                <div className="text-xs text-muted-foreground truncate">{item.subtitle}</div>
                              )}
                            </div>
                            <Badge variant="outline" className="text-[10px]">{item.type}</Badge>
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {/* Actions */}
                    {aiResponse.actions && aiResponse.actions.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs text-muted-foreground">Actions</div>
                        <div className="flex flex-wrap gap-2">
                          {aiResponse.actions.map((action: NLQAction) => (
                            <Button
                              key={action.id}
                              variant="outline"
                              size="sm"
                              className="h-8"
                              onClick={() => executeAction(action)}
                            >
                              <Play className="h-3 w-3 mr-1" />
                              {action.label}
                              {action.requiresConfirmation && (
                                <AlertCircle className="h-3 w-3 ml-1 text-yellow-500" />
                              )}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Suggestions */}
                    {aiResponse.suggestions && aiResponse.suggestions.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs text-muted-foreground">Try asking</div>
                        <div className="flex flex-wrap gap-1">
                          {aiResponse.suggestions.map((suggestion, i) => (
                            <button
                              key={i}
                              className="text-xs px-2 py-1 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                              onClick={() => {
                                setAiQuery(suggestion)
                                executeAiQuery()
                              }}
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Sources */}
                    {aiResponse.sources && aiResponse.sources.length > 0 && (
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <Network className="h-3 w-3" />
                        Sources: {aiResponse.sources.map(s => s.name).join(", ")}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Default AI suggestions */}
                {!aiLoading && !aiResponse && (
                  <div className="p-4">
                    <div className="text-xs text-muted-foreground mb-3">Try asking MYCA</div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        "Show all active agents",
                        "System health status",
                        "Find financial agents",
                        "List n8n workflows",
                        "Show agents with high CPU",
                        "What can you do?",
                      ].map((suggestion) => (
                        <button
                          key={suggestion}
                          className="text-left text-sm p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                          onClick={() => {
                            setAiQuery(suggestion)
                            setTimeout(executeAiQuery, 100)
                          }}
                        >
                          <Sparkles className="h-3 w-3 inline mr-1 text-purple-500" />
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </ScrollArea>
            )}
            
            {/* Traditional Search Mode */}
            {!aiMode && (
              <>
                {isLoading && (
                  <div className="py-6 text-center text-sm">
                    <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                    Searching...
                  </div>
                )}
                {!isLoading && suggestions.length === 0 && query && (
                  <div className="py-6 text-center text-sm">
                    <div>No results found for &quot;{query}&quot;</div>
                    <Button
                      variant="link"
                      size="sm"
                      className="mt-2 text-purple-500"
                      onClick={() => {
                        setAiMode(true)
                        setAiQuery(query)
                      }}
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      Ask MYCA AI instead
                    </Button>
                  </div>
                )}
                {!isLoading && suggestions.length === 0 && !query && (
                  <CommandGroup heading="Quick Actions">
                    <CommandItem onSelect={() => runCommand(() => router.push("/natureos"))}>
                      <div className="mr-2 flex h-4 w-4 items-center justify-center">
                        <span className="h-3 w-3 rounded-sm bg-primary"></span>
                      </div>
                      <span>NatureOS Dashboard</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/natureos/mas/topology"))}>
                      <Network className="mr-2 h-4 w-4 text-purple-500" />
                      <span>MAS Topology</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/myca-ai"))}>
                      <Brain className="mr-2 h-4 w-4 text-purple-500" />
                      <span>Open Myca AI</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/devices"))}>
                      <Cpu className="mr-2 h-4 w-4 text-green-500" />
                      <span>Browse Devices</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/apps"))}>
                      <div className="mr-2 flex h-4 w-4 items-center justify-center">
                        <span className="h-3 w-3 rounded-sm bg-primary"></span>
                      </div>
                      <span>Explore Apps</span>
                    </CommandItem>
                  </CommandGroup>
                )}
                {!isLoading && suggestions.length > 0 && (
                  <CommandGroup heading="Search Results">
                    {suggestions.map((suggestion) => (
                      <CommandItem
                        key={suggestion.id}
                        onSelect={() => {
                          runCommand(() => {
                            searchTracker.trackResultClick(query, suggestion.type)
                            router.push(suggestion.url)
                          })
                        }}
                      >
                        {suggestion.type === "fungi" && <Mushroom className="mr-2 h-4 w-4 text-green-500" />}
                        {suggestion.type === "article" && <FileText className="mr-2 h-4 w-4 text-blue-500" />}
                        {suggestion.type === "compound" && <Flask className="mr-2 h-4 w-4 text-purple-500" />}
                        {suggestion.type === "research" ||
                          (suggestion.type === "category" && <Microscope className="mr-2 h-4 w-4 text-orange-500" />)}
                        <span>{suggestion.title}</span>
                        {suggestion.scientificName && (
                          <span className="ml-2 text-muted-foreground text-xs italic">{suggestion.scientificName}</span>
                        )}
                        <Badge variant="outline" className="ml-auto">
                          {suggestion.type}
                        </Badge>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </>
            )}
            
            {/* Footer */}
            <div className="mt-2 px-3 py-2 border-t bg-muted/30">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {aiMode ? (
                    <><kbd className="px-1 rounded bg-muted">Enter</kbd> to ask</>
                  ) : (
                    <><kbd className="px-1 rounded bg-muted">⌘K</kbd> to search</>
                  )}
                </span>
                <span>
                  <kbd className="px-1 rounded bg-muted">⌘⇧K</kbd> AI mode
                  <span className="mx-2">•</span>
                  <kbd className="px-1 rounded bg-muted">ESC</kbd> close
                </span>
              </div>
            </div>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  )
}

interface CommandProps {
  children?: React.ReactNode
  className?: string
}

const Command = React.forwardRef<React.ElementRef<typeof CommandPrimitive>, CommandProps>(
  ({ className, ...props }, ref) => (
    <CommandPrimitive
      ref={ref}
      className={cn(
        "flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground",
        className,
      )}
      {...props}
    />
  ),
)
Command.displayName = CommandPrimitive.displayName

interface CommandInputProps extends React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input> {}

const CommandInput = React.forwardRef<React.ElementRef<typeof CommandPrimitive.Input>, CommandInputProps>(
  ({ className, ...props }, ref) => (
    <CommandPrimitive.Input
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
)
CommandInput.displayName = CommandPrimitive.Input.displayName

interface CommandItemProps extends React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item> {}

const CommandItem = React.forwardRef<React.ElementRef<typeof CommandPrimitive.Item>, CommandItemProps>(
  ({ className, ...props }, ref) => (
    <CommandPrimitive.Item
      ref={ref}
      className={cn(
        "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    />
  ),
)
CommandItem.displayName = CommandPrimitive.Item.displayName

interface CommandGroupProps extends React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group> {}

const CommandGroup = React.forwardRef<React.ElementRef<typeof CommandPrimitive.Group>, CommandGroupProps>(
  ({ className, ...props }, ref) => (
    <CommandPrimitive.Group
      ref={ref}
      className={cn(
        "overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground",
        className,
      )}
      {...props}
    />
  ),
)
CommandGroup.displayName = CommandPrimitive.Group.displayName
