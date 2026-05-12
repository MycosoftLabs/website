import type { Metadata } from "next"
import Link from "next/link"
import { DocsLayout } from "@/components/docs/docs-layout"
import { Badge } from "@/components/ui/badge"

export const metadata: Metadata = {
  title: "What is Mycosoft",
  description:
    "Mycosoft is an environmental-intelligence and biological-interface company building a connected stack of field hardware, edge compute, AI orchestration, mycological data infrastructure, and simulation software.",
}

export default function Page() {
  return (
    <DocsLayout>
      <article className="max-w-3xl text-foreground [&_h1]:text-4xl [&_h1]:font-bold [&_h1]:mb-6 [&_h1]:scroll-mt-24 [&_h2]:mt-14 [&_h2]:pt-6 [&_h2]:mb-4 [&_h2]:border-t [&_h2]:border-border [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:scroll-mt-24 [&_h3]:mt-10 [&_h3]:mb-3 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:scroll-mt-24 [&_p]:my-4 [&_p]:leading-relaxed [&_ul]:my-4 [&_ul]:pl-6 [&_ul]:list-disc [&_ul]:space-y-2 [&_ol]:my-4 [&_ol]:pl-6 [&_ol]:list-decimal [&_ol]:space-y-2 [&_li]:leading-relaxed [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-primary/80 [&_strong]:font-semibold [&_strong]:text-foreground [&_em]:italic [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:bg-muted [&_code]:text-sm [&_hr]:my-12 [&_hr]:border-border">
        <div className="not-prose mb-4 flex flex-wrap items-center gap-2 text-sm">
          <Link href="/docs" className="text-muted-foreground hover:text-foreground">
            Documentation
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-foreground">Overview</span>
        </div>

        <h1>What is Mycosoft</h1>

        <div className="not-prose my-6 flex flex-wrap items-center gap-2">
          <Badge variant="outline">Overview</Badge>
          <Badge variant="default">Stable</Badge>
          <Badge variant="outline">Public site basis</Badge>
        </div>

        <p>
          Mycosoft is an environmental-intelligence and biological-interface company building a
          connected stack of field hardware, edge compute, AI orchestration, mycological data
          infrastructure, and simulation and analysis software. The platform senses environmental and
          fungal signals, moves them through a telemetry and provenance layer, indexes and stores
          them, and exposes them to operators and researchers through dashboards, APIs, and AI
          systems.
        </p>

        <p>
          This page is the canonical overview. It is written to match what is publicly visible on{" "}
          <a href="https://mycosoft.com/">mycosoft.com</a> today and to be honest about what is
          shipping, what is gated behind sign-in, and what is research-stage. The rest of the
          documentation goes deeper into each part.
        </p>

        <h2 id="thesis">The thesis: Nature Compute</h2>

        <p>
          Mycosoft&apos;s thesis is that technology should not dominate nature but understand it. The
          missing layer in conventional sensing is continuous, in-situ biological telemetry —
          especially below ground, in the air, and inside the fungal and microbial networks that
          underpin every ecosystem. The company&apos;s shorthand for the approach is{" "}
          <strong>Nature Compute</strong>: living networks measured, interfaced with, and used as
          grounded signal sources for environmental intelligence.
        </p>

        <p>
          In practice that translates into devices that read soil, air, water, and bioelectric
          activity; protocols that move that signal through a provenance-preserving telemetry layer;
          a database layer that indexes and correlates it; and an AI layer that grounds reasoning in
          continuous environmental context rather than only in text.
        </p>

        <h2 id="stack">The stack</h2>

        <p>
          The Mycosoft stack is built in five layers. Each layer is independently named on the public
          site; customer value compounds when they are used together.
        </p>

        <h3 id="layer-devices">1. Devices — environmental and biological sensing</h3>
        <p>
          Purpose-built field hardware. The current public device line:
        </p>
        <ul>
          <li>
            <strong>
              <Link href="/devices/mushroom-1">Mushroom 1</Link>
            </strong>{" "}
            — a ground-deployed environmental sensing platform for fungal, soil, atmospheric, and
            multimodal field data. Publicly exposed specs include up to 2 m sensing depth, ~5 km
            line-of-sight range, IP67, ESP32-S3 with 16 MB flash + 8 MB PSRAM, 32 GB local storage
            with cloud sync, ~4.5 kg, 30 × 30 × 100 cm, and roughly six months of solar-rechargeable
            battery life. The device page also names 4K vision, radar / LiDAR, BME690 gas sensing,
            software-defined radio, and a ground-actuated FCI probe.
          </li>
          <li>
            <strong>
              <Link href="/devices/sporebase">SporeBase</Link>
            </strong>{" "}
            — a bioaerosol collection system that produces time-indexed physical samples while
            preserving environmental context. Publicly exposed specs include 2,880 sample intervals
            per cassette, 30-day cassettes, a 15-minute default cadence, IP65 design target, LoRa
            mesh with optional Wi-Fi or cellular, MPPT solar + Li-ion battery, dual ESP32-S3
            controllers, microSD storage (32–256 GB), and approximately 194 × 149 × 53 mm.
          </li>
          <li>
            <strong>
              <Link href="/devices/hyphae-1">Hyphae 1</Link>
            </strong>{" "}
            — the exterior edge-compute and sensing-node family. Publicly named variants are
            Compact, Standard, and Industrial. The public page describes MycoBrain + Jetson compute,
            multi-modal sensing, Ethernet / Wi-Fi / LoRa / LTE / 5G options, and an IP66-class /
            NEMA 4X-equivalent outdoor mechanical intent. Exact workload power and BOM are
            configuration-specific.
          </li>
          <li>
            <strong>
              <Link href="/devices/myconode">MycoNode</Link>
            </strong>{" "}
            — a subsurface bioelectric probe and mesh-networking node for fungal-data telemetry and
            local sensing.
          </li>
          <li>
            <strong>
              <Link href="/devices/alarm">ALARM</Link>
            </strong>{" "}
            — a biological detection and early-warning device with on-device TinyML inference.
          </li>
          <li>
            <strong>
              <Link href="/devices/agaric">Agaric</Link>
            </strong>{" "}
            — the flying platform for aerial survey, mesh extension, over-the-horizon work, and
            payload delivery of Mushroom 1, MycoNode, or SporeBase to remote terrain. Replaces the
            earlier MycoDrone concept.
          </li>
          <li>
            <strong>
              <Link href="/devices/psathyrella">Psathyrella</Link>
            </strong>{" "}
            — a water buoy / surface platform for aquatic environmental intelligence.
          </li>
          <li>
            <strong>
              <Link href="/devices/mycobrain">MycoBrain</Link>
            </strong>{" "}
            — the edge-compute module that ships inside Mycosoft devices and runs the firmware
            stack locally before signal leaves the device.
          </li>
        </ul>
        <p>
          Full specifications for each device live at <Link href="/devices">/devices</Link>. The
          device pages publish dimensions, sensor channels, power profiles, and connectivity
          options.
        </p>

        <h3 id="device-ownership">How devices are provided</h3>
        <p>
          Mycosoft devices are <strong>not sold as individual consumer units</strong>. They are
          data sensors and droids that operate collectively for the multi-agent system and the
          decentralized environmental database. Every device in the field is{" "}
          <strong>owned, operated, and maintained by Mycosoft</strong>.
        </p>
        <p>
          Commercial and civilian partners do not purchase devices. Instead, they{" "}
          <strong>subscribe to the data-access software system</strong> (NatureOS, MINDEX, MYCA,
          and related surfaces). Where a partner&apos;s property is useful to the network, devices
          can be hosted on that property in exchange for the data, signal, environmental coverage,
          or resources the property provides. Mycosoft retains full ownership and operational
          control of the hardware throughout.
        </p>
        <p>
          <strong>Defense exception.</strong> The U.S. Department of Defense and affiliated
          military branches are the only customers to whom Mycosoft delivers devices and systems
          as discrete contractual deliverables. Those engagements run through federal contracting
          vehicles (OTAs, BAAs, SBIRs, and programmes of record) and are governed by the relevant
          contract terms, not by the commercial data-access model.
        </p>

        <h3 id="layer-protocols">2. Telemetry and provenance — Mycorrhizae Protocol, FCI</h3>
        <p>
          Devices speak two public protocols that move signal through the stack while preserving
          chain-of-custody:
        </p>
        <ul>
          <li>
            <strong>Mycorrhizae Protocol</strong> — the public device-telemetry and sensor-mesh
            standard. Mushroom 1 and SporeBase explicitly route structured field data through it,
            and SporeBase additionally uses it to encode chain-of-custody for time-indexed samples.
          </li>
          <li>
            <strong>FCI — Fungal Computer Interface</strong> — the bridge between living mycelial
            networks and digital systems. On Mushroom 1, FCI is a deployable, ground-actuated probe
            into soil, roots, fungal networks, gas exchange, moisture gradients, and bioelectric
            activity. FCI is also indexed in MINDEX and surfaced through NatureOS.
          </li>
        </ul>

        <h3 id="layer-data">3. Data and indexing — MINDEX</h3>
        <p>
          <strong>MINDEX</strong> is the public name for the company&apos;s mycological database and
          provenance layer. The About page describes it as a global fungal species intelligence
          database; the documentation index frames it as a cryptographic mycological database with
          schema, access tiers, and query patterns planned. On device pages it is also where
          chain-of-custody records and long-term storage are surfaced, particularly for Mushroom 1
          and SporeBase. Detailed schema documentation is currently marked coming soon.
        </p>

        <h3 id="layer-ai">4. AI — MYCA, AVANI, NLM</h3>
        <p>
          The AI layer is the part of the stack most visible in the public navigation. Three named
          systems work together:
        </p>
        <ul>
          <li>
            <strong>
              <Link href="/myca">MYCA</Link>
            </strong>{" "}
            — the company&apos;s primary operating intelligence. An edge-native, multi-agent system
            running in distributed edge data centers embedded in dedicated hardware and nodes, not
            only in centralised cloud. MYCA is described as the structured &ldquo;hand&rdquo; in the
            stack, coordinating agents, tasks, APIs, and local reasoning. Public technical specs
            name a 6-state consciousness model and a 6-layer memory architecture. MYCA is being
            built toward <strong>1,000+ specialised agents</strong> across 14 categories.
          </li>
          <li>
            <strong>
              <Link href="/ai/avani">AVANI</Link>
            </strong>{" "}
            — the live Earth substrate for MYCA: the &ldquo;palm&rdquo; that ingests, harmonises,
            and serves climate, sensor, infrastructure, and remote-sensing signals so MYCA acts with
            real environmental context. AVANI&apos;s public architecture is a layered design (input,
            processing, model, serving) with a constitution centred on planetary primacy, human
            legibility, privacy and sovereignty, safety and resilience, and alignment with MYCA.
          </li>
          <li>
            <strong>NLM — Nature Learning Model</strong> — the reasoning backbone that learns from
            environmental and biological signal rather than only from text. NLM is described on the
            AI and device pages as the model layer behind MYCA-grounded reasoning.
          </li>
        </ul>

        <h3 id="layer-platform">5. Platform and apps — NatureOS, MINDEX, AI Studio, simulation</h3>
        <p>
          The operator-facing layer is presented under the NatureOS umbrella. Several of the
          overview pages are currently gated behind sign-in; the public site names them, but the
          full interfaces are accessible to authenticated users today.
        </p>
        <ul>
          <li>
            <strong>NatureOS</strong> — the cloud and edge platform for environmental intelligence.
            Public copy describes it as a cloud OS, an Earth-intelligence workflow layer, and an
            operator dashboard for fleets, telemetry, and alerts.
          </li>
          <li>
            <strong>AI Studio</strong> — &ldquo;MYCA agent orchestration and model training.&rdquo;
            Currently sign-in gated.
          </li>
          <li>
            <strong>Earth Simulator / CREP</strong> — the Common Relevant Environmental Picture.
            Earth Simulator is the runtime; CREP is the name for what it produces and how it is
            used: a fused, time-aligned worldview combining device telemetry, public data, species,
            sensors, missions, and live planetary context into a single shared operational picture
            for operators and partners. Same surface, two names.
          </li>
          <li>
            <strong>Fungi Compute</strong> — biological-computing visualisation; mycelial neural
            networks and bio-compute exploration.
          </li>
          <li>
            <strong>Ancestry Database</strong> — fungal genealogy and genomics explorer.
          </li>
          <li>
            <strong>Petri Dish Simulator</strong> — virtual culture-growth simulation and a
            lab-bench experiment surface.
          </li>
          <li>
            <strong>Compound Analyzer</strong> — chemical compound analysis (the documentation
            index also separately names Alchemy Lab and Compound Sim).
          </li>
          <li>
            <strong>Genomics Tools</strong> — genome browsers and visualisation.
          </li>
        </ul>

        <p>
          The documentation index also publicly advertises additional studio tools — Alchemy Lab,
          Compound Sim, Digital Twin, Genetic Circuit, Growth Analytics, Lifecycle Sim, Mushroom Sim,
          Physics Sim, Retrosynthesis, Spore Tracker, and Symbiosis — most of which are marked{" "}
          <em>Coming soon</em>. Their names and one-line purposes are public; their interfaces are
          not yet generally available.
        </p>

        <h2 id="use-cases">Use cases</h2>

        <p>
          The public use cases point first toward <strong>environmental sensing where biological
          signals matter before surface indicators do</strong>: early anomaly detection,
          infrastructure resilience, agricultural and ecological intelligence, climate-adaptive land
          management, and contamination response. The argument is that continuous in-situ biological
          telemetry is the missing layer in conventional environmental sensing.
        </p>

        <p>
          SporeBase expands the envelope into <strong>airborne biology and temporal sampling</strong>{" "}
          — mycology research, allergy forecasting, agriculture, and air-quality monitoring — because
          it produces a time-indexed physical sample record rather than only a momentary reading.
          The stack is not only about inference from live telemetry; it is also about preserving
          material samples and provenance for later lab work.
        </p>

        <p>
          Mushroom 1 adds <strong>field ecological sensing and direct substrate interaction</strong>,
          publicly tying multimodal environmental sensing to FCI and to MYCA-grounded reasoning.
          Hyphae 1 broadens the envelope toward <strong>exterior edge compute at sites, campuses,
          industrial estates, laboratories, and agriculture</strong>, where correlation and local
          processing are needed outside the building rather than only in the cloud.
        </p>

        <p>
          Taken together, the public basis is: field sensing, bioaerosol capture, exterior edge
          compute, database and provenance, and AI reasoning — for ecology, research, air quality,
          agriculture, site monitoring, and environmental operations.
        </p>

        <h2 id="philosophy">Philosophy</h2>

        <p>
          The site&apos;s governing philosophy is unusually explicit. About says technology should not
          dominate nature but understand it. Mycosoft repeatedly frames the platform as hybrid
          biological-digital computing rooted in biological respect, decentralised intelligence,
          sustainability, and environmental stewardship.
        </p>

        <p>
          The AI and AVANI pages add a second layer: <strong>human legibility, privacy and
          sovereignty, uncertainty awareness, and multi-stakeholder governance</strong>. AVANI&apos;s
          constitution says outputs should remain explainable and privacy-respecting and should
          explicitly surface uncertainty under partial data. MYCA&apos;s philosophy section says the
          system is built with the goal of treating all organisms as users, adopting a reality-first
          principle in which biological networks are not only data sources but active experimental
          partners.
        </p>

        <p>
          That is why public copy across the site emphasises grounding, accountability, provenance,
          and environmental context over generic AI-chatbot language.
        </p>

        <h2 id="how-to-engage">How to engage</h2>

        <h3 id="for-investors">If you are an investor</h3>
        <p>
          The short version: Mycosoft is a vertically integrated environmental-intelligence stack —
          devices, telemetry, provenance, AI, and platform — sold into research, commercial, and
          institutional customers. For materials shared under NDA, contact{" "}
          <a href="mailto:contact@mycosoft.com">contact@mycosoft.com</a>.
        </p>

        <h3 id="for-customers">If you are a customer or researcher</h3>
        <p>
          Start with <Link href="/docs/quickstart">Quickstart</Link>. It walks you from
          &ldquo;I&apos;ve heard of Mycosoft&rdquo; to your first data flowing — which device or API
          fits, how to request access, and where the data lands.
        </p>

        <h3 id="for-developers">If you are a developer or partner</h3>
        <p>
          The MYCA white paper, device datasheets, brochures, full specifications, CAD models, and
          engineering illustrations are advertised on the documentation index. The API documentation
          headings — REST, GraphQL, Webhooks, rate limits and quotas, authentication — are public
          but currently marked <em>Coming soon</em>. Open-source repository, license, and contributing
          headings exist as public sections and are being filled in.
        </p>

        <h2 id="status">Status, openness, and how to read this site</h2>

        <h3 id="status-labels">Status labels you will see in these docs</h3>
        <ul>
          <li>
            <strong>Stable</strong> — shipping today, supported, covered by the standard{" "}
            <Link href="/terms">Terms of Service</Link>.
          </li>
          <li>
            <strong>Draft</strong> — being built right now; documentation reflects current direction
            but specifics will change.
          </li>
          <li>
            <strong>Frontier</strong> — multi-year research; no product commitment, no shipping date.
            Read as ambition, not roadmap.
          </li>
          <li>
            <strong>Coming soon</strong> — the document exists in outline; the page is being written.
          </li>
        </ul>

        <h3 id="gated-vs-public">What is public versus gated</h3>
        <p>
          The site publicly names a coherent stack, but several overview interfaces — NatureOS, Apps,
          AI Studio — currently redirect to sign-in. The accurate present-tense basis is: the public
          site names the platform, while much of the detailed documentation and some interfaces
          remain gated, pending, or research-stage. Where this page describes a system that is
          gated, the description is grounded in the public marketing pages for that system, not in
          the gated interface itself.
        </p>

        <h2 id="contact">Contact</h2>
        <ul>
          <li>
            General — <a href="mailto:contact@mycosoft.com">contact@mycosoft.com</a>
          </li>
          <li>
            Engineering — <a href="https://github.com/MycosoftLabs">github.com/MycosoftLabs</a>
          </li>
          <li>
            Research writing — <a href="https://medium.com/@mycosoft.inc">medium.com/@mycosoft.inc</a>
          </li>
          <li>
            Public channels —{" "}
            <a href="https://www.linkedin.com/company/mycosoft">LinkedIn</a>,{" "}
            <a href="https://x.com/Mycosoft">X</a>,{" "}
            <a href="https://www.youtube.com/channel/UCUUEOg35426XDmZ9sPXbDYg">YouTube</a>,{" "}
            <a href="https://www.crunchbase.com/organization/mycosoft">Crunchbase</a>
          </li>
        </ul>

        <hr />

        <p className="text-sm text-muted-foreground">
          Next: <Link href="/docs/quickstart">Quickstart →</Link> ·{" "}
          <Link href="/docs/glossary">Glossary →</Link>
        </p>
      </article>
    </DocsLayout>
  )
}
