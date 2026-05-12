/**
 * Developer documentation catalog — single source of truth for both the
 * `/docs` index page and the docs sidebar.
 *
 * Editorial guardrails (carry over from /science):
 *  - Frontier work (FCI probes, NLM, planetary Wi-Fi sense, biosignal
 *    "language", interspecies translation) is labelled `status: "frontier"`.
 *  - We do NOT claim fungi are language-capable computers.
 *  - We do NOT claim Wi-Fi sense provides planetary perception.
 *  - We do NOT claim interspecies translation is solved.
 *
 * Source URLs use placeholder paths so links work the moment Morgan uploads
 * the actual PDFs / GitBook pages:
 *  - PDFs:    /pdf/<slug>.pdf
 *  - GitBook: https://mycosoft.gitbook.io/<slug>
 */

export type DocSourceKind = "pdf" | "gitbook" | "internal" | "external"

export type DocSource = {
  label: string
  href: string
  kind: DocSourceKind
}

export type DocStatus = "stable" | "draft" | "frontier" | "coming-soon"

export type DocEntry = {
  title: string
  description: string
  /** Internal docs route (e.g. `/docs/ai/myca`). Omit for pure-concept entries. */
  href?: string
  sources?: DocSource[]
  status?: DocStatus
}

export type DocSection = {
  id: string
  title: string
  /** Section landing route (e.g. `/docs/ai`). Omit for pure grouping headers. */
  href?: string
  description: string
  entries: DocEntry[]
  children?: DocSection[]
}

/** Default placeholder sources for any "coming-soon" doc. */
// TODO(morgan): replace placeholder /pdf/<slug>.pdf + GitBook URLs with the
// real uploaded artifacts as they land.
const placeholderSources = (slug: string): DocSource[] => [
  { label: "PDF", href: `/pdf/${slug}.pdf`, kind: "pdf" },
  { label: "GitBook", href: `https://mycosoft.gitbook.io/${slug}`, kind: "gitbook" },
]

