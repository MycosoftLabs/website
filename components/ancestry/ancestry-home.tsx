// components/ancestry/ancestry-home.tsx
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Image from "next/image"

export function AncestryHome() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Welcome to the Fungal Ancestry App</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Explore the fascinating world of fungal genealogy and discover the relationships between different species.
            This app provides tools and resources to help you delve into the ancestry of fungi.
          </p>
          <div className="relative aspect-video rounded-lg overflow-hidden">
            <Image
              src="/placeholder.svg?height=400&width=800&text=Fungal+Ancestry"
              alt="Fungal Ancestry"
              fill
              className="object-cover"
            />
          </div>
          <p>
            Use the tools to analyze DNA sequences, lookup species by ITS code, and visualize phylogenetic trees.
            Explore our comprehensive database of fungal species and their characteristics.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
