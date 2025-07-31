"use client"

import { CardFooter } from "@/components/ui/card"

import Link from "next/link"
import Image from "next/image"
import { Cloud, Code, Database, FileText, Gauge, Globe, PipetteIcon, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardShell } from "@/components/dashboard/shell"
import LiveDataComponent from "@/components/natureos/LiveDataComponent"

const appWidgets = [
  {
    title: "Petri Dish Simulator",
    description: "Simulate and analyze fungal growth patterns",
    icon: PipetteIcon,
    href: "/natureos/apps/petri-dish-sim",
    image: "/bacterial-growth-simulation.png",
  },
  {
    title: "Spore Tracker",
    description: "Track global spore distribution patterns",
    icon: Globe,
    href: "/natureos/apps/spore-tracker",
    image: "/fungal-spore-dispersion.png",
  },
  {
    title: "Fungal Database",
    description: "Explore fungal genealogy and relationships",
    icon: Database,
    href: "/natureos/apps/fungal-database",
    image: "/fungal-data-network.png",
  },
  {
    title: "Ancestry Database",
    description: "Explore fungal genealogy and relationships",
    icon: Database,
    href: "/natureos/apps/ancestry",
    image: "/interconnected-ancestors.png",
  },
]

const resourceLinks = [
  { title: "Documentation", href: "/natureos/documentation", icon: FileText },
  { title: "API Console", href: "/natureos/api-console", icon: Code },
  { title: "Cloud Storage", href: "/natureos/cloud-storage", icon: Cloud },
  { title: "Performance", href: "/natureos/performance", icon: Gauge },
  { title: "Settings", href: "/natureos/settings", icon: Settings },
]

export default function NatureOSPage() {
  return (
    <DashboardShell>
      <div className="space-y-8">
        {/* Welcome Section */}
        <section className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">Welcome to NatureOS</h1>
          <p className="text-lg text-muted-foreground mt-2">
            Your central hub for fungal intelligence, data analysis, and device management.
          </p>
          <p className="text-muted-foreground mt-4">
            NatureOS provides a suite of tools and applications to explore the fascinating world of mycology, from
            tracking spore distribution to analyzing fungal genomes.
          </p>
        </section>

        {/* App Widgets */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Explore Our Apps</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {appWidgets.map((app) => (
              <Link key={app.title} href={app.href}>
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
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
                    <div className="relative aspect-video rounded-md overflow-hidden">
                      <Image src={app.image || "/placeholder.svg"} alt={app.title} fill className="object-cover" />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full" variant="outline">
                      Launch App
                    </Button>
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* Resources and Links */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {resourceLinks.map((resource) => (
              <Link key={resource.title} href={resource.href}>
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className="rounded-lg bg-primary/10 p-2">
                        <resource.icon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{resource.title}</CardTitle>
                        <CardDescription>Explore fungal genealogy and relationships</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* Live Data */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Live Data</h2>
          <LiveDataComponent />
        </section>
      </div>
    </DashboardShell>
  )
}
