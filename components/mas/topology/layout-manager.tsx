"use client"

/**
 * Layout Manager Component
 * Save and load custom topology layouts
 * Stores layouts in localStorage with option to sync to database
 */

import { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Save,
  FolderOpen,
  Trash2,
  Download,
  Upload,
  Layout,
  Star,
  StarOff,
  MoreVertical,
  Plus,
  Check,
  X,
  Clock,
  Eye,
} from "lucide-react"
import type { TopologyFilter, TopologyViewState, NodeCategory } from "./types"

export interface SavedLayout {
  id: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
  isFavorite: boolean
  isDefault: boolean
  viewState: TopologyViewState
  filter: TopologyFilter
  // Optional custom positions for nodes
  nodePositions?: Record<string, [number, number, number]>
}

interface LayoutManagerProps {
  currentViewState: TopologyViewState
  currentFilter: TopologyFilter
  onLoadLayout: (viewState: TopologyViewState, filter: TopologyFilter, nodePositions?: Record<string, [number, number, number]>) => void
  className?: string
}

const STORAGE_KEY = "mycosoft_topology_layouts"
const DEFAULT_LAYOUT_KEY = "mycosoft_topology_default_layout"

// Generate unique ID
function generateId(): string {
  return `layout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Load layouts from localStorage
function loadLayouts(): SavedLayout[] {
  if (typeof window === "undefined") return []
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

// Save layouts to localStorage
function saveLayouts(layouts: SavedLayout[]): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts))
  } catch {
    console.error("Failed to save layouts to localStorage")
  }
}

// Load default layout ID
function loadDefaultLayoutId(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(DEFAULT_LAYOUT_KEY)
}

// Save default layout ID
function saveDefaultLayoutId(id: string | null): void {
  if (typeof window === "undefined") return
  if (id) {
    localStorage.setItem(DEFAULT_LAYOUT_KEY, id)
  } else {
    localStorage.removeItem(DEFAULT_LAYOUT_KEY)
  }
}

export function LayoutManager({
  currentViewState,
  currentFilter,
  onLoadLayout,
  className = "",
}: LayoutManagerProps) {
  const [layouts, setLayouts] = useState<SavedLayout[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false)
  const [newLayoutName, setNewLayoutName] = useState("")
  const [newLayoutDescription, setNewLayoutDescription] = useState("")
  const [defaultLayoutId, setDefaultLayoutId] = useState<string | null>(null)
  
  // Load layouts on mount
  useEffect(() => {
    setLayouts(loadLayouts())
    setDefaultLayoutId(loadDefaultLayoutId())
  }, [])
  
  // Auto-load default layout on mount
  useEffect(() => {
    if (defaultLayoutId && layouts.length > 0) {
      const defaultLayout = layouts.find(l => l.id === defaultLayoutId)
      if (defaultLayout) {
        onLoadLayout(defaultLayout.viewState, defaultLayout.filter, defaultLayout.nodePositions)
      }
    }
  }, [defaultLayoutId, layouts.length]) // Only run once when layouts are loaded
  
  // Save current layout
  const handleSaveLayout = useCallback(() => {
    if (!newLayoutName.trim()) return
    
    const newLayout: SavedLayout = {
      id: generateId(),
      name: newLayoutName.trim(),
      description: newLayoutDescription.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isFavorite: false,
      isDefault: false,
      viewState: { ...currentViewState },
      filter: { ...currentFilter },
    }
    
    const updatedLayouts = [...layouts, newLayout]
    setLayouts(updatedLayouts)
    saveLayouts(updatedLayouts)
    
    setNewLayoutName("")
    setNewLayoutDescription("")
    setIsSaveDialogOpen(false)
  }, [newLayoutName, newLayoutDescription, currentViewState, currentFilter, layouts])
  
  // Load a layout
  const handleLoadLayout = useCallback((layout: SavedLayout) => {
    onLoadLayout(layout.viewState, layout.filter, layout.nodePositions)
    setIsOpen(false)
  }, [onLoadLayout])
  
  // Delete a layout
  const handleDeleteLayout = useCallback((id: string) => {
    const updatedLayouts = layouts.filter(l => l.id !== id)
    setLayouts(updatedLayouts)
    saveLayouts(updatedLayouts)
    
    if (defaultLayoutId === id) {
      setDefaultLayoutId(null)
      saveDefaultLayoutId(null)
    }
  }, [layouts, defaultLayoutId])
  
  // Toggle favorite
  const handleToggleFavorite = useCallback((id: string) => {
    const updatedLayouts = layouts.map(l => 
      l.id === id ? { ...l, isFavorite: !l.isFavorite, updatedAt: new Date().toISOString() } : l
    )
    setLayouts(updatedLayouts)
    saveLayouts(updatedLayouts)
  }, [layouts])
  
  // Set as default
  const handleSetDefault = useCallback((id: string) => {
    const newDefaultId = defaultLayoutId === id ? null : id
    setDefaultLayoutId(newDefaultId)
    saveDefaultLayoutId(newDefaultId)
  }, [defaultLayoutId])
  
  // Export layouts as JSON
  const handleExport = useCallback(() => {
    const dataStr = JSON.stringify(layouts, null, 2)
    const blob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `topology-layouts-${new Date().toISOString().split("T")[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [layouts])
  
  // Import layouts from JSON
  const handleImport = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string) as SavedLayout[]
        // Merge with existing, avoiding duplicates by name
        const existingNames = new Set(layouts.map(l => l.name))
        const newLayouts = imported.filter(l => !existingNames.has(l.name))
        const updatedLayouts = [...layouts, ...newLayouts.map(l => ({
          ...l,
          id: generateId(), // New IDs for imported layouts
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }))]
        setLayouts(updatedLayouts)
        saveLayouts(updatedLayouts)
      } catch {
        console.error("Failed to import layouts")
      }
    }
    reader.readAsText(file)
    event.target.value = "" // Reset input
  }, [layouts])
  
  // Sort layouts: favorites first, then by date
  const sortedLayouts = useMemo(() => {
    return [...layouts].sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1
      if (!a.isFavorite && b.isFavorite) return 1
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })
  }, [layouts])
  
  return (
    <div className={className}>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Layout className="h-4 w-4" />
            Layouts
            {layouts.length > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1">
                {layouts.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>Saved Layouts</span>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.preventDefault()
                  setIsSaveDialogOpen(true)
                }}
              >
                <Plus className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.preventDefault()
                  handleExport()
                }}
                disabled={layouts.length === 0}
              >
                <Download className="h-3 w-3" />
              </Button>
              <label>
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleImport}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  asChild
                >
                  <span>
                    <Upload className="h-3 w-3" />
                  </span>
                </Button>
              </label>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {sortedLayouts.length === 0 ? (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
              No saved layouts yet.
              <br />
              Click + to save the current view.
            </div>
          ) : (
            <ScrollArea className="max-h-[300px]">
              {sortedLayouts.map((layout) => (
                <DropdownMenuItem
                  key={layout.id}
                  className="flex items-center justify-between p-2 cursor-pointer"
                  onClick={() => handleLoadLayout(layout)}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {layout.isFavorite && (
                      <Star className="h-3 w-3 text-yellow-500 flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate flex items-center gap-1">
                        {layout.name}
                        {layout.id === defaultLayoutId && (
                          <Badge variant="outline" className="text-[8px] px-1">
                            Default
                          </Badge>
                        )}
                      </div>
                      {layout.description && (
                        <div className="text-[10px] text-muted-foreground truncate">
                          {layout.description}
                        </div>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0">
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation()
                        handleLoadLayout(layout)
                      }}>
                        <Eye className="h-3 w-3 mr-2" />
                        Load
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation()
                        handleToggleFavorite(layout.id)
                      }}>
                        {layout.isFavorite ? (
                          <>
                            <StarOff className="h-3 w-3 mr-2" />
                            Unfavorite
                          </>
                        ) : (
                          <>
                            <Star className="h-3 w-3 mr-2" />
                            Favorite
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation()
                        handleSetDefault(layout.id)
                      }}>
                        <Check className="h-3 w-3 mr-2" />
                        {layout.id === defaultLayoutId ? "Remove Default" : "Set as Default"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-red-500"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteLayout(layout.id)
                        }}
                      >
                        <Trash2 className="h-3 w-3 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </DropdownMenuItem>
              ))}
            </ScrollArea>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Save Dialog */}
      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Layout</DialogTitle>
            <DialogDescription>
              Save the current view settings as a reusable layout.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Layout Name</label>
              <Input
                placeholder="My Custom Layout"
                value={newLayoutName}
                onChange={(e) => setNewLayoutName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveLayout()}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description (optional)</label>
              <Input
                placeholder="Description of this layout..."
                value={newLayoutDescription}
                onChange={(e) => setNewLayoutDescription(e.target.value)}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              <p>This will save:</p>
              <ul className="list-disc list-inside mt-1">
                <li>Zoom level: {currentViewState.zoom.toFixed(0)}</li>
                <li>Animation speed: {currentViewState.animationSpeed}x</li>
                <li>Filters: {currentFilter.categories.length || "All"} categories</li>
                <li>Display options: Labels, Metrics, Connections</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveLayout} disabled={!newLayoutName.trim()}>
              <Save className="h-4 w-4 mr-2" />
              Save Layout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default LayoutManager
