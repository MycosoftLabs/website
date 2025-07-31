"use client"

import { Card } from "@/components/ui/card"
import { LineChart, ShoppingBag, Bot, Globe, FlaskRoundIcon as Flask, AppWindow } from "lucide-react"
import Link from "next/link"

const quickAccessItems = [
  {
    title: "Live Data",
    icon: LineChart,
    description: "View real-time sensor readings",
    href: "/natureos",
  },
  {
    title: "Mycology Apps",
    icon: AppWindow,
    description: "Open Petri Dish Simulator",
    href: "/apps",
  },
  {
    title: "Spore Tracker",
    icon: Globe,
    description: "Global map of fungal activity",
    href: "/apps/spore-tracker",
  },
  {
    title: "Science",
    icon: Flask,
    description: "Research & Publications",
    href: "/science",
  },
  {
    title: "Myca AI",
    icon: Bot,
    description: "AI-powered fungal assistant",
    href: "/myca-ai",
  },
  {
    title: "Buy Devices",
    icon: ShoppingBag,
    description: "Shop Mushroom 1, SporeBase",
    href: "/devices",
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
