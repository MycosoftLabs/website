"use client"

import { useSidebar } from "@/components/ui/sidebar"

export function NavigationTitle() {
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
