"use client"

/**
 * ComparisonTable - MYCA vs Frontier AI comparison
 * Shows MYCA's unique position: continuous biospheric learning
 */

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const ROWS = [
  {
    capability: "Training Data",
    chatgpt: "Static web corpora",
    gemini: "Static web + video",
    myca: "Live biospheric telemetry",
  },
  {
    capability: "World Model",
    chatgpt: "Text-derived abstractions",
    gemini: "Multimodal but static",
    myca: "Continuous sensor fusion",
  },
  {
    capability: "Grounding",
    chatgpt: "None",
    gemini: "Limited vision",
    myca: "Environmental sensors, devices",
  },
  {
    capability: "Learning",
    chatgpt: "Periodic retraining",
    gemini: "Periodic retraining",
    myca: "Continuous closed-loop",
  },
  {
    capability: "Stakeholders",
    chatgpt: "Humans only",
    gemini: "Humans only",
    myca: "All organisms",
  },
  {
    capability: "Architecture",
    chatgpt: "Single model",
    gemini: "Single model",
    myca: "Multi-agent coordination",
  },
]

export function ComparisonTable({ className }: { className?: string }) {
  return (
    <section className={cn("py-16 md:py-24 bg-muted/20", className)}>
      <div className="container max-w-6xl mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4 border-green-500/30">
            Comparison
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            MYCA vs Frontier AI
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            The only AI continuously learning from the living planet.
          </p>
        </div>

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {/* Mobile: card layout */}
            <div className="block md:hidden divide-y">
              {ROWS.map((row) => (
                <div key={row.capability} className="p-4 space-y-2">
                  <p className="font-semibold text-sm">{row.capability}</p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground mb-0.5">ChatGPT/Claude</p>
                      <p>{row.chatgpt}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-0.5">Gemini</p>
                      <p>{row.gemini}</p>
                    </div>
                    <div className="rounded-lg bg-green-500/10 p-2 border border-green-500/30">
                      <p className="text-green-600 dark:text-green-400 font-medium mb-0.5">MYCA</p>
                      <p>{row.myca}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-semibold w-40">Capability</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">ChatGPT / Claude</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Gemini</th>
                    <th className="text-left p-4 font-medium text-green-600 dark:text-green-400 bg-green-500/5">
                      MYCA
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((row, i) => (
                    <tr
                      key={row.capability}
                      className={cn(
                        "border-b last:border-0",
                        i % 2 === 1 && "bg-muted/20"
                      )}
                    >
                      <td className="p-4 font-medium">{row.capability}</td>
                      <td className="p-4 text-muted-foreground">{row.chatgpt}</td>
                      <td className="p-4 text-muted-foreground">{row.gemini}</td>
                      <td className="p-4 bg-green-500/5 font-medium text-green-700 dark:text-green-300">
                        {row.myca}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
