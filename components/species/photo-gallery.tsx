"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ExternalLink, Info, ImageIcon } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface Photo {
  url: string
  medium_url?: string
  large_url?: string
  attribution: string
  license_code?: string
}

interface PhotoGalleryProps {
  photos: Photo[]
  speciesName: string
  isLoading?: boolean
  initialLimit?: number
}

export function PhotoGallery({ photos, speciesName, isLoading = false, initialLimit = 8 }: PhotoGalleryProps) {
  const [displayLimit, setDisplayLimit] = useState(initialLimit)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>(
    Object.fromEntries(photos.map((photo) => [photo.url, true])),
  )
  const [errorStates, setErrorStates] = useState<Record<string, boolean>>({})
  const [displayedPhotos, setDisplayedPhotos] = useState<Photo[]>([])

  // Update the image quality check function to be more robust
  const ensureHighQualityImage = useCallback(async (photo: Photo): Promise<boolean> => {
    if (!photo.url && !photo.large_url && !photo.medium_url) {
      console.warn("No valid URLs found for photo")
      return false
    }

    try {
      return new Promise((resolve) => {
        const img = new Image()
        img.crossOrigin = "anonymous" // Add crossOrigin

        const timeoutId = setTimeout(() => {
          console.warn("Image load timeout:", photo.url)
          resolve(false)
        }, 5000) // 5 second timeout

        img.onload = () => {
          clearTimeout(timeoutId)
          // Basic quality check - ensure we have valid dimensions
          if (!img.width || !img.height) {
            console.warn("Invalid image dimensions:", { width: img.width, height: img.height })
            resolve(false)
            return
          }

          // More lenient quality requirements to ensure we have images to display
          const isHighQuality =
            img.width >= 600 && img.height >= 600 && img.width / img.height >= 0.3 && img.width / img.height <= 3.0

          resolve(isHighQuality)
        }

        img.onerror = () => {
          clearTimeout(timeoutId)
          console.warn("Failed to load image for quality check:", photo.url)
          resolve(false)
        }

        // Try best available URL
        img.src = photo.large_url || photo.medium_url || photo.url
      })
    } catch (error) {
      console.error("Error in image quality check:", error)
      return false
    }
  }, [])

  // Update the useEffect hook to handle errors better
  useEffect(() => {
    const filterLowQualityImages = async () => {
      try {
        console.log("Starting photo processing:", photos.length, "photos")

        // Ensure we have photos to process
        if (!Array.isArray(photos) || photos.length === 0) {
          console.log("No photos to process")
          setDisplayedPhotos([])
          return
        }

        const processedPhotos = []

        for (const photo of photos) {
          // Skip invalid photos
          if (!photo || (!photo.url && !photo.large_url && !photo.medium_url)) {
            console.warn("Skipping invalid photo:", photo)
            continue
          }

          try {
            const isHighQuality = await ensureHighQualityImage(photo)
            if (isHighQuality) {
              processedPhotos.push(photo)
            } else {
              console.log("Photo did not meet quality requirements:", photo.url)
            }
          } catch (photoError) {
            console.warn("Error processing individual photo:", photoError)
            // Continue processing other photos
            continue
          }
        }

        console.log("Photo processing complete:", processedPhotos.length, "quality photos found")

        // If no high quality photos found, fall back to original photos
        if (processedPhotos.length === 0) {
          console.log("No high quality photos found, using original photos")
          setDisplayedPhotos(photos.slice(0, displayLimit))
        } else {
          setDisplayedPhotos(processedPhotos.slice(0, displayLimit))
        }
      } catch (error) {
        console.error("Error in photo filtering:", error)
        // Ensure we always show something - fall back to original photos
        setDisplayedPhotos(photos.slice(0, displayLimit))
      }
    }

    filterLowQualityImages()
  }, [photos, displayLimit, ensureHighQualityImage])

  const hasMorePhotos = photos.length > displayedPhotos.length

  const handlePrevious = () => {
    setCurrentPhotoIndex((current) => (current === 0 ? photos.length - 1 : current - 1))
  }

  const handleNext = () => {
    setCurrentPhotoIndex((current) => (current === photos.length - 1 ? 0 : current + 1))
  }

  const handleImageLoad = (url: string) => {
    console.log("Image loaded successfully:", url)
    setLoadingStates((prev) => ({ ...prev, [url]: false }))
  }

  const handleImageError = (url: string) => {
    console.error("Image failed to load:", url)
    setErrorStates((prev) => ({ ...prev, [url]: true }))
    setLoadingStates((prev) => ({ ...prev, [url]: false }))
  }

  const handleLoadMore = () => {
    setDisplayLimit((prev) => Math.min(prev + 8, photos.length))
  }

  if (!photos.length) {
    return (
      <div className="text-center p-8 border rounded-lg bg-muted/50">
        <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No photos available for this species.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {displayedPhotos.map((photo, index) => (
          <Dialog key={photo.url}>
            <DialogTrigger asChild>
              <div className="relative aspect-square cursor-pointer group overflow-hidden rounded-lg bg-muted">
                {loadingStates[photo.url] && !errorStates[photo.url] && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted">
                    <div className="h-8 w-8 animate-pulse rounded-full bg-muted-foreground/20" />
                  </div>
                )}
                {errorStates[photo.url] ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted p-4">
                    <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-xs text-muted-foreground text-center">Unable to load image</span>
                  </div>
                ) : (
                  <Image
                    src={photo.medium_url || photo.url}
                    alt={`${speciesName} specimen ${index + 1}`}
                    fill
                    className={cn(
                      "object-cover transition-transform group-hover:scale-110",
                      loadingStates[photo.url] && "opacity-0",
                    )}
                    onLoad={() => handleImageLoad(photo.url)}
                    onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                      const target = e.target as HTMLImageElement
                      console.error("Gallery image failed to load:", target.src)
                      handleImageError(photo.url)
                      // Try fallback URLs in sequence
                      if (photo.large_url && target.src !== photo.large_url) {
                        target.src = photo.large_url
                      } else if (photo.medium_url && target.src !== photo.medium_url) {
                        target.src = photo.medium_url
                      } else if (photo.url && target.src !== photo.url) {
                        target.src = photo.url
                      } else {
                        // Final fallback - use a species-specific placeholder
                        target.src = `/placeholder.svg?height=800&width=800&text=${encodeURIComponent(speciesName)}`
                      }
                    }}
                    loading={index < 4 ? "eager" : "lazy"}
                    crossOrigin="anonymous"
                    unoptimized={true}
                  />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button variant="secondary" size="sm">
                    View Larger
                  </Button>
                </div>
              </div>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <div className="relative aspect-[4/3] w-full">
                <Image
                  src={photo.large_url || photo.url}
                  alt={`${speciesName} specimen ${index + 1}`}
                  fill
                  className="object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    console.error("Large image failed to load:", target.src)
                    // Use higher resolution for full-size view
                    target.src = `/placeholder.svg?height=1200&width=1200`
                  }}
                  priority={index === currentPhotoIndex}
                  crossOrigin="anonymous"
                  unoptimized={true}
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>{photo.attribution}</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <a href={photo.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-400">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>View original image</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80"
                  onClick={handlePrevious}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80"
                  onClick={handleNext}
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        ))}
      </div>

      {hasMorePhotos && (
        <div className="text-center mt-6">
          <Button variant="outline" onClick={handleLoadMore} className="w-full max-w-xs">
            Load More Photos ({photos.length - displayLimit} remaining)
          </Button>
        </div>
      )}

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Info className="h-4 w-4" />
        <p>Click any photo to view full size.</p>
      </div>
    </div>
  )
}
