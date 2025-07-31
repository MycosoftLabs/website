import type React from "react"
import { TopNav } from "@/components/dashboard/top-nav"
import { SidebarNav } from "@/components/sidebar-nav"

export default function NatureOSLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <TopNav />
      <div className="flex flex-1 h-[calc(100vh-3.5rem)]">
        <SidebarNav />
        <main className="flex-1 p-4">{children}</main>
      </div>
    </div>
  )
}
