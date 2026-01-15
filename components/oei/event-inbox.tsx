"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertTriangle,
  Bell,
  BellOff,
  Check,
  ChevronRight,
  CloudLightning,
  Filter,
  Flame,
  Mountain,
  Plane,
  RefreshCw,
  Search,
  Ship,
  Thermometer,
  Waves,
  X,
  Loader2,
  ExternalLink,
  Clock,
  MapPin,
} from "lucide-react"
import type { Event, EventSeverity, EventType } from "@/types/oei"
import { cn } from "@/lib/utils"

// =============================================================================
// TYPES
// =============================================================================

interface EventInboxProps {
  onEventSelect?: (event: Event) => void
  selectedEventId?: string
  className?: string
  autoRefresh?: boolean
  refreshInterval?: number
}

type EventFilter = {
  severities: EventSeverity[]
  types: string[]
  status: ("active" | "resolved" | "expired")[]
  search: string
}

// =============================================================================
// HELPERS
// =============================================================================

function getSeverityColor(severity: EventSeverity): string {
  switch (severity) {
    case "critical":
      return "bg-red-500 text-white"
    case "high":
      return "bg-orange-500 text-white"
    case "medium":
      return "bg-yellow-500 text-black"
    case "low":
      return "bg-blue-500 text-white"
    case "info":
    default:
      return "bg-gray-500 text-white"
  }
}

function getSeverityBorderColor(severity: EventSeverity): string {
  switch (severity) {
    case "critical":
      return "border-l-red-500"
    case "high":
      return "border-l-orange-500"
    case "medium":
      return "border-l-yellow-500"
    case "low":
      return "border-l-blue-500"
    case "info":
    default:
      return "border-l-gray-500"
  }
}

function getEventIcon(type: string) {
  if (type.includes("weather")) return CloudLightning
  if (type.includes("volcan")) return Mountain
  if (type.includes("earthquake")) return Waves
  if (type.includes("fire")) return Flame
  if (type.includes("aircraft")) return Plane
  if (type.includes("vessel") || type.includes("ship")) return Ship
  if (type.includes("temperature")) return Thermometer
  return AlertTriangle
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

// =============================================================================
// COMPONENT
// =============================================================================

export function EventInbox({
  onEventSelect,
  selectedEventId,
  className,
  autoRefresh = true,
  refreshInterval = 30000,
}: EventInboxProps) {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<EventFilter>({
    severities: [],
    types: [],
    status: ["active"],
    search: "",
  })
  const [tab, setTab] = useState<"all" | "active" | "acknowledged">("active")

  // Fetch events
  const fetchEvents = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError(null)

    try {
      const params = new URLSearchParams()
      if (filter.severities.length) params.set("severity", filter.severities.join(","))
      if (filter.status.length) params.set("status", filter.status.join(","))
      params.set("limit", "100")

      const response = await fetch(`/api/oei/events?${params.toString()}`)
      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      setEvents(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch events")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [filter.severities, filter.status])

  // Initial fetch
  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchEvents(true)
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, fetchEvents])

  // Filter events
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      // Search filter
      if (filter.search) {
        const search = filter.search.toLowerCase()
        const matches =
          event.title.toLowerCase().includes(search) ||
          event.description?.toLowerCase().includes(search) ||
          event.type.toLowerCase().includes(search)
        if (!matches) return false
      }

      // Type filter
      if (filter.types.length && !filter.types.includes(event.type)) {
        return false
      }

      // Tab filter
      if (tab === "acknowledged") {
        // Would check event.acknowledged if available
        return false
      }

      return true
    })
  }, [events, filter, tab])

  // Group events by severity for stats
  const stats = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 }
    filteredEvents.forEach((e) => {
      counts[e.severity] = (counts[e.severity] || 0) + 1
    })
    return counts
  }, [filteredEvents])

  // Handle acknowledge
  const handleAcknowledge = async (event: Event) => {
    // In production, would call API to acknowledge
    console.log("Acknowledge event:", event.id)
  }

  return (
    <Card className={cn("flex flex-col h-full", className)}>
      <CardHeader className="flex-shrink-0 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Event Inbox
            </CardTitle>
            <CardDescription>
              {filteredEvents.length} events
              {stats.critical > 0 && (
                <Badge variant="destructive" className="ml-2 px-1.5 py-0.5">
                  {stats.critical} critical
                </Badge>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fetchEvents(true)}
              disabled={refreshing}
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* Search and filters */}
        <div className="flex items-center gap-2 mt-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search events..."
              className="pl-8"
              value={filter.search}
              onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Filter by Severity</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(["critical", "high", "medium", "low", "info"] as EventSeverity[]).map((sev) => (
                <DropdownMenuCheckboxItem
                  key={sev}
                  checked={filter.severities.includes(sev)}
                  onCheckedChange={(checked) => {
                    setFilter((f) => ({
                      ...f,
                      severities: checked
                        ? [...f.severities, sev]
                        : f.severities.filter((s) => s !== sev),
                    }))
                  }}
                >
                  <Badge className={cn("mr-2", getSeverityColor(sev))}>{sev}</Badge>
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setFilter((f) => ({ ...f, severities: [] }))}>
                Clear filters
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mt-3">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="acknowledged">Acknowledged</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
            <AlertTriangle className="h-12 w-12" />
            <p>{error}</p>
            <Button variant="outline" onClick={() => fetchEvents()}>
              Retry
            </Button>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
            <BellOff className="h-12 w-12" />
            <p>No events found</p>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="p-4 space-y-2">
              {filteredEvents.map((event) => {
                const Icon = getEventIcon(event.type)
                const isSelected = selectedEventId === event.id

                return (
                  <div
                    key={event.id}
                    className={cn(
                      "p-3 rounded-lg border-l-4 bg-card hover:bg-accent/50 cursor-pointer transition-colors",
                      getSeverityBorderColor(event.severity),
                      isSelected && "bg-accent ring-2 ring-primary"
                    )}
                    onClick={() => onEventSelect?.(event)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={cn("p-2 rounded-full shrink-0", getSeverityColor(event.severity))}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-sm line-clamp-1">{event.title}</h4>
                            <Badge variant="outline" className="text-xs shrink-0">
                              {event.type.replace(/_/g, " ")}
                            </Badge>
                          </div>
                          {event.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {event.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTimeAgo(event.occurredAt)}
                            </span>
                            {event.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {event.location.latitude.toFixed(2)}, {event.location.longitude.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleAcknowledge(event)
                          }}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        {event.provenance?.url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation()
                              window.open(event.provenance!.url, "_blank")
                            }}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}

export default EventInbox
