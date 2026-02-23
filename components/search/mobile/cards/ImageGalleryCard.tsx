"use client"

/**
 * ImageGalleryCard - Feb 2026
 * 
 * Swipeable image gallery card for mobile.
 */

import { useState, useRef } from "react"
import Image from "next/image"
import { ImageIcon, Bookmark, ChevronLeft, ChevronRight, X, Maximize2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ImageGalleryCardProps {
  data: Record<string, unknown>
  onSave?: () => void
}

interface GalleryImage {
  url: string
  caption?: string
  source?: string
}

export function ImageGalleryCard({ data, onSave }: ImageGalleryCardProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const name = (data.name || data.title || "Gallery") as string
  const rawImages = (data.images || data.photos || []) as Array<string | GalleryImage>
  
  // Normalize images to consistent format
  const images: GalleryImage[] = rawImages.map(img => 
    typeof img === "string" ? { url: img } : img
  )

  if (images.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">{name}</h3>
            <p className="text-xs text-muted-foreground">No images available</p>
          </div>
        </div>
      </div>
    )
  }

  const goNext = () => setCurrentIndex((i) => (i + 1) % images.length)
  const goPrev = () => setCurrentIndex((i) => (i - 1 + images.length) % images.length)

  const currentImage = images[currentIndex]

  return (
    <>
      <div className="rounded-xl border bg-card overflow-hidden">
        {/* Image container */}
        <div 
          ref={containerRef}
          className="relative aspect-[4/3] bg-muted"
        >
          <Image
            src={currentImage.url}
            alt={currentImage.caption || name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 400px"
          />

          {/* Navigation arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={goPrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={goNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}

          {/* Image counter */}
          {images.length > 1 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-1 rounded-full bg-black/50 text-white text-[10px]">
              {currentIndex + 1} / {images.length}
            </div>
          )}

          {/* Fullscreen button */}
          <button
            onClick={() => setFullscreen(true)}
            className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Caption and actions */}
        <div className="p-3 flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium truncate">{name}</p>
            {currentImage.caption && (
              <p className="text-[10px] text-muted-foreground truncate">{currentImage.caption}</p>
            )}
            {currentImage.source && (
              <Badge variant="outline" className="text-[9px] mt-1">
                {currentImage.source}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={onSave}
          >
            <Bookmark className="h-4 w-4" />
          </Button>
        </div>

        {/* Dot indicators */}
        {images.length > 1 && images.length <= 10 && (
          <div className="flex justify-center gap-1 pb-2">
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  idx === currentIndex 
                    ? "w-4 bg-primary" 
                    : "w-1.5 bg-muted-foreground/30"
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen modal */}
      {fullscreen && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
          <button
            onClick={() => setFullscreen(false)}
            className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors z-10"
          >
            <X className="h-5 w-5" />
          </button>

          <Image
            src={currentImage.url}
            alt={currentImage.caption || name}
            fill
            className="object-contain"
            sizes="100vw"
          />

          {images.length > 1 && (
            <>
              <button
                onClick={goPrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={goNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-white/10 text-white text-sm">
                {currentIndex + 1} / {images.length}
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
