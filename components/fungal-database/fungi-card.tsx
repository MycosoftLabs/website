"use client"

import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Fungi } from "@/types/fungi"

interface FungiCardProps {
  fungi: Fungi
}

export function FungiCard({ fungi }: FungiCardProps) {
  const primaryImage = fungi.images.find((img) => img.isPrimary) || fungi.images[0]

  return (
    <Card className="overflow-hidden transition-all hover:shadow-lg">
      <div className="aspect-[16/9] relative">
        <Image
          src={primaryImage.imageUrl || "/placeholder.svg"}
          alt={fungi.scientificName}
          fill
          className="object-cover"
        />
        {fungi.edibility && (
          <Badge
            className={`absolute top-2 right-2 ${
              fungi.edibility.toLowerCase().includes("edible")
                ? "bg-green-500 hover:bg-green-600"
                : fungi.edibility.toLowerCase().includes("poisonous")
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-amber-500 hover:bg-amber-600"
            }`}
          >
            {fungi.edibility}
          </Badge>
        )}
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-bold">
          <Link href={`/ancestry/fungal-database/${fungi.id}`} className="hover:underline">
            {fungi.scientificName}
          </Link>
        </CardTitle>
        <p className="text-sm text-muted-foreground">{fungi.commonName}</p>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="font-medium">Family:</p>
            <p className="text-muted-foreground">{fungi.family}</p>
          </div>
          <div>
            <p className="font-medium">Habitat:</p>
            <p className="text-muted-foreground truncate" title={fungi.habitat}>
              {fungi.habitat}
            </p>
          </div>
          <div>
            <p className="font-medium">Season:</p>
            <p className="text-muted-foreground">{fungi.season}</p>
          </div>
          <div>
            <p className="font-medium">Distribution:</p>
            <p className="text-muted-foreground truncate" title={fungi.distribution}>
              {fungi.distribution}
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Link
          href={`/ancestry/fungal-database/${fungi.id}`}
          className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
        >
          View Details →
        </Link>
      </CardFooter>
    </Card>
  )
}
