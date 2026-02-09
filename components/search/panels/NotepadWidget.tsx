/**
 * NotepadWidget - Feb 2026
 *
 * Persistent drag-and-drop notepad.
 * Click a saved note to RESTORE it (re-focus widget + re-search).
 * Only the notepad list scrolls internally.
 */

"use client"

import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  StickyNote,
  X,
  Trash2,
  Download,
  Leaf,
  FlaskConical,
  Dna,
  FileText,
  Sparkles,
  GripVertical,
  RotateCcw,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useSearchContext, type NotepadItem } from "../SearchContextProvider"

const typeIcons: Record<string, React.ReactNode> = {
  species: <Leaf className="h-3 w-3 text-green-500" />,
  compound: <FlaskConical className="h-3 w-3 text-purple-500" />,
  genetics: <Dna className="h-3 w-3 text-blue-500" />,
  research: <FileText className="h-3 w-3 text-orange-500" />,
  ai: <Sparkles className="h-3 w-3 text-violet-500" />,
  note: <StickyNote className="h-3 w-3 text-yellow-500" />,
}

const typeToWidgetType: Record<string, string> = {
  species: "species",
  compound: "chemistry",
  genetics: "genetics",
  research: "research",
  ai: "ai",
  note: "species",
}

export function NotepadWidget() {
  const {
    notepadItems, addNotepadItem, removeNotepadItem, clearNotepad,
    focusWidget, setQuery,
  } = useSearchContext()
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const raw = e.dataTransfer.getData("application/search-widget")
    if (raw) {
      try {
        const data = JSON.parse(raw)
        addNotepadItem({
          type: data.type || "note",
          title: data.title || "Untitled",
          content: data.content || "",
          source: data.source,
          searchQuery: data.searchQuery,
          focusedItemId: data.title,
        })
      } catch {}
    }
  }, [addNotepadItem])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "copy"
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => setIsDragOver(false), [])

  // Restore: re-focus the correct widget with the correct item selected
  const handleRestore = useCallback((note: NotepadItem) => {
    const widgetType = typeToWidgetType[note.type] || "species"
    // Use the original search query if saved, otherwise use the note title
    const searchFor = note.searchQuery || note.title
    // Set the query first so results load
    setQuery(searchFor)
    // Focus the widget with the specific item ID so it pre-selects the right one
    setTimeout(() => {
      focusWidget({ type: widgetType, id: note.title } as any)
    }, 300) // Small delay to let search results populate
  }, [focusWidget, setQuery])

  const handleExport = useCallback(() => {
    const text = notepadItems
      .map((n) => `[${n.type.toUpperCase()}] ${n.title}\n${n.content}\nSource: ${n.source || "N/A"}\nSaved: ${new Date(n.timestamp).toLocaleString()}\n`)
      .join("\n---\n\n")
    const blob = new Blob([text], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `search-notes-${new Date().toISOString().split("T")[0]}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }, [notepadItems])

  return (
    <div
      className={cn(
        "flex flex-col h-full transition-colors",
        isDragOver && "bg-primary/5 ring-2 ring-primary/30 ring-inset rounded-lg"
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-yellow-500" />
          <span className="text-sm font-medium">Notepad</span>
          {notepadItems.length > 0 && (
            <Badge variant="outline" className="text-[10px]">{notepadItems.length}</Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {notepadItems.length > 0 && (
            <>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleExport} title="Export notes">
                <Download className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={clearNotepad} title="Clear all">
                <Trash2 className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Notes list -- this is the ONLY scrollable area */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {notepadItems.length === 0 && (
          <div className={cn(
            "text-center py-6 rounded-xl border-2 border-dashed transition-colors",
            isDragOver ? "border-primary bg-primary/5" : "border-muted/50"
          )}>
            <GripVertical className="h-6 w-6 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-[10px] text-muted-foreground">
              Drag widgets here or click Save
            </p>
          </div>
        )}

        <AnimatePresence>
          {notepadItems.map((note) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-start gap-2 p-2 rounded-xl bg-card/60 backdrop-blur-sm border border-white/5 mb-2 group cursor-pointer hover:bg-card/80 transition-colors"
              onClick={() => handleRestore(note)}
              title="Click to restore this item"
            >
              <div className="mt-0.5 shrink-0">
                {typeIcons[note.type] || typeIcons.note}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{note.title}</p>
                <p className="text-[10px] text-muted-foreground line-clamp-2">{note.content}</p>
                {note.source && (
                  <Badge variant="outline" className="text-[8px] mt-1">{note.source}</Badge>
                )}
              </div>
              <div className="flex flex-col gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={(e) => { e.stopPropagation(); handleRestore(note) }}
                  title="Restore"
                >
                  <RotateCcw className="h-2.5 w-2.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={(e) => { e.stopPropagation(); removeNotepadItem(note.id) }}
                  title="Remove"
                >
                  <X className="h-2.5 w-2.5" />
                </Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
