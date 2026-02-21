import Link from "next/link"
import { Button } from "@/components/ui/button"
import { MyceliumSimulator } from "@/components/apps/mycelium-simulator"
import { MyceliumsegValidationPanel } from "@/components/scientific/myceliumseg-validation-panel"
import { ArrowLeft, Microscope } from "lucide-react"

export interface PetriDishSimContentProps {
  showBackLink?: boolean
  variant?: "app" | "natureos"
}

export function PetriDishSimContent({ showBackLink = true, variant = "app" }: PetriDishSimContentProps) {
  const wrapperClass =
    variant === "app" ? "container py-6 md:py-8 space-y-6" : "space-y-6"

  return (
    <div className={wrapperClass}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-green-500/20">
            <Microscope className="h-6 w-6 text-green-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Petri Dish Simulator</h1>
            <p className="text-muted-foreground">
              Virtual mycelium growth simulator with realistic mycelial behavior
            </p>
          </div>
        </div>
        {showBackLink ? (
          <Button asChild variant="outline" className="min-h-[44px] min-w-[44px]">
            <Link href="/apps">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Apps
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4 text-sm">
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

      <MyceliumSimulator />

      <MyceliumsegValidationPanel />

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
