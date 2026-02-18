"use client"

/**
 * /ancestry/taxonomy/[rank]/[name]
 *
 * Internal Mycosoft taxonomy detail page.
 * Shows full info for any fungal taxonomic rank: Kingdom → Phylum → Class →
 * Order → Family → Genus, plus lists all children one level below.
 *
 * Data from MINDEX (cached) and iNaturalist via our own API — never links
 * the user out to iNaturalist as a primary destination.
 */

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import {
  ArrowLeft, ChevronRight, Loader2, ExternalLink, BookOpen,
  TreeDeciduous, Globe, Eye, FlaskConical, Dna, Search,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

const RANK_ORDER = ["kingdom", "phylum", "class", "order", "family", "genus", "species"] as const
const RANK_LABEL: Record<string, string> = {
  kingdom: "Kingdom", phylum: "Phylum", class: "Class",
  order: "Order", family: "Family", genus: "Genus", species: "Species",
}
const RANK_COLOR: Record<string, string> = {
  kingdom: "text-violet-400 border-violet-500/30 bg-violet-500/10",
  phylum:  "text-blue-400   border-blue-500/30   bg-blue-500/10",
  class:   "text-cyan-400   border-cyan-500/30   bg-cyan-500/10",
  order:   "text-teal-400   border-teal-500/30   bg-teal-500/10",
  family:  "text-green-400  border-green-500/30  bg-green-500/10",
  genus:   "text-lime-400   border-lime-500/30   bg-lime-500/10",
  species: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
}

interface Ancestor { id: number; name: string; rank: string; commonName: string | null; href: string }
interface Child {
  id: number; name: string; commonName: string | null; rank: string
  observationCount: number; imageUrl: string | null; taxonPageUrl: string
}
interface TaxonData {
  id: number
  name: string
  rank: string
  commonName: string | null
  description: string | null
  wikipediaUrl: string | null
  imageUrl: string | null
  observationCount: number
  extinct: boolean
  conservation_status: string | null
  ancestors: Ancestor[]
  children: Child[]
  childRank: string | null
}

export default function TaxonomyRankPage() {
  const params  = useParams()
  const rank    = (params.rank as string).toLowerCase()
  const name    = decodeURIComponent(params.name as string)

  const [data,    setData]    = useState<TaxonData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [search,  setSearch]  = useState("")

  useEffect(() => {
    if (!rank || !name) return
    setLoading(true)
    setError(null)

    fetch(`/api/ancestry/taxonomy/${rank}/${encodeURIComponent(name)}`)
      .then(r => r.ok ? r.json() : r.json().then((e: any) => Promise.reject(e.error || "Not found")))
      .then(setData)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [rank, name])

  const rankColor  = RANK_COLOR[rank] || "text-teal-400 border-teal-500/30 bg-teal-500/10"
  const rankLabel  = RANK_LABEL[rank] || rank
  const childLabel = data?.childRank ? RANK_LABEL[data.childRank] || data.childRank : null

  const filtered = (data?.children || []).filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.commonName?.toLowerCase() || "").includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-[#080c14] text-white">
      {/* ── Top nav ────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 border-b border-white/8 bg-[#080c14]/95 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/ancestry">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-white h-8">
              <ArrowLeft className="h-3.5 w-3.5" /> Ancestry
            </Button>
          </Link>

          {/* Breadcrumb */}
          {data?.ancestors && data.ancestors.length > 0 && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground overflow-x-auto scrollbar-hide">
              {data.ancestors.map((a, i) => (
                <span key={a.id} className="flex items-center gap-1 shrink-0">
                  {i > 0 && <ChevronRight className="h-2.5 w-2.5 text-muted-foreground/30" />}
                  <Link
                    href={a.href}
                    className="hover:text-white transition-colors hover:underline underline-offset-2"
                  >
                    {a.name}
                  </Link>
                </span>
              ))}
              <ChevronRight className="h-2.5 w-2.5 text-muted-foreground/30 shrink-0" />
              <span className="text-white font-medium shrink-0">{name}</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

        {/* ── Loading ──────────────────────────────────────────────────────── */}
        {loading && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-32 w-32 rounded-2xl shrink-0" />
              <div className="space-y-3 flex-1">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-96" />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
            </div>
          </div>
        )}

        {/* ── Error ────────────────────────────────────────────────────────── */}
        {!loading && error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center space-y-2">
            <p className="text-red-400 font-medium">Could not load taxonomy data</p>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="mt-2">
              Retry
            </Button>
          </div>
        )}

        {/* ── Main content ─────────────────────────────────────────────────── */}
        {!loading && data && (
          <>
            {/* Hero */}
            <div className="flex flex-col sm:flex-row items-start gap-6">
              {/* Image */}
              <div className="relative w-36 h-36 rounded-2xl overflow-hidden border border-white/10 shrink-0 bg-muted/20">
                {data.imageUrl ? (
                  <Image src={data.imageUrl} alt={data.name} fill className="object-cover" sizes="144px" unoptimized />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-5xl">🍄</div>
                )}
              </div>

              {/* Title + meta */}
              <div className="flex-1 min-w-0 space-y-3">
                <div className="flex items-start gap-3 flex-wrap">
                  <Badge className={cn("text-[10px] uppercase tracking-wider border", rankColor)}>
                    {rankLabel}
                  </Badge>
                  {data.extinct && (
                    <Badge className="text-[10px] bg-red-500/10 text-red-400 border-red-500/30">Extinct</Badge>
                  )}
                  {data.conservation_status && (
                    <Badge className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/30 capitalize">
                      {data.conservation_status}
                    </Badge>
                  )}
                </div>

                <div>
                  <h1 className="text-3xl font-bold italic tracking-tight">{data.name}</h1>
                  {data.commonName && (
                    <p className="text-lg text-muted-foreground mt-0.5">{data.commonName}</p>
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {data.observationCount > 0 && (
                    <span className="flex items-center gap-1.5">
                      <Eye className="h-3.5 w-3.5" />
                      {data.observationCount.toLocaleString()} observations
                    </span>
                  )}
                  {data.childRank && (
                    <span className="flex items-center gap-1.5">
                      <TreeDeciduous className="h-3.5 w-3.5" />
                      {data.children.length} {childLabel}s listed
                    </span>
                  )}
                </div>

                {/* Action buttons — all internal */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Link href={`/search?q=${encodeURIComponent(data.name)}`}>
                    <Button size="sm" className="gap-1.5 h-8 text-xs bg-emerald-600 hover:bg-emerald-500">
                      <Search className="h-3 w-3" /> Search in MINDEX
                    </Button>
                  </Link>
                  <Link href={`/search?q=${encodeURIComponent(data.name)}&widget=chemistry`}>
                    <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs border-purple-500/30 text-purple-400 hover:bg-purple-500/10">
                      <FlaskConical className="h-3 w-3" /> Compounds
                    </Button>
                  </Link>
                  <Link href={`/search?q=${encodeURIComponent(data.name)}&widget=genetics`}>
                    <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs border-blue-500/30 text-blue-400 hover:bg-blue-500/10">
                      <Dna className="h-3 w-3" /> Genetics
                    </Button>
                  </Link>
                  {data.wikipediaUrl && (
                    <a href={data.wikipediaUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-xs text-muted-foreground hover:text-white">
                        <ExternalLink className="h-3 w-3" /> Wikipedia
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Full taxonomy tree */}
            {data.ancestors.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <TreeDeciduous className="h-4 w-4 text-muted-foreground/60" />
                  <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                    Taxonomic Classification
                  </h2>
                </div>
                <div className="rounded-xl border border-white/8 bg-white/3 px-5 py-4">
                  <div className="space-y-1.5">
                    {data.ancestors.map((a, i) => (
                      <div
                        key={a.id}
                        className="flex items-center gap-3 text-sm"
                        style={{ paddingLeft: `${i * 16}px` }}
                      >
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
                        <span className={cn(
                          "text-[9px] uppercase tracking-wider w-16 shrink-0",
                          RANK_COLOR[a.rank]?.split(" ")[0] || "text-muted-foreground/60"
                        )}>
                          {RANK_LABEL[a.rank] || a.rank}
                        </span>
                        <Link
                          href={a.href}
                          className="font-medium hover:text-emerald-400 hover:underline underline-offset-2 transition-colors"
                        >
                          {a.name}
                        </Link>
                        {a.commonName && (
                          <span className="text-xs text-muted-foreground/60">({a.commonName})</span>
                        )}
                      </div>
                    ))}
                    {/* Current level highlighted */}
                    <div
                      className="flex items-center gap-3 text-sm"
                      style={{ paddingLeft: `${data.ancestors.length * 16}px` }}
                    >
                      <ChevronRight className="h-3.5 w-3.5 text-emerald-400/60 shrink-0" />
                      <span className={cn(
                        "text-[9px] uppercase tracking-wider w-16 shrink-0",
                        rankColor.split(" ")[0]
                      )}>
                        {rankLabel}
                      </span>
                      <span className="font-bold italic text-emerald-400">{data.name}</span>
                      {data.commonName && (
                        <span className="text-xs text-muted-foreground/60">({data.commonName})</span>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Description */}
            {data.description && (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground/60" />
                  <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Description</h2>
                </div>
                <p className="text-sm text-foreground/85 leading-relaxed">{data.description}</p>
              </section>
            )}

            {/* Children grid */}
            {data.childRank && data.children.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground/60" />
                    <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                      {childLabel}s in {data.name}
                    </h2>
                    <Badge className="text-[9px] bg-white/5 border-white/10 text-muted-foreground">
                      {data.children.length}
                    </Badge>
                  </div>
                  {data.children.length > 8 && (
                    <input
                      type="text"
                      placeholder={`Search ${childLabel?.toLowerCase()}s…`}
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="h-7 px-3 text-xs rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-muted-foreground/50 focus:outline-none focus:border-emerald-500/40 w-48"
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {filtered.map(child => (
                    <Link key={child.id} href={child.taxonPageUrl} className="group">
                      <div className="rounded-xl border border-white/8 bg-white/3 hover:bg-white/6 hover:border-emerald-500/25 transition-all overflow-hidden">
                        {/* Image */}
                        <div className="relative h-28 bg-muted/20">
                          {child.imageUrl ? (
                            <Image
                              src={child.imageUrl}
                              alt={child.name}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                              sizes="200px"
                              unoptimized
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-3xl">🍄</div>
                          )}
                        </div>
                        {/* Info */}
                        <div className="p-2.5 space-y-0.5">
                          <p className="text-xs font-semibold italic leading-snug truncate group-hover:text-emerald-400 transition-colors">
                            {child.name}
                          </p>
                          {child.commonName && (
                            <p className="text-[10px] text-muted-foreground leading-snug truncate">
                              {child.commonName}
                            </p>
                          )}
                          {child.observationCount > 0 && (
                            <p className="text-[9px] text-muted-foreground/60 tabular-nums">
                              {child.observationCount.toLocaleString()} obs
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {filtered.length === 0 && search && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No {childLabel?.toLowerCase()}s matching "{search}"
                  </p>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
