"use client"

import { MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
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
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="default"
          className={cn(
            "fixed bottom-4 right-4 z-40 h-12 w-12 rounded-full shadow-lg",
            "min-h-[44px] min-w-[44px]",
            className
          )}
          aria-label="Open MYCA chat"
        >
          <MessageSquare className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full max-w-full sm:max-w-md p-0">
        <SheetHeader className="px-4 pt-4">
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="h-[calc(100dvh-96px)] px-4 pb-4">
          <MYCAChatWidget showHeader={false} getContextText={getContextText} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
