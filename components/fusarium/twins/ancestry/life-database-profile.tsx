"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  ChevronRight,
  Dna,
  FlaskConical,
  ImageOff,
  Loader2,
  MapPin,
  Network,
  RefreshCw,
  Search,
  ShieldCheck,
  TreeDeciduous,
  Wrench,
} from "lucide-react"
import { compactNumber, type LifeSourceState, type LifeSpeciesRecord } from "@/lib/fusarium/twins/ancestry/life-database-contract"
import styles from "./life-database-workspace.module.css"

type AnyRecord = Record<string, unknown>
type Plane = { state?: "available" | "unavailable"; data?: unknown }
interface LifeProfileResponse {
  species?: LifeSpeciesRecord
  source?: string
  all_life?: {
    interactions?: { data?: AnyRecord[] } | null
    media?: { video?: AnyRecord[]; audio?: AnyRecord[] } | null
    publications?: { data?: AnyRecord[] } | null
    lineage?: { nodes?: Array<{ name?: string; taxon_id?: string; depth?: number }>; message?: string } | null
    characteristics?: { data?: AnyRecord[] } | null
  }
  profile?: { genetics?: Plane; genomes?: Plane; compounds?: Plane; observations?: Plane }
}

function rows(value: unknown, keys: string[]) {
  if (!value || typeof value !== "object") return [] as AnyRecord[]
  const record = value as AnyRecord
  for (const key of keys) if (Array.isArray(record[key])) return record[key] as AnyRecord[]
  return [] as AnyRecord[]
}

function text(value: unknown, fallback = "—") {
  if (typeof value === "string" && value.trim()) return value
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  return fallback
}

function PlaneGap({ unavailable, children }: { unavailable?: boolean; children: string }) {
  return <div className={styles.coverageGap}>{unavailable ? "Source connection unavailable. " : "Coverage gap. "}{children}</div>
}

