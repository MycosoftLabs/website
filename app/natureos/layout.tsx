"use client"

import type React from "react"
import { useState } from "react"
import { DashboardNav } from "@/components/dashboard/nav"
import { TopNav } from "@/components/dashboard/top-nav"
import { NavigationTitle } from "@/components/dashboard/navigation-title"
import { SidebarProvider, Sidebar, SidebarContent, SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Brain, MessageSquare } from "lucide-react"
import { useMYCA } from "@/contexts/myca-context"
import { Input } from "@/components/ui/input"
import { Send } from "lucide-react"

function MYCAFloatingButton() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
  const myca = useMYCA()
  if (!myca) return null

  const handleSend = async () => {
    const q = input.trim()
    if (!q) return
    setInput("")
    await myca.sendMessage(q, { source: "web" })
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full border-gray-700 bg-[#0A1929] shadow-lg hover:bg-gray-800 md:bottom-8 md:right-8"
          aria-label="Open MYCA assistant"
        >
          <Brain className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full max-w-md overflow-hidden flex flex-col p-0">
        <div className="flex items-center gap-2 p-4 border-b border-gray-800">
          <MessageSquare className="h-5 w-5" />
          <h2 className="font-semibold">MYCA Assistant</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {myca.messages.slice(-20).map((m) => (
            <div
              key={m.id}
              className={`rounded-lg p-3 ${
                m.role === "user" ? "ml-8 bg-gray-800" : "mr-8 bg-gray-700/50"
              }`}
            >
              <p className="text-sm">{m.content}</p>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-gray-800 flex gap-2">
          <Input
            placeholder="Ask MYCA..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            className="flex-1"
          />
          <Button size="icon" onClick={handleSend} disabled={!input.trim() || myca.isLoading}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default function NatureOSLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-dvh flex flex-col bg-[#0A1929] text-white">
      <TopNav />
      {/*
        defaultOpen={false} → sidebar starts CLOSED on mobile (overlay Sheet),
        open on desktop. Users tap the SidebarTrigger to reveal it.
        This gives full-width content area on phones/tablets by default.
      */}
      <SidebarProvider defaultOpen={false}>
        {/* Use dvh so the panel height is correct when mobile browser chrome shows/hides */}
        <div className="flex flex-1 h-[calc(100dvh-3rem)] md:h-[calc(100dvh-3.5rem)] transition-all duration-300">
          {/* Sidebar — overlays on mobile (Sheet), pushes on desktop */}
          <Sidebar className="border-r border-gray-800">
            <div className="flex items-center justify-between p-2">
              <NavigationTitle />
              <SidebarTrigger />
            </div>
            <SidebarContent className="h-full">
              <div className="overflow-y-auto h-full">
                <DashboardNav />
              </div>
            </SidebarContent>
          </Sidebar>
          {/* Main content — full width on mobile when sidebar is closed */}
          <div className="flex-1 overflow-hidden transition-all duration-300 w-full min-w-0">
            {/* Compact sidebar trigger — only on tablet (sm-lg), hidden on phone and desktop */}
            <div className="hidden sm:flex lg:hidden items-center gap-2 px-3 py-1.5 border-b border-gray-800 bg-[#0A1929]">
              <SidebarTrigger className="text-gray-400 hover:text-white h-8 w-8" />
              <span className="text-xs text-gray-500">Toggle Menu</span>
            </div>
            <main className="w-full h-full">{children}</main>
          </div>
        </div>
      </SidebarProvider>
      <MYCAFloatingButton />
    </div>
  )
}
