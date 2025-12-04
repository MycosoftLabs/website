import type React from "react"
import { DashboardNav } from "@/components/dashboard/nav"
import { TopNav } from "@/components/dashboard/top-nav"
import { SidebarProvider, Sidebar, SidebarContent, SidebarTrigger, useSidebar } from "@/components/ui/sidebar"

// Create a new component for the animated navigation title
function NavigationTitle() {
  const { isOpen } = useSidebar()

  return (
    <span
      className={`font-semibold text-sm transition-all duration-300 ${
        isOpen ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden"
      }`}
    >
      Navigation
    </span>
  )
}

export default function NatureOSLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[#0A1929] text-white">
      <TopNav />
      <SidebarProvider defaultOpen={true}>
        <div className="flex flex-1 h-[calc(100vh-3.5rem)] transition-all duration-300">
          <Sidebar className="border-r border-gray-800 md:sticky md:top-14 h-full">
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
          <div className="flex-1 overflow-auto transition-all duration-300">
            <main className="w-full">{children}</main>
          </div>
        </div>
      </SidebarProvider>
    </div>
  )
}
