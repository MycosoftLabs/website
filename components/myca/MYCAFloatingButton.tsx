"use client"

import { useState } from "react"
import { MessageSquare, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { MYCAChatWidget } from "./MYCAChatWidget"

interface MYCAFloatingButtonProps {
  className?: string
  title?: string
  getContextText?: () => string
}

export function MYCAFloatingButton({
  className,
  title = "MYCA",
  getContextText,
}: MYCAFloatingButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        type="button"
        variant="default"
        className={cn(
          "fixed bottom-4 right-4 z-[9999] h-12 w-12 rounded-full shadow-lg",
          "min-h-[44px] min-w-[44px] pointer-events-auto",
          className
        )}
        aria-label="Open MYCA chat"
        onClick={() => setOpen(true)}
      >
        <MessageSquare className="h-5 w-5" />
      </Button>

      {open && (
        <div className="fixed inset-0 z-[80] flex justify-end bg-black/50" onClick={() => setOpen(false)}>
          <div
            className="h-full w-full max-w-full sm:max-w-md bg-background shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="text-base font-semibold">{title}</div>
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="h-[calc(100dvh-72px)] px-4 pb-4">
              <MYCAChatWidget showHeader={false} getContextText={getContextText} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
