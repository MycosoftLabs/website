import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ArrowRight, Cpu, Eye, Radio, Wind } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const sensingPages = {
  "fungi-compute-fci": {
    title: "Fungi Compute + FCI",
    eyebrow: "Biological Interface",
    icon: Cpu,
    summary:
      "Fungi Compute and the Fungal Computer Interface bring fungal bioelectric signals, soil contact, and mycelium-network interaction into Mycosoft's edge sensing stack.",
    sections: [
      {
        title: "Fungi Compute",
        body:
          "Fungi Compute treats fungal systems as a biological sensing and signal layer. Mycosoft devices capture bioelectric activity, response patterns, soil context, and environmental coupling, then turn those signals into structured data for NatureOS, MINDEX, MYCA, and field operations.",
      },
      {
        title: "FCI Probe",
        body:
          "The Fungal Computer Interface is the physical probe layer. It lets Mushroom 1 and other Mycosoft nodes make ground-actuated contact with soil, substrate, and mycelial networks while onboard electronics measure bioelectric, chemical, moisture, and contact-state response.",
      },
      {
        title: "What it senses",
        body:
          "The combined package focuses on bioelectric activity, stimulation response, soil-contact state, substrate moisture, environmental coupling, fungal response, and mycelium-network signals. It is the biological channel alongside optical, acoustic, gas, thermal, and spatial sensing.",
      },
      {
        title: "M-Wave",
        body:
          "M-Wave is the seismic and propagation lens for Fungi Compute. It studies synchronized bioelectric changes, pressure-wave response, and signal propagation through mycelium-linked sensing networks, then correlates those patterns with USGS earthquake data, field readings, and MINDEX anomaly analysis.",
      },
      {
        title: "Where it runs",
        body:
          "Mushroom 1, MycoBrain systems, SporeBase, Hyphae 1, and future field nodes can use Fungi Compute + FCI as part of a broader data sensor package for environmental intelligence.",
      },
      {
        title: "Why it matters",
        body:
          "Traditional sensing observes the environment from outside. Fungi Compute + FCI gives Mycosoft a way to listen from inside living systems, bringing soil, fungi, and biospheric response into the same operational stack as cameras, radar, LiDAR, acoustic sensing, gas detection, and edge AI.",
      },
    ],
    related: [
      { label: "Open Fungi Compute", href: "/natureos/fungi-compute" },
      { label: "M-Wave in MINDEX", href: "/natureos/mindex" },
      { label: "FCI Integration", href: "/devices/mycobrain/integration/fci" },
      { label: "Mushroom 1", href: "/devices/mushroom-1" },
    ],
  },
  bluesight: {
    title: "BlueSight",
    eyebrow: "Fungal Optical + Spatial Intelligence",
    icon: Eye,
    summary:
      "BlueSight combines blue-light fungal response with LiDAR, radar, WiFiSense, 8K 360 cameras, and 4K directional cameras for biological and field perception.",
    sections: [
      {
        title: "What it is",
        body:
          "BlueSight pairs controlled blue-light exposure with response capture, environmental context, biological signal interpretation, and spatial awareness. It gives Mycosoft devices a way to observe how fungal systems react to optical conditions while also understanding geometry, movement, presence, and scene state.",
      },
      {
        title: "Why blue light matters",
        body:
          "Fungi can respond to blue light through growth, behavior, and signaling pathways. BlueSight treats that response as a measurable biological channel rather than a side effect.",
      },
      {
        title: "Spatial stack",
        body:
          "BlueSight includes LiDAR for geometry, radar for motion and range, WiFiSense for presence and through-environment signal changes, 8K 360 camera coverage for complete scene awareness, and 4K directional cameras for focused inspection.",
      },
      {
        title: "How it fits",
        body:
          "BlueSight complements FCI, gas sensing, acoustic sensing, and particle detection so biological response can be interpreted with surrounding environmental state and physical context.",
      },
      {
        title: "Why it matters",
        body:
          "Environmental intelligence needs context. A gas spike, acoustic event, fungal response, or thermal signature becomes more useful when the system also knows where it happened and what was moving nearby.",
      },
    ],
    related: [
      { label: "About Mycosoft", href: "/about#about" },
      { label: "AGARIC", href: "/devices/agaric" },
      { label: "Hyphae 1", href: "/devices/hyphae-1" },
    ],
  },
  sine: {
    title: "SINE",
    eyebrow: "Acoustic Intelligence",
    icon: Radio,
    summary:
      "SINE is Mycosoft's acoustic sensing package for hydrophones, transducers, MEMS microphones, and acoustic communication protocols.",
    sections: [
      {
        title: "What it is",
        body:
          "SINE captures and interprets sound as environmental data. It is built for air, water, machine, animal, and human soundscapes where acoustic signals reveal activity before visual systems can.",
      },
      {
        title: "What it senses",
        body:
          "SINE targets marine life, birds, propellers, explosions, human sounds, machinery, environmental events, and acoustic communication. The system is designed to compare field audio against large libraries of recorded sounds.",
      },
      {
        title: "Hardware",
        body:
          "The package includes hydrophones for water, transducers for acoustic transmission, MEMS microphones for compact field capture, and acoustic comms protocols for signaling between devices.",
      },
    ],
    related: [
      { label: "Psathyrella", href: "/devices/psathyrella" },
      { label: "NatureOS", href: "/natureos" },
    ],
  },
  gandha: {
    title: "GANDHA",
    eyebrow: "Smell + Gas Intelligence",
    icon: Wind,
    summary:
      "GANDHA is Mycosoft's smell and gas detection stack for VOCs, VSCs, Bosch BME sensors, smell-blob training, and particle counters.",
    sections: [
      {
        title: "What it is",
        body:
          "GANDHA turns smell into structured environmental intelligence. It combines gas detection, volatile compound sensing, particulate sensing, and model training so devices can identify chemical patterns in the field.",
      },
      {
        title: "Sensor stack",
        body:
          "GANDHA uses VOC and VSC sensing, BME690, BME688, BME680, Bosch smell-blob training workflows, and BMV080 particle counters for air chemistry, particulate signatures, and changing environmental conditions.",
      },
      {
        title: "Why it matters",
        body:
          "Smell can reveal contamination, fire precursors, biological activity, decay, industrial leakage, indoor air events, and ecosystem change before a camera or map sees anything.",
      },
    ],
    related: [
      { label: "SporeBase", href: "/devices/sporebase" },
      { label: "MycoBrain", href: "/devices/mycobrain" },
    ],
  },
} as const

