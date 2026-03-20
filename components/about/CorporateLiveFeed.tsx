"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { NeuCard, NeuCardContent, NeuBadge } from "@/components/ui/neuromorphic"
import { FileText, Activity } from "lucide-react"

interface DocumentResult {
  name?: string
  path?: string
  score?: number
  snippet?: string
  url_github?: string
  metadata?: {
    modified?: string
    category?: string
  }
}

interface FeedSource {
  id: string
  label: string
  role: string
  query: string
}

const FEED_SOURCES: FeedSource[] = [
  {
    id: "claude",
    label: "Claude CoWorker + Code",
    role: "Secretary + COO",
    query: "operations report policy",
  },
  {
    id: "chatgpt",
    label: "ChatGPT Projects + Codex",
    role: "Directors, planners, auditors",
    query: "director report audit",
  },
  {
    id: "grok",
    label: "Grok Heavy",
    role: "State of affairs + insights",
    query: "state of affairs insights",
  },
  {
    id: "google",
    label: "Gemini + Workspace + NotebookLM",
    role: "Back office + QA",
    query: "back office qa scientific",
  },
  {
    id: "meta",
    label: "Meta AI Llama",
    role: "Knowledge synthesis",
    query: "synthesis report",
  },
  {
    id: "myca",
    label: "MYCA",
    role: "Coordination + governance",
    query: "governance roadmap",
  },
]

function formatDate(value?: string) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString()
}

export function CorporateLiveFeed() {
  const [data, setData] = useState<Record<string, DocumentResult[]>>({})
  const [loading, setLoading] = useState(true)

  const sources = useMemo(() => FEED_SOURCES, [])

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      try {
        const entries = await Promise.all(
          sources.map(async (source) => {
            const res = await fetch(
              `/api/mas/documents/search?q=${encodeURIComponent(source.query)}&limit=4&min_score=0.4`,
              { cache: "no-store" }
            )
            if (!res.ok) return [source.id, []] as const
            const json = await res.json()
            return [source.id, (json?.results ?? []) as DocumentResult[]] as const
          })
        )
        if (active) {
          const next: Record<string, DocumentResult[]> = {}
          for (const [id, results] of entries) next[id] = [...results]
          setData(next)
        }
      } catch {
        if (active) setData({})
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
  }, [sources])

  return (
    <section className="py-10 md:py-14">
      <div className="text-center mb-8">
        <NeuBadge variant="default" className="mb-3 border border-white/20">
          Live Intelligence Feed
        </NeuBadge>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">
          Corporate Updates in Real Time
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto mt-2">
          Live documents, reports, and insights sourced from autonomous corporate agents.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {sources.map((source) => {
          const results = data[source.id] ?? []
          return (
            <NeuCard key={source.id} className="overflow-hidden">
              <NeuCardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-bold">{source.label}</h3>
                    <p className="text-xs text-muted-foreground">{source.role}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Activity className="h-4 w-4" />
                    {loading ? "Loading" : "Live"}
                  </div>
                </div>

                {results.length === 0 ? (
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
                    No data available.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {results.map((doc, idx) => {
                      const title = doc.name || doc.path || "Untitled document"
                      const date = formatDate(doc.metadata?.modified)
                      const href = doc.url_github || undefined
                      return (
                        <div
                          key={`${source.id}-${idx}`}
                          className="rounded-lg border border-border/60 bg-background/50 p-3"
                        >
                          <div className="flex items-start gap-2">
                            <FileText className="h-4 w-4 text-green-400 mt-0.5" />
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate">{title}</div>
                              <div className="text-xs text-muted-foreground">
                                {date ? `Updated ${date}` : "Updated recently"}
                              </div>
                            </div>
                          </div>
                          {href ? (
                            <Link
                              href={href}
                              target="_blank"
                              className="mt-2 inline-flex w-full items-center justify-center rounded-md border border-green-500/30 px-3 min-h-[44px] text-sm text-green-400 hover:text-green-300 hover:bg-green-500/10 underline underline-offset-4 transition-colors touch-manipulation sm:w-auto"
                            >
                              View source
                            </Link>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                )}
              </NeuCardContent>
            </NeuCard>
          )
        })}
      </div>
    </section>
  )
}
