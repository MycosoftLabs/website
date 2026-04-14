"use client"

/**
 * Screenshot Export + Share Link Controls
 *
 * - Screenshot: captures the map canvas as PNG
 * - Share: copies current URL with state to clipboard
 */

import { Camera, Share2, Download } from "lucide-react"
import { cn } from "@/lib/utils"

interface ExportControlsProps {
  map: any // maplibregl.Map
  className?: string
}

export function ScreenshotButton({ map, className }: ExportControlsProps) {
  const handleScreenshot = async () => {
    if (!map) return
    try {
      const canvas = map.getCanvas() as HTMLCanvasElement
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png")
      )
      if (!blob) return

      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `crep-map-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.png`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.warn("[CREP] Screenshot failed:", err)
    }
  }

  return (
    <button
      onClick={handleScreenshot}
      className={cn(
        "p-2 rounded-lg border bg-black/40 border-gray-700/50 text-gray-500 hover:text-gray-300 hover:border-gray-600 transition-all",
        className
      )}
      title="Export map as PNG"
    >
      <Camera className="w-4 h-4" />
    </button>
  )
}

export function ShareLinkButton({ className }: { className?: string }) {
  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      // Could use toast here if imported
    } catch {
      // Fallback for non-HTTPS
      const input = document.createElement("input")
      input.value = window.location.href
      document.body.appendChild(input)
      input.select()
      document.execCommand("copy")
      document.body.removeChild(input)
    }
  }

  return (
    <button
      onClick={handleShare}
      className={cn(
        "p-2 rounded-lg border bg-black/40 border-gray-700/50 text-gray-500 hover:text-gray-300 hover:border-gray-600 transition-all",
        className
      )}
      title="Copy share link"
    >
      <Share2 className="w-4 h-4" />
    </button>
  )
}

export function DownloadDataButton({ className, onDownload }: { className?: string; onDownload?: () => void }) {
  return (
    <button
      onClick={onDownload}
      className={cn(
        "p-2 rounded-lg border bg-black/40 border-gray-700/50 text-gray-500 hover:text-gray-300 hover:border-gray-600 transition-all",
        className
      )}
      title="Download visible data"
    >
      <Download className="w-4 h-4" />
    </button>
  )
}
