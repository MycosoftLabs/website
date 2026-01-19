"use client"

import { useEffect, useRef, useState, useCallback, ReactNode } from "react"
import { cn } from "@/lib/utils"

// Dynamic imports for Packery (client-side only)
let PackeryJS: any = null
let Draggabilly: any = null

interface GridItem {
  id: string
  content: ReactNode
  width?: 1 | 2 | 3 | 4
  height?: 1 | 2 | 3
  static?: boolean
}

interface DraggableGridProps {
  items: GridItem[]
  onLayoutChange?: (layout: LayoutItem[]) => void
  className?: string
  columnWidth?: number
  rowHeight?: number
  gutter?: number
  transitionDuration?: string
  draggable?: boolean
  persistLayoutKey?: string
}

export interface LayoutItem {
  id: string
  x: number
  y: number
  width: number
  height: number
}

/**
 * DraggableGrid - A customizable dashboard grid using Packery
 * Allows users to drag and rearrange widgets with persistence support
 * 
 * @example
 * <DraggableGrid
 *   items={[
 *     { id: 'widget1', content: <MyWidget />, width: 2, height: 1 },
 *     { id: 'widget2', content: <AnotherWidget />, width: 1, height: 2 },
 *   ]}
 *   onLayoutChange={(layout) => saveToDatabase(layout)}
 *   persistLayoutKey="crep-dashboard"
 * />
 */
