"use client"

/**
 * Live Translation Demo - client-only rendering to avoid hydration mismatch.
 * Uses Date.now() and Math.random() which differ between server and client.
 * Renders placeholder until mounted, then shows live simulated signal stream.
 * Created: Mar 02, 2026
 */

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Zap } from "lucide-react"

export function LiveTranslationDemo() {
  const [mounted, setMounted] = useState(false)
  const [lines, setLines] = useState<{ time: string; voc: string; e: string; ph: string }[]>([])

  useEffect(() => {
    setMounted(true)
    // Initial batch of simulated lines (static after first render to avoid constant re-hydration)
    const now = new Date()
    const baseTime = now.getTime()
    const initial = Array.from({ length: 6 }).map((_, i) => {
      const t = new Date(baseTime - (5 - i) * 1000)
      return {
        time: t.toISOString().split("T")[1].slice(0, 8),
        voc: (0.2 + Math.random() * 0.6).toFixed(4),
        e: (Math.random() * 100).toFixed(0),
        ph: (6 + Math.random()).toFixed(2),
      }
    })
    setLines(initial)

    // Optional: refresh lines periodically (every 2s) for "live" feel
    const id = setInterval(() => {
      setLines((prev) => {
        const next = [...prev.slice(1)]
        const t = new Date()
        next.push({
          time: t.toISOString().split("T")[1].slice(0, 8),
          voc: (0.2 + Math.random() * 0.6).toFixed(4),
          e: (Math.random() * 100).toFixed(0),
          ph: (6 + Math.random()).toFixed(2),
        })
        return next
      })
    }, 2000)
    return () => clearInterval(id)
  }, [])

  if (!mounted) {
    return (
      <section>
        <Card className="bg-green-500/5 border-green-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-green-600 dark:text-green-500" /> Live Translation Demo
            </CardTitle>
            <CardDescription>
              Real-time Mycospeak translation from simulated mycelial signals (as shown in NLM Training Dashboard)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h4 className="font-medium">Raw Signal Input</h4>
                <div className="bg-background p-4 rounded-lg font-mono text-xs h-40 overflow-hidden">
                  <div className="animate-pulse space-y-1">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <p key={i} className="text-green-600 dark:text-green-400 opacity-60">
                        [--:--:--] VOC: 0.0000 | E: 0mV | pH: 0.00
                      </p>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Structured Translation Output</h4>
                <div className="bg-background p-4 rounded-lg h-40 overflow-auto">
                  <pre className="text-xs text-green-700 dark:text-green-300">{`{
  "state": "nutrient_foraging_upshift",
  "confidence": 0.82,
  "evidence": ["token_17_burst", "soil_moisture_drop", "CO2_rise"],
  "predicted_next": ["growth_direction_change", "resource_allocation_shift"],
  "recommended_action": ["increase_sampling_rate"],
  "nmf_version": "0.2",
  "provenance": "fci_v2_lab_alpha"
}`}</pre>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    )
  }

  return (
    <section>
      <Card className="bg-green-500/5 border-green-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-green-600 dark:text-green-500" /> Live Translation Demo
          </CardTitle>
          <CardDescription>
            Real-time Mycospeak translation from simulated mycelial signals (as shown in NLM Training Dashboard)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h4 className="font-medium">Raw Signal Input</h4>
              <div className="bg-background p-4 rounded-lg font-mono text-xs h-40 overflow-hidden">
                <div className="animate-pulse space-y-1">
                  {lines.map((line, i) => (
                    <p key={`${line.time}-${i}`} className="text-green-600 dark:text-green-400">
                      [{line.time}] VOC: {line.voc} | E: {line.e}mV | pH: {line.ph}
                    </p>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Structured Translation Output</h4>
              <div className="bg-background p-4 rounded-lg h-40 overflow-auto">
                <pre className="text-xs text-green-700 dark:text-green-300">{`{
  "state": "nutrient_foraging_upshift",
  "confidence": 0.82,
  "evidence": ["token_17_burst", "soil_moisture_drop", "CO2_rise"],
  "predicted_next": ["growth_direction_change", "resource_allocation_shift"],
  "recommended_action": ["increase_sampling_rate"],
  "nmf_version": "0.2",
  "provenance": "fci_v2_lab_alpha"
}`}</pre>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
