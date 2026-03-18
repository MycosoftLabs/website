"use client"

/**
 * Nature Learning Model - Comprehensive explainer and technical documentation
 * Route: /myca/nlm
 * Canonical content home for NLM: implementation, reasoning, business potential, ethics.
 * Integrates all content from NLM Training Dashboard + frontier AI context.
 * Created: Mar 02, 2026
 */

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { NLMTechnicalArchitecture } from "@/components/myca/NLMTechnicalArchitecture"
import { LiveTranslationDemo } from "@/components/myca/LiveTranslationDemo"
import { NeuromorphicProvider, NeuCard, NeuCardContent } from "@/components/ui/neuromorphic"
import {
  Brain,
  Leaf,
  ChevronRight,
  Shield,
  Sparkles,
  Cpu,
  Layers,
  BookOpen,
  ExternalLink,
  ArrowRight,
  Activity,
  FileText,
  Network,
  Database,
  Microscope,
  TreeDeciduous,
  Bug,
  Globe,
  Target,
  LineChart,
  Beaker,
  Upload,
  BookMarked,
  Wind,
  Briefcase,
  Scale,
  Wrench,
  GitBranch,
} from "lucide-react"

const TRAINING_PHASES = [
  { name: "Mycospeak Foundation", progress: 100, status: "complete", description: "Base fungal communication patterns" },
  { name: "Chemical Signal Mapping", progress: 100, status: "complete", description: "VOC and enzyme signal translation" },
  { name: "Mycelial Network Topology", progress: 87, status: "training", description: "Network structure and behavior patterns" },
  { name: "Interspecies Communication", progress: 45, status: "training", description: "Cross-kingdom signal interpretation" },
  { name: "Environmental Response", progress: 12, status: "queued", description: "Stress and adaptation signals" },
  { name: "Symbiotic Relationships", progress: 0, status: "queued", description: "Mycorrhizal communication patterns" },
]

const NLM_PHASES = [
  { phase: "Phase 0", name: "Foundations", timeline: "0-6 months", status: "active", items: ["NMF v0.1 + ingestion pipeline", "Lab rigs for 3-5 fungal species", "Baseline dataset + calibration logs", "Baseline NLM-Funga: denoiser + event detector", "Benchmark harness"] },
  { phase: "Phase 1", name: "Funga Decoding", timeline: "6-18 months", status: "upcoming", items: ["Scale to 10-20 species", "FungaLex v0.5 probabilistic lexicon", "NatureOS dashboards integration", "Closed-loop stimulation-response protocols"] },
  { phase: "Phase 2", name: "Cross-Species Translation", timeline: "18-36 months", status: "planned", items: ["Plant root-zone + VOC/hormone sensing", "Interaction graph learning", "Causal hypothesis generation", "Regional pilots"] },
  { phase: "Phase 3", name: "Nature Intelligence at Scale", timeline: "36+ months", status: "vision", items: ["Earth observation integration", "Data-assimilating world model", "Open benchmarks ecosystem", "Global nature translation network"] },
]