export function DraggableGrid({
  items,
  onLayoutChange,
  className,
  columnWidth = 180,
  rowHeight = 160,
  gutter = 16,
  transitionDuration = "0.4s",
  draggable = true,
  persistLayoutKey,
}: DraggableGridProps) {
  const gridRef = useRef<HTMLDivElement>(null)
  const packeryRef = useRef<any>(null)
  const [isClient, setIsClient] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const draggiesRef = useRef<any[]>([])

  // Load libraries on client
  useEffect(() => {
    setIsClient(true)
    
    Promise.all([
      import('packery'),
      import('draggabilly').catch(() => null) // Draggabilly might not be available
    ]).then(([packeryModule, draggabillyModule]) => {
      PackeryJS = packeryModule.default || packeryModule
      Draggabilly = draggabillyModule?.default || draggabillyModule
    }).catch(console.error)
  }, [])

  // Get saved layout from localStorage
  const getSavedLayout = useCallback(() => {
    if (!persistLayoutKey || typeof window === 'undefined') return null
    try {
      const saved = localStorage.getItem(`packery-layout-${persistLayoutKey}`)
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  }, [persistLayoutKey])

  // Save layout to localStorage
  const saveLayout = useCallback(() => {
    if (!packeryRef.current || !persistLayoutKey) return
    
    const layout: LayoutItem[] = []
    const items = packeryRef.current.getItemElements()
    
    items.forEach((item: HTMLElement) => {
      const id = item.dataset.gridId
      if (id) {
        const rect = packeryRef.current.getItem(item).rect
        layout.push({
          id,
          x: rect.x,
          y: rect.y,
          width: parseInt(item.dataset.gridWidth || '1'),
          height: parseInt(item.dataset.gridHeight || '1'),
        })
      }
    })
    
    localStorage.setItem(`packery-layout-${persistLayoutKey}`, JSON.stringify(layout))
    onLayoutChange?.(layout)
  }, [persistLayoutKey, onLayoutChange])

  // Initialize Packery
  useEffect(() => {
    if (!isClient || !PackeryJS || !gridRef.current) return

    // Initialize Packery
    packeryRef.current = new PackeryJS(gridRef.current, {
      itemSelector: '.grid-item',
      columnWidth: columnWidth,
      rowHeight: rowHeight,
      gutter: gutter,
      percentPosition: false,
      transitionDuration: transitionDuration,
      initLayout: true,
    })

    // Make items draggable
    if (draggable && Draggabilly) {
      const itemElems = gridRef.current.querySelectorAll('.grid-item:not(.grid-item-static)')
      
      itemElems.forEach((itemElem) => {
        const draggie = new Draggabilly(itemElem, {
          handle: '.drag-handle',
        })
        packeryRef.current.bindDraggabillyEvents(draggie)
        draggiesRef.current.push(draggie)
      })
    }

    // Listen for layout changes
    packeryRef.current.on('layoutComplete', saveLayout)
    packeryRef.current.on('dragItemPositioned', saveLayout)

    setInitialized(true)

    // Apply saved layout if available
    const savedLayout = getSavedLayout()
    if (savedLayout) {
      // TODO: Apply saved positions
    }

    return () => {
      if (packeryRef.current) {
        packeryRef.current.off('layoutComplete', saveLayout)
        packeryRef.current.off('dragItemPositioned', saveLayout)
        packeryRef.current.destroy()
        packeryRef.current = null
      }
      draggiesRef.current.forEach((draggie) => draggie.destroy())
      draggiesRef.current = []
    }
  }, [isClient, items.length, columnWidth, rowHeight, gutter, transitionDuration, draggable, saveLayout, getSavedLayout])

  // Relayout when items change
  useEffect(() => {
    if (packeryRef.current && initialized) {
      packeryRef.current.reloadItems()
      packeryRef.current.layout()
    }
  }, [items, initialized])

  // Get item size classes
  const getItemStyle = (width: number = 1, height: number = 1) => ({
    width: columnWidth * width + gutter * (width - 1),
    height: rowHeight * height + gutter * (height - 1),
  })

  // Fallback for SSR
  if (!isClient) {
    return (
      <div className={cn("grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4", className)}>
        {items.map((item) => (
          <div key={item.id} className="bg-card rounded-lg border p-4">
            {item.content}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div
      ref={gridRef}
      className={cn("relative", className)}
      style={{
        minHeight: rowHeight * 2,
      }}
    >
      {items.map((item) => (
        <div
          key={item.id}
          data-grid-id={item.id}
          data-grid-width={item.width || 1}
          data-grid-height={item.height || 1}
          className={cn(
            "grid-item bg-card rounded-lg border shadow-sm overflow-hidden",
            "transition-shadow hover:shadow-md",
            item.static && "grid-item-static",
            !item.static && draggable && "cursor-move"
          )}
          style={getItemStyle(item.width, item.height)}
        >
          {/* Drag handle */}
          {!item.static && draggable && (
            <div className="drag-handle absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-muted/50 to-transparent cursor-move z-10 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <div className="flex gap-1">
                <div className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                <div className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                <div className="w-1 h-1 rounded-full bg-muted-foreground/50" />
              </div>
            </div>
          )}
          <div className="p-4 h-full">
            {item.content}
          </div>
        </div>
      ))}
    </div>
  )
}

// Helper hook for persisting layouts
export function useDashboardLayout(key: string) {
  const [layout, setLayout] = useState<LayoutItem[]>([])
  
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const saved = localStorage.getItem(`packery-layout-${key}`)
      if (saved) {
        setLayout(JSON.parse(saved))
      }
    } catch {
      // Ignore
    }
  }, [key])
  
  const updateLayout = useCallback((newLayout: LayoutItem[]) => {
    setLayout(newLayout)
    if (typeof window !== 'undefined') {
      localStorage.setItem(`packery-layout-${key}`, JSON.stringify(newLayout))
    }
  }, [key])
  
  const resetLayout = useCallback(() => {
    setLayout([])
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`packery-layout-${key}`)
    }
  }, [key])
  
  return { layout, updateLayout, resetLayout }
}

// Predefined layout templates for different user types
export const layoutTemplates = {
  researcher: [
    { id: 'species-search', width: 2 as const, height: 1 as const },
    { id: 'recent-observations', width: 2 as const, height: 2 as const },
    { id: 'map-view', width: 2 as const, height: 2 as const },
    { id: 'analysis-tools', width: 2 as const, height: 1 as const },
  ],
  developer: [
    { id: 'api-status', width: 1 as const, height: 1 as const },
    { id: 'logs', width: 3 as const, height: 2 as const },
    { id: 'metrics', width: 2 as const, height: 1 as const },
    { id: 'deployments', width: 2 as const, height: 1 as const },
  ],
  operator: [
    { id: 'system-health', width: 2 as const, height: 1 as const },
    { id: 'device-status', width: 2 as const, height: 2 as const },
    { id: 'alerts', width: 2 as const, height: 1 as const },
    { id: 'quick-actions', width: 2 as const, height: 1 as const },
  ],
}
