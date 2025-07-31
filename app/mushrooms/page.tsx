import type { Metadata } from "next"
import { MushroomDirectory } from "@/components/mushrooms/mushroom-directory"

export const metadata: Metadata = {
  title: "Mushroom Species Database - Mycosoft",
  description: "Explore our comprehensive database of over 10,000 mushroom species and their properties",
}

export default function MushroomsPage() {
  return (
    <div className="container py-6 md:py-8 px-4 sm:px-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mushroom Species Database</h1>
          <p className="text-lg text-muted-foreground">
            Explore our comprehensive database of over 10,000 mushroom-producing fungi
          </p>
        </div>
      </div>
      <div className="mt-8 space-y-8">
        <MushroomDirectory />
      </div>
    </div>
  )
}
