"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Search, Bell, HelpCircle, Settings, User, ExternalLink, Cloud } from "lucide-react"
import Link from "next/link"

export function TopNav() {
  return (
    <header className="h-14 border-b border-gray-800 bg-[#0A1929] sticky top-0 z-40">
      <div className="flex h-full items-center px-4 gap-x-2 md:gap-x-4 container mx-auto">
        <div className="flex items-center gap-1 md:gap-2 font-semibold">
          <Cloud className="h-5 w-5 md:h-6 md:w-6" />
          <span className="hidden sm:inline">NatureOS</span>
        </div>
        <div className="flex-1 max-w-xl ml-2 md:ml-8 hidden sm:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search resources..."
              className="pl-10 bg-gray-900 border-gray-800 focus-visible:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex items-center gap-1 md:gap-2 ml-auto">
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <HelpCircle className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/" className="flex items-center">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Back to Mycosoft.com
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
