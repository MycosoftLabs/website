"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PipetteIcon as PetriDish, Microscope, FlaskRoundIcon as Flask, Globe, Database, LineChart } from "lucide-react"

const apps = [
  {
    title: "Petri Dish Simulator",
    description: "Simulate and analyze fungal growth patterns",
    icon: PetriDish,
    href: "/apps/petri-dish-sim",
  },
  {
    title: "Mushroom Simulator",
    description: "3D visualization of mushroom development",
    icon: Microscope,
    href: "/apps/mushroom-sim",
  },
  {
    title: "Compound Analyzer",
    description: "Analyze fungal compounds and interactions",
    icon: Flask,
    href: "/apps/compound-sim",
  },
  {
    title: "Spore Tracker",
    description: "Track global spore distribution patterns",
    icon: Globe,
    href: "/apps/spore-tracker",
  },
  {
    title: "Ancestry Database",
    description: "Explore fungal genealogy and relationships",
    icon: Database,
    href: "/ancestry",
  },
  {
    title: "Growth Analytics",
    description: "Advanced metrics for fungal development",
    icon: LineChart,
    href: "/apps/growth-analytics",
  },
]

export function AppDirectory() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {apps.map((app) => (
        <Card key={app.title} className="hover:bg-muted/50 transition-colors">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-primary/10 p-2">
                <app.icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">{app.title}</CardTitle>
                <CardDescription>{app.description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline" asChild>
              <a href={app.href}>Launch App</a>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
