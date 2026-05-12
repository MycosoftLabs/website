import type { Metadata } from "next"
import Link from "next/link"
import { DocsLayout } from "@/components/docs/docs-layout"
import { Badge } from "@/components/ui/badge"

export const metadata: Metadata = {
  title: "Glossary",
  description:
    "Every Mycosoft-specific term, plus the AI, mycology, and federal contracting vocabulary you will meet in our documentation — written for newcomers.",
}

export default function Page() {
  return (
    <DocsLayout>
      <article className="prose prose-neutral dark:prose-invert max-w-3xl prose-headings:scroll-mt-24 prose-h1:text-4xl prose-h2:mt-14 prose-h2:pt-6 prose-h2:border-t prose-h2:border-border prose-h2:text-2xl prose-h2:font-bold prose-h3:mt-10 prose-h3:text-xl prose-h3:font-semibold prose-p:leading-relaxed prose-li:leading-relaxed prose-ul:my-4 prose-dl:my-6">
        <div className="not-prose mb-4 flex flex-wrap items-center gap-2 text-sm">
          <Link href="/docs" className="text-muted-foreground hover:text-foreground">
            Documentation
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-foreground">Overview</span>
        </div>

        <h1>Glossary</h1>

        <div className="not-prose my-6 flex flex-wrap items-center gap-2">
          <Badge variant="outline">Overview</Badge>
          <Badge variant="default">Stable</Badge>
          <Badge variant="outline">Living document</Badge>
        </div>

        <p>
          One place to look up every term you will hit in the Mycosoft docs. Grouped into five
          sections — company &amp; products, platform &amp; AI, devices &amp; firmware,
          mycology &amp; biology, and federal contracting. Cross-references link to the canonical
          documentation for each concept.
        </p>

        <div className="not-prose my-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          <a href="#company" className="rounded-md border border-border bg-card px-3 py-2 hover:bg-accent">
            Company &amp; products
          </a>
          <a href="#platform" className="rounded-md border border-border bg-card px-3 py-2 hover:bg-accent">
            Platform &amp; AI
          </a>
          <a href="#devices" className="rounded-md border border-border bg-card px-3 py-2 hover:bg-accent">
            Devices &amp; firmware
          </a>
          <a href="#biology" className="rounded-md border border-border bg-card px-3 py-2 hover:bg-accent">
            Mycology &amp; biology
          </a>
          <a href="#federal" className="rounded-md border border-border bg-card px-3 py-2 hover:bg-accent">
            Federal contracting
          </a>
          <a href="#status-labels" className="rounded-md border border-border bg-card px-3 py-2 hover:bg-accent">
            Status labels
          </a>
        </div>

        <h2 id="company">Company &amp; products</h2>

        <dl>
          <dt><strong>Mycosoft, Inc.</strong></dt>
          <dd>
            Delaware C-Corporation. The parent company, investor-of-record, and licensor of
            platform intellectual property.
          </dd>

          <dt><strong>Mycosoft, LLC</strong></dt>
          <dd>
            California limited liability company; operating subsidiary. The federal contracting
            entity and the party that signs most pilot, reseller, and field-deployment
            agreements. Holds UEI <span className="font-mono">YK3ARVKJ77S9</span> and CAGE{" "}
            <span className="font-mono">9KR60</span>.
          </dd>

          <dt><strong>MycoLabs</strong> / <strong>MycosoftLabs</strong></dt>
          <dd>
            Public engineering presence on GitHub:{" "}
            <a href="https://github.com/MycosoftLabs">github.com/MycosoftLabs</a>.
          </dd>

          <dt><strong>NatureOS</strong></dt>
          <dd>
            The Mycosoft operating platform. Cloud + edge services that ingest device signal and
            public environmental data, store it, model it, and expose it through dashboards,
            APIs, and agentic interfaces.{" "}
            <Link href="/docs/dashboards">Dashboards →</Link>
          </dd>

          <dt><strong>Earth Simulator</strong></dt>
          <dd>
            Environmental world-model service inside NatureOS. Used for scenario generation,
            simulation-backed model training, and what-if analysis against live telemetry.
          </dd>

          <dt><strong>MINDEX</strong></dt>
          <dd>
            The indexed data plane — Postgres-backed store of record for telemetry, specimen
            records, chain-of-custody, and model outputs.{" "}
            <Link href="/docs/mindex">MINDEX →</Link>
          </dd>

          <dt><strong>AI Studio</strong></dt>
          <dd>
            Model training, evaluation, and deployment surface for internal and partner ML work.
          </dd>

          <dt><strong>CREP</strong></dt>
          <dd>
            Compliance, Reporting, and Evidence Pipeline. The audit and chain-of-custody layer
            for regulated work and defence deployments.
          </dd>

          <dt><strong>OEI</strong></dt>
          <dd>
            Open Environmental Intelligence — the public-data ingestion layer covering AIS,
            ADS-B, satellite imagery, weather, biodiversity records, and other open feeds.
          </dd>

          <dt><strong>FUSARIUM</strong></dt>
          <dd>
            Field intelligence and defence-deployment programme; a named operational stack inside
            Mycosoft for environmental and biosurveillance use cases.
          </dd>

          <dt><strong>Mycorrhizae Protocol</strong></dt>
          <dd>
            Inter-device protocol for moving signal between Mycosoft devices, edge nodes, and the
            NatureOS cloud — analogous to how mycorrhizal networks shuttle resources between
            plants and fungi.
          </dd>

          <dt><strong>HPL</strong></dt>
          <dd>
            Higher-level platform protocol used between NatureOS services and external partner
            systems.
          </dd>

          <dt><strong>Apps</strong></dt>
          <dd>
            The library of focused web apps on top of NatureOS: <em>earth-simulator</em>,{" "}
            <em>alchemy-lab</em>, <em>compound-sim</em>, <em>digital-twin</em>,{" "}
            <em>genetic-circuit</em>, <em>growth-analytics</em>, <em>lifecycle-sim</em>,{" "}
            <em>mushroom-sim</em>, <em>petri-dish-sim</em>, <em>physics-sim</em>,{" "}
            <em>retrosynthesis</em>, <em>spore-tracker</em>, and <em>symbiosis</em>.{" "}
            <Link href="/docs/apps">Apps →</Link>
          </dd>
        </dl>

        <h2 id="platform">Platform &amp; AI</h2>

        <dl>
          <dt><strong>MYCA</strong></dt>
          <dd>
            Mycosoft&apos;s multi-agent AI orchestrator. Routes work across specialised agents
            under the <strong>Task Automation Law</strong> that governs delegation, escalation,
            and human-in-the-loop checkpoints. <Link href="/docs/ai/myca">MYCA →</Link>
          </dd>

          <dt><strong>MAS</strong></dt>
          <dd>
            Mycosoft Agent Swarm runtime. The deployment-side execution environment that hosts
            agents in production, including resource limits, retries, and observability.{" "}
            <Link href="/docs/mas">MAS →</Link>
          </dd>

          <dt><strong>AVANI</strong></dt>
          <dd>
            Voice and conversational interface across Mycosoft products. The layer customers and
            operators speak to. <Link href="/docs/ai/avani">AVANI →</Link>
          </dd>

          <dt><strong>NLM</strong></dt>
          <dd>
            A frontier research programme on natural-language-to-signal interfaces. Labelled
            frontier; not a shipping product. <Link href="/docs/ai/nlm">NLM →</Link>
          </dd>

          <dt><strong>Task Automation Law</strong></dt>
          <dd>
            The governance contract every MYCA-orchestrated agent operates under. Defines what an
            agent may decide on its own, what it must escalate, what it must log, and where
            human approval is required.
          </dd>

          <dt><strong>Deterministic vs stochastic AI</strong></dt>
          <dd>
            The decision framework Mycosoft uses for field-deployed systems. Deterministic
            pipelines (rules, classical algorithms) own anything safety-critical or
            regulated; stochastic systems (LLMs, frontier models) are used for reasoning,
            drafting, and exploration — never as the sole decision-maker for a field action.{" "}
            <Link href="/docs/ai/deterministic-vs-stochastic">Read more →</Link>
          </dd>

          <dt><strong>Chain-of-custody record</strong></dt>
          <dd>
            A cryptographically signed log entry that tracks who handled a sample, signal, or
            artifact and when. CREP produces and stores chain-of-custody records for regulated
            workflows.
          </dd>

          <dt><strong>Telemetry</strong></dt>
          <dd>
            The continuous stream of measured readings from a device — environmental channels
            (temperature, humidity, gas), bioelectric channels, and device-health metadata.
          </dd>

          <dt><strong>Digital twin</strong></dt>
          <dd>
            A live, simulation-backed representation of a physical specimen, device, or
            environment, kept in sync with real telemetry via NatureOS and Earth Simulator.
          </dd>
        </dl>

        <h2 id="devices">Devices &amp; firmware</h2>

        <dl>
          <dt><strong>FCI</strong> — Fungal Computer Interface</dt>
          <dd>
            Two meanings: (1) the firmware stack that runs on every Mycosoft device and on
            partner boards (BME688 / BSEC2 environmental sensing, bioelectric sampling,
            MQTT/HTTP APIs, OTA updates); and (2) the broader multi-year R&amp;D programme
            building higher-bandwidth fungal computer interfaces. The firmware is{" "}
            <em>stable</em>; the broader programme is <em>frontier</em>.{" "}
            <Link href="/docs/fci-firmware">FCI firmware →</Link>
          </dd>

          <dt><strong>Mushroom 1</strong></dt>
          <dd>
            Flagship Mycosoft device. Substrate-grown mycelium probe that records bioelectric
            activity and environmental signal, forwarded to NatureOS.
          </dd>

          <dt><strong>Hyphae 1</strong></dt>
          <dd>
            Compact, lower-cost growth and signal node for lab benches, classrooms, and
            citizen-science deployments.
          </dd>

          <dt><strong>MycoBrain</strong></dt>
          <dd>
            The ESP32-class embedded compute board that runs the FCI firmware inside finished
            devices.
          </dd>

          <dt><strong>MycoNode</strong></dt>
          <dd>
            Environmental gateway / edge node. Aggregates signal from multiple devices and
            brokers it to the cloud.
          </dd>

          <dt><strong>SporeBase</strong></dt>
          <dd>
            Spore-sampling and chain-of-custody hardware module used in laboratory and field
            workflows.
          </dd>

          <dt><strong>ALARM</strong></dt>
          <dd>
            Early-warning sensor unit for biological and environmental anomalies.
          </dd>

          <dt><strong>Agaric</strong></dt>
          <dd>
            Reference development board for partners and integrators building on top of FCI
            firmware.
          </dd>

          <dt><strong>Psathyrella</strong> <em className="text-muted-foreground">(draft)</em></dt>
          <dd>
            Specialised field-sampling device under partial build; status will move to stable
            once shipping.
          </dd>

          <dt><strong>BME688</strong></dt>
          <dd>
            Bosch four-in-one environmental sensor (temperature, humidity, pressure, VOC / gas
            resistance) used throughout the Mycosoft device line.
          </dd>

          <dt><strong>BSEC2</strong></dt>
          <dd>
            Bosch Sensortec Environmental Cluster library, version 2 — the gas-classification and
            calibration runtime layered on top of BME688.
          </dd>

          <dt><strong>Bioelectric signal</strong></dt>
          <dd>
            Voltage and current measurements taken across or within living tissue — in our case,
            mycelium. The primary biological channel Mushroom 1 and Hyphae 1 record.
          </dd>

          <dt><strong>OTA</strong></dt>
          <dd>
            Over-the-air firmware update. Mycosoft devices receive signed OTA updates via the
            NatureOS device-management service.
          </dd>

          <dt><strong>FCI protocol</strong></dt>
          <dd>
            The on-wire and over-network message format that FCI firmware uses to publish
            samples, sensor frames, and device events.
          </dd>
        </dl>

        <h2 id="biology">Mycology &amp; biology</h2>

        <dl>
          <dt><strong>Mycelium</strong></dt>
          <dd>
            The vegetative, thread-like body of a fungus — a network of fine filaments called
            hyphae. Mushroom 1 grows mycelium on a controlled substrate and records its
            electrical and environmental activity.
          </dd>

          <dt><strong>Hyphae</strong></dt>
          <dd>
            The individual filaments that make up mycelium. Hyphae 1 takes its name from these.
          </dd>

          <dt><strong>Fruiting body</strong></dt>
          <dd>
            The reproductive structure of a fungus — the &ldquo;mushroom&rdquo; in everyday
            language. Most of the organism&apos;s mass and information lives below it, in the
            mycelium.
          </dd>

          <dt><strong>Substrate</strong></dt>
          <dd>
            The growth medium that mycelium colonises — wood chips, grain, agar, controlled
            blends. Substrate composition directly affects signal quality.
          </dd>

          <dt><strong>Mycorrhiza</strong></dt>
          <dd>
            A symbiotic relationship between fungal mycelium and plant roots. Inspires (and
            names) the Mycorrhizae Protocol used between Mycosoft devices.
          </dd>

          <dt><strong>Spore</strong></dt>
          <dd>
            The reproductive unit of a fungus. SporeBase and the spore-tracker app deal with
            collection, identification, and chain-of-custody for spores.
          </dd>

          <dt><strong>Symbiosis</strong></dt>
          <dd>
            A long-term biological interaction between two organisms. The{" "}
            <em>symbiosis</em> app models and visualises symbiotic systems.
          </dd>

          <dt><strong>Retrosynthesis</strong></dt>
          <dd>
            A chemistry planning technique for working backwards from a target molecule to viable
            precursors. The <em>retrosynthesis</em> app exposes this for compounds of interest
            in mycology and biotechnology.
          </dd>

          <dt><strong>Bioaerosol</strong></dt>
          <dd>
            Airborne biological particles — spores, bacteria, fragments. Mycosoft sensor kits
            include bioaerosol collection in some deployments.
          </dd>
        </dl>

        <h2 id="federal">Federal contracting</h2>

        <dl>
          <dt><strong>SAM.gov</strong></dt>
          <dd>
            The U.S. federal System for Award Management. The required registry for any entity
            receiving federal contracts, grants, or sub-awards. Mycosoft, LLC&apos;s registration
            is active through April 2027.
          </dd>

          <dt><strong>UEI</strong> — Unique Entity Identifier</dt>
          <dd>
            The 12-character federal identifier that replaced DUNS in 2022. Mycosoft, LLC&apos;s
            UEI is <span className="font-mono">YK3ARVKJ77S9</span>.
          </dd>

          <dt><strong>CAGE code</strong></dt>
          <dd>
            Commercial And Government Entity code — a 5-character identifier assigned by the
            Defense Logistics Agency. Mycosoft, LLC&apos;s CAGE is{" "}
            <span className="font-mono">9KR60</span>.
          </dd>

          <dt><strong>FAR</strong></dt>
          <dd>
            Federal Acquisition Regulation — the primary regulation governing how U.S. federal
            agencies acquire goods and services.
          </dd>

          <dt><strong>DFARS</strong></dt>
          <dd>
            Defense Federal Acquisition Regulation Supplement — the DoD-specific supplement to
            the FAR.
          </dd>

          <dt><strong>OTA</strong> — Other Transaction Authority</dt>
          <dd>
            A non-traditional contracting authority used by DoD and select agencies to acquire
            prototypes and research outside the FAR. Not to be confused with over-the-air
            firmware updates (also abbreviated OTA in the device section above).
          </dd>

          <dt><strong>CSO</strong></dt>
          <dd>
            Commercial Solutions Opening — a competitive acquisition vehicle that lets agencies
            solicit innovative solutions on shorter timelines.
          </dd>

          <dt><strong>SBIR / STTR</strong></dt>
          <dd>
            Small Business Innovation Research / Small Business Technology Transfer — federal
            R&amp;D funding programmes for small businesses; STTR requires a research-institution
            partner.
          </dd>

          <dt><strong>SAFE</strong></dt>
          <dd>
            Simple Agreement for Future Equity — a startup financing instrument. Used by
            Mycosoft, Inc. in early-stage rounds. Distinct from federal contracting acronyms.
          </dd>

          <dt><strong>Capability statement</strong></dt>
          <dd>
            A short, structured document a federal vendor uses to introduce itself to a
            contracting officer — what it does, NAICS codes, past performance, and key
            differentiators.
          </dd>

          <dt><strong>Teaming agreement</strong></dt>
          <dd>
            A contract between a prime contractor and one or more subcontractors covering how
            they will jointly pursue and execute a federal opportunity.
          </dd>

          <dt><strong>Prime contractor / subcontractor</strong></dt>
          <dd>
            The prime holds the federal contract directly with the agency; subcontractors hold
            contracts with the prime. Mycosoft, LLC engages in both roles depending on the
            programme.
          </dd>

          <dt><strong>Deployment Sponsor</strong></dt>
          <dd>
            Defined in the <Link href="/terms">Mycosoft Terms of Service</Link>: the person or
            entity responsible for authorising, funding, directing, hosting, purchasing,
            leasing, permitting, or benefiting from a field deployment.
          </dd>

          <dt><strong>NAICS code</strong></dt>
          <dd>
            North American Industry Classification System code — used by federal procurement to
            categorise vendors by industry.
          </dd>
        </dl>

        <h2 id="status-labels">Status labels used in these docs</h2>

        <dl>
          <dt><strong>Stable</strong></dt>
          <dd>
            Shipping today, supported, and covered by the standard{" "}
            <Link href="/terms">Terms of Service</Link>.
          </dd>

          <dt><strong>Draft</strong></dt>
          <dd>
            Being built right now; the documentation reflects current direction but specifics
            will change.
          </dd>

          <dt><strong>Frontier</strong></dt>
          <dd>
            Multi-year research programme. Read as ambition, not roadmap. No product commitment
            and no shipping date.
          </dd>

          <dt><strong>Coming soon</strong></dt>
          <dd>
            The document exists in outline; the page is being written.
          </dd>
        </dl>

        <hr className="my-12" />

        <p className="text-sm text-muted-foreground">
          Back to: <Link href="/docs/what-is-mycosoft">What is Mycosoft</Link> ·{" "}
          <Link href="/docs/quickstart">Quickstart</Link>
        </p>
      </article>
    </DocsLayout>
  )
}
