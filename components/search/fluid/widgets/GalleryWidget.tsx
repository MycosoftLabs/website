/**
 * GalleryWidget - Feb 2026
 * 
 * Photo gallery widget with:
 * - Grid/masonry layout
 * - Lightbox support
 * - Photo attribution
 */

"use client"

import { useState } from "react"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { 
  Images, 
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Photo {
  id: string
  url: string
  medium_url: string
  large_url: string
  attribution?: string
}

interface GalleryWidgetProps {
  photos: Photo[]
  title?: string
  isFocused: boolean
  className?: string
}

export function GalleryWidget({ 
  photos, 
  title = "Photo Gallery",
  isFocused,
  className,
}: GalleryWidgetProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)

  const displayPhotos = isFocused ? photos.slice(0, 12) : photos.slice(0, 4)

  const nextPhoto = () => {
    setCurrentIndex((prev) => (prev + 1) % photos.length)
  }

  const prevPhoto = () => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length)
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="p-2 bg-amber-500/10 rounded-lg shrink-0">
          <Images className="h-5 w-5 text-amber-500" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">{title}</h3>
          <p className="text-xs text-muted-foreground">
            {photos.length} photos
          </p>
        </div>
      </div>

      {/* Photo grid */}
      <div className={cn(
        "grid gap-2",
        isFocused ? "grid-cols-4" : "grid-cols-2"
      )}>
        {displayPhotos.map((photo, index) => (
          <motion.button
            key={photo.id || index}
            className="relative aspect-square rounded-lg overflow-hidden bg-muted group"
            onClick={() => {
              setCurrentIndex(index)
              setLightboxOpen(true)
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Image
              src={photo.medium_url || photo.url}
              alt={`Photo ${index + 1}`}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes={isFocused ? "100px" : "80px"}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
          </motion.button>
        ))}
      </div>

      {/* Show more indicator */}
      {!isFocused && photos.length > 4 && (
        <p className="text-xs text-muted-foreground text-center">
          +{photos.length - 4} more photos
        </p>
      )}

      {/* Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-4xl p-0 bg-black/95">
          <div className="relative aspect-[4/3] w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative w-full h-full"
              >
                <Image
                  src={photos[currentIndex]?.large_url || photos[currentIndex]?.url}
                  alt={`Photo ${currentIndex + 1}`}
                  fill
                  className="object-contain"
                  sizes="100vw"
                />
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            {photos.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                  onClick={prevPhoto}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                  onClick={nextPhoto}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            )}

            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white"
              onClick={() => setLightboxOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>

            {/* Attribution */}
            {photos[currentIndex]?.attribution && (
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent text-white text-xs">
                {photos[currentIndex].attribution}
              </div>
            )}

            {/* Counter */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/50 rounded text-white text-xs">
              {currentIndex + 1} / {photos.length}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default GalleryWidget
