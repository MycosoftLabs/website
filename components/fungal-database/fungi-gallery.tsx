"use client"

import { useState } from "react"
import Image from "next/image"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import type { FungiImage } from "@/types/fungi"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface FungiGalleryProps {
  images: FungiImage[]
  initialImageId?: number
}

export function FungiGallery({ images, initialImageId }: FungiGalleryProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(
    initialImageId ? images.findIndex((img) => img.id === initialImageId) : 0,
  )

  const currentImage = images[currentImageIndex]

  const goToNextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length)
  }

  const goToPreviousImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {images.map((image) => (
            <div
              key={image.id}
              className="relative aspect-square rounded-md overflow-hidden cursor-pointer border hover:opacity-90 transition-opacity"
              onClick={() => setCurrentImageIndex(images.findIndex((img) => img.id === image.id))}
            >
              <Image
                src={image.imageUrl || "/placeholder.svg"}
                alt={image.caption || "Fungi image"}
                fill
                className="object-cover"
              />
            </div>
          ))}
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-3xl p-0 bg-transparent border-none">
        <div className="relative bg-black rounded-lg overflow-hidden">
          <div className="relative aspect-[4/3] w-full">
            <Image
              src={currentImage.imageUrl || "/placeholder.svg"}
              alt={currentImage.caption || "Fungi image"}
              fill
              className="object-contain"
            />
          </div>

          {currentImage.caption && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-4">
              <p>{currentImage.caption}</p>
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 text-white hover:bg-black/50 rounded-full"
            onClick={() => document.body.click()}
          >
            <X className="h-6 w-6" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="absolute left-2 top-1/2 -translate-y-1/2 text-white hover:bg-black/50 rounded-full"
            onClick={(e) => {
              e.stopPropagation()
              goToPreviousImage()
            }}
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:bg-black/50 rounded-full"
            onClick={(e) => {
              e.stopPropagation()
              goToNextImage()
            }}
          >
            <ChevronRight className="h-8 w-8" />
          </Button>

          <div className="absolute bottom-16 left-0 right-0 flex justify-center gap-1 p-2">
            {images.map((image, index) => (
              <button
                key={image.id}
                className={`h-2 rounded-full transition-all ${
                  index === currentImageIndex ? "w-6 bg-white" : "w-2 bg-white/50"
                }`}
                onClick={(e) => {
                  e.stopPropagation()
                  setCurrentImageIndex(index)
                }}
                aria-label={`Go to image ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
