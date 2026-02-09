/**
 * SearchLayout - Feb 2026
 *
 * 3-panel layout: MYCA chat (left) | Results (center) | Live + Notepad (right)
 * No scrolling on center panel. Only notepad scrolls internally.
 * Side panels slide via edge tabs.
 */

"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { MessageSquare, StickyNote, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSearchContext } from "./SearchContextProvider"
import { MYCAChatPanel } from "./panels/MYCAChatPanel"
import { LiveResultsWidget } from "./panels/LiveResultsWidget"
import { NotepadWidget } from "./panels/NotepadWidget"

interface SearchLayoutProps {
  children: React.ReactNode
}

export function SearchLayout({ children }: SearchLayoutProps) {
  const { leftPanelOpen, setLeftPanelOpen, rightPanelOpen, setRightPanelOpen } = useSearchContext()

  return (
    <div className="h-[calc(100vh-64px)] overflow-hidden flex relative">
      {/* Left Panel - MYCA Chat */}
      <AnimatePresence initial={false}>
        {leftPanelOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 350 }}
            className="shrink-0 border-r border-white/5 bg-card/50 backdrop-blur-sm overflow-hidden"
          >
            <MYCAChatPanel />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Left edge tab (when panel closed) */}
      {!leftPanelOpen && (
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-30 bg-card/80 backdrop-blur-sm border border-l-0 rounded-r-lg px-1 py-3 shadow-md hover:bg-card transition-colors"
          onClick={() => setLeftPanelOpen(true)}
          title="Show MYCA chat"
        >
          <MessageSquare className="h-4 w-4 mb-1" />
          <ChevronRight className="h-3 w-3" />
        </motion.button>
      )}

      {/* Center Panel - Search + Widgets (NO scroll) */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Close buttons as small pills at top edges */}
        <div className="absolute top-2 left-2 z-20 flex gap-1">
          {leftPanelOpen && (
            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full bg-card/50 backdrop-blur-sm" onClick={() => setLeftPanelOpen(false)}>
              <ChevronLeft className="h-3 w-3" />
            </Button>
          )}
        </div>
        <div className="absolute top-2 right-2 z-20 flex gap-1">
          {rightPanelOpen && (
            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full bg-card/50 backdrop-blur-sm" onClick={() => setRightPanelOpen(false)}>
              <ChevronRight className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Content -- overflow hidden, no scrollbar */}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </div>

      {/* Right edge tab (when panel closed) */}
      {!rightPanelOpen && (
        <motion.button
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-30 bg-card/80 backdrop-blur-sm border border-r-0 rounded-l-lg px-1 py-3 shadow-md hover:bg-card transition-colors"
          onClick={() => setRightPanelOpen(true)}
          title="Show notepad"
        >
          <StickyNote className="h-4 w-4 mb-1" />
          <ChevronLeft className="h-3 w-3" />
        </motion.button>
      )}

      {/* Right Panel - Live Results + Notepad */}
      <AnimatePresence initial={false}>
        {rightPanelOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 350 }}
            className="shrink-0 border-l border-white/5 bg-card/50 backdrop-blur-sm overflow-hidden flex flex-col"
          >
            {/* Live Results - fixed height */}
            <div className="border-b border-white/5 shrink-0">
              <LiveResultsWidget />
            </div>
            {/* Notepad - ONLY scrollable area */}
            <div className="flex-1 overflow-hidden">
              <NotepadWidget />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
