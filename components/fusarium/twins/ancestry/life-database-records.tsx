"use client"

import { FormEvent, useEffect, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Database,
  Loader2,
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

const PAGE_SIZE = 100
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")

function coverageFlags(record: LifeSpeciesRecord) {
  const coverage = record.coverage
  return [
    Boolean(record.image_url || (coverage?.images ?? 0) > 0),
    (coverage?.observations ?? record.observations_count ?? 0) > 0,
    (coverage?.genomes ?? 0) > 0,
    (coverage?.compounds ?? 0) > 0,
    (coverage?.interactions ?? 0) > 0,
  ]
}

export function FusariumLifeDatabaseRecords() {
  const [draft, setDraft] = useState("")
  const [query, setQuery] = useState("")
  const [letter, setLetter] = useState("A")
  const [kingdom, setKingdom] = useState("all")
  const [page, setPage] = useState(1)
  const [records, setRecords] = useState<LifeSpeciesRecord[]>([])
  const [total, setTotal] = useState<number | null>(null)
  const [pages, setPages] = useState(0)
  const [state, setState] = useState<LifeSourceState>("loading")
  const [message, setMessage] = useState("Reading the protected catalog index.")
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      setState("loading")
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE), page: String(page), rank: "all", sort: "alphabetical", include_incomplete: "true",
      })
      if (query) params.set("query", query)
      else params.set("prefix", letter)
      if (kingdom !== "all") params.set("kingdom", kingdom)
      try {
        const response = await fetch(`/api/fusarium/life-database?${params.toString()}`, { cache: "no-store", credentials: "same-origin", signal: controller.signal })
        if (response.status === 401 || response.status === 403) {
          setRecords([]); setTotal(null); setPages(0); setState("unauthorized"); setMessage("An owner session is required to read the Fusarium catalog index."); return
        }
        if (!response.ok) throw new Error("catalog_unavailable")
        const payload = (await response.json()) as LifeCatalogResponse
        setRecords(Array.isArray(payload.species) ? payload.species : [])
        setTotal(typeof payload.total === "number" ? payload.total : null)
        setPages(typeof payload.pages === "number" ? payload.pages : 0)
        const nextState = payload.source_state === "unavailable" ? "unavailable" : payload.source_state === "empty" ? "empty" : "available"
        setState(nextState)
        setMessage(nextState === "unavailable" ? payload.message || "The protected catalog index is unavailable." : nextState === "empty" ? payload.message || "The current index filter has no matching record." : "Protected Mycosoft MINDEX catalog index available.")
      } catch {
        if (controller.signal.aborted) return
        setRecords([]); setTotal(null); setPages(0); setState("unavailable"); setMessage("The protected catalog index is unavailable. No absence claim has been made.")
      }
    }
    void load()
    return () => controller.abort()
  }, [kingdom, letter, page, query, reloadToken])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setQuery(draft.trim())
    setPage(1)
  }

  return (
    <main className={styles.page} data-fusarium-life-database="database">
      <div className={styles.topbar}>
        <nav className={styles.breadcrumbs} aria-label="Breadcrumb"><Link href="/fusarium"><ArrowLeft /> Fusarium</Link><ChevronRight /><Link href="/fusarium/life-database">Life Database</Link><ChevronRight /><span>Database</span></nav>
        <div className={styles.navActions}><Link className={styles.navLink} href="/fusarium/life-database/explorer"><Search /> Species Explorer</Link><Link className={styles.navLink} href="/fusarium/life-database/tools"><Wrench /> Tools</Link></div>
      </div>

      <header className={`${styles.header} ${styles.glass}`}>
        <span className={styles.eyebrow}><Database /> UNIFIED BIOLOGICAL RECORD STORE</span><h1>Database</h1>
        <p>Browse the complete MINDEX record index across taxonomy ranks. Missing imagery, genetics, chemistry, or observations is shown as a coverage gap—not as a missing organism.</p>
      </header>

      <form className={styles.toolbar} onSubmit={submit} role="search">
        <label className={styles.searchBox}><Search /><span className={styles.srOnly}>Search database</span><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Search scientific name, common name, or taxon" /></label>
        <label><span className={styles.srOnly}>Kingdom</span><select className={styles.select} value={kingdom} onChange={(event) => { setKingdom(event.target.value); setPage(1) }}>{LIFE_KINGDOMS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <button className={`${styles.button} ${styles.buttonPrimary}`} type="submit"><Search /> Search index</button>
        <button className={styles.button} type="button" onClick={() => { setDraft(""); setQuery(""); setPage(1); setReloadToken((value) => value + 1) }}><RefreshCw /> Reset</button>
      </form>

      {!query ? <nav className={styles.alphabet} aria-label="Browse by initial letter">{LETTERS.map((value) => <button key={value} type="button" className={`${styles.letter} ${letter === value ? styles.letterActive : ""}`} onClick={() => { setLetter(value); setPage(1) }}>{value}</button>)}</nav> : null}

      <section className={styles.statusBar} aria-live="polite">
        <div className={styles.statusLead}>{state === "loading" ? <Loader2 className={styles.spinner} /> : state === "available" ? <ShieldCheck /> : <AlertTriangle />}<span><strong>{state === "available" ? "Index online" : state === "loading" ? "Index check" : state === "empty" ? "No indexed matches" : state === "unauthorized" ? "Owner session required" : "Index unavailable"}</strong><small>{message}</small></span></div>
        <div className={styles.statusMetrics}><span><strong>{total === null ? "—" : compactNumber(total)}</strong><small>{query ? "Matches" : `Initial ${letter}`}</small></span><span><strong>{records.length}</strong><small>Rows shown</small></span></div>
      </section>

      {state === "loading" ? <section className={`${styles.emptyState} ${styles.glass}`}><div><Loader2 className={styles.spinner} /><h2>Loading the index</h2><p>Reading canonical records without substituting demo rows.</p></div></section> : records.length ? (
        <section className={styles.tableShell} aria-label="Life Database record index"><div className={styles.tableScroll}><table className={styles.table}><thead><tr><th>Scientific name</th><th>Common name</th><th>Kingdom</th><th>Rank</th><th>Family</th><th>Coverage</th><th>Observations</th></tr></thead><tbody>{records.map((record) => <tr key={lifeRecordId(record)}><td><Link className={styles.recordLink} href={`/fusarium/life-database/species/${encodeURIComponent(lifeRecordId(record))}`}>{record.scientific_name}</Link></td><td>{record.common_name || "—"}</td><td>{record.kingdom || "Pending"}</td><td>{record.rank || record.characteristics?.[0] || "—"}</td><td>{record.family || "—"}</td><td><span className={styles.coverageDots} aria-label="Media, observations, genetics, chemistry, relationships coverage">{coverageFlags(record).map((active, index) => <i key={index} className={styles.coverageDot} data-active={active} />)}</span></td><td>{compactNumber(record.coverage?.observations ?? record.observations_count)}</td></tr>)}</tbody></table></div></section>
      ) : <section className={`${styles.emptyState} ${styles.glass}`}><div><AlertTriangle /><h2>{state === "empty" ? "No indexed matches in this filter" : "Catalog index needs attention"}</h2><p>{message}</p><button className={styles.button} type="button" onClick={() => setReloadToken((value) => value + 1)}><RefreshCw /> Retry connection</button></div></section>}

      {records.length > 0 && pages > 1 ? <nav className={styles.pagination} aria-label="Database pages"><button className={styles.button} type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft /> Previous</button><span>Page {page.toLocaleString()} of {pages.toLocaleString()}</span><button className={styles.button} type="button" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>Next <ChevronRight /></button></nav> : null}

      <details className={styles.evidenceDrawer}><summary>Evidence and upstream source details</summary><p>Mycosoft MINDEX is the operator-facing system of record. Upstream identifiers, licenses, record timestamps, and ingestion lineage remain attached for audit, conflict resolution, and export, but are collapsed in the working index.</p></details>
    </main>
  )
}
