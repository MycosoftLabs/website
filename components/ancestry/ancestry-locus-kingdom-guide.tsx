"use client"

import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const ROWS: { kingdom: string; locus: string; note: string }[] = [
  { kingdom: "Fungi", locus: "ITS / LSU", note: "Barcode and phylogeny workhorses; cross-check with vouchered sequences." },
  { kingdom: "Plantae", locus: "rbcL, matK, trnH–psbA", note: "Common plant barcoding; herbarium vouchers recommended." },
  { kingdom: "Animalia", locus: "COI (metazoa)", note: "Widely used animal barcode; use tissue-appropriate primers per group." },
  { kingdom: "Bacteria", locus: "16S rRNA", note: "Taxonomy and community profiling; 16S databases align with MINDEX as ingested." },
  { kingdom: "Archaea", locus: "16S rRNA", note: "As for Bacteria; use archaeal 16S primers where available." },
  { kingdom: "Protista", locus: "18S / ITS region", note: "Group-dependent; align markers to your focal lineage." },
  { kingdom: "Viruses", locus: "Whole-genome or conserved regions", note: "Highly lineage-specific; use reference-backed protocols." },
]

const URL_TO_KINGDOM: Record<string, string> = {
  all: "Any",
  fungi: "Fungi",
  plantae: "Plantae",
  animalia: "Animalia",
  bacteria: "Bacteria",
  archaea: "Archaea",
  protista: "Protista",
  viruses: "Viruses",
}

/**
 * Read-only display: typical genetic loci by kingdom. ITS tools on this page remain fungi-oriented;
 * use this table to pick the analogue locus for other groups.
 */
export function AncestryLocusKingdomGuide() {
  const sp = useSearchParams()
  const k = (sp.get("kingdom") || "all").toLowerCase()
  const label = URL_TO_KINGDOM[k] ?? "Any"

  return (
    <Card className="mb-8 border-emerald-500/20">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle>Barcode &amp; locus by kingdom</CardTitle>
            <CardDescription>
              Add <code className="text-xs">?kingdom=Plantae</code> to this URL to highlight; current context:{" "}
              <Badge variant="secondary">{label}</Badge>
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-3">Kingdom</th>
                <th className="py-2 pr-3">Common loci</th>
                <th className="py-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => {
                const hi = r.kingdom === label
                return (
                  <tr key={r.kingdom} className={hi ? "bg-emerald-500/10" : ""}>
                    <td className="py-2 pr-3 font-medium align-top whitespace-nowrap">{r.kingdom}</td>
                    <td className="py-2 pr-3 align-top">{r.locus}</td>
                    <td className="py-2 text-muted-foreground align-top">{r.note}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Data in these tools must come from your sequences and MINDEX-backed references only — not invented samples.
        </p>
      </CardContent>
    </Card>
  )
}
