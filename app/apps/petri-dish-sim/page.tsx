import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { MyceliumSimulator } from "@/components/apps/mycelium-simulator"
import { MyceliumsegValidationPanel } from "@/components/scientific/myceliumseg-validation-panel"
import { ArrowLeft, Microscope } from "lucide-react"

export const metadata: Metadata = {
  title: "Petri Dish Simulator - Mycosoft",
  description: "Virtual mycelium growth simulator with environmental controls, multiple species, and realistic mycelial behavior",
}

export default function PetriDishSimPage() {
  return (
    <div className="container py-6 md:py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-green-500/20">
            <Microscope className="h-6 w-6 text-green-500" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Petri Dish Simulator</h1>
            <p className="text-muted-foreground">
              Virtual mycelium growth simulator with realistic mycelial behavior
            </p>
          </div>
        </div>
        <Button asChild variant="outline">
          <Link href="/apps">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Apps
          </Link>
        </Button>
      </div>

      {/* Instructions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
        <div className="p-3 rounded-lg bg-muted/50 border">
          <h3 className="font-medium mb-1">🧫 Spore Swab</h3>
          <p className="text-muted-foreground text-xs">Click to place a single mycelium sample on the agar</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50 border">
          <h3 className="font-medium mb-1">🔪 Scalpel</h3>
          <p className="text-muted-foreground text-xs">Places a tissue sample with multiple growth points</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50 border">
          <h3 className="font-medium mb-1">☣️ Contamination</h3>
          <p className="text-muted-foreground text-xs">Introduce mold, bacteria, or other contaminants</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50 border">
          <h3 className="font-medium mb-1">🌡️ Environment</h3>
          <p className="text-muted-foreground text-xs">Adjust pH, temperature, and humidity to optimize growth</p>
        </div>
      </div>

      {/* Simulator Component */}
      <MyceliumSimulator />

      {/* MyceliumSeg scientific validation: one-click run, real metrics from MINDEX */}
      <MyceliumsegValidationPanel />

      {/* Info */}
      <div className="text-sm text-muted-foreground text-center space-y-2">
        <p>
          This simulator models realistic mycelial growth patterns including branching, nutrient consumption, 
          environmental responses, and species-specific behaviors.
        </p>
        <p>
          Different species have different optimal conditions for pH, temperature, and humidity. 
          Try different agar types to see how they affect growth rates!
        </p>
      </div>
    </div>
  )
}
