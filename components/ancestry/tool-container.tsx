// components/ancestry/tool-container.tsx
"use client"

import type React from "react"

import Link from "next/link"
import { Button } from "@/components/ui/button"

interface ToolContainerProps {
  title: string
  description: string
  children: React.ReactNode
  popupLink?: string
}

export function ToolContainer({ title, description, children, popupLink }: ToolContainerProps) {
  return (
    <div className="bg-card border rounded-lg overflow-hidden hover:shadow-md transition-shadow relative shadow-md">
      <div className="bg-primary text-white py-2 px-4">
        <h3 className="font-medium text-lg">{title}</h3>
      </div>
      <div className="p-4">
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="p-4 border-t dark:border-gray-800">
        {children}
        {popupLink && (
          <div className="mt-4">
            <Link href={popupLink}>
              <Button variant="outline" size="sm">
                Open in Popup
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
