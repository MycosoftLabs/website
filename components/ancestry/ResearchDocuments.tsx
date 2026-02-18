"use client"

/**
 * Research Documents Section
 * Fetches from PubMed (NCBI) - real data only.
 * "No research available - Help contribute" when none found.
 */

import { useState, useEffect } from "react"
import { ExternalLink, FileText, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface ResearchPaper {
  title: string
  authors?: string
  year?: string
  journal?: string
  pmid?: string
  doi?: string
  abstract?: string
  url: string
}

interface ResearchDocumentsProps {
  speciesName: string
  limit?: number
  className?: string
}

export function ResearchDocuments({
  speciesName,
  limit = 15,
  className,
}: ResearchDocumentsProps) {
  const [papers, setPapers] = useState<ResearchPaper[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!speciesName?.trim()) {
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    const query = encodeURIComponent(speciesName)
    const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${query}&retmax=${limit}&retmode=json`

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        const idList = data.esearchresult?.idlist || []
        if (idList.length === 0) {
          setPapers([])
          setLoading(false)
          return
        }
        const ids = idList.join(",")
        return fetch(
          `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids}&retmode=json`
        ).then((r) => r.json())
      })
      .then((summaryData) => {
        if (cancelled || !summaryData) return
        const result = summaryData.result || {}
        const list: ResearchPaper[] = []
        for (const id of Object.keys(result)) {
          if (id === "uids") continue
          const art = result[id]
          if (!art || !art.title) continue
          list.push({
            title: art.title,
            authors: art.authors?.map((a: { name: string }) => a.name).join(", "),
            year: art.pubdate?.match(/\d{4}/)?.[0],
            journal: art.fulljournalname || art.source,
            pmid: art.uid,
            doi: art.elocationid?.startsWith("doi:") ? art.elocationid.slice(4) : undefined,
            abstract: art.snippet,
            url: `https://pubmed.ncbi.nlm.nih.gov/${art.uid}/`,
          })
        }
        setPapers(list)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message || "Failed to fetch research")
          setPapers([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [speciesName, limit])

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-4",
        className
      )}
    >
      <h3 className="font-semibold mb-4 flex items-center gap-2 text-foreground">
        <FileText className="h-4 w-4 text-purple-600" />
        Research Publications
      </h3>

      {loading && (
        <div className="flex items-center gap-2 py-8 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Searching PubMed...</span>
        </div>
      )}

      {error && !loading && (
        <div className="py-6 text-center text-muted-foreground text-sm">
          <p>Could not fetch research: {error}</p>
          <p className="mt-2 text-xs">Try again later or search PubMed directly.</p>
        </div>
      )}

      {!loading && !error && papers.length === 0 && (
        <div className="py-8 text-center text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No research available for this species.</p>
          <p className="text-sm mt-1">Help contribute — add publications to MINDEX or NCBI.</p>
        </div>
      )}

      {!loading && papers.length > 0 && (
        <div className="space-y-4">
          {papers.map((paper) => (
            <div
              key={paper.pmid || paper.title}
              className="p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
            >
              <a
                href={paper.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground hover:underline"
              >
                {paper.title}
              </a>
              {(paper.authors || paper.year) && (
                <p className="text-sm text-muted-foreground mt-1">
                  {paper.authors}
                  {paper.year && ` (${paper.year})`}
                </p>
              )}
              {paper.journal && (
                <p className="text-xs text-muted-foreground mt-0.5">{paper.journal}</p>
              )}
              <a
                href={paper.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary mt-2 hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                View on PubMed
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
