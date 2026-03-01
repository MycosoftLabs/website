import type { Metadata } from "next"
import { SporeTrackerApp } from "@/components/apps/spore-tracker/spore-tracker-app"

export const metadata: Metadata = {
  title: "Spore Tracker - Mycosoft",
  description: "Global spore distribution tracking with real-time wind and weather data",
}

export default function SporeTrackerPage() {
  return <SporeTrackerApp />
}
