import type React from "react"
interface DashboardHeaderProps {
  heading: string
  text?: string
  children?: React.ReactNode
}

export function DashboardHeader({ heading, text, children }: DashboardHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-2 mb-6">
      <div className="grid gap-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{heading}</h1>
        {text && <p className="text-sm sm:text-base text-muted-foreground">{text}</p>}
      </div>
      {children}
    </div>
  )
}