export const DOCS_CATALOG: DocSection[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // 1. Overview
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "overview",
    title: "Overview",
    href: "/docs",
    description:
      "Start here. What Mycosoft is, how the stack fits together, and the first 15 minutes for a new developer.",
    entries: [
      {
        title: "What is Mycosoft",
        description: "Company overview, the stack, and who this documentation is for.",
        status: "coming-soon",
        sources: placeholderSources("what-is-mycosoft"),
      },
      {
        title: "Quickstart",
        description:
          "First 15 minutes: pick a device or API, request access, and see your first data flow.",
        status: "coming-soon",
        sources: placeholderSources("quickstart"),
      },
      {
        title: "Glossary",
        description:
          "Mycology, AI, and federal-contracting terms in one place — written for newcomers.",
        status: "coming-soon",
        sources: placeholderSources("glossary"),
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 2. AI Stack
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "ai",
    title: "AI Stack",
    href: "/docs/ai",
    description:
      "MYCA, AVANI, NLM, and the deterministic-vs-stochastic decision framework for field-deployed systems.",
    entries: [
      {
        title: "MYCA",
        description:
          "Mycosoft's primary multi-agent AI orchestrator — task automation law, agent roles, deployment patterns.",
        href: "/docs/ai/myca",
        status: "coming-soon",
        sources: [
          { label: "PDF", href: "/pdf/myca-architecture.pdf", kind: "pdf" },
          { label: "GitBook", href: "https://mycosoft.gitbook.io/myca", kind: "gitbook" },
        ],
      },
      {
        title: "AVANI",
        description: "Voice and conversational interface across Mycosoft products.",
        href: "/docs/ai/avani",
        status: "coming-soon",
        sources: placeholderSources("avani"),
      },
      {
        title: "NLM",
        description:
          "Natural Language for Mycology — research model trained on mycological literature and biosignal data.",
        href: "/docs/ai/nlm",
        status: "frontier",
        sources: placeholderSources("nlm"),
      },
      {
        title: "Deterministic vs Stochastic AI",
        description:
          "When to use rule-based pipelines, LLMs, or hybrids; reliability tradeoffs in field deployments.",
        href: "/docs/ai/deterministic-vs-stochastic",
        status: "coming-soon",
        sources: placeholderSources("deterministic-vs-stochastic"),
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Multi-Agent System
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "mas",
    title: "Multi-Agent System",
    href: "/docs/mas",
    description:
      "Agent runtime, communications, audit, and the permission model that gates what can be automated.",
    entries: [
      {
        title: "MAS Overview",
        description: "Agent architecture, runtime, and how MYCA composes them.",
        status: "coming-soon",
        sources: placeholderSources("mas-overview"),
      },
      {
        title: "MYCA Task Automation Law",
        description:
          "The governing rule for what agents may and may not automate — with human-approval gates.",
        status: "coming-soon",
        sources: placeholderSources("myca-task-automation-law"),
      },
      {
        title: "Agent communications & logging",
        description: "Audit-trail expectations, message format, and how to verify agent provenance.",
        status: "coming-soon",
        sources: placeholderSources("agent-communications"),
      },
      {
        title: "Permission model",
        description: "Who can authorize what; final-approval gates and revocation flow.",
        status: "coming-soon",
        sources: placeholderSources("mas-permissions"),
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Dashboards (group only, no section landing page)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "dashboards",
    title: "Dashboards",
    description: "Operator and research dashboards built on the MYCA + MINDEX backbone.",
    entries: [
      {
        title: "NatureOS",
        description: "Operator dashboard for fleets, telemetry, and alerts.",
        href: "/docs/dashboards/natureos",
        status: "coming-soon",
        sources: placeholderSources("dashboards-natureos"),
      },
      {
        title: "Fusarium",
        description: "Research dashboard for biosignal analysis and lab work.",
        href: "/docs/dashboards/fusarium",
        status: "coming-soon",
        sources: placeholderSources("dashboards-fusarium"),
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 5. MINDEX Database
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "mindex",
    title: "MINDEX Database",
    href: "/docs/mindex",
    description:
      "The cryptographic mycological database — schemas, access tiers, and recommended query patterns.",
    entries: [
      {
        title: "Schema overview",
        description: "Tables, relationships, and the most common queries operators run.",
        status: "coming-soon",
        sources: placeholderSources("mindex-schema"),
      },
      {
        title: "Access tiers",
        description: "Public, partner, contractor, and classified tiers — what each can read and write.",
        status: "coming-soon",
        sources: placeholderSources("mindex-access-tiers"),
      },
      {
        title: "Query patterns",
        description: "Recommended joins, filters, indexes, and rate-limit considerations.",
        status: "coming-soon",
        sources: placeholderSources("mindex-query-patterns"),
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 6. APIs
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "api",
    title: "APIs",
    href: "/docs/api",
    description: "Reference docs for the REST and GraphQL surfaces, webhooks, quotas, and authentication.",
    entries: [
      {
        title: "REST API reference",
        description: "Endpoints by product, authentication scheme, and the canonical error model.",
        status: "coming-soon",
        sources: placeholderSources("api-rest"),
      },
      {
        title: "GraphQL surface",
        description: "Schema overview and example queries against the federated graph.",
        status: "coming-soon",
        sources: placeholderSources("api-graphql"),
      },
      {
        title: "Webhooks",
        description: "Event types, delivery semantics, retries, and signature verification.",
        status: "coming-soon",
        sources: placeholderSources("api-webhooks"),
      },
      {
        title: "Rate limits and quotas",
        description: "Per-tier limits, burst behaviour, and how to request a raise.",
        status: "coming-soon",
        sources: placeholderSources("api-rate-limits"),
      },
      {
        title: "Authentication",
        description: "API keys, OAuth, and mTLS for federal deployments.",
        status: "coming-soon",
        sources: placeholderSources("api-authentication"),
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 7. Devices
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "devices",
    title: "Devices",
    href: "/docs/devices",
    description: "Hardware reference: probes, edge compute, mesh nodes, and the firmware that runs on them.",
    entries: [
      {
        title: "Mushroom 1",
        description: "Edge biosignal collector.",
        href: "/docs/devices/mushroom-1",
        status: "coming-soon",
        sources: placeholderSources("devices-mushroom-1"),
      },
      {
        title: "Hyphae 1",
        description: "Distributed soil and substrate sensor network.",
        href: "/docs/devices/hyphae-1",
        status: "coming-soon",
        sources: placeholderSources("devices-hyphae-1"),
      },
      {
        title: "MycoNode",
        description: "Mesh networking node for fungal-data telemetry.",
        href: "/docs/devices/myconode",
        status: "coming-soon",
        sources: placeholderSources("devices-myconode"),
      },
      {
        title: "ALARM",
        description: "Biological detection and early-warning sensor with TinyML inference on-device.",
        href: "/docs/devices/alarm",
        status: "coming-soon",
        sources: placeholderSources("devices-alarm"),
      },
      {
        title: "MycoBrain",
        description: "Edge compute appliance running MYCA workloads on-device.",
        href: "/docs/devices/mycobrain",
        status: "coming-soon",
        sources: placeholderSources("devices-mycobrain"),
      },
      {
        title: "Agaric",
        description: "Compact field probe with audio and bioelectric sensing.",
        href: "/docs/devices/agaric",
        status: "coming-soon",
        sources: placeholderSources("devices-agaric"),
      },
      {
        title: "Psathyrella",
        description: "Subsurface and aquatic probe variant.",
        href: "/docs/devices/psathyrella",
        status: "coming-soon",
        sources: placeholderSources("devices-psathyrella"),
      },
      {
        title: "SporeBase",
        description: "Stationary lab and field base station for spore capture and analysis.",
        href: "/docs/devices/sporebase",
        status: "coming-soon",
        sources: placeholderSources("devices-sporebase"),
      },
      {
        title: "FCI Probes",
        description:
          "Fungal Computing Interface probes (research grade). Electrically active substrates, not language-capable systems.",
        href: "/docs/devices/fci-probes",
        status: "frontier",
        sources: placeholderSources("devices-fci-probes"),
      },
      {
        title: "FCI Firmware",
        description: "Firmware reference for the FCI probe family — pin maps, telemetry, OTA flow.",
        href: "/docs/fci-firmware",
        status: "stable",
        sources: [{ label: "Internal", href: "/docs/fci-firmware", kind: "internal" }],
      },
      {
        title: "Tricorder",
        description: "Handheld multi-sensor unit for field surveys.",
        href: "/docs/devices/tricorder",
        status: "coming-soon",
        sources: placeholderSources("devices-tricorder"),
      },
      {
        title: "Petraeus",
        description: "High-power deployment platform for ruggedized outdoor use.",
        href: "/docs/devices/petraeus",
        status: "coming-soon",
        sources: placeholderSources("devices-petraeus"),
      },
      {
        title: "MycoTenna",
        description: "RF and spectrum sensing array for environmental signals.",
        href: "/docs/devices/mycotenna",
        status: "coming-soon",
        sources: placeholderSources("devices-mycotenna"),
      },
      {
        title: "Mushroom 2",
        description: "Next-gen consumer and professional variant of Mushroom 1.",
        href: "/docs/devices/mushroom-2",
        status: "coming-soon",
        sources: placeholderSources("devices-mushroom-2"),
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 8. Apps
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "apps",
    title: "Apps",
    href: "/docs/apps",
    description: "Studio tools and simulators built on the Mycosoft platform.",
    entries: [
      {
        title: "Earth Simulator",
        description: "Planetary-scale environmental modeling.",
        href: "/docs/apps/earth-simulator",
        status: "coming-soon",
        sources: placeholderSources("apps-earth-simulator"),
      },
      {
        title: "Alchemy Lab",
        description: "Compound design and reaction planning.",
        href: "/docs/apps/alchemy-lab",
        status: "coming-soon",
        sources: placeholderSources("apps-alchemy-lab"),
      },
      {
        title: "Compound Sim",
        description: "Molecular simulation surface.",
        href: "/docs/apps/compound-sim",
        status: "coming-soon",
        sources: placeholderSources("apps-compound-sim"),
      },
      {
        title: "Digital Twin",
        description: "Live operational twin of a deployment site.",
        href: "/docs/apps/digital-twin",
        status: "coming-soon",
        sources: placeholderSources("apps-digital-twin"),
      },
      {
        title: "Genetic Circuit",
        description: "Synthetic-biology circuit design.",
        href: "/docs/apps/genetic-circuit",
        status: "coming-soon",
        sources: placeholderSources("apps-genetic-circuit"),
      },
      {
        title: "Growth Analytics",
        description: "Cultivation and growth metrics over time.",
        href: "/docs/apps/growth-analytics",
        status: "coming-soon",
        sources: placeholderSources("apps-growth-analytics"),
      },
      {
        title: "Lifecycle Sim",
        description: "Organism lifecycle modeling.",
        href: "/docs/apps/lifecycle-sim",
        status: "coming-soon",
        sources: placeholderSources("apps-lifecycle-sim"),
      },
      {
        title: "Mushroom Sim",
        description: "Fungal growth simulation playground.",
        href: "/docs/apps/mushroom-sim",
        status: "coming-soon",
        sources: placeholderSources("apps-mushroom-sim"),
      },
      {
        title: "Petri Dish Sim",
        description: "Lab-bench virtual experiment surface.",
        href: "/docs/apps/petri-dish-sim",
        status: "coming-soon",
        sources: placeholderSources("apps-petri-dish-sim"),
      },
      {
        title: "Physics Sim",
        description: "Underlying physics engine for environment modeling.",
        href: "/docs/apps/physics-sim",
        status: "coming-soon",
        sources: placeholderSources("apps-physics-sim"),
      },
      {
        title: "Retrosynthesis",
        description: "Retrosynthetic route planning for target compounds.",
        href: "/docs/apps/retrosynthesis",
        status: "coming-soon",
        sources: placeholderSources("apps-retrosynthesis"),
      },
      {
        title: "Spore Tracker",
        description: "Track spore release and dispersion in the field.",
        href: "/docs/apps/spore-tracker",
        status: "coming-soon",
        sources: placeholderSources("apps-spore-tracker"),
      },
      {
        title: "Symbiosis",
        description: "Multi-organism symbiosis modeling.",
        href: "/docs/apps/symbiosis",
        status: "coming-soon",
        sources: placeholderSources("apps-symbiosis"),
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 9. Open Source
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "open-source",
    title: "Open Source",
    href: "/docs/open-source",
    description: "Public Mycosoft repositories, licenses, and how to contribute.",
    entries: [
      {
        title: "Repositories",
        description: "Index of public Mycosoft repos and what each one is for.",
        status: "coming-soon",
        sources: placeholderSources("open-source-repositories"),
      },
      {
        title: "Licenses",
        description: "License-per-repo overview — what is source-available vs. OSI-licensed.",
        status: "coming-soon",
        sources: placeholderSources("open-source-licenses"),
      },
      {
        title: "Contributing",
        description: "How to file issues, propose changes, and sign the CLA.",
        status: "coming-soon",
        sources: placeholderSources("open-source-contributing"),
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 10. Defense & Government
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "defense-government",
    title: "Defense & Government",
    href: "/docs/defense-government",
    description:
      "Federal credentials, CUI handling, contracting vehicles, and operator obligations for government deployments.",
    entries: [
      {
        title: "SAM.gov & federal credentials",
        description: "UEI YK3ARVKJ77S9 · CAGE 9KR60 · Mycosoft, LLC entity.",
        status: "coming-soon",
        sources: placeholderSources("federal-credentials"),
      },
      {
        title: "CUI & export-controlled data",
        description: "Handling rules for Controlled Unclassified Information and export-controlled artifacts.",
        status: "coming-soon",
        sources: placeholderSources("cui-export-controlled"),
      },
      {
        title: "Contracting vehicles",
        description: "OTAs, SBIRs, BOOST, and other vehicles — high-level pointer for procurement teams.",
        status: "coming-soon",
        sources: placeholderSources("contracting-vehicles"),
      },
      {
        title: "Operator obligations",
        description: "Field-deployment compliance, training, and reporting requirements.",
        status: "coming-soon",
        sources: placeholderSources("operator-obligations"),
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 11. Security
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "security",
    title: "Security",
    href: "/docs/security",
    description: "Disclosure policy, device integrity, and data-security expectations across the platform.",
    entries: [
      {
        title: "Responsible disclosure",
        description: "How to report a vulnerability, and the response SLAs we hold ourselves to.",
        status: "coming-soon",
        sources: placeholderSources("security-disclosure"),
      },
      {
        title: "Reverse engineering & tampering",
        description: "What is permitted, what is not, and how to coordinate authorized research.",
        status: "coming-soon",
        sources: placeholderSources("security-reverse-engineering"),
      },
      {
        title: "Device integrity",
        description: "Signed firmware, attestation, and the chain-of-custody we enforce.",
        status: "coming-soon",
        sources: placeholderSources("security-device-integrity"),
      },
      {
        title: "Data security",
        description: "Encryption at rest, in transit, and data-classification boundaries.",
        status: "coming-soon",
        sources: placeholderSources("security-data"),
      },
    ],
  },
]

/** Lookup a section by id for type-safe consumption in pages. */
export function getSectionById(id: string): DocSection | undefined {
  return DOCS_CATALOG.find((section) => section.id === id)
}

/** Lookup an entry by its route. */
export function getEntryByHref(href: string): { section: DocSection; entry: DocEntry } | undefined {
  for (const section of DOCS_CATALOG) {
    const entry = section.entries.find((e) => e.href === href)
    if (entry) return { section, entry }
  }
  return undefined
}
