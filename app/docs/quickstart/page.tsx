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
      <article className="prose prose-neutral dark:prose-invert max-w-3xl prose-headings:scroll-mt-24 prose-h1:text-4xl prose-h2:mt-14 prose-h2:pt-6 prose-h2:border-t prose-h2:border-border prose-h2:text-2xl prose-h2:font-bold prose-h3:mt-10 prose-h3:text-xl prose-h3:font-semibold prose-p:leading-relaxed prose-li:leading-relaxed prose-ul:my-4 prose-ol:my-4">
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
          This page takes you from zero to your first data flowing through a Mycosoft system in
          about fifteen minutes. There are three entry paths — pick the one that matches what
          you have today and what you want to do next. You can come back and follow another path
          later.
        </p>

        <div className="not-prose my-8 grid gap-4 sm:grid-cols-3">
          <Link
            href="#path-device"
            className="rounded-lg border border-border bg-card p-4 hover:bg-accent transition-colors"
          >
            <div className="text-sm font-semibold text-foreground">Path A — Device</div>
            <p className="mt-1 text-sm text-muted-foreground">
              You have (or want) a Mushroom 1, Hyphae 1, or Agaric and want signal in a
              dashboard.
            </p>
          </Link>
          <Link
            href="#path-api"
            className="rounded-lg border border-border bg-card p-4 hover:bg-accent transition-colors"
          >
            <div className="text-sm font-semibold text-foreground">Path B — API</div>
            <p className="mt-1 text-sm text-muted-foreground">
              You are a developer and you want to query NatureOS / OEI from your own code.
            </p>
          </Link>
          <Link
            href="#path-dashboards"
            className="rounded-lg border border-border bg-card p-4 hover:bg-accent transition-colors"
          >
            <div className="text-sm font-semibold text-foreground">Path C — Dashboards</div>
            <p className="mt-1 text-sm text-muted-foreground">
              You want to explore data in NatureOS dashboards without writing code.
            </p>
          </Link>
        </div>

        <h2 id="before-you-start">Before you start</h2>

        <p>You need:</p>
        <ul>
          <li>A work email address you can receive mail at.</li>
          <li>
            For Path A only — physical device hardware (Mushroom 1, Hyphae 1, an Agaric
            development board, or a partner board running FCI firmware), a USB-C cable, and
            Wi-Fi access.
          </li>
          <li>
            For Path B only — a computer with{" "}
            <span className="font-mono">curl</span> or Node.js / Python installed.
          </li>
        </ul>

        <p>
          By using the Services you agree to the <Link href="/terms">Mycosoft Terms of
          Service</Link>. The Terms apply to every path below.
        </p>

        <h2 id="path-device">Path A — From device to first signal</h2>

        <p>Target outcome: your device is paired, online, and streaming readings into NatureOS.</p>

        <h3 id="device-step-1">1. Identify your device</h3>
        <ul>
          <li>
            <strong>Mushroom 1</strong> — flagship; substrate-grown mycelium probe with full FCI
            firmware. <Link href="/docs/devices">Spec sheet →</Link>
          </li>
          <li>
            <strong>Hyphae 1</strong> — compact growth / signal node; lower-cost classroom and
            citizen-science deployments.
          </li>
          <li>
            <strong>Agaric</strong> — reference development board for partners and integrators.
          </li>
        </ul>
        <p>
          Other devices in the lineup (<strong>MycoNode</strong>, <strong>SporeBase</strong>,{" "}
          <strong>ALARM</strong>, <strong>MycoBrain</strong> board) follow the same flow; consult
          the device-specific page for any deltas.
        </p>

        <h3 id="device-step-2">2. Power on and flash (if needed)</h3>
        <p>
          Production devices ship with FCI firmware pre-flashed. If you have a development board
          or want to upgrade:
        </p>
        <ol>
          <li>
            Install PlatformIO CLI: <span className="font-mono">pip install platformio</span>.
          </li>
          <li>
            Clone the firmware repo:{" "}
            <span className="font-mono">
              git clone https://github.com/MycosoftLabs/mycobrain-firmware.git
            </span>
          </li>
          <li>
            Connect the device by USB-C and run <span className="font-mono">pio run -t upload</span>{" "}
            from the repo root.
          </li>
        </ol>
        <p>
          Full reference and troubleshooting:{" "}
          <Link href="/docs/fci-firmware">FCI firmware documentation</Link>.
        </p>

        <h3 id="device-step-3">3. Join Wi-Fi and pair</h3>
        <ol>
          <li>
            On first boot the device exposes a captive Wi-Fi network named{" "}
            <span className="font-mono">mycosoft-setup-XXXX</span>.
          </li>
          <li>
            Join it from your phone or laptop. The pairing page opens automatically.
          </li>
          <li>
            Enter your Wi-Fi credentials and the pairing code printed on the device label.
          </li>
          <li>
            When the device boots into normal mode, it registers with NatureOS and appears in
            your device list.
          </li>
        </ol>

        <h3 id="device-step-4">4. See your first signal</h3>
        <p>
          Sign in at <a href="https://natureos.mycosoft.com">natureos.mycosoft.com</a> and open
          the device. Within a minute or two you should see live bioelectric and environmental
          channels (temperature, humidity, VOC, gas resistance, bioelectric voltage). The
          dashboard updates in real time and stores history in MINDEX so you can scrub backwards.
        </p>

        <div className="not-prose my-6 rounded-lg border border-border bg-muted/40 p-4 text-sm">
          <p className="m-0">
            <strong>If you don&apos;t have a device yet:</strong> request one at{" "}
            <a href="mailto:contact@mycosoft.com">contact@mycosoft.com</a> with the use case
            (research, classroom, commercial pilot, defence) and the deployment environment.
            Allocation is currently order-by-order.
          </p>
        </div>

        <h2 id="path-api">Path B — From zero to first API call</h2>

        <p>Target outcome: you have an API key, made a successful authenticated call, and seen real data come back.</p>

        <h3 id="api-step-1">1. Request developer access</h3>
        <ol>
          <li>
            Email <a href="mailto:contact@mycosoft.com">contact@mycosoft.com</a> with the subject{" "}
            <strong>API access request</strong> and include your name, organisation, intended use
            case, and whether you need access to your own device data, the OEI public-data layer,
            or both.
          </li>
          <li>
            Accept the <Link href="/terms">Terms of Service</Link>.
          </li>
          <li>
            You will receive a developer-portal invitation and an initial API key with scoped
            permissions.
          </li>
        </ol>

        <h3 id="api-step-2">2. Make your first call</h3>
        <p>From a terminal:</p>
        <pre className="not-prose overflow-x-auto rounded-lg border border-border bg-muted/40 p-4 text-sm font-mono">
{`curl -H "Authorization: Bearer YOUR_API_KEY" \\
     https://api.mycosoft.com/v1/health`}
        </pre>
        <p>
          You should get a JSON <span className="font-mono">200 OK</span> with platform version
          and your key&apos;s scopes. If you get a 401, your key isn&apos;t active yet — wait a
          minute and retry; if it persists, contact support.
        </p>

        <h3 id="api-step-3">3. Query real data</h3>
        <p>List the devices in your organisation:</p>
        <pre className="not-prose overflow-x-auto rounded-lg border border-border bg-muted/40 p-4 text-sm font-mono">
{`curl -H "Authorization: Bearer YOUR_API_KEY" \\
     https://api.mycosoft.com/v1/devices`}
        </pre>
        <p>Pull the last hour of signal from a device:</p>
        <pre className="not-prose overflow-x-auto rounded-lg border border-border bg-muted/40 p-4 text-sm font-mono">
{`curl -H "Authorization: Bearer YOUR_API_KEY" \\
     "https://api.mycosoft.com/v1/devices/DEVICE_ID/signal?window=1h"`}
        </pre>
        <p>
          Each row is a timestamped reading. The full schema, rate limits, pagination rules, and
          OEI public-data endpoints (AIS, ADS-B, weather, biodiversity) are documented under{" "}
          <Link href="/docs/api">API reference</Link>.
        </p>

        <h3 id="api-step-4">4. Optional — talk to an agent</h3>
        <p>
          If your access scope includes the agent runtime, you can send a task to MYCA from your
          code. See <Link href="/docs/ai/myca">MYCA</Link> for the request shape, agent roles,
          and the Task Automation Law that governs what an agent will and will not do
          autonomously.
        </p>

        <h2 id="path-dashboards">Path C — Explore in NatureOS dashboards</h2>

        <p>Target outcome: you have a NatureOS account and have opened a live dashboard.</p>

        <ol>
          <li>
            Go to <a href="https://natureos.mycosoft.com">natureos.mycosoft.com</a> and sign in
            with the email used in your pilot, order, or partnership.
          </li>
          <li>
            On the home page, open the <strong>Environment</strong> tile to see public-data
            feeds (OEI), or the <strong>Devices</strong> tile to see live device telemetry, or
            the <strong>Apps</strong> tile to launch a simulation (mushroom-sim,
            petri-dish-sim, earth-simulator, and others).
          </li>
          <li>
            Every chart in NatureOS has an <strong>Export</strong> button — CSV or JSON, with the
            same data your API key can pull.
          </li>
        </ol>

        <p>
          Dashboard catalogue and deep-links live under{" "}
          <Link href="/docs/dashboards">Dashboards</Link>.
        </p>

        <h2 id="what-next">What to do next</h2>

        <h3 id="next-developers">If you&apos;re a developer</h3>
        <ul>
          <li>
            <Link href="/docs/api">API reference</Link> — full endpoint list and SDKs.
          </li>
          <li>
            <Link href="/docs/fci-firmware">FCI firmware</Link> — protocol details, MQTT topics,
            OTA, custom builds.
          </li>
          <li>
            <Link href="/docs/mas">MAS</Link> — running and hosting agents.
          </li>
          <li>
            <Link href="/docs/open-source">Open source</Link> — what is permissively licensed,
            source-available, or commercial.
          </li>
        </ul>

        <h3 id="next-operators">If you&apos;re an operator or scientist</h3>
        <ul>
          <li>
            <Link href="/docs/devices">Devices</Link> — per-device deployment guides.
          </li>
          <li>
            <Link href="/docs/mindex">MINDEX</Link> — how telemetry is stored and queried.
          </li>
          <li>
            <Link href="/docs/dashboards">Dashboards</Link> — building views and exports.
          </li>
          <li>
            <Link href="/docs/apps">Apps</Link> — the simulation and lab tools on top of
            NatureOS.
          </li>
        </ul>

        <h3 id="next-defense">If you&apos;re a defence or government contact</h3>
        <ul>
          <li>
            <Link href="/docs/defense-government">Defence &amp; Government</Link> — SAM.gov
            status (UEI <span className="font-mono">YK3ARVKJ77S9</span>, CAGE{" "}
            <span className="font-mono">9KR60</span>), capability statements, teaming, and the
            deployment-sponsor model.
          </li>
          <li>
            <Link href="/docs/security">Security</Link> — controls, evidence, and the CREP
            pipeline.
          </li>
        </ul>

        <h2 id="getting-help">Getting help</h2>

        <ul>
          <li>
            General — <a href="mailto:contact@mycosoft.com">contact@mycosoft.com</a>
          </li>
          <li>
            Engineering — issues and discussions at{" "}
            <a href="https://github.com/MycosoftLabs">github.com/MycosoftLabs</a>
          </li>
          <li>
            Glossary of every term you&apos;ll meet in these docs:{" "}
            <Link href="/docs/glossary">Glossary</Link>
          </li>
        </ul>

        <hr className="my-12" />

        <p className="text-sm text-muted-foreground">
          Back to: <Link href="/docs/what-is-mycosoft">What is Mycosoft</Link> · Next:{" "}
          <Link href="/docs/glossary">Glossary →</Link>
        </p>
      </article>
    </DocsLayout>
  )
}
