"use client"

import { useEffect, useRef, useState, useCallback, ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { GripVertical, X, Maximize2, Minimize2, RotateCcw } from "lucide-react"

/**
 * PackeryDashboard - CSS Grid based draggable widget system
 * Simpler, more reliable than Packery.js
 */

export interface DashboardWidget {
  id: string
  title: string
  icon?: ReactNode
  content: ReactNode
  width?: 1 | 2 | 3 | 4
  height?: 1 | 2 | 3
  minWidth?: 1 | 2 | 3 | 4
  minHeight?: 1 | 2 | 3
  closable?: boolean
  resizable?: boolean
  locked?: boolean
  badge?: string | number
  badgeVariant?: "default" | "secondary" | "destructive" | "outline"
  headerActions?: ReactNode
  className?: string
  headerClassName?: string
  contentClassName?: string
}

export interface WidgetLayout {
  id: string
  order: number
  visible: boolean
}

interface PackeryDashboardProps {
  widgets: DashboardWidget[]
  onLayoutChange?: (layout: WidgetLayout[]) => void
  onWidgetClose?: (widgetId: string) => void
  onWidgetMaximize?: (widgetId: string) => void
  className?: string
  rowHeight?: number
  gutter?: number
  draggable?: boolean
  persistLayoutKey?: string
  showResetButton?: boolean
  variant?: "default" | "compact" | "dark"
}

// Clean theme variants (no brown/amber)
const variantStyles = {
  default: {
    container: "",
    widget: "bg-card border border-border shadow-sm",
    header: "bg-muted/40 border-b border-border",
    handle: "hover:bg-muted",
    headerText: "text-foreground",
  },
  compact: {
    container: "",
    widget: "bg-card border border-border shadow-sm",
    header: "bg-transparent border-b border-border/50",
    handle: "hover:bg-muted/50",
    headerText: "text-foreground",
  },
  dark: {
    container: "",
    widget: "bg-zinc-900/90 border border-zinc-700/50 backdrop-blur-sm",
    header: "bg-zinc-800/50 border-b border-zinc-700/50",
    handle: "hover:bg-zinc-700/50",
    headerText: "text-zinc-100",
  },
}

export function PackeryDashboard({
  widgets,
  onLayoutChange,
  onWidgetClose,
  onWidgetMaximize,
  className,
  rowHeight = 180,
  gutter = 16,
  draggable = true,
  persistLayoutKey,
  showResetButton = true,
  variant = "default",
}: PackeryDashboardProps) {
  const [widgetOrder, setWidgetOrder] = useState<string[]>(widgets.map(w => w.id))
  const [visibleWidgets, setVisibleWidgets] = useState<Set<string>>(new Set(widgets.map(w => w.id)))
  const [maximizedWidget, setMaximizedWidget] = useState<string | null>(null)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  
  const styles = variantStyles[variant]

  // Load saved layout
  useEffect(() => {
    if (!persistLayoutKey || typeof window === 'undefined') return
    try {
      const saved = localStorage.getItem(`widget-layout-${persistLayoutKey}`)
      if (saved) {
        const layout: WidgetLayout[] = JSON.parse(saved)
        const order = layout.sort((a, b) => a.order - b.order).map(l => l.id)
        const visible = new Set(layout.filter(l => l.visible).map(l => l.id))
        
        // Only use valid widget IDs
        const validOrder = order.filter(id => widgets.some(w => w.id === id))
        const missingWidgets = widgets.filter(w => !validOrder.includes(w.id)).map(w => w.id)
        
        setWidgetOrder([...validOrder, ...missingWidgets])
        setVisibleWidgets(visible)
      }
    } catch (e) {
      console.error("Failed to load layout:", e)
    }
  }, [persistLayoutKey, widgets])

  // Save layout
  const saveLayout = useCallback(() => {
    if (!persistLayoutKey || typeof window === 'undefined') return
    const layout: WidgetLayout[] = widgetOrder.map((id, index) => ({
      id,
      order: index,
      visible: visibleWidgets.has(id),
    }))
    localStorage.setItem(`widget-layout-${persistLayoutKey}`, JSON.stringify(layout))
    onLayoutChange?.(layout)
  }, [persistLayoutKey, widgetOrder, visibleWidgets, onLayoutChange])

  // Save on changes
  useEffect(() => {
    saveLayout()
  }, [widgetOrder, visibleWidgets, saveLayout])

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
    // Add drag ghost styling
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5'
    }
  }

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedId(null)
    setDragOverId(null)
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1'
    }
  }

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (id !== draggedId) {
      setDragOverId(id)
    }
  }

  const handleDragLeave = () => {
    setDragOverId(null)
  }

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!draggedId || draggedId === targetId) return

    setWidgetOrder(prev => {
      const newOrder = [...prev]
      const draggedIndex = newOrder.indexOf(draggedId)
      const targetIndex = newOrder.indexOf(targetId)
      
      // Remove dragged item and insert at target position
      newOrder.splice(draggedIndex, 1)
      newOrder.splice(targetIndex, 0, draggedId)
      
      return newOrder
    })
    
    setDraggedId(null)
    setDragOverId(null)
  }

  // Close widget
  const handleClose = useCallback((widgetId: string) => {
    setVisibleWidgets(prev => {
      const next = new Set(prev)
      next.delete(widgetId)
      return next
    })
    onWidgetClose?.(widgetId)
  }, [onWidgetClose])

  // Maximize widget
  const handleMaximize = useCallback((widgetId: string) => {
    setMaximizedWidget(prev => prev === widgetId ? null : widgetId)
    onWidgetMaximize?.(widgetId)
  }, [onWidgetMaximize])

  // Reset layout
  const resetLayout = useCallback(() => {
    if (persistLayoutKey && typeof window !== 'undefined') {
      localStorage.removeItem(`widget-layout-${persistLayoutKey}`)
    }
    setWidgetOrder(widgets.map(w => w.id))
    setVisibleWidgets(new Set(widgets.map(w => w.id)))
    setMaximizedWidget(null)
  }, [persistLayoutKey, widgets])

  // Get ordered visible widgets
  const orderedWidgets = widgetOrder
    .filter(id => visibleWidgets.has(id))
    .map(id => widgets.find(w => w.id === id))
    .filter(Boolean) as DashboardWidget[]

  // Maximized view
  if (maximizedWidget) {
    const widget = widgets.find(w => w.id === maximizedWidget)
    if (widget) {
      return (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm p-4 flex flex-col">
          <Card className={cn("flex-1 flex flex-col overflow-hidden", styles.widget)}>
            <CardHeader className={cn("flex flex-row items-center justify-between space-y-0 p-4", styles.header)}>
              <CardTitle className={cn("text-lg flex items-center gap-2", styles.headerText)}>
                {widget.icon}
                {widget.title}
                {widget.badge !== undefined && (
                  <Badge variant={widget.badgeVariant || "secondary"} className="ml-2">
                    {widget.badge}
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                {widget.headerActions}
                <Button variant="ghost" size="icon" onClick={() => handleMaximize(widget.id)}>
                  <Minimize2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className={cn("flex-1 p-4 overflow-auto", widget.contentClassName)}>
              {widget.content}
            </CardContent>
          </Card>
        </div>
      )
    }
  }

  return (
    <div className={cn("relative", className)}>
      {/* Header Controls */}
      {showResetButton && (
        <div className="flex items-center justify-end gap-3 mb-4">
          <span className="text-xs text-muted-foreground">
            {orderedWidgets.length}/{widgets.length} widgets
          </span>
          <Button variant="outline" size="sm" onClick={resetLayout} className="h-8">
            <RotateCcw className="h-3 w-3 mr-1.5" />
            Reset Layout
          </Button>
        </div>
      )}

      {/* Widget Grid - CSS Grid based */}
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: gutter,
        }}
      >
        {orderedWidgets.map((widget) => {
          const widthSpan = widget.width || 1
          const heightSpan = widget.height || 1
          const isDragging = draggedId === widget.id
          const isDragOver = dragOverId === widget.id

          return (
            <div
              key={widget.id}
              className={cn(
                "rounded-lg overflow-hidden transition-all duration-200",
                styles.widget,
                isDragging && "opacity-50 ring-2 ring-primary",
                isDragOver && "ring-2 ring-primary/50 scale-[1.02]",
                widget.className
              )}
              style={{
                gridColumn: `span ${widthSpan}`,
                gridRow: `span ${heightSpan}`,
                minHeight: rowHeight * heightSpan + gutter * (heightSpan - 1),
              }}
              draggable={draggable && !widget.locked}
              onDragStart={(e) => handleDragStart(e, widget.id)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, widget.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, widget.id)}
            >
              {/* Widget Header */}
              <div className={cn(
                "flex items-center justify-between px-3 py-2 gap-2",
                styles.header,
                widget.headerClassName
              )}>
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {/* Drag Handle */}
                  {!widget.locked && draggable && (
                    <div className={cn(
                      "cursor-grab active:cursor-grabbing p-1 rounded transition-colors",
                      styles.handle
                    )}>
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  
                  {widget.icon && (
                    <span className="flex-shrink-0">{widget.icon}</span>
                  )}
                  
                  <span className={cn("text-sm font-medium truncate", styles.headerText)}>
                    {widget.title}
                  </span>
                  
                  {widget.badge !== undefined && (
                    <Badge variant={widget.badgeVariant || "secondary"} className="flex-shrink-0 text-xs">
                      {widget.badge}
                    </Badge>
                  )}
                </div>

                {/* Widget Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {widget.headerActions}
                  
                  {widget.resizable !== false && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={() => handleMaximize(widget.id)}
                    >
                      <Maximize2 className="h-3 w-3" />
                    </Button>
                  )}
                  
                  {widget.closable && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 hover:bg-destructive/20 hover:text-destructive"
                      onClick={() => handleClose(widget.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Widget Content - Fixed height with proper scroll */}
              <div 
                className={cn(
                  "p-3",
                  widget.contentClassName
                )}
                style={{ 
                  height: `calc(100% - 44px)`,
                  overflow: 'auto',
                }}
              >
                {widget.content}
              </div>
            </div>
          )
        })}
      </div>

      {/* Hidden widgets indicator */}
      {widgets.length > orderedWidgets.length && (
        <div className="mt-4 p-3 border border-dashed rounded-lg text-center text-sm text-muted-foreground">
          {widgets.length - orderedWidgets.length} widget(s) hidden •{' '}
          <button 
            className="text-primary hover:underline"
            onClick={resetLayout}
          >
            Show all
          </button>
        </div>
      )}
    </div>
  )
}

// Pre-built widget templates
export const widgetPresets = {
  sensorNetwork: (count: number) => ({
    id: 'sensor-network',
    title: 'Sensor Network',
    badge: count,
    badgeVariant: 'default' as const,
    width: 1 as const,
    height: 1 as const,
  }),
  
  globalEvents: (count: number) => ({
    id: 'global-events',
    title: 'Global Events',
    badge: count,
    badgeVariant: 'secondary' as const,
    width: 2 as const,
    height: 2 as const,
    closable: true,
  }),
  
  situationalAwareness: () => ({
    id: 'situational-awareness',
    title: 'Situational Awareness',
    width: 4 as const,
    height: 1 as const,
    locked: true,
  }),
  
  dataExplorer: () => ({
    id: 'data-explorer',
    title: 'Data Explorer',
    width: 2 as const,
    height: 2 as const,
    closable: true,
    resizable: true,
  }),
}
