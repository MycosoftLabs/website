import { Suspense } from "react"
import { getAllSpecies } from "@/lib/services/ancestry-service"
import { SeedTrigger } from "@/components/ancestry/seed-trigger"

export default async function ExplorerPage() {
  const species = await getAllSpecies()

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Species Explorer</h1>

      <SeedTrigger />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <Suspense fallback={<div>Loading species...</div>}>
          {species.map((item) => (
            <div key={item.id} className="bg-card border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
              <div className="h-48 overflow-hidden">
                <img
                  src={item.image_url || "/placeholder.svg?height=200&width=200"}
                  alt={item.common_name || item.scientific_name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder.svg?height=200&width=200"
                  }}
                />
              </div>
              <div className="p-4">
                <h3 className="font-medium text-lg">{item.scientific_name}</h3>
                {item.common_name && <p className="text-sm text-muted-foreground">{item.common_name}</p>}
                <p className="text-xs mt-2">Family: {item.family}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {item.characteristics?.map((char, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 bg-muted rounded-full">
                      {char}
                    </span>
                  ))}
                </div>
                <a
                  href={`/ancestry/species/${item.id}`}
                  className="text-sm text-green-600 hover:underline mt-2 inline-block"
                >
                  View Details →
                </a>
              </div>
            </div>
          ))}
        </Suspense>
      </div>
    </div>
  )
}
