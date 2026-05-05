"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GlassCard } from "@/components/ui/glowing-border"
import { ScrollArea } from "@/components/ui/scroll-area"

export default function MindexSpeciesProfilePage() {
  const params = useParams()
  const id = useMemo(() => (typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params?.id[0] : "") || "", [params])

  const [tab, setTab] = useState("overview")
  const [ancestry, setAncestry] = useState<unknown>(null)
  const [integrity, setIntegrity] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setErr(null)
    try {
      const [a, i] = await Promise.all([
        fetch(`/api/ancestry/${encodeURIComponent(id)}`, { cache: "no-store" }),
        fetch(`/api/mindex/integrity/entity/taxon/${encodeURIComponent(id)}`, { cache: "no-store" }),
      ])
      setAncestry(a.ok ? await a.json() : { error: `ancestry HTTP ${a.status}` })
      setIntegrity(i.ok ? await i.json() : { error: `integrity HTTP ${i.status}` })
    } catch (e) {
      setErr(e instanceof Error ? e.message : "load_failed")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const title =
    ancestry && typeof ancestry === "object" && ancestry !== null && "ancestry" in ancestry
      ? String((ancestry as { ancestry?: { scientific_name?: string } }).ancestry?.scientific_name || id)
      : id

  return (
    <div className="min-h-dvh bg-[#0A0A0F] text-white p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="outline" className="min-h-[44px] border-purple-500/40">
            <Link href="/natureos/mindex">
              <ArrowLeft className="h-4 w-4 mr-2" />
              MINDEX
            </Link>
          </Button>
          <h1 className="text-xl sm:text-2xl font-semibold">{title}</h1>
        </div>

        {err ? <p className="text-sm text-amber-300">{err}</p> : null}

        {loading ? (
          <div className="flex items-center gap-2 text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading live ancestry + integrity…
          </div>
        ) : null}

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <ScrollArea className="w-full whitespace-nowrap pb-2">
            <TabsList className="inline-flex h-auto min-h-[48px] flex-wrap gap-1 bg-white/5 p-1">
              {[
                "overview",
                "taxonomy",
                "genetics",
                "chemistry",
                "locations",
                "media",
                "research",
                "relationships",
                "provenance",
              ].map((t) => (
                <TabsTrigger
                  key={t}
                  value={t}
                  className="min-h-[44px] px-3 text-base capitalize data-[state=active]:bg-purple-600 sm:text-sm"
                >
                  {t}
                </TabsTrigger>
              ))}
            </TabsList>
          </ScrollArea>

          <TabsContent value="overview" className="mt-4">
            <GlassCard color="purple">
              <p className="text-sm text-gray-400 mb-2">Live `/api/ancestry/{id}` + `/api/mindex/integrity/entity/taxon/{id}`.</p>
              <pre className="text-xs font-mono overflow-auto max-h-[50vh] text-gray-300">
                {JSON.stringify({ ancestry, integrity }, null, 2)}
              </pre>
            </GlassCard>
          </TabsContent>

          {["taxonomy", "genetics", "chemistry", "locations", "media", "research", "relationships"].map((t) => (
            <TabsContent key={t} value={t} className="mt-4">
              <GlassCard color="cyan">
                <p className="text-sm text-gray-300">
                  This tab will bind to dedicated MINDEX routes when available (no mock rows). Shared ancestry payload is
                  shown in Overview.
                </p>
              </GlassCard>
            </TabsContent>
          ))}

          <TabsContent value="provenance" className="mt-4">
            <GlassCard color="orange">
              <p className="text-sm text-gray-300 mb-2">Anchors + current taxon content hash from MINDEX integrity API.</p>
              <pre className="text-xs font-mono overflow-auto max-h-[40vh] text-gray-300">{JSON.stringify(integrity, null, 2)}</pre>
            </GlassCard>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
