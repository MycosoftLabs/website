"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, Database, Dna, Search, ShieldCheck, Wrench } from "lucide-react"
import styles from "./life-database-home.module.css"

const WORKSPACES = [
  {
    href: "/fusarium/life-database/explorer",
    label: "Species Explorer",
    description: "Find organisms across all kingdoms and inspect taxonomy, observations, distribution, media, and provenance.",
    icon: Search,
    tone: "cyan",
  },
  {
    href: "/fusarium/life-database/tools",
    label: "Tools",
    description: "Use phylogeny, evolution, sequence, genetics, relationship, and evidence-analysis workspaces in one place.",
    icon: Wrench,
    tone: "orange",
  },
  {
    href: "/fusarium/life-database/database",
    label: "Database",
    description: "Browse the unified MINDEX-backed biological record store without splitting genetics into a duplicate database.",
    icon: Database,
    tone: "green",
  },
] as const

export function FusariumLifeDatabaseHome() {
  const router = useRouter()
  const [query, setQuery] = useState("")

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = query.trim()
    router.push(value ? `/fusarium/life-database/explorer?search=${encodeURIComponent(value)}` : "/fusarium/life-database/database")
  }

  return (
    <main className={styles.page} data-life-database-home data-fusarium-life-database="home">
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}><ShieldCheck aria-hidden="true" /> FUSARIUM BIOLOGICAL INTELLIGENCE</span>
          <h1>Life Database</h1>
          <p>
            A global biological record plane for environmental intelligence, force health, biosurveillance, invasive
            species and pathogen awareness, ecosystem change, and mission planning. It connects species identity and
            relationships to verified observations, place, time, genetics, media, and source provenance so defense and
            civil operators can distinguish known evidence, modeled risk, and genuine data gaps.
          </p>
          <div className={styles.missionTags} aria-label="Life Database operational uses">
            <span>Global taxonomy</span><span>Biosurveillance</span><span>Environmental baselines</span><span>Evidence provenance</span>
          </div>
        </div>
        <div className={styles.heroMark} aria-hidden="true"><Dna /><Database /></div>
      </header>

      <form className={styles.searchBar} onSubmit={submitSearch} role="search">
        <Search aria-hidden="true" />
        <label htmlFor="life-database-search" className={styles.srOnly}>Search Life Database</label>
        <input
          id="life-database-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Scientific name, common name, family, taxon, trait, or location"
          autoComplete="off"
        />
        <button type="submit">Search <ArrowRight aria-hidden="true" /></button>
      </form>

      <section className={styles.workspaceSection} aria-labelledby="life-database-workspaces">
        <div className={styles.sectionHeader}>
          <div><span className={styles.eyebrow}>DATABASE WORKSPACES</span><h2 id="life-database-workspaces">Choose an operational view</h2></div>
          <p>Three focused entry points; one evidence-backed biological database.</p>
        </div>
        <div className={styles.workspaceGrid}>
          {WORKSPACES.map((workspace) => {
            const Icon = workspace.icon
            return (
              <Link key={workspace.href} href={workspace.href} className={styles.workspaceCard} data-tone={workspace.tone}>
                <span className={styles.iconWell}><Icon aria-hidden="true" /></span>
                <span className={styles.cardCopy}><strong>{workspace.label}</strong><small>{workspace.description}</small></span>
                <ArrowRight aria-hidden="true" className={styles.cardArrow} />
              </Link>
            )
          })}
        </div>
      </section>

      <footer className={styles.footerNote}>
        <ShieldCheck aria-hidden="true" />
        <span><strong>Evidence boundary</strong><small>Life Database shows only source-backed records. Missing coverage is unknown, not biological absence, and predictions remain separate from observations.</small></span>
      </footer>
    </main>
  )
}
