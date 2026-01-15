"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Activity,
  AlertTriangle,
  ChevronLeft,
  Clock,
  ExternalLink,
  History,
  Info,
  Loader2,
  MapPin,
  Navigation,
  Plane,
  RefreshCw,
  Settings,
  Ship,
  Signal,
  Thermometer,
  Wifi,
  X,
} from "lucide-react"
import type { Entity, Event, Observation } from "@/types/oei"
import { cn } from "@/lib/utils"

// =============================================================================
// TYPES
// =============================================================================

interface EntityInspectorProps {
  entity: Entity | null
  onClose?: () => void
  onEventSelect?: (event: Event) => void
  className?: string
}

// =============================================================================
// HELPERS
// =============================================================================

function getEntityIcon(type: string) {
  switch (type) {
    case "aircraft":
      return Plane
    case "vessel":
      return Ship
    case "device":
      return Wifi
    case "sensor":
      return Thermometer
    case "weather_station":
      return Activity
    default:
      return Info
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case "active":
      return "text-green-500"
    case "inactive":
      return "text-gray-500"
    case "error":
      return "text-red-500"
    case "warning":
      return "text-yellow-500"
    default:
      return "text-muted-foreground"
  }
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "-"
  if (typeof value === "boolean") return value ? "Yes" : "No"
  if (typeof value === "number") {
    // Format numbers nicely
    if (Number.isInteger(value)) return value.toLocaleString()
    return value.toFixed(2)
  }
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}

function formatDateTime(dateString?: string): string {
  if (!dateString) return "-"
  const date = new Date(dateString)
  return date.toLocaleString()
}

function formatTimeAgo(dateString?: string): string {
  if (!dateString) return "-"
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
// PROPERTY ROW COMPONENT
// =============================================================================

function PropertyRow({ label, value, icon: Icon }: { label: string; value: unknown; icon?: React.ElementType }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {Icon && <Icon className="h-4 w-4" />}
        <span>{label}</span>
      </div>
      <div className="text-sm font-medium text-right max-w-[60%] truncate">
        {formatValue(value)}
      </div>
    </div>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function EntityInspector({
  entity,
  onClose,
  onEventSelect,
  className,
}: EntityInspectorProps) {
  const [tab, setTab] = useState<"details" | "properties" | "history" | "events">("details")
  const [events, setEvents] = useState<Event[]>([])
  const [observations, setObservations] = useState<Observation[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [loadingObservations, setLoadingObservations] = useState(false)

  // Fetch related events when entity changes
  useEffect(() => {
    if (!entity) return

    const fetchRelatedEvents = async () => {
      setLoadingEvents(true)
      try {
        // Would fetch events related to this entity
        // For now, just clear the events
        setEvents([])
      } catch (error) {
        console.error("Failed to fetch events:", error)
      } finally {
        setLoadingEvents(false)
      }
    }

    fetchRelatedEvents()
  }, [entity?.id])

  // Get entity-specific properties
  const entityProperties = useMemo(() => {
    if (!entity?.properties) return []
    return Object.entries(entity.properties)
      .filter(([, value]) => value !== null && value !== undefined)
      .map(([key, value]) => ({
        key: key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()),
        value,
      }))
  }, [entity?.properties])

  if (!entity) {
    return (
      <Card className={cn("flex flex-col h-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Entity Inspector
          </CardTitle>
          <CardDescription>Select an entity to view details</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No entity selected</p>
            <p className="text-sm mt-2">
              Click on a marker or entity in the list to inspect it
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const Icon = getEntityIcon(entity.type)

  return (
    <Card className={cn("flex flex-col h-full", className)}>
      <CardHeader className="flex-shrink-0 pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">{entity.name}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="capitalize">
                  {entity.type}
                </Badge>
                <span className={cn("flex items-center gap-1", getStatusColor(entity.status))}>
                  <Signal className="h-3 w-3" />
                  {entity.status}
                </span>
              </CardDescription>
            </div>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mt-3">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="properties">Props</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full">
          <div className="p-4">
            {tab === "details" && (
              <div className="space-y-4">
                {/* Description */}
                {entity.description && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground">{entity.description}</p>
                  </div>
                )}

                {/* Location */}
                {entity.location && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Location
                    </h4>
                    <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                      <PropertyRow label="Latitude" value={entity.location.latitude} />
                      <PropertyRow label="Longitude" value={entity.location.longitude} />
                      {entity.location.altitude && (
                        <PropertyRow label="Altitude" value={`${entity.location.altitude.toFixed(0)} m`} />
                      )}
                      <PropertyRow label="Source" value={entity.location.source || "GPS"} />
                    </div>
                  </div>
                )}

                {/* Timestamps */}
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Timeline
                  </h4>
                  <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                    <PropertyRow label="Last Seen" value={formatTimeAgo(entity.lastSeenAt)} />
                    <PropertyRow label="Updated" value={formatDateTime(entity.updatedAt)} />
                    <PropertyRow label="Created" value={formatDateTime(entity.createdAt)} />
                  </div>
                </div>

                {/* Provenance */}
                {entity.provenance && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      Data Source
                    </h4>
                    <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                      <PropertyRow label="Source" value={entity.provenance.source} />
                      {entity.provenance.sourceId && (
                        <PropertyRow label="Source ID" value={entity.provenance.sourceId} />
                      )}
                      {entity.provenance.reliability !== undefined && (
                        <PropertyRow 
                          label="Reliability" 
                          value={`${(entity.provenance.reliability * 100).toFixed(0)}%`} 
                        />
                      )}
                      {entity.provenance.url && (
                        <div className="flex items-center justify-between py-2">
                          <span className="text-sm text-muted-foreground">External Link</span>
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0"
                            onClick={() => window.open(entity.provenance!.url, "_blank")}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {entity.tags && entity.tags.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {entity.tags.map((tag, i) => (
                        <Badge key={i} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === "properties" && (
              <div className="space-y-1">
                {entityProperties.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No additional properties
                  </p>
                ) : (
                  entityProperties.map(({ key, value }) => (
                    <PropertyRow key={key} label={key} value={value} />
                  ))
                )}
              </div>
            )}

            {tab === "history" && (
              <div className="space-y-4">
                {loadingObservations ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : observations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No observation history</p>
                    <p className="text-sm mt-2">
                      Observations will appear here as data is collected
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {observations.map((obs) => (
                      <div
                        key={obs.id}
                        className="p-3 rounded-lg bg-muted/50 flex items-center justify-between"
                      >
                        <div>
                          <p className="text-sm font-medium">{obs.type}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatTimeAgo(obs.observedAt)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {obs.value} {obs.unit}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === "events" && (
              <div className="space-y-4">
                {loadingEvents ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : events.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No related events</p>
                    <p className="text-sm mt-2">
                      Events related to this entity will appear here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {events.map((event) => (
                      <div
                        key={event.id}
                        className="p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                        onClick={() => onEventSelect?.(event)}
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize">
                            {event.severity}
                          </Badge>
                          <span className="text-sm font-medium line-clamp-1">
                            {event.title}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatTimeAgo(event.occurredAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

export default EntityInspector
