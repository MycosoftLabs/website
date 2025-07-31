"use client"

import { useState } from "react"
import Image from "next/image"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, Download, ZoomIn, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface PhotoGalleryProps {
  images: string[]
  title: string
  className?: string
}

export function PhotoGallery({ images, title, className }: PhotoGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({})

  const handleImageError = (index: number) => {
    setImageErrors((prev) => ({ ...prev, [index]: true }))
  }

  const getImageSrc = (src: string, index: number) => {
    if (imageErrors[index]) {
      return `/placeholder.svg?height=400&width=600&text=Image+Unavailable`
    }
    return src || `/placeholder.svg?height=400&width=600&text=No+Image`
  }

  const nextImage = () => {
    setSelectedIndex((prev) => (prev + 1) % images.length)
  }

  const prevImage = () => {
    setSelectedIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  const downloadImage = async (src: string, filename: string) => {
    try {
      const response = await fetch(src)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Failed to download image:", error)
    }
  }

  if (!images || images.length === 0) {
    return (
      <div className={cn("text-center py-8", className)}>
        <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center">
          <p className="text-muted-foreground">No images available</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Main Image */}
      <div className="relative group">
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <div className="relative aspect-video cursor-pointer overflow-hidden rounded-lg bg-muted">
              <Image
                src={getImageSrc(images[selectedIndex], selectedIndex) || "/placeholder.svg"}
                alt={`${title} - Image ${selectedIndex + 1}`}
                fill
                className="object-cover transition-transform group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                onError={() => handleImageError(selectedIndex)}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <Badge className="absolute top-2 right-2 bg-black/50 text-white">
                {selectedIndex + 1} / {images.length}
              </Badge>
            </div>
          </DialogTrigger>

          <DialogContent className="max-w-4xl w-full p-0">
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-10 bg-black/50 text-white hover:bg-black/70"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>

              <div className="relative aspect-video">
                <Image
                  src={getImageSrc(images[selectedIndex], selectedIndex) || "/placeholder.svg"}
                  alt={`${title} - Image ${selectedIndex + 1}`}
                  fill
                  className="object-contain"
                  sizes="90vw"
                  onError={() => handleImageError(selectedIndex)}
                />
              </div>

              {images.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                    onClick={prevImage}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                    onClick={nextImage}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              )}

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    downloadImage(
                      getImageSrc(images[selectedIndex], selectedIndex),
                      `${title}-${selectedIndex + 1}.jpg`,
                    )
                  }
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Navigation Controls */}
      {images.length > 1 && (
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={prevImage} disabled={images.length <= 1}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          <div className="flex gap-1">
            {images.map((_, index) => (
              <button
                key={index}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  index === selectedIndex ? "bg-primary" : "bg-muted",
                )}
                onClick={() => setSelectedIndex(index)}
              />
            ))}
          </div>

          <Button variant="outline" size="sm" onClick={nextImage} disabled={images.length <= 1}>
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}

      {/* Thumbnail Grid */}
      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-2">
          {images.map((image, index) => (
            <button
              key={index}
              className={cn(
                "relative aspect-square overflow-hidden rounded border-2 transition-colors",
                index === selectedIndex ? "border-primary" : "border-transparent hover:border-muted-foreground",
              )}
              onClick={() => setSelectedIndex(index)}
            >
              <Image
                src={getImageSrc(image, index) || "/placeholder.svg"}
                alt={`${title} thumbnail ${index + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 25vw, 10vw"
                onError={() => handleImageError(index)}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
