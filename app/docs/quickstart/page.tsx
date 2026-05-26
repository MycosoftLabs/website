import type { Metadata } from "next"
import Link from "next/link"
import { DocsLayout } from "@/components/docs/docs-layout"
import { Badge } from "@/components/ui/badge"

export const metadata: Metadata = {
  title: "Quickstart",
  description:
    "First fifteen minutes with Mycosoft — pick a device or an API, request access, and see your first data flow into NatureOS.",
}

export default function Page() {
  return (
    <DocsLayout>
      <article className="max-w-3xl text-foreground [&_h1]:text-4xl [&_h1]:font-bold [&_h1]:mb-6 [&_h1]:scroll-mt-24 [&_h2]:mt-14 [&_h2]:pt-6 [&_h2]:mb-4 [&_h2]:border-t [&_h2]:border-border [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:scroll-mt-24 [&_h3]:mt-10 [&_h3]:mb-3 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:scroll-mt-24 [&_p]:my-4 [&_p]:leading-relaxed [&_ul]:my-4 [&_ul]:pl-6 [&_ul]:list-disc [&_ul]:space-y-2 [&_ol]:my-4 [&_ol]:pl-6 [&_ol]:list-decimal [&_ol]:space-y-2 [&_li]:leading-relaxed [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-primary/80 [&_strong]:font-semibold [&_strong]:text-foreground [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:bg-muted [&_code]:text-sm [&_hr]:my-12 [&_hr]:border-border">
        <div className="not-prose mb-4 flex flex-wrap items-center gap-2 text-sm">
          <Link href="/docs" className="text-muted-foreground hover:text-foreground">
            Documentation
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-foreground">Overview</span>
        </div>

        <h1>Quickstart</h1>

        <div className="not-prose my-6 flex flex-wrap items-center gap-2">
          <Badge variant="outline">Overview</Badge>
          <Badge variant="default">Stable</Badge>
          <Badge variant="outline">~15 minutes</Badge>
        </div>

        <p>
          This page takes you from zero to your first data flowing through a Mycosoft system in about
          fifteen minutes. There are four entry paths — pick the one that matches what you have
          today and what you want to do next. You can come back and follow another path later.
        </p>

        <div className="not-prose my-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="#path-device"
            className="rounded-lg border border-border bg-card p-4 hover:bg-accent transition-colors"
          >
            <div className="text-sm font-semibold text-foreground">Path A — Host devices</div>
            <p className="mt-1 text-sm text-muted-foreground">
              You have property useful to the network and want Mycosoft-owned devices deployed in
              exchange for data access. (Commercial / civilian model.)
            </p>
          </Link>
          <Link
            href="#path-platform"
            className="rounded-lg border border-border bg-card p-4 hover:bg-accent transition-colors"
          >
            <div className="text-sm font-semibold text-foreground">Path B — Platform</div>
            <p className="mt-1 text-sm text-muted-foreground">
              You want NatureOS for dashboards, AI Studio, MINDEX, and the apps without rolling out
              hardware yet.
            </p>
          </Link>
          <Link
            href="#path-agents"
            className="rounded-lg border border-border bg-card p-4 hover:bg-accent transition-colors"
          >
            <div className="text-sm font-semibold text-foreground">Path C — MYCA / Agents</div>
            <p className="mt-1 text-sm text-muted-foreground">
              You want to build on, host, or run agents in the MYCA multi-agent system (MAS).
            </p>
          </Link>
          <Link
            href="#path-defense"
            className="rounded-lg border border-border bg-card p-4 hover:bg-accent transition-colors"
          >
            <div className="text-sm font-semibold text-foreground">Path D — Defence / Gov</div>
            <p className="mt-1 text-sm text-muted-foreground">
              You are a federal customer evaluating Mycosoft for an OTA, BAA, SBIR, or programme of
              record.
            </p>
          </Link>
        </div>

        <h2 id="path-device">Path A — Host Mycosoft devices on your property</h2>

        <div className="not-prose my-6 rounded-lg border border-border bg-muted/30 p-4">
          <p className="text-sm leading-relaxed text-foreground">
            <strong>How this works.</strong> Mycosoft devices are not sold as individual consumer
            units. They are data sensors and droids that operate collectively for the multi-agent
            system and the decentralized environmental database. Every device is owned, operated,
            and maintained by Mycosoft. Commercial and civilian partners subscribe to the
            data-access platform; in exchange, Mycosoft-owned devices can be hosted on the
            partner&apos;s property to capture the signal, coverage, or environmental resources the
            site provides. (Defense and federal customers, see{" "}
            <Link href="#path-defense">Path D</Link>.)
          </p>
        </div>

        <h3 id="device-pick">1. Identify the device class that fits the site</h3>
        <ul>
          <li>
            <strong>Mushroom 1</strong> — solar-powered quadruped walker. 2-metre soil probe, dual
            BME688 environmental sensors, 915 MHz mesh radio, six-month battery life with solar
            recharge. For forests, farms, parks, and field sites where a mobile, self-sited sensor
            can reposition itself.
          </li>
          <li>
            <strong>Hyphae 1</strong> — distributed edge datacenter. Air, light, sound, gas, radar,
            lidar, and radio (incl. jamming and anti-jamming) in a shelter-grade enclosure.
            Aggregates clusters of other Mycosoft devices and runs local compute.
          </li>
          <li>
            <strong>MycoNode</strong> — subsurface bioelectric probe, 5-mile broadcast range. Hand
            placement or Agaric-deployed for fungal and root-zone signal.
          </li>
          <li>
            <strong>SporeBase v4</strong> — bioaerosol collector. Time-indexed sealed tape captures
            pollen, spores, fungal, bacterial, and viral particulates in 15- to 60-minute segments.
            For air-quality, biosurveillance, and longitudinal studies.
          </li>
          <li>
            <strong>Agaric</strong> — flying platform (Mini / Standard / Heavy-Lift). Aerial
            survey, mesh extension, over-the-horizon work, and payload delivery of Mushroom 1,
            MycoNode, or SporeBase to remote terrain.
          </li>
          <li>
            <strong>ALARM</strong> — incident signalling device. Dual smoke (ionisation +
            photoelectric), VOC, particulates, CO₂, BME688, mold warning, on-device TinyML. For
            facilities, vehicles, and early-warning deployments.
          </li>
          <li>
            <strong>Psathyrella</strong> <em>(draft)</em> — water buoy with undersea cable
            monitoring, cameras, laser comms, and turbopropellers. Surface-deployed from USVs,
            manned vessels, or shore.
          </li>
        </ul>
        <p>
          Full device specs — dimensions, sensor channels, power profiles — live at{" "}
          <Link href="/devices">/devices</Link>.
        </p>

        <h3 id="device-order">2. Request a deployment on your site</h3>
        <ol>
          <li>
            Email <a href="mailto:contact@mycosoft.com">contact@mycosoft.com</a> with the site
            location, the kind of coverage or signal the property offers, the device classes that
            seem to fit, and the data you want access to in return.
          </li>
          <li>
            Mycosoft reviews the site for fit with the network. If accepted, we issue a hosting
            and data-access agreement that defines the device count, the data you receive, the
            subscription terms, and the access Mycosoft requires to install and maintain the
            hardware.
          </li>
          <li>
            Devices are shipped, installed, and commissioned by Mycosoft (or under Mycosoft
            supervision). They remain Mycosoft property throughout the deployment.
          </li>
        </ol>

        <h3 id="device-onboarding">3. What happens once devices are on site</h3>
        <ol>
          <li>
            Devices ship pre-flashed with Mycosoft firmware on ESP32-S3 silicon (MycoBrain) and
            are pre-paired into the Mycosoft fleet. Your NatureOS organisation is provisioned
            with the views and data scopes defined in the agreement.
          </li>
          <li>
            Devices join their local mesh via 915 MHz LoRa and reach the upstream gateway over
            Wi-Fi, cellular, or satellite — whichever path the site supports.
          </li>
          <li>
            Telemetry flows over <strong>MDP</strong> (Mycosoft Data Protocol — COBS-framed,
            CRC-16, device transport) into the upstream gateway, which forwards it over{" "}
            <strong>MMP</strong> (Mycosoft Mycorrhizae Protocol — gateway-to-cloud mesh) into the
            Mycosoft fleet and into your NatureOS views.
          </li>
          <li>
            You see your contracted data in NatureOS. Mycosoft handles firmware, calibration,
            field service, recovery, and end-of-life on the hardware itself.
          </li>
        </ol>

        <p>
          If anything stalls — no telemetry after 15 minutes — check the device&apos;s status LEDs
          (green: normal · blue: network · red: alert · amber: charging) and email{" "}
          <a href="mailto:support@mycosoft.com">support@mycosoft.com</a> with the device serial.
        </p>

        <h2 id="path-platform">Path B — Start with NatureOS</h2>

        <h3 id="platform-access">1. Request platform access</h3>
        <p>
          NatureOS is the cloud and edge platform: dashboards, AI Studio, MINDEX (data plane), Earth
          Simulator (environmental world model), CREP (Common Relevant Environmental Picture), and
          the apps. Request a workspace at{" "}
          <a href="mailto:contact@mycosoft.com">contact@mycosoft.com</a> with your team, intended
          users, and use case.
        </p>

        <h3 id="platform-data">2. Bring data in</h3>
        <ol>
          <li>
            <strong>Public data first.</strong> OEI (Open Environmental Intelligence) ingests AIS,
            ADS-B, satellite, weather, and biodiversity feeds out of the box. Turn the channels you
            need on in your workspace and see the data populate within minutes.
          </li>
          <li>
            <strong>Existing telemetry.</strong> Bring your own CSV, Parquet, or live stream over the
            NatureOS ingestion API. MINDEX stores the canonical record; AI Studio reads from it.
          </li>
          <li>
            <strong>Mycosoft devices.</strong> If you add devices later (Path A), they appear
            alongside your imported data without changes to dashboards.
          </li>
        </ol>

        <h3 id="platform-first-app">3. Open your first app</h3>
        <p>
          Pick one of the focused apps that matches your work — <em>earth-simulator</em>,{" "}
          <em>spore-tracker</em>, <em>growth-analytics</em>, <em>digital-twin</em>,{" "}
          <em>petri-dish-sim</em>, <em>retrosynthesis</em>, <em>symbiosis</em>, and so on. Each app
          is a thin client over the NatureOS APIs, so anything you do there shows up everywhere else
          in the platform.
        </p>

        <h2 id="path-agents">Path C — Start with MYCA / agents</h2>

        <p>
          <strong>MYCA</strong> is the MYCOSOFT Environmental Super Intelligence: an edge-native
          multi-agent system orchestrating <strong>over 1,000 agents</strong> across{" "}
          <strong>14 categories</strong>, governed by a three-tier permission model. MYCA is what
          you build on if you want autonomous workflows running against environmental and biological
          signal.
        </p>

        <h3 id="agents-clone">1. Clone the agent runtime</h3>
        <ol>
          <li>
            Clone the open-source MAS repo:{" "}
            <a href="https://github.com/MycosoftLabs/mycosoft-mas">
              github.com/MycosoftLabs/mycosoft-mas
            </a>
            .
          </li>
          <li>
            Follow the repo&apos;s README to bring up a local MAS instance. You will be running a
            scoped subset of MYCA against test data.
          </li>
          <li>
            Each agent operates under one of three permission tiers — <em>Read</em>{" "}
            (auto-approved), <em>Write</em> (requires approval), <em>Execute</em> (requires explicit
            yes). The permission model is non-negotiable for production deployments.
          </li>
        </ol>

        <h3 id="agents-connect">2. Connect to MYCA in production</h3>
        <ol>
          <li>
            For hosted MYCA access, request a workspace at{" "}
            <a href="mailto:contact@mycosoft.com">contact@mycosoft.com</a>.
          </li>
          <li>
            Your local agents connect over the MYCA APIs into the production fleet. AVANI provides
            the Live Earth Substrate that grounds agent actions in real, continuous planetary
            context.
          </li>
          <li>
            For voice and conversational interfaces, integrate <strong>MycaPLEX</strong> — our
            modified PersonaPlex full-duplex voice-to-agent stack.
          </li>
        </ol>

        <h3 id="agents-deploy">3. Deploy with discipline</h3>
        <p>
          Mycosoft draws a hard line between <em>deterministic</em> and <em>stochastic</em>{" "}
          pipelines. Any agent action that touches physical equipment, regulated workflows, or
          chain-of-custody records is deterministic by default — frontier models reason, draft, and
          explore, but they are never the sole decision-maker for a field action.
        </p>

        <h2 id="path-defense">Path D — Defence and government</h2>

        <h3 id="defense-credentials">1. Verify our credentials</h3>
        <ul>
          <li>
            UEI: <span className="font-mono">YK3ARVKJ77S9</span>
          </li>
          <li>
            CAGE: <span className="font-mono">9KR60</span>
          </li>
          <li>SAM.gov: active through April 9, 2027</li>
          <li>
            Contracting entity: <strong>Mycosoft, LLC</strong> (CA Entity No. 202253910565). All
            federal submissions are 100% self-performed.
          </li>
        </ul>

        <h3 id="defense-fit">2. Confirm programme fit</h3>
        <p>
          Mycosoft focuses on <strong>non-kinetic environmental intelligence and electronic
          warfare</strong> — jamming and anti-jamming, microwave, laser, radar, and software-defined
          radio — aligned with the U.S. military Black Dart programme. Current priorities:
        </p>
        <ul>
          <li>
            <strong>DARPA</strong> and <strong>U.S. Army</strong> first. ITDX 2026 white paper
            (W91RUSI-FCID260001) submitted; DARPA submission against HR001125S0011 covering the
            FUSARIUM programme submitted.
          </li>
          <li>
            <strong>USAF</strong> — engagement around Agaric as a deployment platform for
            Mushroom 1, MycoNode, and SporeBase.
          </li>
          <li>
            <strong>U.S. Navy</strong> — Tactical Operations (TAC-O) and undersea monitoring via the
            Psathyrella buoy.
          </li>
          <li>
            <strong>DoD SBIR</strong> — sequenced after the primary programmes.
          </li>
        </ul>

        <h3 id="defense-request">3. Request a capability statement and demo</h3>
        <p>
          Email <a href="mailto:contact@mycosoft.com">contact@mycosoft.com</a> with the agency, the
          programme, and the contact point. We will provide the capability statement, programme
          alignment notes, and schedule a CREP and device walkthrough.
        </p>

        <h2 id="what-next">What to read next</h2>
        <ul>
          <li>
            <Link href="/docs/what-is-mycosoft">What is Mycosoft</Link> — the canonical company and
            stack overview.
          </li>
          <li>
            <Link href="/docs/glossary">Glossary</Link> — every Mycosoft term in one place: MYCA,
            AVANI, NLM, MAS, MycaPLEX, CREP, MDP, MMP, every device, and every protocol.
          </li>
          <li>
            <Link href="/devices">/devices</Link> — full specifications page for every shipping
            device.
          </li>
          <li>
            <Link href="/docs/defense-government">Defence &amp; Government</Link> — federal-only
            engagement.
          </li>
          <li>
            <a href="https://github.com/MycosoftLabs/mycosoft-mas">mycosoft-mas on GitHub</a> — the
            open-source MYCA agent runtime.
          </li>
        </ul>

        <hr className="my-12" />

        <p className="text-sm text-muted-foreground">
          Previous: <Link href="/docs/what-is-mycosoft">← What is Mycosoft</Link> · Next:{" "}
          <Link href="/docs/glossary">Glossary →</Link>
        </p>
      </article>
    </DocsLayout>
  )
}