type SensingSlug = keyof typeof sensingPages

export function generateStaticParams() {
  return Object.keys(sensingPages).map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const page = sensingPages[slug as SensingSlug]
  if (!page) return {}

  return {
    title: `${page.title} | Mycosoft Sensing`,
    description: page.summary,
  }
}

export default async function SensingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const page = sensingPages[slug as SensingSlug]
  if (!page) notFound()

  const Icon = page.icon

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,rgba(6,78,59,0.22),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,255,255,0.72))] dark:bg-[radial-gradient(circle_at_25%_15%,rgba(16,185,129,0.12),transparent_34%),linear-gradient(180deg,rgba(2,8,6,0.96),rgba(2,8,6,0.82))]" />
        <div className="relative container mx-auto px-4 py-20 md:py-28">
          <Link href="/about" className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            About
          </Link>
          <div className="max-w-4xl">
            <Badge variant="outline" className="mb-5">{page.eyebrow}</Badge>
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl border border-emerald-950/15 bg-emerald-950/[0.06] backdrop-blur dark:border-emerald-200/15 dark:bg-emerald-200/10">
              <Icon className="h-7 w-7 text-emerald-950/75 dark:text-emerald-100" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight md:text-6xl">{page.title}</h1>
            <p className="mt-6 max-w-3xl text-lg leading-relaxed text-muted-foreground md:text-xl">{page.summary}</p>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-14 md:py-20">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {page.sections.map((section) => (
            <Card key={section.title} className="bg-card/80 backdrop-blur">
              <CardHeader>
                <CardTitle>{section.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-relaxed text-muted-foreground">{section.body}</CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          {page.related.map((link) => (
            <Button key={link.href} variant="outline" asChild>
              <Link href={link.href}>
                {link.label}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          ))}
        </div>
      </section>
    </main>
  )
}
