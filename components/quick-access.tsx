"use client"

import { Card } from "@/components/ui/card"
import { Globe, Radar, PipetteIcon as PetriDish, Users, Database, Shield } from "lucide-react"
import Link from "next/link"

const quickAccessItems = [
  {
    title: "Nature OS",
    icon: Globe,
    description: "Environmental intelligence platform",
    href: "/natureos",
  },
  {
    title: "Mushroom 1",
    icon: Radar,
    description: "Ground-based fungal intelligence station",
    href: "/devices/mushroom-1",
  },
  {
    title: "Petri Dish Simulator",
    icon: PetriDish,
    description: "Simulate fungal growth patterns",
    href: "/apps/petri-dish-sim",
  },
  {
    title: "About Us",
    icon: Users,
    description: "Our mission and team",
    href: "/about",
  },
  {
    title: "Ancestry Database",
    icon: Database,
    description: "Fungal genealogy and phylogenetics",
    href: "/ancestry",
  },
  {
    title: "Defense",
    icon: Shield,
    description: "Operational Environmental Intelligence",
    href: "/defense",
  },
]

export function QuickAccess() {
  return (
    <section className="py-8 md:py-12 px-4 md:px-0">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {quickAccessItems.map((item) => (
          <Link href={item.href} key={item.title}>
            <Card className="p-4 md:p-6 hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                  <item.icon className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  )
}
