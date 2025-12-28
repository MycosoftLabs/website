import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Petri Dish Simulator - Mycosoft",
  description: "Petri dish simulation (embed / scaffold)",
}

export default function PetriDishSimPage() {
  return (
    <div className="container py-6 md:py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Petri Dish Simulator</h1>
          <p className="text-muted-foreground">
            The Petri dish simulator is available as a standalone experience. This page embeds it.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/apps">Back to Apps</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Embedded simulator</CardTitle>
          <CardDescription>Source: `https://mycosoft.org/mycelium-sim`</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <iframe
            title="Petri Dish Simulator"
            src="https://mycosoft.org/mycelium-sim"
            className="w-full h-[70vh] border-0 rounded-b-lg"
            loading="lazy"
          />
        </CardContent>
      </Card>
    </div>
  )
}

