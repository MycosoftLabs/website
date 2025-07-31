import type React from "react"
import { cn } from "@/lib/utils"

interface DashboardShellProps extends React.HTMLAttributes<HTMLDivElement> {}

export function DashboardShell({ children, className, ...props }: DashboardShellProps) {
  return (
    <div className={cn("flex-1 w-full h-full flex flex-col overflow-auto", className)} {...props}>
      <div className="flex-1 container mx-auto px-4 py-6 md:py-8 max-w-7xl">{children}</div>
    </div>
  )
}
