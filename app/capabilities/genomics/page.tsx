import type { Metadata } from "next"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Dna, CircleDot, Layers, Globe, Bot, ArrowRight, 
  Shield, Building2, Smartphone, Microscope, Database,
  Sparkles, CheckCircle2
} from "lucide-react"

export const metadata: Metadata = {
  title: "Genomics Capabilities - Mycosoft",
  description: "Advanced genomics visualization and analysis tools for fungal species research, biosecurity, and environmental intelligence",
}

const tools = [
  {
    title: "JBrowse2 Genome Browser",
    description: "Industry-standard linear genome browser with multi-track support, zoom controls, and gene annotation display",
    icon: Layers,
    color: "indigo",
    features: ["Multi-chromosome navigation", "Gene track visualization", "Zoom & pan controls", "Region search"],
    link: "/natureos/mindex#genomics"
  },
  {
    title: "Species Explorer",
    description: "Spatial heatmap visualization of fungal observations from iNaturalist and GBIF data sources",
    icon: Globe,
    color: "cyan",
    features: ["Interactive heatmap", "Temporal timeline", "Multi-source aggregation", "Real-time filtering"],
    link: "/natureos/mindex/explorer"
  },
  {
    title: "Circos Visualization",
    description: "Circular genome plots for species relationships, metabolic pathways, and gene networks",
    icon: CircleDot,
    color: "purple",
    features: ["Genome plots", "Pathway diagrams", "Phylogeny circles", "SVG/PNG export"],
    link: "/ancestry/tools#genomics"
  },
  {
    title: "Genome Track Viewer",
    description: "Gosling.js-powered multi-track visualization with Ideograms, GC content, and gene annotations",
    icon: Dna,
    color: "green",
    features: ["Multi-track support", "Ideogram view", "GC content display", "Gene annotations"],
    link: "/ancestry/tools#genomics"
  },
  {
    title: "AI Explainer",
    description: "Interactive educational tool explaining transformer architecture and MYCA AI integration",
    icon: Bot,
    color: "amber",
    features: ["Model transparency", "Architecture visualization", "Interactive learning", "MYCA integration"],
    link: "/natureos/ai-studio/explainer"
  }
]

const useCases = [
  {
    title: "Defense & Biosecurity",
    icon: Shield,
    description: "Identify fungal threats and track pathogen spread with real-time genome analysis",
    applications: ["Fusarium tracking", "Bioaerosol detection", "Threat identification", "Containment planning"]
  },
  {
    title: "Enterprise Research",
    icon: Building2,
    description: "Accelerate fungal research with integrated visualization and analysis pipelines",
    applications: ["Drug discovery", "Strain comparison", "Pathway analysis", "Publication-ready figures"]
  },
  {
    title: "NatureOS Integration",
    icon: Smartphone,
    description: "Connect field devices to cloud genomics for real-time species identification",
    applications: ["MycoBrain data", "Field sequencing", "Species ID", "Environmental monitoring"]
  },
  {
    title: "MINDEX Database",
    icon: Database,
    description: "Cryptographically-verified genomic data with blockchain integrity",
    applications: ["Data provenance", "Research replication", "Audit trails", "Cross-validation"]
  }
]

const techSpecs = [
  { label: "Visualization Libraries", value: "JBrowse2, Gosling.js, pyCirclize, Vitessce" },
  { label: "Data Sources", value: "iNaturalist, GBIF, NCBI GenBank" },
  { label: "Output Formats", value: "SVG, PNG, PDF, Interactive" },
  { label: "Performance", value: "Lazy-loaded, sub-second render times" },
  { label: "API Integration", value: "REST endpoints, WebSocket streams" },
  { label: "Agent Support", value: "GenomicsVisualizationAgent, SpeciesExplorerAgent" }
]

export default function GenomicsCapabilitiesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <Badge variant="outline" className="mb-4">Advanced Genomics</Badge>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Genomics <span className="text-green-500">Visualization</span> Platform
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
          Industry-leading visualization tools for fungal genomics research, integrated with 
          MINDEX database and powered by MAS autonomous agents
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button asChild size="lg">
            <Link href="/natureos/mindex">
              Open MINDEX Dashboard <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/ancestry/tools#genomics">
              Explore Ancestry Tools
            </Link>
          </Button>
        </div>
      </section>

      {/* Tools Grid */}
      <section className="container mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold text-center mb-8">Visualization Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool) => {
            const Icon = tool.icon
            const colorClasses: Record<string, string> = {
              indigo: "text-indigo-500 bg-indigo-500/10",
              cyan: "text-cyan-500 bg-cyan-500/10",
              purple: "text-purple-500 bg-purple-500/10",
              green: "text-green-500 bg-green-500/10",
              amber: "text-amber-500 bg-amber-500/10"
            }
            
            return (
              <Card key={tool.title} className="hover:border-green-500/40 transition-colors">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-lg ${colorClasses[tool.color]}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-lg">{tool.title}</CardTitle>
                  </div>
                  <CardDescription>{tool.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-4">
                    {tool.features.map(feature => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button variant="ghost" size="sm" asChild className="w-full">
                    <Link href={tool.link}>
                      Open Tool <ArrowRight className="ml-2 h-3 w-3" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      {/* Use Cases */}
      <section className="container mx-auto px-4 py-12 bg-muted/30 rounded-3xl my-8">
        <h2 className="text-3xl font-bold text-center mb-8">Use Cases</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {useCases.map((useCase) => {
            const Icon = useCase.icon
            return (
              <Card key={useCase.title} className="bg-background/50">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Icon className="h-8 w-8 text-green-500" />
                    <CardTitle>{useCase.title}</CardTitle>
                  </div>
                  <CardDescription>{useCase.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {useCase.applications.map(app => (
                      <Badge key={app} variant="secondary">{app}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      {/* Technical Specifications */}
      <section className="container mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold text-center mb-8">Technical Specifications</h2>
        <Card className="max-w-3xl mx-auto">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {techSpecs.map((spec) => (
                <div key={spec.label} className="flex flex-col gap-1 p-4 bg-muted/30 rounded-lg">
                  <span className="text-sm text-muted-foreground">{spec.label}</span>
                  <span className="font-medium">{spec.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Sparkles className="h-6 w-6 text-green-500" />
          <span className="text-sm uppercase tracking-wider text-muted-foreground">Powered by MAS v2</span>
        </div>
        <h2 className="text-3xl font-bold mb-4">Ready to Explore?</h2>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
          Start visualizing fungal genomes, tracking species observations, and analyzing genetic data today
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button asChild size="lg">
            <Link href="/signup">
              Get Started Free
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/defense/request-briefing">
              Request Defense Briefing
            </Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
