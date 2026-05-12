import type { Metadata } from "next"
import Link from "next/link"
import { DocsLayout } from "@/components/docs/docs-layout"
import { Badge } from "@/components/ui/badge"

export const metadata: Metadata = {
  title: "What is Mycosoft",
  description:
    "Company overview and the full Mycosoft stack — devices, firmware, NatureOS, MYCA, AVANI, and apps. Written for investors, customers, partners, and developers.",
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
          Mycosoft is a biotechnology and software company building the operating layer for biological
          intelligence — the devices, models, and services that let humans observe, model, and act on
          the living world. We design environmental sensing hardware, train AI on environmental and
          biological signal, run a planetary-scale edge intelligence called <strong>MYCA</strong>, and
          deliver this stack to commercial, research, and defense customers under a single software
          identity called <strong>NatureOS</strong>.
        </p>

        <p>
          This page is the canonical, one-stop overview. An investor can read it end-to-end in fifteen
          minutes and understand exactly what Mycosoft sells, how the stack is composed, who the
          customers are, and where the company is in its build. Engineers and partners get the same
          picture — the rest of the docs go deeper into each piece.
        </p>

        <h2 id="company">The company</h2>

        <h3 id="entities">Legal entities</h3>
        <p>Mycosoft operates as two entities working in parallel:</p>
        <ul>
          <li>
            <strong>Mycosoft, Inc.</strong> — a Delaware C-Corporation. Parent company, investment
            vehicle, and licensor of platform intellectual property.
          </li>
          <li>
            <strong>Mycosoft, LLC</strong> — a California limited liability company (CA Entity No.
            202253910565) and operating subsidiary. This is the federal contracting entity, the
            manufacturing entity, and the party that signs pilot, deployment, and reseller agreements.
            All federal submissions are 100% self-performed by Mycosoft, LLC.
          </li>
        </ul>
        <p>
          Federal credentials are held by Mycosoft, LLC: UEI{" "}
          <span className="font-mono">YK3ARVKJ77S9</span>, CAGE{" "}
          <span className="font-mono">9KR60</span>, with an active SAM.gov registration valid through
          April 9, 2027.
        </p>

        <h3 id="mission">Mission</h3>
        <p>
          Build the substrate that lets biology, sensors, and AI cooperate at planetary scale —
          starting with the most distributed and under-sampled signal sources on Earth: soil, air,
          water, and the fungal networks woven through them. Every Mycosoft product earns its place
          by feeding, modelling, or acting on that signal.
        </p>

        <h3 id="how-we-talk">How we talk about what we do</h3>
        <p>
          We are deliberate about claims. Mycosoft ships measurable systems — sensors that record
          environmental and bioelectric activity, dashboards that visualise telemetry, agents that
          execute defined workflows. We do <em>not</em> claim that fungi are language-capable
          computers, that Wi-Fi sensing gives planetary perception, or that interspecies translation
          is a solved problem. Research that explores those frontiers is labelled <em>frontier</em>{" "}
          throughout the documentation; commercial work is labelled <em>stable</em>.
        </p>

        <h2 id="stack">The stack at a glance</h2>

        <p>
          Mycosoft is built in five layers. Each layer is independently usable; customer value
          compounds when they are combined.
        </p>

        <h3 id="layer-devices">1. Devices — environmental and biological sensing</h3>
        <p>
          Purpose-built field hardware. Each device is a sealed, solar-capable, mesh-networked
          compute node running our firmware over ESP32-S3 class silicon. Production lineup:
        </p>
        <ul>
          <li>
            <strong>Mushroom 1</strong> — the flagship. A solar-powered <em>quadruped walker</em>{" "}
            with four articulated carbon-fibre legs, a 2-metre multi-depth soil probe, dual Bosch
            BME688 environmental sensors, and a long-range 915 MHz mesh radio. Walks itself to
            optimal terrain, reads soil and air, and joins the local network. Designed for forests,
            farms, parks, and remote field sites.
          </li>
          <li>
            <strong>Hyphae 1</strong> — an on-ground distributed edge datacenter. Air, light, sound,
            and gas sensors plus radar, lidar, and radio (including jamming and anti-jamming) in a
            single shelter-grade enclosure. Aggregates and computes locally for clusters of
            Mushroom 1, MycoNode, SporeBase, and Agaric units.
          </li>
          <li>
            <strong>MycoBrain</strong> — the ESP32-S3 edge compute module that ships inside every
            Mycosoft device. Dual BME688 + BSEC2, runs the firmware stack, processes all sensor
            inputs locally before they leave the device.
          </li>
          <li>
            <strong>MycoNode</strong> — a subsurface bioelectric probe with a 5-mile broadcast range.
            Deployed by hand or dropped from a MycoDrone, it captures fungal and root-zone electrical
            signal and forwards it through the mesh.
          </li>
          <li>
            <strong>SporeBase v4</strong> — a bioaerosol collector. A stepper-driven sealed tape
            cassette captures pollen, spores, fungal, bacterial, and viral particulates in
            time-indexed 15- to 60-minute segments (up to 2,880 segments over 30 days). Dual ESP32-S3,
            LoRa, fan-driven sampling, Bosch BME69x gas sensing, solar + battery.
          </li>
          <li>
            <strong>Agaric</strong> — a flying sensor hub (drone) available in Mini, Standard, and
            Heavy-Lift variants. Six-point coaxial propulsion, tangential flight control, MAVLink,
            LoRa mesh, and satellite options for over-the-horizon work.
          </li>
          <li>
            <strong>ALARM</strong> — an incident signaling device. Dual smoke detection (ionisation +
            photoelectric), MOS VOC, PM1.0 / 2.5 / 10 particulates, NDIR CO₂ (400–5,000 ppm), BME688
            climate, mold warning, ESP32-S3 + on-device TinyML for early-warning classification.
          </li>
          <li>
            <strong>MycoDrone</strong> — a flying carrier that deploys Mushroom 1, MycoNode, or
            SporeBase to remote terrain.
          </li>
        </ul>
        <p>
          <strong>Draft:</strong> <em>Psathyrella</em> — a water buoy for undersea cable monitoring,
          boat and submarine deterrence, cameras, and laser comms. Surface-deployed from USVs, manned
          vessels, or shore. Solar + battery, four turbopropellers.
        </p>
        <p>
          See <Link href="/devices">/devices</Link> for the full specifications page.
        </p>

        <h3 id="layer-firmware">2. Firmware and protocols</h3>
        <p>
          Every Mycosoft device runs the same firmware stack and speaks two protocols designed for
          biological and environmental telemetry:
        </p>
        <ul>
          <li>
            <strong>MDP</strong> — Mycosoft Data Protocol. Device-level transport. COBS-framed with
            CRC-16. Low-overhead, lossy-link tolerant, suitable for radio mesh and serial bus.
          </li>
          <li>
            <strong>MMP</strong> — Mycosoft Mycorrhizae Protocol. Gateway-to-cloud mesh transport.
            Handles store-and-forward, prioritisation, and platform attestation.
          </li>
        </ul>
        <p>
          On-device features include BME688 / BSEC2 environmental processing, bioelectric sampling,
          OTA updates, signed attestation, and on-device safety controls.
        </p>

        <h3 id="layer-platform">3. Platform — NatureOS</h3>
        <p>
          <strong>NatureOS</strong> is the cloud and edge platform that ingests device signal, stores
          it, models it, and exposes it through dashboards and APIs. Named services you will see
          across the docs:
        </p>
        <ul>
          <li>
            <strong>MINDEX</strong> — the indexed data plane. Postgres-backed store of record for
            telemetry, specimen records, chain-of-custody, and model outputs.
          </li>
          <li>
            <strong>AI Studio</strong> — model training, evaluation, and deployment for internal and
            partner ML work.
          </li>
          <li>
            <strong>Earth Simulator</strong> — environmental world-model service for scenario
            generation, simulation-backed training, and what-if analysis against live telemetry.
          </li>
          <li>
            <strong>CREP</strong> — Common Relevant Environmental Picture. The fused, time-aligned
            operational view of an area of interest — combining device telemetry, public data, and
            model output into a single shared picture used by operators and partners.
          </li>
          <li>
            <strong>OEI</strong> — Open Environmental Intelligence. Public-data ingestion (AIS,
            ADS-B, satellite, weather, biodiversity).
          </li>
        </ul>

        <h3 id="layer-ai">4. AI — MYCA, AVANI, NLM</h3>
        <p>
          The intelligence layer is paired: <strong>MYCA</strong> is the hand that acts, <strong>AVANI</strong>{" "}
          is the palm that senses.
        </p>
        <ul>
          <li>
            <strong>MYCA</strong> — the MYCOSOFT Environmental Super Intelligence. An edge-native
            multi-agent system orchestrating <strong>over 1,000 specialised agents</strong> across{" "}
            <strong>14 categories</strong>, governed by a three-tier permission model: <em>Read</em>{" "}
            (auto-approved), <em>Write</em> (requires approval), and <em>Execute</em> (requires
            explicit yes). Powered by NVIDIA Nemotron foundation models and PersonaPlex, designed for
            Blackwell-generation edge GPUs. Self-trains from NLM, MDP, MMP, and open-source models.
            Repo: <a href="https://github.com/MycosoftLabs/mycosoft-mas">github.com/MycosoftLabs/mycosoft-mas</a>.
          </li>
          <li>
            <strong>AVANI</strong> — the Live Earth Substrate. A dedicated backend next to MYCA that
            ingests and harmonises planetary-scale signals — climate, sensor networks, infrastructure
            telemetry, remote sensing — and serves them to MYCA through privacy-respecting APIs so
            agents always act with environmental and societal context.
          </li>
          <li>
            <strong>MycaPLEX</strong> — full-duplex voice-to-voice and voice-to-agent interface for
            MYCA. A modified PersonaPlex stack that lets operators converse with agents naturally,
            including on the field, in vehicles, and through hardware headsets.
          </li>
          <li>
            <strong>NLM</strong> — Natural Language Model. Mycosoft&rsquo;s frontier research
            programme on bioelectric and environmental signal interfaces. Labelled <em>frontier</em>;
            not a shipping product.
          </li>
        </ul>
        <p>
          We are explicit about a separation that matters in the field: pipelines that affect
          physical equipment, regulated workflows, or chain-of-custody records are{" "}
          <em>deterministic</em> by default. Frontier models reason, draft, and explore — they are
          never the sole decision-maker for a field action.
        </p>

        <h3 id="layer-apps">5. Apps — simulation and lab tools</h3>
        <p>
          Focused web apps that sit on top of NatureOS for scientists, students, and operators:{" "}
          <em>earth-simulator</em>, <em>alchemy-lab</em>, <em>compound-sim</em>, <em>digital-twin</em>,{" "}
          <em>genetic-circuit</em>, <em>growth-analytics</em>, <em>lifecycle-sim</em>,{" "}
          <em>mushroom-sim</em>, <em>petri-dish-sim</em>, <em>physics-sim</em>, <em>retrosynthesis</em>,{" "}
          <em>spore-tracker</em>, and <em>symbiosis</em>. Each app is a thin client over the NatureOS
          APIs.
        </p>

        <h2 id="who-its-for">Who Mycosoft is for</h2>

        <h3 id="customers">Customers and use cases</h3>
        <ul>
          <li>
            <strong>Defence and government</strong> — non-kinetic environmental intelligence,
            biosurveillance, common relevant environmental picture (CREP) generation,
            chain-of-custody evidence pipelines, and autonomous field-deployment programmes. Mycosoft
            focuses on non-kinetic electronic warfare capabilities — jamming and anti-jamming,
            microwave, laser, radar — aligned with the U.S. military Black Dart programme. Mycosoft,
            LLC is the federal contracting entity; all submissions are self-performed.
          </li>
          <li>
            <strong>Research institutions</strong> — universities, national labs, and biotech / agtech
            R&amp;D groups using the devices and NatureOS APIs for mycology, soil science, and
            environmental monitoring.
          </li>
          <li>
            <strong>Commercial operators</strong> — agriculture, food and beverage, indoor cultivation,
            and industrial fermentation customers using the devices for process monitoring.
          </li>
          <li>
            <strong>Educators and citizen scientists</strong> — schools and individual makers using
            the devices and firmware to teach and explore.
          </li>
          <li>
            <strong>Developers and integrators</strong> — partners building on the APIs, firmware,
            and the MYCA multi-agent runtime.
          </li>
        </ul>

        <h3 id="federal-programs">Federal program focus</h3>
        <p>
          Mycosoft is actively pursuing DARPA and U.S. Army programmes first, with USAF engagement
          around MycoDrone and U.S. Navy engagement on Tactical Operations (TAC-O) and undersea
          monitoring. Notable submissions: Army <em>ITDX 2026</em> white paper
          (W91RUSI-FCID260001) and a DARPA submission against HR001125S0011 covering the FUSARIUM
          programme. DoD SBIR engagement is sequenced after these primary programmes.
        </p>

        <h3 id="capital">Capital and community</h3>
        <p>
          Mycosoft maintains two capital tracks: traditional equity through Mycosoft, Inc., and a
          tokenised community track through <strong>MYCO DAO</strong>. The DAO raised approximately
          $500,000 in its first 48 hours by selling 15% of the MYCO token on Solana, funding
          community-aligned research and tooling. Operating contracts and federal programmes continue
          to be executed through Mycosoft, LLC.
        </p>

        <h3 id="for-investors">If you&apos;re an investor</h3>
        <p>
          The short version: Mycosoft is a vertically integrated stack — devices, firmware, platform,
          AI, and apps — sold into defence, research, and commercial customers. Hardware revenue
          funds the platform; platform contracts compound the device base. Federal contracting
          credentials are active. For financing materials, structure, and cap-table details, the
          investor packet is shared under NDA — contact{" "}
          <a href="mailto:contact@mycosoft.com">contact@mycosoft.com</a>.
        </p>

        <h3 id="for-customers">If you&apos;re a customer</h3>
        <p>
          Start with <Link href="/docs/quickstart">Quickstart</Link>. It takes you from
          &ldquo;I&apos;ve heard of Mycosoft&rdquo; to your first data flowing in fifteen minutes —
          which device or API to choose, how to request access, and where the data lands.
        </p>

        <h3 id="for-developers">If you&apos;re a developer or partner</h3>
        <p>
          The agent runtime is open-source at{" "}
          <a href="https://github.com/MycosoftLabs/mycosoft-mas">github.com/MycosoftLabs/mycosoft-mas</a>.
          API and firmware references are linked from <Link href="/docs">/docs</Link>; protocol
          specifications for MDP and MMP are part of the same documentation set.
        </p>

        <h3 id="for-defense">If you&apos;re a defence or government contact</h3>
        <p>
          See <Link href="/docs/defense-government">Defence &amp; Government</Link> for SAM.gov
          credentials, capability statement, programme alignment (DARPA, Army ITDX, USAF, Navy TAC-O,
          Black Dart), and the deployment-sponsor model for regulated field work.
        </p>

        <h2 id="status">Status, openness, and how to engage</h2>

        <h3 id="status-labels">Status labels you will see in these docs</h3>
        <ul>
          <li>
            <strong>Stable</strong> — shipping today, supported, covered by the standard Terms of
            Service.
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

        <h3 id="openness">Open source and source-available</h3>
        <p>
          The MYCA multi-agent system (MAS) is open source. Firmware is source-available. Selected
          platform components and SDKs ship under permissive licences; others are commercial. See{" "}
          <Link href="/docs/open-source">Open Source</Link> for the full matrix.
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
            Research writing —{" "}
            <a href="https://medium.com/@mycosoft.inc">medium.com/@mycosoft.inc</a>
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
          Next: <Link href="/docs/quickstart">Quickstart →</Link> ·{" "}
          <Link href="/docs/glossary">Glossary →</Link>
        </p>
      </article>
    </DocsLayout>
  )
}
