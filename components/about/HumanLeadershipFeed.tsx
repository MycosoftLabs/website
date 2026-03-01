"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { NeuCard, NeuCardContent, NeuBadge } from "@/components/ui/neuromorphic"
import { FileText, Activity } from "lucide-react"

interface DocumentResult {
  name?: string
  path?: string
  url_github?: string
  metadata?: {
    modified?: string
  }
}

export function HumanLeadershipFeed() {
  const [docs, setDocs] = useState<DocumentResult[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch(
          "/api/mas/documents/search?q=leadership%20policy%20vision&limit=6&min_score=0.4",
          { cache: "no-store" }
        )
        if (active) {
          if (res.ok) {
            const json = await res.json()
            setDocs(json?.results ?? [])
          } else {
            setDocs([])
          }
        }
      } catch {
        if (active) setDocs([])
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    const interval = setInterval(load, 30000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [])

  return (
    <section className="py-10 md:py-14">
      <div className="text-center mb-8">
        <NeuBadge variant="default" className="mb-3 border border-white/20">
          Live Leadership Feed
        </NeuBadge>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">
          Human vs Digital Operations
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto mt-2">
          Live leadership policies, human oversight notes, and governance updates that guide the
          autonomous corporation.
        </p>
      </div>

      <NeuCard className="overflow-hidden">
        <NeuCardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-amber-400" />
              <h3 className="text-lg font-bold">Leadership Documents</h3>
            </div>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Activity className="h-4 w-4" />
              {loading ? "Loading" : "Live"}
            </span>
          </div>

          {docs.length === 0 ? (
            <div className="rounded-lg border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
              No data available.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {docs.map((doc, idx) => (
                <div key={`${doc.path ?? idx}`} className="rounded-lg border border-border/60 bg-background/50 p-3">
                  <div className="text-sm font-medium truncate">
                    {doc.name ?? doc.path ?? "Document"}
                  </div>
                  {doc.url_github ? (
                    <Link
                      href={doc.url_github}
                      target="_blank"
                      className="inline-flex items-center text-xs text-amber-300 hover:text-amber-200 underline underline-offset-4 mt-2 min-h-[44px] touch-manipulation"
                    >
                      View source
                    </Link>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </NeuCardContent>
      </NeuCard>
    </section>
  )
}
