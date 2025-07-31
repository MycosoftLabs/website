"use client"

import * as React from "react"
import { createContext, useContext, useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
interface SidebarContextValue {
  isOpen: boolean
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>
  toggleSidebar: () => void
}

const SidebarContext = createContext<SidebarContextValue | undefined>(undefined)

export function SidebarProvider({
  children,
  defaultOpen = true,
}: {
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const toggleSidebar = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  return <SidebarContext.Provider value={{ isOpen, setIsOpen, toggleSidebar }}>{children}</SidebarContext.Provider>
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider")
  }
  return context
}

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Sidebar({ className, children, ...props }: SidebarProps) {
  const { isOpen } = useSidebar()

  return (
    <div
      className={cn(
        "h-full transition-all duration-300 ease-in-out border-r border-gray-800",
        isOpen ? "w-64" : "w-16",
        "md:sticky md:top-14", // Keep sticky positioning but allow width to change
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

interface SidebarContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export function SidebarContent({ className, children, ...props }: SidebarContentProps) {
  return (
    <div className={cn("p-2", className)} {...props}>
      {children}
    </div>
  )
}

interface SidebarTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export const SidebarTrigger = React.forwardRef<React.ElementRef<"button">, SidebarTriggerProps>(
  ({ className, ...props }, ref) => {
    const { isOpen, toggleSidebar } = useSidebar()
    return (
      <Button
        ref={ref}
        variant="ghost"
        size="icon"
        onClick={toggleSidebar}
        className={cn(
          "rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground",
          className,
        )}
        {...props}
      >
        {isOpen ? <ChevronLeft className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        <span className="sr-only">Toggle Sidebar</span>
      </Button>
    )
  },
)
SidebarTrigger.displayName = "SidebarTrigger"

interface SidebarMenuProps extends React.HTMLAttributes<HTMLDivElement> {}

export function SidebarMenu({ className, children, ...props }: SidebarMenuProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)} {...props}>
      {children}
    </div>
  )
}

interface SidebarMenuItemProps extends React.HTMLAttributes<HTMLDivElement> {}

export function SidebarMenuItem({ className, children, ...props }: SidebarMenuItemProps) {
  return (
    <div className={cn("relative", className)} {...props}>
      {children}
    </div>
  )
}

interface SidebarMenuButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isActive?: boolean
  tooltip?: string
}

export const SidebarMenuButton = React.forwardRef<React.ElementRef<"button">, SidebarMenuButtonProps>(
  ({ className, isActive, tooltip, children, ...props }, ref) => {
    const { isOpen } = useSidebar()
    return (
      <button
        ref={ref}
        className={cn(
          "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
          isActive && "bg-accent text-accent-foreground",
          !isOpen && "justify-center", // Center content when collapsed
          className,
        )}
        {...props}
      >
        <span
          className={cn("transition-all duration-300", isOpen ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden")}
        >
          {children}
        </span>
        {!isOpen && tooltip && (
          <span className="absolute left-12 top-1/2 -translate-y-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 z-10">
            {tooltip}
          </span>
        )}
      </button>
    )
  },
)
SidebarMenuButton.displayName = "SidebarMenuButton"

interface SidebarHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}
function SidebarHeader({ className, ...props }: SidebarHeaderProps) {
  return <div className={cn("p-2", className)} {...props} />
}

interface SidebarFooterProps extends React.HTMLAttributes<HTMLDivElement> {}
function SidebarFooter({ className, ...props }: SidebarFooterProps) {
  return <div className={cn("p-2", className)} {...props} />
}

interface SidebarGroupActionProps extends React.HTMLAttributes<HTMLDivElement> {}
function SidebarGroupAction({ className, ...props }: SidebarGroupActionProps) {
  return <div className={cn("p-2", className)} {...props} />
}

interface SidebarInputProps extends React.HTMLAttributes<HTMLDivElement> {}
function SidebarInput({ className, ...props }: SidebarInputProps) {
  return <div className={cn("p-2", className)} {...props} />
}

interface SidebarInsetProps extends React.HTMLAttributes<HTMLDivElement> {}
function SidebarInset({ className, ...props }: SidebarInsetProps) {
  return <div className={cn("p-2", className)} {...props} />
}

interface SidebarMenuActionProps extends React.HTMLAttributes<HTMLDivElement> {}
function SidebarMenuAction({ className, ...props }: SidebarMenuActionProps) {
  return <div className={cn("p-2", className)} {...props} />
}

interface SidebarMenuBadgeProps extends React.HTMLAttributes<HTMLDivElement> {}
function SidebarMenuBadge({ className, ...props }: SidebarMenuBadgeProps) {
  return <div className={cn("p-2", className)} {...props} />
}

interface SidebarMenuSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}
function SidebarMenuSkeleton({ className, ...props }: SidebarMenuSkeletonProps) {
  return <div className={cn("p-2", className)} {...props} />
}

interface SidebarMenuSubProps extends React.HTMLAttributes<HTMLDivElement> {}
function SidebarMenuSub({ className, ...props }: SidebarMenuSubProps) {
  return <div className={cn("p-2", className)} {...props} />
}

interface SidebarMenuSubButtonProps extends React.HTMLAttributes<HTMLDivElement> {}
function SidebarMenuSubButton({ className, ...props }: SidebarMenuSubButtonProps) {
  return <div className={cn("p-2", className)} {...props} />
}

interface SidebarMenuSubItemProps extends React.HTMLAttributes<HTMLDivElement> {}
function SidebarMenuSubItem({ className, ...props }: SidebarMenuSubItemProps) {
  return <div className={cn("p-2", className)} {...props} />
}

interface SidebarRailProps extends React.HTMLAttributes<HTMLDivElement> {}
function SidebarRail({ className, ...props }: SidebarRailProps) {
  return <div className={cn("p-2", className)} {...props} />
}

interface SidebarSeparatorProps extends React.HTMLAttributes<HTMLDivElement> {}
function SidebarSeparator({ className, ...props }: SidebarSeparatorProps) {
  return <div className={cn("p-2", className)} {...props} />
}