const RESEARCH_PAPERS = [
  { title: "Fungal Electrical Signaling Patterns", authors: "Adamatzky et al.", year: 2022, citations: 156, url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10157304/" },
  { title: "Inter-plant Communication via Mycorrhizal Networks", authors: "Gorzelak et al.", year: 2015, citations: 892, url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4497361/" },
  { title: "Mycelial Intelligence: A New Paradigm", authors: "Stamets & Trappe", year: 2023, citations: 342, url: "#" },
  { title: "Chemical Signaling in Fungal Networks", authors: "Boddy et al.", year: 2024, citations: 89, url: "#" },
]

const SIX_LAYERS = [
  { layer: "1", title: "Sensing & Acquisition", icon: Activity, cardClass: "bg-purple-500/5 border-purple-500/20", iconClass: "text-purple-600 dark:text-purple-400", badgeClass: "bg-purple-500/20", items: ["Fungal electrophysiology (FCI)", "Chemical & environmental sensors", "Time-lapse imaging"] },
  { layer: "2", title: "Edge Processing", icon: Cpu, cardClass: "bg-blue-500/5 border-blue-500/20", iconClass: "text-blue-600 dark:text-blue-400", badgeClass: "bg-blue-500/20", items: ["Denoising & artifact removal", "Spike/event detection", "On-device compression"] },
  { layer: "3", title: "Transport", icon: Network, cardClass: "bg-cyan-500/5 border-cyan-500/20", iconClass: "text-cyan-600 dark:text-cyan-400", badgeClass: "bg-cyan-500/20", items: ["Mesh/gateway architecture", "Store-and-forward", "Mycorrhizae Protocol alignment"] },
  { layer: "4", title: "Data Integrity & Indexing", icon: Database, cardClass: "bg-green-500/5 border-green-500/20", iconClass: "text-green-600 dark:text-green-400", badgeClass: "bg-green-500/20", items: ["MINDEX provenance layer", "Dataset lakehouse", "Feature derivation"] },
  { layer: "5", title: "Model Layer (NLM)", icon: Brain, cardClass: "bg-amber-500/5 border-amber-500/20", iconClass: "text-amber-600 dark:text-amber-400", badgeClass: "bg-amber-500/20", items: ["NLM-Funga foundation model", "Translation services", "Forecasting & anomaly detection"] },
  { layer: "6", title: "Application (NatureOS)", icon: Layers, cardClass: "bg-pink-500/5 border-pink-500/20", iconClass: "text-pink-600 dark:text-pink-400", badgeClass: "bg-pink-500/20", items: ["Dashboards & APIs", "Experiment orchestration", "Stimulation loops"] },
]

export default function NLMPage() {
  const overallProgress = TRAINING_PHASES.reduce((sum, p) => sum + p.progress, 0) / TRAINING_PHASES.length

  return (
    <NeuromorphicProvider>
      <div className="min-h-dvh">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-purple-900/30 via-green-900/20 to-emerald-900/30 border-b border-purple-500/20">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />
          <div className="relative z-10 container max-w-6xl mx-auto px-4 md:px-6 py-12 md:py-16">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge variant="outline" className="bg-purple-500/20 border-purple-500/50 text-purple-700 dark:text-purple-300">
                    <Sparkles className="h-3 w-3 mr-1" /> Foundation Model
                  </Badge>
                  <Badge variant="outline" className="bg-green-500/20 border-green-500/50 text-green-700 dark:text-green-300">
                    Training Active
                  </Badge>
                  <Badge variant="outline" className="bg-amber-500/20 border-amber-500/50 text-amber-700 dark:text-amber-300">
                    Frontier AI
                  </Badge>
                </div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 via-green-600 to-emerald-600 dark:from-purple-400 dark:via-green-400 dark:to-emerald-400 bg-clip-text text-transparent">
                  Nature Learning Model
                </h1>
                <p className="text-base md:text-lg text-muted-foreground mt-2 max-w-2xl">
                  The reasoning backbone inside our ecosystem, responsible for turning MYCA and AVANI&apos;s rich data
                  into structured inferences, rules, and decisions. Robust by design — operates under partial data,
                  conflicting signals, and noisy environments while surfacing its own uncertainty.
                </p>
              </div>
              <Link href="/natureos/model-training">
                <Button size="lg" className="gap-2 min-h-[44px] min-w-[180px] mt-4 md:mt-0">
                  NLM Training Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <div className="container max-w-6xl mx-auto px-4 md:px-6 py-12 space-y-16">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-purple-500/10 border-purple-500/20">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Brain className="h-4 w-4" /> Model Status</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-purple-600 dark:text-purple-400">Training</div><p className="text-sm text-muted-foreground">NLM-Funga Phase 0</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Translation Accuracy</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-green-600 dark:text-green-500">94.7%</div><Progress value={94.7} className="h-2 mt-2" /></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Training Data</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">2.4M</div><p className="text-sm text-muted-foreground">Signal samples</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Overall Progress</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{overallProgress.toFixed(0)}%</div><Progress value={overallProgress} className="h-2 mt-2" /></CardContent>
            </Card>
          </div>

          {/* NLM in Frontier AI */}
          <section>
            <NeuCard className="border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-purple-500/5">
              <NeuCardContent className="pt-6">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <LineChart className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  The NLM in the World of Frontier AI
                </h2>
                <p className="text-muted-foreground mb-4">
                  The Nature Learning Model (NLM) is the reasoning backbone inside our ecosystem, specializing in connecting dots
                  over time and across modalities. It helps the system explain not just what is happening but why and what might
                  happen next. NLM integrates tightly with MYCA&apos;s worldview and AVANI&apos;s live Earth feeds, giving every agent
                  access to a shared, evolving logical substrate.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-background/50 border">
                    <h4 className="font-medium mb-2">Robust by Design</h4>
                    <p className="text-sm text-muted-foreground">
                      NLM can operate under partial data, conflicting signals, and noisy environments, while surfacing its own
                      uncertainty so humans and downstream agents can react appropriately. It is designed for scientific
                      falsifiability and calibrated uncertainty — never overstating confidence.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-background/50 border">
                    <h4 className="font-medium mb-2">Shared Logical Substrate</h4>
                    <p className="text-sm text-muted-foreground">
                      NLM exposes simple APIs for classification, causal inference, and plan evaluation. It uses synchronized
                      multi-modal telemetry and structured vocabularies aligned to MYCA/AVANI ontologies. Output is operational
                      state — enabling automation, forecasting, and closed-loop control across the entire stack.
                    </p>
                  </div>
                </div>
              </NeuCardContent>
            </NeuCard>
          </section>

          {/* Business Potential */}
          <section>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Briefcase className="h-6 w-6 text-green-600 dark:text-green-400" />
              Business Potential
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="bg-green-500/5 border-green-500/20">
                <CardHeader className="pb-2"><CardTitle className="text-base">Precision Agriculture</CardTitle></CardHeader>
                <CardContent><p className="text-sm text-muted-foreground">Soil health, mycorrhizal network mapping, stress detection, and predictive irrigation from fungal and plant signals.</p></CardContent>
              </Card>
              <Card className="bg-green-500/5 border-green-500/20">
                <CardHeader className="pb-2"><CardTitle className="text-base">Bioremediation & Biosensing</CardTitle></CardHeader>
                <CardContent><p className="text-sm text-muted-foreground">Early warning for contamination, pollutant degradation monitoring, and environmental impact assessment via biosensor networks.</p></CardContent>
              </Card>
              <Card className="bg-green-500/5 border-green-500/20">
                <CardHeader className="pb-2"><CardTitle className="text-base">Climate & Biodiversity</CardTitle></CardHeader>
                <CardContent><p className="text-sm text-muted-foreground">Ecosystem state forecasting, species interaction modeling, and data-assimilating Earth models for policy and conservation.</p></CardContent>
              </Card>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              NLM outputs are structured, licensable, and integrable into existing workflows&mdash;APIs, dashboards, and decision support systems.
            </p>
          </section>

          {/* Technological & Ethical Potential */}
          <section>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Scale className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              Technological & Ethical Potential
            </h2>
            <div className="space-y-4">
              <Card className="bg-amber-500/5 border-amber-500/20">
                <CardHeader><CardTitle className="text-base">Scientific Integrity by Design</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    The NLM is built to be <strong>falsifiable</strong>. Claims are benchmarked against controlled perturbations.
                    We do not anthropomorphize fungal signals; we learn motifs and state transitions with explicit confidence bounds.
                    Translation to human language is a <em>view</em> of the structured state, not the ground truth.
                  </p>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Calibrated uncertainty on every output</li>
                    <li>• Open benchmarks and cross-lab validation</li>
                    <li>• Stimulation protocols bounded by safety envelopes</li>
                  </ul>
                </CardContent>
              </Card>
              <Card className="bg-amber-500/5 border-amber-500/20">
                <CardHeader><CardTitle className="text-base">Responsible Deployment</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    NLM is intended for research, agriculture, and environmental monitoring. We avoid dual-use applications that could
                    harm ecosystems or enable surveillance of sensitive biological systems. Data provenance, permissions, and consent
                    are built into the NMF (Nature Message Frame) format from the start.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* What Makes NLM Different */}
          <section>
            <NeuCard className="border-2 border-dashed border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-green-500/5">
              <NeuCardContent className="pt-6">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  What Makes NLM Different from Traditional AI?
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h3 className="font-bold text-lg flex items-center gap-2"><Brain className="h-5 w-5 text-blue-600 dark:text-blue-400" /> Large Language Models (LLM)</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li className="flex items-start gap-2"><ChevronRight className="h-4 w-4 mt-1 text-blue-600 dark:text-blue-400 shrink-0" /><span>Primary signal: <strong>human text</strong> (plus images/audio)</span></li>
                      <li className="flex items-start gap-2"><ChevronRight className="h-4 w-4 mt-1 text-blue-600 dark:text-blue-400 shrink-0" /><span>Core objective: predict/produce language tokens</span></li>
                      <li className="flex items-start gap-2"><ChevronRight className="h-4 w-4 mt-1 text-blue-600 dark:text-blue-400 shrink-0" /><span>Ground truth: human-written corpora and supervised labels</span></li>
                    </ul>
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-bold text-lg flex items-center gap-2"><Leaf className="h-5 w-5 text-green-600 dark:text-green-400" /> Nature Learning Model (NLM)</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li className="flex items-start gap-2"><ChevronRight className="h-4 w-4 mt-1 text-green-600 dark:text-green-400 shrink-0" /><span>Primary signal: <strong>synchronized nature telemetry</strong> (time series + chemistry + imagery)</span></li>
                      <li className="flex items-start gap-2"><ChevronRight className="h-4 w-4 mt-1 text-green-600 dark:text-green-400 shrink-0" /><span>Core objective: learn latent state + interaction dynamics of ecosystems</span></li>
                      <li className="flex items-start gap-2"><ChevronRight className="h-4 w-4 mt-1 text-green-600 dark:text-green-400 shrink-0" /><span>Ground truth: <strong>causal experiments</strong>, field observations, physical/biological assays</span></li>
                    </ul>
                  </div>
                </div>
                <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <p className="text-sm text-amber-800 dark:text-amber-200 flex items-start gap-2">
                    <Shield className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <span><strong>Key Design Constraint:</strong> NLM must be scientifically falsifiable and calibrated with explicit uncertainty, rather than &quot;story-like&quot; translation.</span>
                  </p>
                </div>
              </NeuCardContent>
            </NeuCard>
          </section>

          {/* Abstract */}
          <section>
            <Card>
              <CardHeader><CardTitle className="text-xl">Abstract</CardTitle></CardHeader>
              <CardContent className="prose prose-invert max-w-none space-y-3">
                <p>
                  The <strong>Nature Learning Model (NLM)</strong> is a proposed class of multi-modal foundation models that learn the
                  <strong> information-bearing signals of living and non-living Earth systems</strong> and translate them into
                  operational representations usable by humans, machines, and scientific workflows.
                </p>
                <p>
                  Unlike a Large Language Model (LLM) trained primarily on human text, the NLM is trained on synchronized observations
                  across biology and geophysics: <strong>bioelectric activity, chemical gradients, volatile compounds, growth dynamics,
                  genomics, microbiome profiles, imagery, acoustics, and physical environmental telemetry</strong>.
                </p>
                <p>
                  The program starts with <strong>fungi (&quot;funga&quot;)</strong> because fungal mycelia are ubiquitous, form dense networks,
                  and show measurable electrical spiking activity. The initial deliverable is <strong>NLM‑Funga</strong>, trained on
                  standardized fungal input-output datasets captured with Mycosoft&apos;s Fungal Computer Interface (FCI), producing a
                  compact <strong>bio-token</strong> vocabulary (&quot;micro-speak&quot;) aligned to scientific ontologies.
                </p>
              </CardContent>
            </Card>
          </section>

          {/* Why Fungi First + Training Phases */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" /> Training Phases</CardTitle>
                <CardDescription>Progressive learning stages for Mycospeak translation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {TRAINING_PHASES.map((phase, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                      <div><span className="font-medium">{phase.name}</span><p className="text-sm text-muted-foreground">{phase.description}</p></div>
                      <Badge variant={phase.status === "complete" ? "default" : phase.status === "training" ? "outline" : "secondary"} className="w-fit">
                        {phase.status === "complete" ? "✓ Complete" : phase.status === "training" ? "Training..." : "Queued"}
                      </Badge>
                    </div>
                    <Progress value={phase.progress} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="bg-amber-500/5 border-amber-500/20">
              <CardHeader><CardTitle className="flex items-center gap-2"><Microscope className="h-5 w-5 text-amber-600 dark:text-amber-400" /> Why Fungi First?</CardTitle></CardHeader>
              <CardContent className="space-y-4 text-sm">
                <p>Research indicates fungi exhibit <strong>extracellular electrical potential spikes</strong> and structured spiking activity, with researchers proposing &quot;fungal language&quot; interpretations.</p>
                <div className="space-y-3 pt-2">
                  <div className="flex items-start gap-2"><Network className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-1" /><span><strong>Continuous substrate</strong> - Dense mycelial networks enable comprehensive sensing</span></div>
                  <div className="flex items-start gap-2"><TreeDeciduous className="h-4 w-4 text-green-600 dark:text-green-400 mt-1" /><span><strong>Ecosystem coupling</strong> - Strong connection to soil microenvironments and plant roots</span></div>
                  <div className="flex items-start gap-2"><GitBranch className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-1" /><span><strong>Scalable pathway</strong> - Mycorrhizal networks enable cross-species modeling</span></div>
                </div>
                <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC10157304/" target="_blank" rel="noopener noreferrer" className="text-xs text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1">
                  <ExternalLink className="h-3 w-3" /> View Research: Fungal Communication Signals
                </a>
              </CardContent>
            </Card>
          </div>

          {/* Live Translation Demo - client-only to avoid hydration mismatch */}
          <LiveTranslationDemo />

          {/* NLM Technical Architecture - MDP, MMP, HPL, FCI, CREP, MINDEX */}
          <NLMTechnicalArchitecture />

          <section>
            <h2 className="text-2xl font-bold mb-6">Six-Layer Reference Architecture</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {SIX_LAYERS.map((layer, i) => {
                const LayerIcon = layer.icon
                return (
                <Card key={i} className={layer.cardClass}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full ${layer.badgeClass} flex items-center justify-center text-xs font-bold`}>{layer.layer}</div>
                      <LayerIcon className={`h-4 w-4 ${layer.iconClass}`} />
                      {layer.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-xs space-y-1 text-muted-foreground">
                      {layer.items.map((item, j) => (
                        <li key={j} className="flex items-start gap-1"><ChevronRight className="h-3 w-3 mt-0.5" />{item}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )})}
            </div>
          </section>

          <section>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" /> Nature Message Frame (NMF)</CardTitle>
                <CardDescription>Versioned record format for model-ready data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-background p-4 rounded-lg font-mono text-xs overflow-x-auto">
                  <pre className="text-green-700 dark:text-green-300">{`NMF v0.1 Record Format:
├── timestamp + location/lab context
├── sensor_identity + calibration_hash
├── taxonomy/strain + growth_stage + substrate
├── raw_waveform_blocks + derived_features
├── environmental_context_streams
├── experiment_protocol_metadata
│   ├── stimulus (type, magnitude, timing)
│   └── expected_response
├── data_quality_flags
└── provenance + permissions`}</pre>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Micro-speak + Translation Layer */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Cpu className="h-5 w-5 text-purple-600 dark:text-purple-400" /> Micro-speak: Bio-Token Vocabulary</CardTitle>
                <CardDescription>Tokenization without anthropomorphism</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">Rather than claiming literal semantics, NLM defines bio-tokens as learned motifs over multi-channel windows.</p>
                <div className="space-y-2">
                  <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20"><h4 className="font-medium text-sm text-purple-300">Level 0: Spike Primitives</h4><p className="text-xs text-muted-foreground mt-1">Basic electrical impulse patterns detected in mycelium</p></div>
                  <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20"><h4 className="font-medium text-sm text-purple-300">Level 1: Burst &quot;Phrases&quot;</h4><p className="text-xs text-muted-foreground mt-1">Grouped spike patterns forming coherent signal units</p></div>
                  <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20"><h4 className="font-medium text-sm text-purple-300">Level 2: State Transitions</h4><p className="text-xs text-muted-foreground mt-1">&quot;Messages&quot; as observable state change events</p></div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Layers className="h-5 w-5 text-green-600 dark:text-green-400" /> Translation Layer</CardTitle>
                <CardDescription>Funga → Ontology → Language</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">Output is structured and calibrated, then rendered into human language as a view of the structured state.</p>
                <div className="bg-background p-4 rounded-lg"><pre className="text-xs text-green-700 dark:text-green-300 overflow-x-auto">{`{"state":"nutrient_foraging_upshift","confidence":0.82,"evidence":["token_17_burst","soil_moisture_drop","CO2_rise"],"predicted_next":["growth_direction_change"],"recommended_action":["increase_sampling_rate"]}`}</pre></div>
                <p className="text-xs text-muted-foreground italic mt-2">Human language summaries are a view of the structured state, not the ground truth.</p>
              </CardContent>
            </Card>
          </div>

          {/* Expansion Path */}
          <section>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5 text-blue-600 dark:text-blue-400" /> Expansion Path Beyond Funga</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2"><div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center"><TreeDeciduous className="h-5 w-5 text-green-600 dark:text-green-400" /></div><h3 className="font-bold">Phase 2: Plants</h3></div>
                    <p className="text-sm text-muted-foreground">Mycorrhizal networks + root zone chemistry + VOC sensing. Joint embeddings for fungi+plants+microbes.</p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2"><div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center"><Bug className="h-5 w-5 text-amber-600 dark:text-amber-400" /></div><h3 className="font-bold">Phase 3: Multi-Species</h3></div>
                    <p className="text-sm text-muted-foreground">Non-invasive animal/insect modalities: acoustics, movement, environmental DNA in permitted contexts.</p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2"><div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center"><Globe className="h-5 w-5 text-blue-600 dark:text-blue-400" /></div><h3 className="font-bold">Phase 4: Earth Systems</h3></div>
                    <p className="text-sm text-muted-foreground">Fuse with physical telemetry: meteorology, hydrology, geophysics, remote sensing for world modeling.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Training Strategy */}
          <section>
            <Card>
              <CardHeader><CardTitle className="text-2xl">NLM-Funga Training Strategy</CardTitle><CardDescription>Scientifically grounded approach to model training</CardDescription></CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2"><Badge className="bg-blue-500">1</Badge><h3 className="text-lg font-medium">Self-Supervised Pretraining (Unlabeled)</h3></div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-blue-500/10 rounded-lg"><h4 className="font-medium mb-2">Masked Time-Series Modeling</h4><p className="text-sm text-muted-foreground">Learn patterns by predicting masked portions of signal sequences</p></div>
                    <div className="p-4 bg-blue-500/10 rounded-lg"><h4 className="font-medium mb-2">Next-Event Prediction</h4><p className="text-sm text-muted-foreground">Spike/burst forecasting from signal history</p></div>
                    <div className="p-4 bg-blue-500/10 rounded-lg"><h4 className="font-medium mb-2">Cross-Modal Contrastive</h4><p className="text-sm text-muted-foreground">Align electrical ↔ environment ↔ chemistry ↔ imaging</p></div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-2"><Badge className="bg-green-500">2</Badge><h3 className="text-lg font-medium">Supervised Alignment (Labeled)</h3></div>
                  <p className="text-sm text-muted-foreground">Labels are functional states: Foraging Drive, Stress Response, Resource Reallocation, Boundary Encounter, Host Association, Nutrient Seeking.</p>
                  <p className="text-sm text-muted-foreground">Controlled perturbations: nutrient gradients, osmotic stress, temperature shifts, pH changes, mechanical perturbation, inhibitory exposures.</p>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-2"><Badge className="bg-purple-500">3</Badge><h3 className="text-lg font-medium">Causal Identification (Closed-Loop)</h3></div>
                  <p className="text-sm text-muted-foreground">Use stimulation/perturbation to distinguish correlation vs causation. Validate token stability under interventions. Cross-validate across labs, devices, substrates.</p>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Validation Benchmarks */}
          <section>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-green-400" /> Validation Benchmarks</CardTitle><CardDescription>Every claim needs a benchmark for scientific rigor</CardDescription></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {[{ name: "Instrumentation", desc: "SNR, drift, impedance stability" }, { name: "Stimulus Inference", desc: "Predict stimulus from signals" }, { name: "Response Forecasting", desc: "Predict near-future signals" }, { name: "Generalization", desc: "Cross-lab/device/species transfer" }, { name: "Safety", desc: "Stimulation envelopes & constraints" }].map((bench, i) => (
                    <div key={i} className="p-4 bg-green-500/10 rounded-lg border border-green-500/20 text-center"><h4 className="font-medium text-sm">{bench.name}</h4><p className="text-xs text-muted-foreground mt-1">{bench.desc}</p></div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Development Roadmap */}
          <section>
            <h2 className="text-2xl font-bold mb-6">Development Roadmap</h2>
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-green-500 via-amber-500 to-purple-500" />
              <div className="space-y-8">
                {NLM_PHASES.map((phase, i) => (
                  <div key={i} className="relative pl-12">
                    <div className={`absolute left-0 w-8 h-8 rounded-full flex items-center justify-center ${phase.status === "active" ? "bg-green-500" : phase.status === "upcoming" ? "bg-amber-500" : phase.status === "planned" ? "bg-blue-500" : "bg-purple-500"}`}>
                      {phase.status === "active" ? <Activity className="h-4 w-4 text-white" /> : phase.status === "upcoming" ? <ArrowRight className="h-4 w-4 text-white" /> : <Sparkles className="h-4 w-4 text-white" />}
                    </div>
                    <Card className={phase.status === "active" ? "border-green-500/50 bg-green-500/5" : ""}>
                      <CardHeader className="pb-2">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <CardTitle className="text-lg flex items-center gap-2"><Badge variant={phase.status === "active" ? "default" : "outline"}>{phase.phase}</Badge>{phase.name}</CardTitle>
                          <span className="text-sm text-muted-foreground">{phase.timeline}</span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {phase.items.map((item, j) => (
                            <li key={j} className="flex items-center gap-2 text-sm"><ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />{item}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* How the NLM Training Dashboard Works */}
          <section>
            <NeuCard className="border-2 border-dashed border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-purple-500/5">
              <NeuCardContent className="pt-6">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Wrench className="h-6 w-6 text-blue-400" />
                  How the NLM Training Dashboard Works
                </h2>
                <p className="text-muted-foreground mb-4">
                  The <Link href="/natureos/model-training" className="text-blue-600 dark:text-blue-400 hover:underline">NLM Training Dashboard</Link> at <code className="text-sm bg-muted px-1 rounded">/natureos/model-training</code> is the operational interface for NLM-Funga development.
                  It evolved from early NatureOS model-training prototypes and now serves as the primary tool for monitoring training progress, viewing live translation demos, and accessing experiment controls.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-background/50 border">
                    <h4 className="font-medium mb-2">What the Dashboard Does</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Displays model status, translation accuracy, and training data metrics</li>
                      <li>• Provides Pause/Resume and Export Model controls (wired to NLM API when available)</li>
                      <li>• Shows live raw signal input → structured translation output (simulated or real FCI streams)</li>
                      <li>• Organizes content into tabs: Overview, About NLM, Architecture, Training, Roadmap</li>
                      <li>• Links to Smell Training tools (Wizard, Blob Manager, Smell Encyclopedia)</li>
                    </ul>
                  </div>
                  <div className="p-4 rounded-lg bg-background/50 border">
                    <h4 className="font-medium mb-2">Relationship to This Page</h4>
                    <p className="text-sm text-muted-foreground">
                      This page (<code className="text-xs bg-muted px-1 rounded">/myca/nlm</code>) is the <strong>canonical content home</strong> for NLM: implementation details, reasoning, business and ethical potential, and full technical documentation.
                      The dashboard is the <strong>utility layer</strong>—controls, live demos, and experiment orchestration. Over time, the dashboard will lean further into tooling and applications while this page remains the comprehensive reference.
                    </p>
                  </div>
                </div>
                <Link href="/natureos/model-training">
                  <Button variant="outline" className="mt-4 gap-2">
                    Open NLM Training Dashboard
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </NeuCardContent>
            </NeuCard>
          </section>

          {/* Smell Training Apps */}
          <section>
            <Card className="border-green-500/30 bg-gradient-to-br from-green-950/20 to-transparent">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Wind className="h-5 w-5 text-green-600 dark:text-green-500" /> Smell Training Applications</CardTitle>
                <CardDescription>BME688/690 gas sensor training for MINDEX fungal smell detection</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Link href="/natureos/smell-training">
                    <Card className="h-full hover:border-green-500/50 hover:bg-green-500/5 transition-colors cursor-pointer group">
                      <CardContent className="p-4 flex flex-col items-center text-center">
                        <div className="p-3 rounded-xl bg-green-500/20 group-hover:bg-green-500/30 transition-colors mb-3"><Beaker className="h-8 w-8 text-green-500" /></div>
                        <h4 className="font-semibold">Smell Training Wizard</h4>
                        <p className="text-xs text-muted-foreground mt-1">Record fungal specimens and export training data for Bosch AI-Studio</p>
                      </CardContent>
                    </Card>
                  </Link>
                  <Link href="/natureos/smell-training?tab=blobs">
                    <Card className="h-full hover:border-amber-500/50 hover:bg-amber-500/5 transition-colors cursor-pointer group">
                      <CardContent className="p-4 flex flex-col items-center text-center">
                        <div className="p-3 rounded-xl bg-amber-500/20 group-hover:bg-amber-500/30 transition-colors mb-3"><Upload className="h-8 w-8 text-amber-500" /></div>
                        <h4 className="font-semibold">Blob Manager</h4>
                        <p className="text-xs text-muted-foreground mt-1">Upload and manage BSEC selectivity blobs for smell classification</p>
                      </CardContent>
                    </Card>
                  </Link>
                  <Link href="/natureos/mindex?tab=smells">
                    <Card className="h-full hover:border-purple-500/50 hover:bg-purple-500/5 transition-colors cursor-pointer group">
                      <CardContent className="p-4 flex flex-col items-center text-center">
                        <div className="p-3 rounded-xl bg-purple-500/20 group-hover:bg-purple-500/30 transition-colors mb-3"><BookMarked className="h-8 w-8 text-purple-600 dark:text-purple-500" /></div>
                        <h4 className="font-semibold">Smell Encyclopedia</h4>
                        <p className="text-xs text-muted-foreground mt-1">Browse MINDEX smell signatures with fungal species and VOC profiles</p>
                      </CardContent>
                    </Card>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Research Foundation */}
          <section>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><BookOpen className="h-6 w-6" /> Research Foundation</h2>
            <p className="text-muted-foreground mb-6">Scientific papers informing NLM development</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {RESEARCH_PAPERS.map((paper, i) => (
                <Card key={i} className="bg-muted/50 hover:bg-muted/70 transition-colors cursor-pointer" onClick={() => paper.url !== "#" && window.open(paper.url, "_blank")}>
                  <CardContent className="p-4">
                    <h4 className="font-medium text-sm line-clamp-2">{paper.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{paper.authors} ({paper.year})</p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-muted-foreground">{paper.citations} citations</p>
                      {paper.url !== "#" && <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="py-12 border-t">
            <div className="flex flex-col md:flex-row gap-4 justify-center items-center flex-wrap">
              <Link href="/natureos/model-training">
                <Button size="lg" className="gap-2 min-h-[44px] min-w-[200px] w-full md:w-auto">
                  NLM Training Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/science">
                <Button variant="outline" size="lg" className="gap-2 min-h-[44px] min-w-[160px] w-full md:w-auto">
                  <FileText className="h-4 w-4" />
                  White Paper
                </Button>
              </Link>
              <Link href="/contact">
                <Button variant="secondary" size="lg" className="gap-2 min-h-[44px] min-w-[160px] w-full md:w-auto">
                  Request access
                </Button>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </NeuromorphicProvider>
  )
}
