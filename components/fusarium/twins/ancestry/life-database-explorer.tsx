"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  AlertTriangle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Database,
  Dna,
  ImageOff,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  Wrench,
} from "lucide-react"
import {
  compactNumber,
  LIFE_KINGDOMS,
  lifeRecordId,
  type LifeCatalogResponse,
  type LifeSourceState,
  type LifeSpeciesRecord,
} from "@/lib/fusarium/twins/ancestry/life-database-contract"
import styles from "./life-database-workspace.module.css"

const PAGE_SIZE = 36

export function FusariumLifeDatabaseExplorer() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [draft, setDraft] = useState(searchParams.get("search") || "")
  const [query, setQuery] = useState(searchParams.get("search") || "")
  const [kingdom, setKingdom] = useState(searchParams.get("kingdom") || "all")
  const [sort, setSort] = useState(searchParams.get("sort") || "popular")
  const [page, setPage] = useState(1)
  const [records, setRecords] = useState<LifeSpeciesRecord[]>([])
  const [total, setTotal] = useState<number | null>(null)
  const [pages, setPages] = useState(0)
  const [state, setState] = useState<LifeSourceState>("loading")
  const [message, setMessage] = useState("Connecting to the Mycosoft biological catalog.")
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      setState("loading")
      setMessage("Reading the protected MINDEX catalog.")
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        page: String(page),
        rank: "species",
        sort,
        include_incomplete: "true",
      })
      if (query) params.set("query", query)
      if (kingdom !== "all") params.set("kingdom", kingdom)
      try {
        const response = await fetch(`/api/fusarium/life-database?${params.toString()}`, {
          cache: "no-store",
          credentials: "same-origin",
          signal: controller.signal,
        })
        if (response.status === 401 || response.status === 403) {
          setRecords([])
          setTotal(null)
          setState("unauthorized")
          setMessage("An owner session is required to read the Fusarium Life Database.")
          return
        }
        if (!response.ok) throw new Error("catalog_unavailable")
        const payload = (await response.json()) as LifeCatalogResponse
        setRecords(Array.isArray(payload.species) ? payload.species : [])
        setTotal(typeof payload.total === "number" ? payload.total : null)
        setPages(typeof payload.pages === "number" ? payload.pages : 0)
        const nextState = payload.source_state === "unavailable" ? "unavailable" : payload.source_state === "empty" ? "empty" : "available"
        setState(nextState)
        setMessage(
          nextState === "unavailable"
            ? payload.message || "The protected catalog connection is unavailable."
            : nextState === "empty"
            ? payload.message || "The catalog is available, but these filters have no indexed matches."
            : "Protected Mycosoft MINDEX records are available.",
        )
      } catch (error) {
        if (controller.signal.aborted) return
        setRecords([])
        setTotal(null)
        setPages(0)
        setState("unavailable")
        setMessage("The protected catalog connection is unavailable. This is not evidence that a species is absent.")
      }
    }
    void load()
    return () => controller.abort()
  }, [kingdom, page, query, reloadToken, sort])

  const displayedCoverage = useMemo(
    () => records.reduce((sum, record) => sum + (record.image_url ? 1 : 0), 0),
    [records],
  )

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = draft.trim()
    setQuery(next)
    setPage(1)
    const params = new URLSearchParams()
    if (next) params.set("search", next)
    if (kingdom !== "all") params.set("kingdom", kingdom)
    if (sort !== "popular") params.set("sort", sort)
    router.replace(`/fusarium/life-database/explorer${params.size ? `?${params.toString()}` : ""}`, { scroll: false })
  }

  return (
    <main className={styles.page} data-fusarium-life-database="explorer">
      <div className={styles.topbar}>
        <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
          <Link href="/fusarium"><ArrowLeft aria-hidden="true" /> Fusarium</Link><ChevronRight aria-hidden="true" />
          <Link href="/fusarium/life-database">Life Database</Link><ChevronRight aria-hidden="true" /><span>Species Explorer</span>
        </nav>
        <div className={styles.navActions}>
          <Link className={styles.navLink} href="/fusarium/life-database/tools"><Wrench /> Tools</Link>
          <Link className={styles.navLink} href="/fusarium/life-database/database"><Database /> Database</Link>
        </div>
      </div>

      <header className={`${styles.header} ${styles.glass}`}>
        <span className={styles.eyebrow}><ShieldCheck /> FUSARIUM BIOLOGICAL INTELLIGENCE</span>
        <h1>Species Explorer</h1>
        <p>Search all indexed life, open a unified operational profile, and inspect biological identity, media, genetics, chemistry, relationships, and location evidence without leaving Fusarium.</p>
      </header>

      <form className={styles.toolbar} onSubmit={submit} role="search">
        <label className={styles.searchBox}>
          <Search aria-hidden="true" /><span className={styles.srOnly}>Search species</span>
          <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Scientific name, common name, family, or taxon" />
        </label>
        <label><span className={styles.srOnly}>Kingdom</span><select className={styles.select} value={kingdom} onChange={(event) => { setKingdom(event.target.value); setPage(1) }}>
          {LIFE_KINGDOMS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select></label>
        <label><span className={styles.srOnly}>Sort</span><select className={styles.select} value={sort} onChange={(event) => { setSort(event.target.value); setPage(1) }}>
          <option value="popular">Observation activity</option><option value="alphabetical">Scientific name</option>
        </select></label>
        <button className={`${styles.button} ${styles.buttonPrimary}`} type="submit"><Search /> Search</button>
      </form>

      <section className={styles.statusBar} aria-live="polite">
        <div className={styles.statusLead}>
          {state === "loading" ? <Loader2 className={styles.spinner} /> : state === "available" ? <ShieldCheck /> : <AlertTriangle />}
          <span><strong>{state === "available" ? "Catalog online" : state === "loading" ? "Catalog check" : state === "empty" ? "No indexed matches" : state === "unauthorized" ? "Owner session required" : "Catalog unavailable"}</strong><small>{message}</small></span>
        </div>
        <div className={styles.statusMetrics}>
          <span><strong>{total === null ? "—" : compactNumber(total)}</strong><small>Matching records</small></span>
          <span><strong>{records.length}</strong><small>Shown</small></span>
          <span><strong>{displayedCoverage}</strong><small>With imagery</small></span>
        </div>
      </section>

      {state === "loading" ? (
        <section className={`${styles.emptyState} ${styles.glass}`}><div><Loader2 className={styles.spinner} /><h2>Loading biological records</h2><p>The database keeps the previous claim separate from current connection state.</p></div></section>
      ) : records.length ? (
        <section className={styles.recordGrid} aria-label="Species records">
          {records.map((record) => {
            const coverage = record.coverage
            return (
              <Link key={lifeRecordId(record)} href={`/fusarium/life-database/species/${encodeURIComponent(lifeRecordId(record))}`} className={styles.recordCard}>
                <div className={styles.recordImage}>{record.image_url ? <img src={record.image_url} alt="" loading="lazy" /> : <div className={styles.imageMissing}><span><ImageOff />Media not indexed</span></div>}</div>
                <div className={styles.recordBody}>
                  <h2>{record.scientific_name}</h2><p className={styles.commonName}>{record.common_name || "Common name not indexed"}</p>
                  <div className={styles.badges}><span className={styles.badge}>{record.kingdom || "Kingdom pending"}</span><span className={styles.badge}>{record.family || "Family pending"}</span><span className={styles.badge}>{record.rank || "species"}</span></div>
                  <div className={styles.coverage} aria-label="Record coverage">
                    <span><strong>{compactNumber(coverage?.observations ?? record.observations_count)}</strong><small>Observations</small></span>
                    <span><strong>{compactNumber(coverage?.genomes)}</strong><small>Genetics</small></span>
                    <span><strong>{compactNumber(coverage?.compounds)}</strong><small>Chemistry</small></span>
                  </div>
                </div>
              </Link>
            )
          })}
        </section>
      ) : (
        <section className={`${styles.emptyState} ${styles.glass}`}><div><AlertTriangle /><h2>{state === "empty" ? "No indexed matches in this view" : "Catalog connection needs attention"}</h2><p>{message}</p><button className={styles.button} type="button" onClick={() => setReloadToken((value) => value + 1)}><RefreshCw /> Retry connection</button></div></section>
      )}

      {records.length > 0 && pages > 1 ? <nav className={styles.pagination} aria-label="Catalog pages"><button className={styles.button} type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft /> Previous</button><span>Page {page.toLocaleString()} of {pages.toLocaleString()}</span><button className={styles.button} type="button" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>Next <ChevronRight /></button></nav> : null}

      <details className={styles.evidenceDrawer}>
        <summary>Evidence and source details</summary>
        <p>The operator view is delivered through Mycosoft MINDEX. Each record retains upstream identifiers, media licensing, timestamps, and source lineage for audit, export, and conflict resolution; those details stay collapsed until requested.</p>
      </details>
    </main>
  )
}
