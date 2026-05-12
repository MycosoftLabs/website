import type { Metadata } from "next"
import Link from "next/link"
import { DocsLayout } from "@/components/docs/docs-layout"
import { Badge } from "@/components/ui/badge"

export const metadata: Metadata = {
  title: "What is Mycosoft",
  description:
    "Company overview, the full Mycosoft stack, and who this documentation is for — written for investors, customers, partners, and developers.",
}

export default function Page() {
  return (
    <DocsLayout>
      <article className="prose prose-neutral dark:prose-invert max-w-3xl prose-headings:scroll-mt-24 prose-h1:text-4xl prose-h2:mt-14 prose-h2:pt-6 prose-h2:border-t prose-h2:border-border prose-h2:text-2xl prose-h2:font-bold prose-h3:mt-10 prose-h3:text-xl prose-h3:font-semibold prose-p:leading-relaxed prose-li:leading-relaxed prose-ul:my-4">
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
          <Badge variant="outline">For investors · customers · developers</Badge>
        </div>

        <p>
          Mycosoft is a biotechnology and software company building the operating layer for
          biological intelligence — the systems, devices, and services that let humans observe,
          model, and act on the living world. We design fungal-aware sensors, train AI models on
          environmental and biological signal, run autonomous agent platforms for science and
          operations, and deliver this stack to commercial, research, and defense customers under
          a single software identity called <strong>NatureOS</strong>.
        </p>

        <p>
          This page is the canonical, one-stop overview. It is written so an investor can read it
          end-to-end in fifteen minutes and understand exactly what Mycosoft sells, how the
          technology is composed, who the customers are, and where the company is in its build.
          Engineers and partners get the same picture — the rest of the docs site goes deeper into
          each piece.
        </p>

        <h2 id="company">The company</h2>

        <h3 id="entities">Legal entities</h3>
        <p>
          Mycosoft operates as two entities working in parallel:
        </p>
        <ul>
          <li>
            <strong>Mycosoft, Inc.</strong> — a Delaware C-Corporation. This is the parent
            company, the investment vehicle, and the licensor of platform intellectual property.
          </li>
          <li>
            <strong>Mycosoft, LLC</strong> — a California limited liability company and operating
            subsidiary. This is the federal contracting entity, the manufacturing entity, and the
            party that signs most field deployment, reseller, and pilot agreements.
          </li>
        </ul>
        <p>
          Federal credentials are held by Mycosoft, LLC: UEI{" "}
          <span className="font-mono">YK3ARVKJ77S9</span>, CAGE{" "}
          <span className="font-mono">9KR60</span>, with an active SAM.gov registration valid
          through April 2027.
        </p>

        <h3 id="mission">Mission</h3>
        <p>
          Build the substrate that lets biology, sensors, and AI cooperate at planetary scale —
          starting with fungi, because mycelium is already the world&apos;s most distributed
          biological network and the most undersampled signal source on Earth. Every Mycosoft
          product earns its place by feeding, modelling, or acting on that signal.
        </p>

        <h3 id="how-we-talk">How we talk about what we do</h3>
        <p>
          We are deliberate about claims. Mycosoft ships measurable systems — sensors that record
          bioelectric activity, dashboards that visualise environmental telemetry, agents that
          execute defined workflows. We do <em>not</em> claim that fungi are language-capable
          computers, that Wi-Fi sensing gives planetary perception, or that interspecies
          translation is a solved problem. Research that explores those frontiers is labelled{" "}
          <em>frontier</em> throughout the documentation; commercial work is labelled{" "}
          <em>stable</em>.
        </p>

        <h2 id="stack">The stack at a glance</h2>

        <p>
          Mycosoft is built in five layers. Each layer is independently usable, but the customer
          value compounds when they are combined.
        </p>

        <h3 id="layer-devices">1. Devices — biological and environmental sensing</h3>
        <p>
          Field hardware that captures signal from living systems and their environments.
          Production lineup today:
        </p>
        <ul>
          <li>
            <strong>Mushroom 1</strong> — the flagship fungal computer interface device; records
            bioelectric activity from substrate-grown mycelium and forwards it to NatureOS.
          </li>
          <li>
            <strong>Hyphae 1</strong> — a smaller, lower-cost growth and signal node intended for
            lab benches, classrooms, and citizen-science deployments.
          </li>
          <li>
            <strong>MycoBrain</strong> — the embedded compute board (ESP32-class) that runs the
            FCI firmware and ships inside Mushroom 1 and Hyphae 1.
          </li>
          <li>
            <strong>MycoNode</strong> — an environmental gateway / edge node that aggregates
            signal from multiple devices and brokers it to the cloud.
          </li>
          <li>
            <strong>SporeBase</strong> — a spore-sampling and chain-of-custody hardware module
            used in laboratory and field workflows.
          </li>
          <li>
            <strong>ALARM</strong> — early-warning sensor unit for biological and environmental
            anomalies.
          </li>
          <li>
            <strong>Agaric</strong> — the developer board / reference hardware for partners
            building on the FCI firmware stack.
          </li>
        </ul>
        <p>
          <strong>Draft:</strong> <em>Psathyrella</em>, a partial-build device for specialised
          field sampling.{" "}
          <strong>Frontier:</strong> the broader <em>FCI</em> programme — multi-year R&amp;D into
          higher-bandwidth fungal computer interfaces.
        </p>
        <p>
          See <Link href="/docs/devices">Devices documentation</Link> for technical specs, sensor
          channels, power profiles, and deployment guides.
        </p>

        <h3 id="layer-firmware">2. Firmware — FCI</h3>
        <p>
          Every Mycosoft device runs <strong>FCI</strong> (Fungal Computer Interface) firmware —
          an open, source-available firmware stack covering BME688 / BSEC2 environmental sensing,
          bioelectric sampling, FCI protocol for signal transport, MQTT and HTTP APIs, OTA
          updates, and on-device safety controls. FCI is the same firmware whether you bought a
          finished Mushroom 1 or you are building on an Agaric reference board.{" "}
          <Link href="/docs/fci-firmware">FCI firmware docs →</Link>
        </p>

        <h3 id="layer-platform">3. Platform — NatureOS</h3>
        <p>
          <strong>NatureOS</strong> is the cloud and edge platform that ingests device signal,
          stores it, models it, and exposes it through dashboards and APIs. NatureOS is composed
          of several named services that you will see referenced throughout the docs:
        </p>
        <ul>
          <li>
            <strong>MINDEX</strong> — the indexed data plane. The Postgres-backed store of record
            for telemetry, specimen records, chain-of-custody, and model outputs.
          </li>
          <li>
            <strong>AI Studio</strong> — model training, evaluation, and deployment surface for
            internal and partner ML work.
          </li>
          <li>
            <strong>Earth Simulator</strong> — environmental world-model service used for
            scenario generation, simulation-backed training, and what-if analysis against live
            telemetry.
          </li>
          <li>
            <strong>CREP</strong> — Compliance, Reporting, and Evidence Pipeline; the audit and
            chain-of-custody layer for regulated work.
          </li>
          <li>
            <strong>OEI</strong> — Open Environmental Intelligence; the public-data ingestion
            layer (AIS, ADS-B, satellite, weather, biodiversity records).
          </li>
          <li>
            <strong>Mycorrhizae Protocol</strong> and <strong>HPL</strong> — the inter-device and
            inter-platform protocols that move signal between edge and cloud.
          </li>
        </ul>

        <h3 id="layer-ai">4. AI — MYCA, AVANI, NLM, MAS</h3>
        <p>
          The agentic layer. Four named systems, each with a clear role:
        </p>
        <ul>
          <li>
            <strong>MYCA</strong> — the multi-agent orchestrator. Routes work across specialised
            agents under a single Task Automation Law that governs delegation, escalation, and
            human-in-the-loop checkpoints.
          </li>
          <li>
            <strong>MAS</strong> — the Mycosoft Agent Swarm runtime; the deployment-side execution
            environment that hosts agents in production.
          </li>
          <li>
            <strong>AVANI</strong> — voice and conversational interface across products; the layer
            customers and operators speak to.
          </li>
          <li>
            <strong>NLM</strong> — a frontier research programme on natural-language-to-signal
            interfaces. Labelled frontier; not a shipping product.
          </li>
        </ul>
        <p>
          We are explicit about a separation that matters in the field:{" "}
          <Link href="/docs/ai/deterministic-vs-stochastic">deterministic vs stochastic AI</Link>.
          Pipelines that affect physical equipment, regulated workflows, or chain-of-custody
          records are deterministic by default. LLMs and frontier models are used for reasoning,
          drafting, and exploration — never as the sole decision-maker for a field action.
        </p>

        <h3 id="layer-apps">5. Apps — the simulation and lab tools</h3>
        <p>
          A library of focused web apps that sit on top of NatureOS for scientists, students, and
          operators: <em>earth-simulator</em>, <em>alchemy-lab</em>,{" "}
          <em>compound-sim</em>, <em>digital-twin</em>, <em>genetic-circuit</em>,{" "}
          <em>growth-analytics</em>, <em>lifecycle-sim</em>, <em>mushroom-sim</em>,{" "}
          <em>petri-dish-sim</em>, <em>physics-sim</em>, <em>retrosynthesis</em>,{" "}
          <em>spore-tracker</em>, and <em>symbiosis</em>. Each app is a thin client over the
          NatureOS APIs.
        </p>

        <h2 id="who-its-for">Who Mycosoft is for</h2>

        <h3 id="customers">Customers and use cases</h3>
        <ul>
          <li>
            <strong>Defence and government</strong> — environmental intelligence, biosurveillance,
            chain-of-custody-grade evidence pipelines, autonomous field deployment programmes.
            Mycosoft, LLC is the federal contracting entity.
          </li>
          <li>
            <strong>Research institutions</strong> — universities, national labs, and
            biotech/agtech R&amp;D groups using the devices and NatureOS APIs for
            mycology, soil science, and environmental monitoring.
          </li>
          <li>
            <strong>Commercial operators</strong> — agriculture, food and beverage, indoor
            cultivation, and industrial fermentation customers using the devices for process
            monitoring.
          </li>
          <li>
            <strong>Educators and citizen scientists</strong> — schools and individual makers
            using Hyphae 1 and the open FCI firmware to teach and explore.
          </li>
          <li>
            <strong>Developers and integrators</strong> — partners building on top of the APIs,
            firmware, and MAS agent runtime.
          </li>
        </ul>

        <h3 id="for-investors">If you&apos;re an investor</h3>
        <p>
          The short version: Mycosoft is a vertically integrated stack — devices, firmware,
          platform, AI, and apps — sold into defence, research, and commercial customers.
          Hardware revenue funds the platform; platform contracts compound the device base.
          Federal contracting credentials are active and current. For financing materials,
          structure, and cap-table details, the investor packet is shared under NDA — contact{" "}
          <a href="mailto:contact@mycosoft.com">contact@mycosoft.com</a>.
        </p>

        <h3 id="for-customers">If you&apos;re a customer</h3>
        <p>
          Start with <Link href="/docs/quickstart">Quickstart</Link>. It takes you from
          &ldquo;I&apos;ve heard of Mycosoft&rdquo; to your first data flowing in fifteen minutes
          — including which device or API to choose, how to request access, and where the data
          lands.
        </p>

        <h3 id="for-developers">If you&apos;re a developer or partner</h3>
        <p>
          Read the <Link href="/docs/fci-firmware">FCI firmware</Link>,{" "}
          <Link href="/docs/api">API</Link>, and <Link href="/docs/mas">MAS</Link> docs. The
          firmware is source-available; the APIs are documented and versioned; MAS is the
          deployment runtime if you are building or hosting agents on the platform.
        </p>

        <h3 id="for-defense">If you&apos;re a defence or government contact</h3>
        <p>
          The <Link href="/docs/defense-government">Defence &amp; Government</Link> section
          covers SAM.gov status, prime/sub teaming, capability statements, and the
          deployment-sponsor model for regulated field work.
        </p>

        <h2 id="status">Status, openness, and how to engage</h2>

        <h3 id="status-labels">Status labels you will see in these docs</h3>
        <ul>
          <li>
            <strong>Stable</strong> — shipping today, supported, and covered by the standard
            terms of service.
          </li>
          <li>
            <strong>Draft</strong> — being built right now; documentation reflects current
            direction but specifics will change.
          </li>
          <li>
            <strong>Frontier</strong> — multi-year research; no product commitment, no shipping
            date. Read as ambition, not roadmap.
          </li>
          <li>
            <strong>Coming soon</strong> — the document exists in outline; the page is being
            written.
          </li>
        </ul>

        <h3 id="openness">Open source and source-available</h3>
        <p>
          FCI firmware is source-available. Selected platform components and SDKs ship under
          permissive licences; others are commercial. See{" "}
          <Link href="/docs/open-source">Open Source</Link> for the full matrix of what is open,
          what is source-available, and what is commercial.
        </p>

        <h3 id="terms">Legal</h3>
        <p>
          Use of any Mycosoft website, device, platform, agent, or API is governed by the{" "}
          <Link href="/terms">Mycosoft Terms of Service</Link>. The Terms are the canonical legal
          document; this overview is informational.
        </p>

        <h3 id="contact">Contact</h3>
        <ul>
          <li>
            General — <a href="mailto:contact@mycosoft.com">contact@mycosoft.com</a>
          </li>
          <li>
            Federal / defence —{" "}
            <Link href="/docs/defense-government">/docs/defense-government</Link>
          </li>
          <li>
            Engineering — <a href="https://github.com/MycosoftLabs">github.com/MycosoftLabs</a>
          </li>
          <li>
            Public channels —{" "}
            <a href="https://www.linkedin.com/company/mycosoft">LinkedIn</a>,{" "}
            <a href="https://x.com/Mycosoft">X</a>,{" "}
            <a href="https://www.youtube.com/channel/UCUUEOg35426XDmZ9sPXbDYg">YouTube</a>,{" "}
            <a href="https://www.crunchbase.com/organization/mycosoft">Crunchbase</a>
          </li>
        </ul>

        <hr className="my-12" />

        <p className="text-sm text-muted-foreground">
          Next: <Link href="/docs/quickstart">Quickstart →</Link>{" "}
          ·{" "}
          <Link href="/docs/glossary">Glossary →</Link>
        </p>
      </article>
    </DocsLayout>
  )
}
