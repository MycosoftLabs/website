import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Petri Dish Simulator - Mycosoft",
  description: "Virtual mycelium growth simulator with environmental controls",
}

export default function PetriDishSimPage() {
  return (
    <div className="container py-6 md:py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Petri Dish Simulator</h1>
          <p className="text-muted-foreground">
            Virtual mycelium growth simulator with realistic mycelial behavior
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/apps">Back to Apps</Link>
        </Button>
      </div>

      {/* Embed the actual simulator from GitHub */}
      <div className="w-full">
        <iframe
          src="https://raw.githubusercontent.com/MycosoftLabs/myceliumsim/main/myceliumsim.html"
          className="w-full h-[90vh] border-0 rounded-lg"
          title="Mycelium Simulator"
          sandbox="allow-scripts allow-same-origin allow-downloads"
        />
      </div>

      <div className="text-sm text-muted-foreground text-center">
        <p>
          Source:{" "}
          <a 
            href="https://github.com/MycosoftLabs/myceliumsim" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            github.com/MycosoftLabs/myceliumsim
          </a>
        </p>
      </div>
    </div>
  )
}


