"use client"

import { MetricsDashboard } from "@/components/ethics-training/MetricsDashboard"

export default function AnalyticsPage() {
  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-2">Analytics</h1>
      <p className="text-gray-400 text-sm mb-6">
        Grade comparisons across vessel stages, scenario types, and learning methods.
      </p>
      <MetricsDashboard />
    </div>
  )
}
