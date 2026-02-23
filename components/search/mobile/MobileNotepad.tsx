"use client"

/**
 * MobileNotepad - Feb 2026
 * 
 * Bottom sheet notepad for mobile with save/restore/export functionality.
 * Uses the same storage as desktop notepad for cross-device persistence.
 */

import { useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  StickyNote, X, Trash2, Download, Share2, 
  Leaf, FlaskConical, Dna, FileText, Sparkles, 
  RotateCcw, MapPin, Layers, Image as ImageIcon, Newspaper
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { useSearchContext, type NotepadItem } from "../SearchContextProvider"

interface MobileNotepadProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const typeIcons: Record<string, React.ReactNode> = {
  species: <Leaf className="h-4 w-4 text-green-500" />,
  compound: <FlaskConical className="h-4 w-4 text-purple-500" />,
  chemistry: <FlaskConical className="h-4 w-4 text-purple-500" />,
  genetics: <Dna className="h-4 w-4 text-cyan-500" />,
  research: <FileText className="h-4 w-4 text-orange-500" />,
  news: <Newspaper className="h-4 w-4 text-yellow-500" />,
  ai: <Sparkles className="h-4 w-4 text-violet-500" />,
  note: <StickyNote className="h-4 w-4 text-yellow-500" />,
  location: <MapPin className="h-4 w-4 text-emerald-500" />,
  taxonomy: <Layers className="h-4 w-4 text-amber-500" />,
  images: <ImageIcon className="h-4 w-4 text-pink-500" />,
}

export function MobileNotepad({ open, onOpenChange }: MobileNotepadProps) {
  const { 
    notepadItems, 
    removeNotepadItem, 
    clearNotepad,
    setQuery,
    focusWidget,
    emit,
  } = useSearchContext()

  // Export notes as text file
  const handleExport = useCallback(() => {
    const text = notepadItems
      .map((n) => [
        `[${n.type.toUpperCase()}] ${n.title}`,
        n.content,
        n.source ? `Source: ${n.source}` : null,
        `Saved: ${new Date(n.timestamp).toLocaleString()}`,
      ].filter(Boolean).join("\n"))
      .join("\n\n---\n\n")

    const blob = new Blob([text], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `myca-notes-${new Date().toISOString().split("T")[0]}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }, [notepadItems])

  // Share notes using Web Share API if available
  const handleShare = useCallback(async () => {
    if (!navigator.share) {
      handleExport()
      return
    }

    const text = notepadItems
      .map((n) => `${n.title}: ${n.content.slice(0, 100)}`)
      .join("\n\n")

    try {
      await navigator.share({
        title: "My MYCA Notes",
        text: text.slice(0, 500),
      })
    } catch {
      // User cancelled or share failed
    }
  }, [notepadItems, handleExport])

  // Restore a saved note (re-search and focus)
  const handleRestore = useCallback((note: NotepadItem) => {
    // For news/research items with stored meta, emit to open reader
    if ((note.type === "news" || note.type === "research") && note.meta) {
      emit("read-item", { type: note.type, item: note.meta })
      onOpenChange(false)
      return
    }

    // Otherwise restore search and focus widget
    if (note.searchQuery || note.title) {
      setQuery(note.searchQuery || note.title)
    }

    const widgetType = typeToWidgetType[note.type] || "species"
    setTimeout(() => {
      focusWidget({ type: widgetType, id: note.title } as any)
      onOpenChange(false)
    }, 300)
  }, [emit, focusWidget, onOpenChange, setQuery])

  // Format timestamp
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffHours < 1) return "Just now"
    if (diffHours < 24) return `${Math.floor(diffHours)}h ago`
    if (diffHours < 48) return "Yesterday"
    return date.toLocaleDateString()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => onOpenChange(false)}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-2xl max-h-[80vh] flex flex-col"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            {/* Handle */}
            <div className="flex justify-center py-2">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-3 border-b">
              <div className="flex items-center gap-2">
                <StickyNote className="h-5 w-5 text-yellow-500" />
                <span className="font-semibold">Notepad</span>
                {notepadItems.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {notepadItems.length}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                {notepadItems.length > 0 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleShare}
                      title="Share"
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleExport}
                      title="Export"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={clearNotepad}
                      title="Clear all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onOpenChange(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Notes list */}
            <ScrollArea className="flex-1 px-4 py-3">
              {notepadItems.length === 0 ? (
                <div className="text-center py-12">
                  <StickyNote className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No saved notes yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Save items from your search results to reference later
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {notepadItems.map((note) => (
                    <motion.div
                      key={note.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 50 }}
                      className="flex items-start gap-3 p-3 rounded-xl bg-card border group"
                      onClick={() => handleRestore(note)}
                    >
                      <div className="mt-0.5 shrink-0">
                        {typeIcons[note.type] || typeIcons.note}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{note.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {note.content}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {note.source && (
                            <Badge variant="outline" className="text-[9px]">
                              {note.source}
                            </Badge>
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            {formatTime(note.timestamp)}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRestore(note)
                          }}
                          title="Restore"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeNotepadItem(note.id)
                          }}
                          title="Remove"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

const typeToWidgetType: Record<string, string> = {
  species: "species",
  compound: "chemistry",
  chemistry: "chemistry",
  genetics: "genetics",
  research: "research",
  ai: "ai",
  note: "species",
  location: "species",
  taxonomy: "species",
}
