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
      <article className="max-w-3xl text-foreground [&_h1]:text-4xl [&_h1]:font-bold [&_h1]:mb-6 [&_h1]:scroll-mt-24 [&_h2]:mt-14 [&_h2]:pt-6 [&_h2]:mb-4 [&_h2]:border-t [&_h2]:border-border [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:scroll-mt-24 [&_h3]:mt-10 [&_h3]:mb-3 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:scroll-mt-24 [&_p]:my-4 [&_p]:leading-relaxed [&_ul]:my-4 [&_ul]:pl-6 [&_ul]:list-disc [&_ul]:space-y-2 [&_ol]:my-4 [&_ol]:pl-6 [&_ol]:list-decimal [&_ol]:space-y-2 [&_li]:leading-relaxed [&_dl]:my-6 [&_dt]:mt-5 [&_dt]:font-medium [&_dd]:mb-3 [&_dd]:ml-4 [&_dd]:text-muted-foreground [&_dd]:leading-relaxed [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-primary/80 [&_strong]:font-semibold [&_strong]:text-foreground [&_em]:italic [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:bg-muted [&_code]:text-sm [&_hr]:my-12 [&_hr]:border-border">
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
          One place to look up every term you will hit in the Mycosoft docs. Grouped into six
          sections — company &amp; products, platform &amp; AI, devices &amp; firmware, protocols,
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
          <a href="#protocols" className="rounded-md border border-border bg-card px-3 py-2 hover:bg-accent">
            Protocols
          </a>
          <a href="#biology" className="rounded-md border border-border bg-card px-3 py-2 hover:bg-accent">
            Mycology &amp; biology
          </a>
          <a href="#federal" className="rounded-md border border-border bg-card px-3 py-2 hover:bg-accent">
            Federal contracting
          </a>
        </div>

        <h2 id="company">Company &amp; products</h2>
        <dl>
          <dt>
            <strong>Mycosoft</strong>
          </dt>
          <dd>
            The biotechnology and software company building the operating layer for biological
            intelligence. See <Link href="/docs/what-is-mycosoft">What is Mycosoft</Link>.
          </dd>

          <dt>
            <strong>Mycosoft, Inc.</strong>
          </dt>
          <dd>Delaware C-Corporation. Parent company, investment vehicle, IP licensor.</dd>

          <dt>
            <strong>Mycosoft, LLC</strong>
          </dt>
          <dd>
            California limited liability company (CA Entity No. 202253910565). Operating subsidiary,
            federal contracting entity, manufacturing entity. All federal submissions are 100%
            self-performed.
          </dd>

          <dt>
            <strong>NatureOS</strong>
          </dt>
          <dd>
            The single software identity for the Mycosoft platform — cloud and edge services for
            ingestion, storage, modelling, dashboards, and apps.
          </dd>

          <dt>
            <strong>MYCO DAO</strong>
          </dt>
          <dd>
            Tokenised community vehicle on Solana. Raised approximately $500k in 48 hours by selling
            15% of the MYCO token. Funds community-aligned research and tooling; operating contracts
            remain with Mycosoft, LLC.
          </dd>

          <dt>
            <strong>FUSARIUM</strong>
          </dt>
          <dd>
            Mycosoft&rsquo;s defence programme name. Subject of the Mycosoft submission against DARPA
            BAA HR001125S0011. Integrates MycoBrain devices, MYCA agents, and NatureOS into a
            non-kinetic environmental intelligence stack.
          </dd>
        </dl>

        <h2 id="platform">Platform &amp; AI</h2>
        <dl>
          <dt>
            <strong>MYCA</strong>
          </dt>
          <dd>
            MYCOSOFT Environmental Super Intelligence. An edge-native multi-agent system
            orchestrating <strong>over 1,000 specialised agents</strong> across{" "}
            <strong>14 categories</strong>, governed by a three-tier permission model: <em>Read</em>{" "}
            (auto-approved), <em>Write</em> (requires approval), and <em>Execute</em> (requires
            explicit yes). Powered by NVIDIA Nemotron, PersonaPlex, and designed for
            Blackwell-generation edge GPUs. Open source at{" "}
            <a href="https://github.com/MycosoftLabs/mycosoft-mas">
              github.com/MycosoftLabs/mycosoft-mas
            </a>
            .
          </dd>

          <dt>
            <strong>MAS</strong>
          </dt>
          <dd>
            Multi-Agent System. The open-source runtime for MYCA agents. The repo name is{" "}
            <code>mycosoft-mas</code>.
          </dd>

          <dt>
            <strong>AVANI</strong>
          </dt>
          <dd>
            The Live Earth Substrate. A dedicated backend next to MYCA that ingests and harmonises
            planetary-scale signals — climate, sensor networks, infrastructure telemetry, remote
            sensing — and serves them to MYCA through privacy-respecting APIs. If MYCA is the hand,
            AVANI is the palm that grounds every action in real, continuous environmental context.
          </dd>

          <dt>
            <strong>MycaPLEX</strong>
          </dt>
          <dd>
            Full-duplex voice-to-voice and voice-to-agent interface for MYCA. A modified PersonaPlex
            stack used in operator headsets, vehicles, and conversational dashboards.
          </dd>

          <dt>
            <strong>NLM</strong>
          </dt>
          <dd>
            Natural Language Model. Mycosoft&rsquo;s frontier research programme on bioelectric and
            environmental signal interfaces. Labelled <em>frontier</em>; not a shipping product.
          </dd>

          <dt>
            <strong>MINDEX</strong>
          </dt>
          <dd>
            The indexed data plane. Postgres-backed store of record for telemetry, specimen records,
            chain-of-custody, and model outputs.
          </dd>

          <dt>
            <strong>AI Studio</strong>
          </dt>
          <dd>
            Model training, evaluation, and deployment surface for internal and partner ML work.
            Sits inside NatureOS.
          </dd>

          <dt>
            <strong>Earth Simulator</strong>
          </dt>
          <dd>
            Environmental world-model service for scenario generation, simulation-backed training,
            and what-if analysis against live telemetry.
          </dd>

          <dt>
            <strong>CREP</strong>
          </dt>
          <dd>
            Common Relevant Environmental Picture. The fused, time-aligned operational view of an
            area of interest — combining device telemetry, public data, and model output into a
            single shared picture used by operators and partners.
          </dd>

          <dt>
            <strong>OEI</strong>
          </dt>
          <dd>
            Open Environmental Intelligence. Public-data ingestion (AIS, ADS-B, satellite, weather,
            biodiversity).
          </dd>

          <dt>
            <strong>Deterministic vs Stochastic AI</strong>
          </dt>
          <dd>
            A hard line Mycosoft draws in production. Any pipeline that affects physical equipment,
            regulated workflows, or chain-of-custody records is <em>deterministic</em>. Frontier
            models reason, draft, and explore — they are never the sole decision-maker for a field
            action.
          </dd>

          <dt>
            <strong>Task Automation Law</strong>
          </dt>
          <dd>
            MYCA&rsquo;s governing rule for delegation, escalation, and human-in-the-loop
            checkpoints. Combined with the three-tier permission model, it defines what an agent may
            do without sign-off, what requires approval, and what requires an explicit yes.
          </dd>
        </dl>

        <h2 id="devices">Devices &amp; firmware</h2>
        <dl>
          <dt>
            <strong>Mushroom 1</strong>
          </dt>
          <dd>
            The flagship Mycosoft device. A solar-powered quadruped walker with four articulated
            carbon-fibre legs, a 2-metre multi-depth soil probe, dual Bosch BME688 environmental
            sensors, a long-range 915 MHz mesh radio, and ~6 months of battery life with solar
            recharge. Designed to self-site on uneven terrain.
          </dd>

          <dt>
            <strong>Hyphae 1</strong>
          </dt>
          <dd>
            An on-ground distributed edge datacenter in a shelter-grade enclosure. Air, light,
            sound, and gas sensors plus radar, lidar, and radio (including jamming and anti-jamming)
            capability. Aggregates clusters of Mushroom 1, MycoNode, SporeBase, and Agaric units and
            runs local compute.
          </dd>

          <dt>
            <strong>MycoBrain</strong>
          </dt>
          <dd>
            The ESP32-S3 edge compute module that ships inside every Mycosoft device. Dual BME688 +
            BSEC2, runs the firmware stack, processes all sensor inputs locally before they leave
            the device.
          </dd>

          <dt>
            <strong>MycoNode</strong>
          </dt>
          <dd>
            A subsurface bioelectric probe with a 5-mile broadcast range. Hand placement or
            drone-deployed. Captures fungal and root-zone electrical signal and forwards it through
            the mesh.
          </dd>

          <dt>
            <strong>SporeBase v4</strong>
          </dt>
          <dd>
            A bioaerosol collector. A stepper-driven sealed tape cassette captures pollen, spores,
            fungal, bacterial, and viral particulates in time-indexed 15- to 60-minute segments (up
            to 2,880 segments over 30 days). Dual ESP32-S3, LoRa, fan-driven sampling, Bosch BME69x
            gas sensing, solar + battery.
          </dd>

          <dt>
            <strong>Agaric</strong>
          </dt>
          <dd>
            A flying sensor hub (drone) in Mini, Standard, and Heavy-Lift variants. Six-point
            coaxial propulsion, tangential flight control, MAVLink, LoRa mesh, and satellite options
            for over-the-horizon work.
          </dd>

          <dt>
            <strong>ALARM</strong>
          </dt>
          <dd>
            An incident signaling device. Dual smoke (ionisation + photoelectric), MOS VOC, PM1.0 /
            2.5 / 10 particulates, NDIR CO₂ (400–5,000 ppm), BME688 climate, mold warning, ESP32-S3
            + on-device TinyML for early-warning classification.
          </dd>

          <dt>
            <strong>MycoDrone</strong>
          </dt>
          <dd>
            A flying carrier drone that deploys Mushroom 1, MycoNode, or SporeBase to remote terrain
            and supports mesh extension.
          </dd>

          <dt>
            <strong>Psathyrella</strong> <Badge variant="outline">Draft</Badge>
          </dt>
          <dd>
            A water buoy for undersea cable monitoring, boat and submarine deterrence, cameras, and
            laser comms. Solar + battery, four turbopropellers. Surface-deployed from USVs, manned
            vessels, or shore.
          </dd>

          <dt>
            <strong>BME688 / BSEC2</strong>
          </dt>
          <dd>
            Bosch&rsquo;s integrated environmental sensor (temperature, humidity, pressure, gas) and
            its software library. Used across the Mycosoft device line for atmospheric and VOC
            sensing.
          </dd>

          <dt>
            <strong>ESP32-S3</strong>
          </dt>
          <dd>
            The dual-core Xtensa LX7 microcontroller with Wi-Fi and Bluetooth used as the host
            silicon for MycoBrain and every shipping Mycosoft device.
          </dd>

          <dt>
            <strong>Status LEDs</strong>
          </dt>
          <dd>
            Mycosoft devices use a standard convention: <strong>green</strong> normal operation,{" "}
            <strong>blue</strong> network connectivity, <strong>red</strong> alert or warning,{" "}
            <strong>amber</strong> charging.
          </dd>
        </dl>

        <h2 id="protocols">Protocols</h2>
        <dl>
          <dt>
            <strong>MDP — Mycosoft Data Protocol</strong>
          </dt>
          <dd>
            Device-level transport. COBS-framed with CRC-16. Low-overhead, lossy-link tolerant,
            suitable for radio mesh and serial bus. Moves data between sensors, MycoBrain, and the
            upstream gateway.
          </dd>

          <dt>
            <strong>MMP — Mycosoft Mycorrhizae Protocol</strong>
          </dt>
          <dd>
            Gateway-to-cloud mesh transport. Handles store-and-forward, prioritisation, and platform
            attestation between field gateways and NatureOS.
          </dd>

          <dt>
            <strong>HPL — Hypha Programming Language</strong>
          </dt>
          <dd>
            A programming language Mycosoft is developing for biological and environmental
            workflows. See the introduction on{" "}
            <a href="https://medium.com/@mycosoft.inc/introduction-to-the-hypha-programming-language-hpl-069567239474">
              Mycosoft Labs on Medium
            </a>
            .
          </dd>

          <dt>
            <strong>OTA</strong>
          </dt>
          <dd>Over-the-air firmware updates. All Mycosoft devices support signed OTA.</dd>
        </dl>

        <h2 id="biology">Mycology &amp; biology</h2>
        <dl>
          <dt>
            <strong>Mycelium</strong>
          </dt>
          <dd>
            The vegetative body of a fungus: a network of fine filaments (hyphae) that grow through
            soil, wood, and other substrates. The world&rsquo;s most distributed biological network
            and the substrate Mycosoft devices most frequently sample.
          </dd>

          <dt>
            <strong>Hypha (pl. hyphae)</strong>
          </dt>
          <dd>A single filament of fungal cells. Many hyphae together form mycelium.</dd>

          <dt>
            <strong>Substrate</strong>
          </dt>
          <dd>
            The medium fungi grow on or through — soil, wood, agar, grain, straw, sawdust. Mycosoft
            devices read environmental signal from and around substrate.
          </dd>

          <dt>
            <strong>Spore</strong>
          </dt>
          <dd>
            The reproductive unit of a fungus. Captured by SporeBase as part of bioaerosol sampling.
          </dd>

          <dt>
            <strong>Bioaerosol</strong>
          </dt>
          <dd>
            Airborne biological particulates — pollen, fungal spores, bacteria, viruses. SporeBase
            v4 collects these on a time-indexed sealed tape for laboratory analysis.
          </dd>

          <dt>
            <strong>Bioelectric signal</strong>
          </dt>
          <dd>
            Electrical activity measured in or near living tissue. MycoNode samples bioelectric
            activity in the subsurface root and mycelial zone.
          </dd>

          <dt>
            <strong>FCI — Fungal Computer Interface</strong>
          </dt>
          <dd>
            A long-running Mycosoft research programme exploring direct interfaces between fungal
            networks and digital systems. Labelled <em>frontier</em>. See the FCI article on{" "}
            <a href="https://medium.com/@mycosoft.inc/fungal-computer-interface-fci-c0c444611cc1">
              Mycosoft Labs on Medium
            </a>
            .
          </dd>
        </dl>

        <h2 id="federal">Federal contracting</h2>
        <dl>
          <dt>
            <strong>UEI</strong>
          </dt>
          <dd>
            Unique Entity Identifier. Replaces the legacy DUNS number. Mycosoft, LLC&apos;s UEI is{" "}
            <span className="font-mono">YK3ARVKJ77S9</span>.
          </dd>

          <dt>
            <strong>CAGE Code</strong>
          </dt>
          <dd>
            Commercial and Government Entity code. Mycosoft, LLC&apos;s CAGE is{" "}
            <span className="font-mono">9KR60</span>.
          </dd>

          <dt>
            <strong>SAM.gov</strong>
          </dt>
          <dd>
            The federal System for Award Management. Mycosoft, LLC&apos;s registration is active
            through April 9, 2027.
          </dd>

          <dt>
            <strong>NAICS</strong>
          </dt>
          <dd>
            North American Industry Classification System. Codes used in federal procurement to
            describe the type of work being procured.
          </dd>

          <dt>
            <strong>DARPA</strong>
          </dt>
          <dd>
            Defense Advanced Research Projects Agency. Primary federal research customer for the
            FUSARIUM programme.
          </dd>

          <dt>
            <strong>ITDX</strong>
          </dt>
          <dd>
            Information Technology Defense Experiment (Army). Mycosoft submitted ITDX 2026 white
            paper W91RUSI-FCID260001.
          </dd>

          <dt>
            <strong>Navy TAC-O</strong>
          </dt>
          <dd>
            Tactical Operations. The U.S. Navy track Mycosoft engages on for undersea monitoring and
            surface intelligence (Psathyrella).
          </dd>

          <dt>
            <strong>Black Dart</strong>
          </dt>
          <dd>
            The U.S. military counter-UAS demonstration programme. Mycosoft&rsquo;s non-kinetic EW
            focus — jamming and anti-jamming, microwave, laser, radar — aligns with Black Dart.
          </dd>

          <dt>
            <strong>BAA</strong>
          </dt>
          <dd>
            Broad Agency Announcement. The standard federal solicitation mechanism for research
            programmes such as DARPA HR001125S0011 (FUSARIUM).
          </dd>

          <dt>
            <strong>OTA</strong> <em>(contracting)</em>
          </dt>
          <dd>
            Other Transaction Authority. A flexible non-FAR-based contracting vehicle the DoD uses
            for prototyping and research. Distinct from over-the-air firmware updates of the same
            acronym.
          </dd>

          <dt>
            <strong>CSO</strong>
          </dt>
          <dd>
            Commercial Solutions Opening. A solicitation mechanism used by federal customers to
            acquire commercial technology rapidly.
          </dd>

          <dt>
            <strong>SBIR / STTR</strong>
          </dt>
          <dd>
            Small Business Innovation Research / Small Business Technology Transfer. Federal
            programmes funding small-business R&amp;D. Sequenced after Mycosoft&rsquo;s primary DARPA
            and Army engagements.
          </dd>
        </dl>

        <h2 id="status-labels">Status labels in our docs</h2>
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
            <strong>Frontier</strong> — multi-year research; no product commitment, no shipping
            date. Read as ambition, not roadmap.
          </li>
          <li>
            <strong>Coming soon</strong> — the document exists in outline; the page is being
            written.
          </li>
        </ul>

        <hr className="my-12" />

        <p className="text-sm text-muted-foreground">
          Previous: <Link href="/docs/quickstart">← Quickstart</Link> · See also:{" "}
          <Link href="/docs/what-is-mycosoft">What is Mycosoft</Link>
        </p>
      </article>
    </DocsLayout>
  )
}