export function FusariumLifeDatabaseProfile() {
  const params = useParams<{ id: string }>()
  const [payload, setPayload] = useState<LifeProfileResponse | null>(null)
  const [state, setState] = useState<LifeSourceState>("loading")
  const [message, setMessage] = useState("Reading the protected biological profile.")
  const [reloadToken, setReloadToken] = useState(0)
  const [enrichmentLoading, setEnrichmentLoading] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      setState("loading")
      try {
        const endpoint = `/api/fusarium/life-database/${encodeURIComponent(params.id)}?type=species`
        const response = await fetch(`${endpoint}&enrich=0`, { cache: "no-store", credentials: "same-origin", signal: controller.signal })
        if (response.status === 401 || response.status === 403) {
          setPayload(null); setState("unauthorized"); setMessage("An owner session is required to read this Fusarium profile."); return
        }
        if (response.status === 404) {
          setPayload(null); setState("empty"); setMessage("This identifier is not indexed in the current MINDEX catalog. That is a coverage gap, not proof of biological absence."); return
        }
        if (!response.ok) throw new Error("profile_unavailable")
        const next = (await response.json()) as LifeProfileResponse
        if (!next.species) throw new Error("profile_missing")
        setPayload(next); setState("available"); setMessage("Protected Mycosoft MINDEX profile available.")
      } catch {
        if (controller.signal.aborted) return
        setPayload(null); setState("unavailable"); setMessage("The profile connection is unavailable. Existing catalog claims have not been replaced with generated data.")
      }
    }
    void load()
    return () => controller.abort()
  }, [params.id, reloadToken])

  useEffect(() => {
    if (state !== "available" || !payload?.species || payload.profile) return
    const controller = new AbortController()
    setEnrichmentLoading(true)
    const endpoint = `/api/fusarium/life-database/${encodeURIComponent(params.id)}?type=species`
    void fetch(endpoint, { cache: "no-store", credentials: "same-origin", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return
        const enriched = (await response.json()) as LifeProfileResponse
        if (enriched.species) setPayload(enriched)
      })
      .catch(() => {
        // The core MINDEX record remains usable when a linked evidence plane times out.
      })
      .finally(() => {
        if (!controller.signal.aborted) setEnrichmentLoading(false)
      })
    return () => controller.abort()
  }, [params.id, payload, state])

  const species = payload?.species
  const genetics = useMemo(() => rows(payload?.profile?.genetics?.data, ["data", "sequences"]), [payload])
  const genomes = useMemo(() => rows(payload?.profile?.genomes?.data, ["genomes", "data"]), [payload])
  const compounds = useMemo(() => rows(payload?.profile?.compounds?.data, ["compounds", "data"]), [payload])
  const observations = useMemo(() => rows(payload?.profile?.observations?.data, ["data", "observations"]), [payload])
  const interactions = payload?.all_life?.interactions?.data || []
  const publications = payload?.all_life?.publications?.data || []
  const media = [...(payload?.all_life?.media?.video || []), ...(payload?.all_life?.media?.audio || [])]
  const lineage = payload?.all_life?.lineage?.nodes?.map((node) => node.name).filter((name): name is string => Boolean(name)) || species?.lineage || []

  if (state !== "available" || !species) {
    return <main className={styles.page} data-fusarium-life-database="profile"><div className={styles.topbar}><nav className={styles.breadcrumbs}><Link href="/fusarium/life-database/explorer"><ArrowLeft /> Species Explorer</Link></nav></div><section className={`${styles.emptyState} ${styles.glass}`}><div>{state === "loading" ? <Loader2 className={styles.spinner} /> : <AlertTriangle />}<h2>{state === "loading" ? "Loading unified profile" : state === "unauthorized" ? "Owner session required" : "Profile coverage unavailable"}</h2><p>{message}</p>{state !== "loading" ? <button className={styles.button} type="button" onClick={() => setReloadToken((value) => value + 1)}><RefreshCw /> Retry</button> : null}</div></section></main>
  }

  const coverage = species.coverage
  return (
    <main className={styles.page} data-fusarium-life-database="profile">
      <div className={styles.topbar}>
        <nav className={styles.breadcrumbs} aria-label="Breadcrumb"><Link href="/fusarium"><ArrowLeft /> Fusarium</Link><ChevronRight /><Link href="/fusarium/life-database">Life Database</Link><ChevronRight /><Link href="/fusarium/life-database/explorer">Species Explorer</Link><ChevronRight /><span>{species.scientific_name}</span></nav>
        <div className={styles.navActions}><Link className={styles.navLink} href="/fusarium/life-database/explorer"><Search /> Explorer</Link><Link className={styles.navLink} href="/fusarium/life-database/tools"><Wrench /> Tools</Link></div>
      </div>

      <header className={styles.profileHero}>
        <div className={styles.profileImage}>{species.image_url ? <img src={species.image_url} alt={species.common_name || species.scientific_name} /> : <div className={styles.imageMissing}><span><ImageOff />Media not indexed</span></div>}</div>
        <div className={styles.profileCopy}>
          <span className={styles.eyebrow}><ShieldCheck /> UNIFIED MINDEX SPECIES PROFILE</span><h1>{species.scientific_name}</h1><p>{species.common_name || "Common name not indexed"}</p>
          <div className={styles.badges}><span className={styles.badge}>{species.kingdom || "Kingdom pending"}</span><span className={styles.badge}>{species.family || "Family pending"}</span><span className={styles.badge}>{species.rank || "Taxon"}</span></div>
          <p className={styles.profileSummary}>{species.description || "A canonical taxonomic record is available. Narrative biology has not yet been indexed for this profile."}</p>
          <div className={styles.profileMetrics}>
            <span><strong>{compactNumber(coverage?.observations ?? species.observations_count)}</strong><small>Observations</small></span><span><strong>{compactNumber(genetics.length || coverage?.genomes)}</strong><small>Genetic records</small></span><span><strong>{compactNumber(compounds.length || coverage?.compounds)}</strong><small>Compounds</small></span><span><strong>{compactNumber(interactions.length || coverage?.interactions)}</strong><small>Relationships</small></span><span><strong>{compactNumber(publications.length || coverage?.publications)}</strong><small>Research</small></span>
          </div>
        </div>
      </header>

      {enrichmentLoading ? <div className={styles.coverageGap}><Loader2 className={styles.spinner} /> Loading linked genetics, chemistry, observations, and research while the core profile remains usable.</div> : null}

      <div className={styles.sectionGrid}>
        <section className={styles.profileSection}><div className={styles.sectionTitle}><TreeDeciduous /><h2>Taxonomy and relationships</h2></div><dl className={styles.factList}><div className={styles.fact}><dt>Scientific name</dt><dd><i>{species.scientific_name}</i></dd></div><div className={styles.fact}><dt>Kingdom</dt><dd>{species.kingdom || "Not yet resolved"}</dd></div><div className={styles.fact}><dt>Family</dt><dd>{species.family || "Not yet resolved"}</dd></div><div className={styles.fact}><dt>Rank</dt><dd>{species.rank || "Not yet resolved"}</dd></div><div className={styles.fact}><dt>Lineage</dt><dd>{lineage.length ? lineage.join(" → ") : "Full lineage not yet indexed"}</dd></div></dl></section>

        <section className={styles.profileSection}><div className={styles.sectionTitle}><Dna /><h2>Genetics and genomes</h2></div>{genetics.length || genomes.length ? <div className={styles.dataRows}>{genetics.slice(0, 6).map((row, index) => <div className={styles.dataRow} key={text(row.accession, `sequence-${index}`)}><strong>{text(row.accession, "Genetic sequence")}</strong><small>{[text(row.gene, "gene pending"), `${text(row.sequence_length, "unknown")} bp`, text(row.source, "source retained")].join(" · ")}</small><small>{text(row.definition, "Sequence description not indexed")}</small></div>)}{genomes.slice(0, 4).map((row, index) => <div className={styles.dataRow} key={text(row.id, `genome-${index}`)}><strong>{text(row.accession, "Genome assembly")}</strong><small>{[text(row.assembly_level, "assembly level pending"), text(row.source, "source retained")].join(" · ")}</small></div>)}</div> : <PlaneGap unavailable={payload.profile?.genetics?.state === "unavailable" || payload.profile?.genomes?.state === "unavailable"}>No linked sequence or genome records are currently indexed for this taxon.</PlaneGap>}</section>

        <section className={styles.profileSection}><div className={styles.sectionTitle}><FlaskConical /><h2>Chemistry and traits</h2></div>{compounds.length ? <div className={styles.dataRows}>{compounds.slice(0, 8).map((row, index) => <div className={styles.dataRow} key={text(row.compound_id ?? row.id, `compound-${index}`)}><strong>{text(row.name, "Unnamed compound")}</strong><small>{[text(row.formula, "formula pending"), text(row.relationship_type, "association"), text(row.evidence_level, "evidence retained")].join(" · ")}</small></div>)}</div> : <PlaneGap unavailable={payload.profile?.compounds?.state === "unavailable"}>No taxon-compound links are currently indexed. The interface does not infer chemistry from the name alone.</PlaneGap>}</section>

        <section className={styles.profileSection}><div className={styles.sectionTitle}><MapPin /><h2>Locations and observations</h2></div>{observations.length ? <div className={styles.dataRows}>{observations.slice(0, 8).map((row, index) => <div className={styles.dataRow} key={text(row.id, `observation-${index}`)}><strong>{text(row.place_guess ?? row.location_name, "Observation")}</strong><small>{[text(row.observed_on ?? row.observed_at, "time retained"), text(row.quality_grade, "quality pending")].join(" · ")}</small></div>)}</div> : <PlaneGap unavailable={payload.profile?.observations?.state === "unavailable"}>No location-bearing observations are linked to this canonical taxon identifier yet.</PlaneGap>}</section>

        <section className={styles.profileSection}><div className={styles.sectionTitle}><Network /><h2>Biological interactions</h2></div>{interactions.length ? <div className={styles.dataRows}>{interactions.slice(0, 8).map((row, index) => <div className={styles.dataRow} key={text(row.id, `interaction-${index}`)}><strong>{text(row.interaction_type ?? row.type, "Recorded interaction")}</strong><small>{text(row.target_name ?? row.related_taxon ?? row.description, "Linked evidence retained")}</small></div>)}</div> : <PlaneGap>No verified interaction edges are currently linked to this record.</PlaneGap>}</section>

        <section className={styles.profileSection}><div className={styles.sectionTitle}><Camera /><h2>Media and research</h2></div>{media.length || publications.length ? <div className={styles.dataRows}>{media.slice(0, 4).map((row, index) => <div className={styles.dataRow} key={text(row.id, `media-${index}`)}><strong>{text(row.title ?? row.media_type, "Linked media")}</strong><small>{text(row.created_at ?? row.recorded_at, "Timestamp retained")}</small></div>)}{publications.slice(0, 5).map((row, index) => <div className={styles.dataRow} key={text(row.id ?? row.doi, `publication-${index}`)}><strong>{text(row.title, "Indexed publication")}</strong><small>{[text(row.year, "year pending"), text(row.doi, "identifier retained")].join(" · ")}</small></div>)}</div> : <PlaneGap>No additional audio, video, or publications are linked to this record yet.</PlaneGap>}</section>
      </div>

      <details className={styles.evidenceDrawer}><summary>Evidence, licenses, and upstream lineage</summary><p>Operator source: Mycosoft MINDEX. Canonical record source: {species.source || "retained internally"}. Image credit: {species.photo_attribution || "not supplied"}. Image license: {species.photo_license || "not supplied"}. Upstream identifiers and record timestamps remain available to reviewers even though they are not foregrounded in the operational profile.</p></details>
    </main>
  )
}
