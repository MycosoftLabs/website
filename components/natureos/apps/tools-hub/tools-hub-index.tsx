import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface HubItem {
  name: string
  description: string
  href: string
  status: "live" | "beta" | "pending_data_source"
}

interface HubCategory {
  title: string
  description: string
  items: HubItem[]
}

const categories: HubCategory[] = [
  {
    title: "Lab Equipment",
    description: "Registers, samples, and instrument flows via NatureOS lab tools.",
    items: [
      {
        name: "Lab tools home",
        description: "Overview of registered equipment and lab ops entry points.",
        href: "/natureos/lab-tools/register",
        status: "live",
      },
      {
        name: "Register equipment",
        description: "Provision bioreactors, pipettes, Tecan-class systems when backend is configured.",
        href: "/natureos/lab-tools/register",
        status: "beta",
      },
    ],
  },
  {
    title: "AI Analysis",
    description: "Vision, VOC, and olfactory pipelines tied to devices and models.",
    items: [
      {
        name: "Smell training",
        description: "BME688 / VOC signature workflows.",
        href: "/natureos/smell-training",
        status: "live",
      },
      {
        name: "Petri imaging (MyceliumSeg)",
        description:
          "Validation panel inside Virtual Petri Dish talks to the MyceliumSeg API when MYCELIUMSEG_API_URL/NEXT_PUBLIC_MYCELIUMSEG_API_URL points at a running service (8010 by default).",
        href: "/natureos/virtual-petri-dish",
        status: "pending_data_source",
      },
    ],
  },
  {
    title: "Chemistry",
    description: "Reaction planning and compound exploration.",
    items: [
      {
        name: "Compound Analyser",
        description: "Primary chemistry workspace (public NatureOS app route).",
        href: "/natureos/compound-analyser",
        status: "live",
      },
      {
        name: "Retrosynthesis",
        description: "Planning tool under legacy tools namespace.",
        href: "/natureos/tools/retrosynthesis",
        status: "live",
      },
      {
        name: "Alchemy Lab",
        description: "Molecular modeling sandbox.",
        href: "/natureos/tools/alchemy-lab",
        status: "live",
      },
    ],
  },
  {
    title: "Biology",
    description: "Organism- and tissue-scale instruments.",
    items: [
      {
        name: "Biology Simulator",
        description: "Landing + roadmap for cross-scale simulation program.",
        href: "/natureos/biology-simulator",
        status: "beta",
      },
      {
        name: "Digital Twin",
        description: "Biological digital twin tooling.",
        href: "/natureos/tools/digital-twin",
        status: "live",
      },
      {
        name: "Lifecycle Simulator",
        description: "Lifecycle dynamics.",
        href: "/natureos/tools/lifecycle-sim",
        status: "live",
      },
    ],
  },
  {
    title: "Genetics & Genomics",
    description: "Sequence, browser, and visualization stacks.",
    items: [
      {
        name: "Genetics tools",
        description: "NatureOS genetics workspace.",
        href: "/natureos/genetics",
        status: "live",
      },
      {
        name: "Ancestry genomics",
        description: "Genomics section inside Ancestry Database.",
        href: "/natureos/ancestry/tools#genomics",
        status: "live",
      },
    ],
  },
  {
    title: "Physics & Math",
    description: "Simulation kernels supporting biology and chemistry UX.",
    items: [
      {
        name: "Physics Simulator",
        href: "/natureos/tools/physics-sim",
        description: "Physics-first sandbox.",
        status: "live",
      },
      {
        name: "Genetic Circuit",
        href: "/natureos/tools/genetic-circuit",
        description: "Circuit-level biological computation visualization.",
        status: "live",
      },
      {
        name: "Symbiosis",
        href: "/natureos/tools/symbiosis",
        description: "Relationship networks.",
        status: "live",
      },
      {
        name: "MATLAB bridge",
        href: "/natureos/tools/matlab",
        description: "MATLAB-facing integrations when configured.",
        status: "pending_data_source",
      },
    ],
  },
  {
    title: "Sampling & Lab Ops",
    description: "Chain-of-custody oriented flows.",
    items: [
      {
        name: "Samples",
        description: "Use Lab Tools → samples routes (IDs from register flow).",
        href: "/natureos/lab-tools/register",
        status: "beta",
      },
    ],
  },
]

function statusBadge(status: HubItem["status"]) {
  if (status === "live") return <Badge>Live</Badge>
  if (status === "beta") return <Badge variant="secondary">Beta</Badge>
  return <Badge variant="outline">Pending data source</Badge>
}

export function ToolsHubIndex() {
  return (
    <div className="container mx-auto px-4 py-6 md:py-10 max-w-5xl space-y-10">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">NatureOS</p>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">Science &amp; Lab Tools Hub</h1>
        <p className="text-sm sm:text-base text-muted-foreground max-w-3xl">
          Seven categories catalog real routes only — nothing listed here is mock data. Items marked pending require an
          upstream service or dataset before they surface live metrics.
        </p>
      </header>

      <div className="space-y-10">
        {categories.map((cat) => (
          <section key={cat.title} className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">{cat.title}</h2>
              <p className="text-sm text-muted-foreground">{cat.description}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cat.items.map((item) => (
                <Card key={item.name + item.href} className="border-border/70">
                  <CardHeader className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-lg">{item.name}</CardTitle>
                      {statusBadge(item.status)}
                    </div>
                    <CardDescription className="text-base">{item.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link
                      href={item.href}
                      className="inline-flex min-h-[44px] items-center text-base font-medium text-primary underline-offset-4 hover:underline touch-manipulation"
                    >
                      Open →
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
