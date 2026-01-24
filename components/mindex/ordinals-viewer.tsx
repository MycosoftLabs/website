"use client"

import { useMemo, useState } from "react"
import { Bitcoin, Copy, FileJson, Loader2, Sparkles, Zap } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  createInscriptionPayload,
  estimateInscriptionCost,
  prepareOrdinalEnvelope,
  type DNAInscription,
  type MINDEXInscription,
  type ObservationInscription,
  type TaxaInscription,
} from "@/lib/mindex/ordinals/inscription"

type Template = "dna" | "taxa" | "observation" | "json"

function copyToClipboard(text: string) {
  if (!text) return
  void navigator.clipboard?.writeText(text)
}

export function OrdinalsViewer({ className }: { className?: string }) {
  const [template, setTemplate] = useState<Template>("dna")
  const [isBuilding, setIsBuilding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [dnaSpeciesId, setDnaSpeciesId] = useState("mindex:pleurotus-ostreatus")
  const [dnaCanonicalName, setDnaCanonicalName] = useState("Pleurotus ostreatus")
  const [dnaSeqType, setDnaSeqType] = useState<"its" | "lsu" | "ssu" | "genome" | "barcode" | "mtdna">("its")
  const [dnaPayload, setDnaPayload] = useState(">ITS\nATGCGTACGTACGTAGCTAGCTAGCTAGCTAGC")

  const [taxonId, setTaxonId] = useState("mindex:pleurotus-ostreatus")
  const [taxonRank, setTaxonRank] = useState<"kingdom" | "phylum" | "class" | "order" | "family" | "genus" | "species" | "subspecies">(
    "species",
  )
  const [taxonName, setTaxonName] = useState("Pleurotus ostreatus")
  const [taxonPayload, setTaxonPayload] = useState(JSON.stringify({ description: "Oyster mushroom", edibility: "edible" }, null, 2))

  const [obsId, setObsId] = useState("obs_demo_0001")
  const [obsTaxonId, setObsTaxonId] = useState("mindex:pleurotus-ostreatus")
  const [obsLat, setObsLat] = useState("47.6101")
  const [obsLng, setObsLng] = useState("-122.2015")
  const [obsPayload, setObsPayload] = useState(JSON.stringify({ notes: "Found on decaying log", substrate: "hardwood" }, null, 2))

  const [jsonContentType, setJsonContentType] = useState("application/json")
  const [jsonPayload, setJsonPayload] = useState(JSON.stringify({ hello: "mindex", kind: "inscription" }, null, 2))

  const [inscription, setInscription] = useState<MINDEXInscription | null>(null)

  const cost = useMemo(() => (inscription ? estimateInscriptionCost(inscription) : null), [inscription])
  const envelope = useMemo(() => (inscription ? prepareOrdinalEnvelope(inscription) : null), [inscription])

  async function build() {
    setError(null)
    setInscription(null)
    setIsBuilding(true)

    try {
      if (template === "dna") {
        const ins = await createInscriptionPayload<DNAInscription>(
          {
            content_type: "application/dna",
            protocol: "mindex-v2",
            version: "2.0.0",
            metadata: {
              species_id: dnaSpeciesId,
              canonical_name: dnaCanonicalName,
              sequence_type: dnaSeqType,
              sequence_length: dnaPayload.replace(/[^A-Za-z]/g, "").length,
              source: "demo",
            },
          },
          dnaPayload,
        )
        setInscription(ins)
      }

      if (template === "taxa") {
        const payloadObj = JSON.parse(taxonPayload)
        const ins = await createInscriptionPayload<TaxaInscription>(
          {
            content_type: "application/mindex",
            protocol: "mindex-v2",
            version: "2.0.0",
            metadata: {
              taxon_id: taxonId,
              rank: taxonRank,
              canonical_name: taxonName,
              observation_count: 0,
              compounds_known: 0,
            },
          },
          payloadObj,
        )
        setInscription(ins)
      }

      if (template === "observation") {
        const payloadObj = JSON.parse(obsPayload)
        const ins = await createInscriptionPayload<ObservationInscription>(
          {
            content_type: "application/mindex",
            protocol: "mindex-v2",
            version: "2.0.0",
            metadata: {
              observation_id: obsId,
              taxon_id: obsTaxonId,
              location: { type: "Point", coordinates: [Number(obsLng), Number(obsLat)] },
              observed_at: new Date().toISOString(),
              observer_id: "demo",
            },
          },
          payloadObj,
        )
        setInscription(ins)
      }

      if (template === "json") {
        const payloadObj = JSON.parse(jsonPayload)
        const ins = await createInscriptionPayload<MINDEXInscription>(
          {
            content_type: jsonContentType as any,
            protocol: "mindex-v2",
            version: "2.0.0",
          },
          payloadObj,
        )
        setInscription(ins)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setIsBuilding(false)
    }
  }

  return (
    <Card className={cn("border-purple-500/20 bg-gradient-to-br from-purple-500/5 via-background to-blue-500/5", className)}>
      <CardHeader className="space-y-2">
        <CardTitle className="flex items-center gap-2">
          <Bitcoin className="h-5 w-5 text-purple-400" />
          Bitcoin Ordinals Workshop
        </CardTitle>
        <CardDescription>
          Create a MINDEX v2 inscription payload (hash + optional gzip) and estimate byte-cost before anchoring.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-[260px_1fr_auto]">
          <Select value={template} onValueChange={(v) => setTemplate(v as Template)}>
            <SelectTrigger>
              <SelectValue placeholder="Template" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dna">DNA (FASTA)</SelectItem>
              <SelectItem value="taxa">Taxa record</SelectItem>
              <SelectItem value="observation">Observation</SelectItem>
              <SelectItem value="json">Generic JSON</SelectItem>
            </SelectContent>
          </Select>

          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-300" />
            This is a local “payload builder” UI; actual inscription broadcasting is handled by your Ordinals anchor service.
          </div>

          <Button onClick={build} disabled={isBuilding}>
            {isBuilding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
            Build inscription
          </Button>
        </div>

        {error ? (
          <div className="text-xs text-red-200/80 border border-red-500/20 bg-red-500/10 rounded-md px-3 py-2">{error}</div>
        ) : null}

        <Tabs defaultValue="builder" className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="builder">Builder</TabsTrigger>
            <TabsTrigger value="result" disabled={!inscription}>
              Result
            </TabsTrigger>
            <TabsTrigger value="envelope" disabled={!envelope}>
              Envelope
            </TabsTrigger>
          </TabsList>

          <TabsContent value="builder" className="mt-4 space-y-3">
            {template === "dna" ? (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">species_id</div>
                  <Input value={dnaSpeciesId} onChange={(e) => setDnaSpeciesId(e.target.value)} className="font-mono" />
                </div>
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">canonical_name</div>
                  <Input value={dnaCanonicalName} onChange={(e) => setDnaCanonicalName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">sequence_type</div>
                  <Select value={dnaSeqType} onValueChange={(v) => setDnaSeqType(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="its">ITS</SelectItem>
                      <SelectItem value="lsu">LSU</SelectItem>
                      <SelectItem value="ssu">SSU</SelectItem>
                      <SelectItem value="barcode">Barcode</SelectItem>
                      <SelectItem value="genome">Genome</SelectItem>
                      <SelectItem value="mtdna">mtDNA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <div className="text-xs text-muted-foreground">FASTA payload</div>
                  <Textarea value={dnaPayload} onChange={(e) => setDnaPayload(e.target.value)} className="font-mono min-h-36" />
                </div>
              </div>
            ) : null}

            {template === "taxa" ? (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">taxon_id</div>
                  <Input value={taxonId} onChange={(e) => setTaxonId(e.target.value)} className="font-mono" />
                </div>
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">rank</div>
                  <Select value={taxonRank} onValueChange={(v) => setTaxonRank(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["kingdom", "phylum", "class", "order", "family", "genus", "species", "subspecies"].map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <div className="text-xs text-muted-foreground">canonical_name</div>
                  <Input value={taxonName} onChange={(e) => setTaxonName(e.target.value)} />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <div className="text-xs text-muted-foreground">JSON payload</div>
                  <Textarea value={taxonPayload} onChange={(e) => setTaxonPayload(e.target.value)} className="font-mono min-h-36" />
                </div>
              </div>
            ) : null}

            {template === "observation" ? (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">observation_id</div>
                  <Input value={obsId} onChange={(e) => setObsId(e.target.value)} className="font-mono" />
                </div>
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">taxon_id</div>
                  <Input value={obsTaxonId} onChange={(e) => setObsTaxonId(e.target.value)} className="font-mono" />
                </div>
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">lat</div>
                  <Input value={obsLat} onChange={(e) => setObsLat(e.target.value)} className="font-mono" />
                </div>
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">lng</div>
                  <Input value={obsLng} onChange={(e) => setObsLng(e.target.value)} className="font-mono" />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <div className="text-xs text-muted-foreground">JSON payload</div>
                  <Textarea value={obsPayload} onChange={(e) => setObsPayload(e.target.value)} className="font-mono min-h-36" />
                </div>
              </div>
            ) : null}

            {template === "json" ? (
              <div className="grid gap-3">
                <div className="grid gap-2 md:grid-cols-[280px_1fr]">
                  <Input value={jsonContentType} onChange={(e) => setJsonContentType(e.target.value)} className="font-mono" />
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <FileJson className="h-4 w-4" />
                    content_type (e.g. <span className="font-mono">application/json</span>)
                  </div>
                </div>
                <Textarea value={jsonPayload} onChange={(e) => setJsonPayload(e.target.value)} className="font-mono min-h-36" />
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value="result" className="mt-4">
            {inscription ? (
              <div className="space-y-3">
                <div className="grid gap-3 md:grid-cols-3">
                  <Stat label="content_type" value={inscription.content_type} />
                  <Stat label="data_hash" value={inscription.data_hash} mono />
                  <Stat label="compressed" value={String(inscription.compressed)} />
                </div>

                {cost ? (
                  <div className="grid gap-3 md:grid-cols-3">
                    <Stat label="envelope_bytes" value={String(cost.sizeBytes)} />
                    <Stat label="est_sats" value={cost.estimatedSatoshis.toLocaleString()} />
                    <Stat label="est_usd" value={`$${cost.estimatedUSD.toFixed(2)}`} />
                  </div>
                ) : null}

                <Separator className="bg-white/10" />

                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs text-muted-foreground">inscription JSON</div>
                  <Button size="sm" variant="outline" onClick={() => copyToClipboard(JSON.stringify(inscription, null, 2))}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                </div>

                <pre className="text-xs font-mono whitespace-pre-wrap break-words rounded-xl border border-white/10 bg-black/30 p-4 text-purple-100/90">
                  {JSON.stringify(inscription, null, 2)}
                </pre>
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value="envelope" className="mt-4">
            {envelope ? (
              <div className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <Stat label="contentType" value={envelope.contentType} mono />
                  <Stat label="body_bytes" value={String(envelope.body.length)} />
                </div>
                <Separator className="bg-white/10" />
                <div className="text-xs text-muted-foreground">metadata headers</div>
                <pre className="text-xs font-mono whitespace-pre-wrap break-words rounded-xl border border-white/10 bg-black/30 p-4 text-purple-100/90">
                  {JSON.stringify(envelope.metadata, null, 2)}
                </pre>
              </div>
            ) : null}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <Card className="border-white/10 bg-black/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={cn("text-sm font-medium break-all", mono && "font-mono")}>{value}</div>
      </CardContent>
    </Card>
  )
}

