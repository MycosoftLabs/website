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
    <div className="h-[calc(100vh-56px)] sm:h-[calc(100vh-64px)] overflow-hidden flex relative">
      {/* Left Panel - MYCA Chat (hidden on mobile, overlay on tablet, inline on desktop) */}
      <AnimatePresence initial={false}>
        {leftPanelOpen && (
          <>
            {/* Mobile/Tablet: overlay backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setLeftPanelOpen(false)}
            />
            <motion.div
              initial={{ x: -260, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -260, opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 350 }}
              className="fixed lg:relative left-0 top-0 bottom-0 w-[280px] sm:w-[300px] lg:w-[260px] z-50 lg:z-auto shrink-0 border-r border-white/5 bg-card/95 lg:bg-card/50 backdrop-blur-sm overflow-hidden"
            >
              <MYCAChatPanel />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Left edge tab (when panel closed) */}
      {!leftPanelOpen && (
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-30 bg-card/80 backdrop-blur-sm border border-l-0 rounded-r-lg px-1.5 sm:px-1 py-4 sm:py-3 shadow-md hover:bg-card active:bg-card/90 transition-colors"
          onClick={() => setLeftPanelOpen(true)}
          title="Show MYCA chat"
        >
          <MessageSquare className="h-5 w-5 sm:h-4 sm:w-4 mb-1" />
          <ChevronRight className="h-4 w-4 sm:h-3 sm:w-3" />
        </motion.button>
      )}

      {/* Center Panel - Search + Widgets (NO scroll) */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Close buttons as small pills at top edges - hidden on mobile when panel open (use overlay tap instead) */}
        <div className="absolute top-2 left-2 z-20 hidden lg:flex gap-1">
          {leftPanelOpen && (
            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full bg-card/50 backdrop-blur-sm" onClick={() => setLeftPanelOpen(false)}>
              <ChevronLeft className="h-3 w-3" />
            </Button>
          )}
        </div>
        <div className="absolute top-2 right-2 z-20 hidden lg:flex gap-1">
          {rightPanelOpen && (
            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full bg-card/50 backdrop-blur-sm" onClick={() => setRightPanelOpen(false)}>
              <ChevronRight className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Content -- allow vertical scroll on mobile */}
        <div className="flex-1 overflow-y-auto sm:overflow-hidden">
          {children}
        </div>
      </div>

      {/* Right edge tab (when panel closed) */}
      {!rightPanelOpen && (
        <motion.button
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-30 bg-card/80 backdrop-blur-sm border border-r-0 rounded-l-lg px-1.5 sm:px-1 py-4 sm:py-3 shadow-md hover:bg-card active:bg-card/90 transition-colors"
          onClick={() => setRightPanelOpen(true)}
          title="Show notepad"
        >
          <StickyNote className="h-5 w-5 sm:h-4 sm:w-4 mb-1" />
          <ChevronLeft className="h-4 w-4 sm:h-3 sm:w-3" />
        </motion.button>
      )}

      {/* Right Panel - Live Results + Notepad (overlay on mobile/tablet) */}
      <AnimatePresence initial={false}>
        {rightPanelOpen && (
          <>
            {/* Mobile/Tablet: overlay backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setRightPanelOpen(false)}
            />
            <motion.div
              initial={{ x: 280, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 280, opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 350 }}
              className="fixed lg:relative right-0 top-0 bottom-0 w-[280px] sm:w-[300px] lg:w-[280px] z-50 lg:z-auto shrink-0 border-l border-white/5 bg-card/95 lg:bg-card/50 backdrop-blur-sm overflow-hidden flex flex-col"
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
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
