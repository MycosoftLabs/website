"use client"

/**
 * Nature Learning Model - Comprehensive explainer and technical documentation
 * Route: /myca/nlm
 * Canonical content home for NLM: implementation, reasoning, business potential, ethics.
 * Cards: monochrome glass (black/white) matching NLM training app — no blue slate / green tints.
 * Created: Mar 02, 2026 | Glass restyle: Sep 22, 2026
 */

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { NLMTechnicalArchitecture } from "@/components/myca/NLMTechnicalArchitecture"
import { LiveTranslationDemo } from "@/components/myca/LiveTranslationDemo"
import { NLMStatsPanel } from "@/components/myca/NLMStatsPanel"
import { NlmTrainingApplication } from "@/components/natureos/nlm-training/NlmTrainingApplication"
import {
  NLM_GLASS_CARD,
  NLM_GLASS_CHIP,
  NLM_GLASS_HERO,
  NLM_GLASS_ICON_WELL,
  NLM_GLASS_INSET,
} from "@/components/myca/nlm-glass"
import {
  NLM_GLASS_CYCLE_FRAMES,
  ProductGlassIconCycle,
} from "@/components/brand/product-glass-icon-cycle"
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
import { cn } from "@/lib/utils"

const REFERENCE_MODEL = [
  { name: "Input", detail: "16 environmental features, 7 missingness flags, and 1 elapsed-time feature. Missing stays distinct from a measured zero." },
  { name: "Memory", detail: "A learned projection and two selective state-space blocks. The sequence state resets between independent captures." },
  { name: "Chart", detail: "32 learned coordinates per observation, then the nearest of four fitted prototypes. Novelty is the training 99th-percentile distance, not a claim that the input is false." },
  { name: "Weights", detail: "A versioned trained parameter set produces the reference coordinates. The weights are published with the model." },
  { name: "Abstention", detail: "Unsupported ontology, or every measurement missing, produces no probability. The model does not invent a midpoint." },
]

const NLM_PHASES = [
  { phase: "Phase 0", name: "Foundations", timeline: "0-6 months", status: "active", items: ["NMF v0.2 + ingestion pipeline (operational)", "Lab rigs for 5 fungal species (active)", "3.1M sample dataset + calibration logs (growing)", "NLM-Funga v0.3: denoiser + event detector + early translator", "Benchmark harness (v1 operational)"] },
  { phase: "Phase 1", name: "Funga Decoding", timeline: "6-18 months", status: "upcoming", items: ["Scale to 10-20 species", "FungaLex v0.5 probabilistic lexicon", "NatureOS dashboards integration", "Closed-loop stimulation-response protocols"] },
  { phase: "Phase 2", name: "Cross-Species Translation", timeline: "18-36 months", status: "planned", items: ["Plant root-zone + VOC/hormone sensing", "Interaction graph learning", "Causal hypothesis generation", "Regional pilots"] },
  { phase: "Phase 3", name: "Nature Intelligence at Scale", timeline: "36+ months", status: "vision", items: ["Earth observation integration", "Data-assimilating world model", "Open benchmarks ecosystem", "Global nature translation network"] },
]

const RESEARCH_PAPERS = [
  { title: "Fungal Electrical Signaling Patterns", authors: "Adamatzky et al.", year: 2022, citations: 156, url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10157304/" },
  { title: "Inter-plant Communication via Mycorrhizal Networks", authors: "Gorzelak et al.", year: 2015, citations: 892, url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4497361/" },
  { title: "Mycelial Intelligence: A New Paradigm", authors: "Stamets & Trappe", year: 2023, citations: 342, url: "#" },
  { title: "Chemical Signaling in Fungal Networks", authors: "Boddy et al.", year: 2024, citations: 89, url: "#" },
  { title: "Multi-Modal Biosignal Fusion for Ecosystem State Inference", authors: "Mycosoft Research", year: 2026, citations: 12, url: "#" },
]

const SIX_LAYERS = [
  { layer: "1", title: "Sensing & Acquisition", icon: Activity, items: ["Fungal electrophysiology (FCI)", "Chemical & environmental sensors", "Time-lapse imaging"] },
  { layer: "2", title: "Edge Processing", icon: Cpu, items: ["Denoising & artifact removal", "Spike/event detection", "On-device compression"] },
  { layer: "3", title: "Transport", icon: Network, items: ["Mesh/gateway architecture", "Store-and-forward", "Mycorrhizae Protocol alignment"] },
  { layer: "4", title: "Data Integrity & Indexing", icon: Database, items: ["MINDEX provenance layer", "Dataset lakehouse", "Feature derivation"] },
  { layer: "5", title: "Model Layer (NLM)", icon: Brain, items: ["NLM-Funga signal-state model", "Translation services", "Forecasting & anomaly detection"] },
  { layer: "6", title: "Application (NatureOS)", icon: Layers, items: ["Dashboards & APIs", "Experiment orchestration", "Stimulation loops"] },
]

function phaseDotClass(status: string): string {
  if (status === "active") return "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
  if (status === "upcoming") return "bg-zinc-600 text-white dark:bg-zinc-400 dark:text-zinc-900"
  if (status === "planned") return "bg-zinc-400 text-zinc-900 dark:bg-zinc-600 dark:text-white"
  return "bg-zinc-300 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100"
}

export default function NLMPage() {
  return (
    <div className="product-glass-page min-h-dvh">
      {/* Hero — monochrome glass */}
      <section className={NLM_GLASS_HERO}>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] bg-[size:40px_40px] dark:bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)]" />
        <div className="relative z-10 container max-w-6xl mx-auto px-4 md:px-6 py-12 md:py-16">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Badge variant="outline" className={cn(NLM_GLASS_CHIP, "px-2.5 py-1 text-xs font-medium")}>
                  <Sparkles className="h-3 w-3 mr-1" /> Signal Model Family
                </Badge>
                <Badge variant="outline" className={cn(NLM_GLASS_CHIP, "px-2.5 py-1 text-xs font-medium")}>
                  Training Active
                </Badge>
                <Badge variant="outline" className={cn(NLM_GLASS_CHIP, "px-2.5 py-1 text-xs font-medium")}>
                  Frontier SI
                </Badge>
              </div>
              <h1 className="mt-1 inline-flex max-w-full flex-nowrap items-center gap-[0.18em] text-3xl font-bold tracking-tight leading-none sm:text-4xl md:text-5xl">
                <ProductGlassIconCycle
                  frames={NLM_GLASS_CYCLE_FRAMES}
                  className="h-[1em] w-[1em] scale-90 translate-y-[5px]"
                  alt="Nature Learning Model"
                  reducedMotionLightIndex={0}
                  reducedMotionDarkIndex={1}
                />
                <span className="whitespace-nowrap leading-none bg-gradient-to-r from-purple-600 via-green-600 to-emerald-600 bg-clip-text text-transparent dark:from-purple-400 dark:via-green-400 dark:to-emerald-400">
                  Nature Learning Model
                </span>
              </h1>
              <p className="text-base md:text-lg text-muted-foreground mt-2 max-w-2xl">
                A numerical model of a physical environment through time. It learns light, sound, gas, electricity,
                heat, and pressure together, keeps a missing channel empty, and writes a state that says what was
                measured. The reference is a selective state-space model with a versioned trained parameter set.
              </p>
            </div>
            <Link href="/natureos/model-training">
              <Button size="lg" className="gap-2 min-h-[44px] min-w-[180px] mt-4 md:mt-0">
                Open Full Training Dashboard
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="container mx-auto max-w-7xl px-4 py-8 md:px-6">
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-black shadow-2xl shadow-black/30">
          <NlmTrainingApplication embedded />
        </div>
      </section>

      <div className="container max-w-6xl mx-auto px-4 md:px-6 py-12 space-y-16">
        <NLMStatsPanel />

        {/* NLM in Frontier AI */}
        <section>
          <Card className={NLM_GLASS_CARD}>
            <CardContent className="pt-6">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <LineChart className="h-6 w-6 text-zinc-800 dark:text-zinc-200" />
                The NLM in the World of Frontier SI
              </h2>
              <p className="text-muted-foreground mb-4">
                The Nature Learning Model (NLM) is the reasoning backbone inside our ecosystem, specializing in connecting dots
                over time and across modalities. It helps the system explain not just what is happening but why and what might
                happen next. NLM integrates tightly with MYCA&apos;s worldview and AVANI&apos;s live Earth feeds, giving every agent
                access to a shared, evolving logical substrate.
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className={cn(NLM_GLASS_INSET, "p-4")}>
                  <h4 className="font-medium mb-2">Robust by Design</h4>
                  <p className="text-sm text-muted-foreground">
                    NLM can operate under partial data, conflicting signals, and noisy environments, while surfacing its own
                    uncertainty so humans and downstream agents can react appropriately. It is designed for scientific
                    falsifiability and calibrated uncertainty — never overstating confidence.
                  </p>
                </div>
                <div className={cn(NLM_GLASS_INSET, "p-4")}>
                  <h4 className="font-medium mb-2">Shared Logical Substrate</h4>
                  <p className="text-sm text-muted-foreground">
                    NLM exposes simple APIs for classification, causal inference, and plan evaluation. It uses synchronized
                    multi-modal telemetry and structured vocabularies aligned to MYCA/AVANI ontologies. Output is operational
                    state — enabling automation, forecasting, and closed-loop control across the entire stack.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Business Potential */}
        <section>
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-zinc-800 dark:text-zinc-200" />
            Business Potential
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className={NLM_GLASS_CARD}>
              <CardHeader className="pb-2"><CardTitle className="text-base">Precision Agriculture</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">Soil health, mycorrhizal network mapping, stress detection, and predictive irrigation from fungal and plant signals.</p></CardContent>
            </Card>
            <Card className={NLM_GLASS_CARD}>
              <CardHeader className="pb-2"><CardTitle className="text-base">Bioremediation & Biosensing</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">Early warning for contamination, pollutant degradation monitoring, and environmental impact assessment via biosensor networks.</p></CardContent>
            </Card>
            <Card className={NLM_GLASS_CARD}>
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
            <Scale className="h-6 w-6 text-zinc-800 dark:text-zinc-200" />
            Technological & Ethical Potential
          </h2>
          <div className="space-y-4">
            <Card className={NLM_GLASS_CARD}>
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
            <Card className={NLM_GLASS_CARD}>
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
          <Card className={cn(NLM_GLASS_CARD, "border-dashed")}>
            <CardContent className="pt-6">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-zinc-800 dark:text-zinc-200" />
                What Makes NLM Different
              </h2>
              <p className="text-muted-foreground mb-6 max-w-3xl">
                The Nature Learning Model is a <strong>family of signal-state and scenario learning models</strong>.
                It learns from calibrated physical measurements—spectral, acoustic, bioelectric, thermal, chemical,
                and mechanical—via Nature Message Frames, encoders, and temporal state-space backbones. Human-language
                summaries are optional views of structured state, not the training objective.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <h3 className="font-bold text-lg flex items-center gap-2"><Leaf className="h-5 w-5 text-zinc-700 dark:text-zinc-300" /> Primary signal</h3>
                  <p className="text-sm text-muted-foreground"><strong>Synchronized nature telemetry</strong> — time series, chemistry, imagery, and multi-channel sensor streams.</p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-lg flex items-center gap-2"><Brain className="h-5 w-5 text-zinc-700 dark:text-zinc-300" /> Core objective</h3>
                  <p className="text-sm text-muted-foreground">Learn latent environmental state and interaction dynamics of ecosystems under uncertainty.</p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-lg flex items-center gap-2"><Beaker className="h-5 w-5 text-zinc-700 dark:text-zinc-300" /> Ground truth</h3>
                  <p className="text-sm text-muted-foreground"><strong>Causal experiments</strong>, field observations, and physical/biological assays—not prose corpora alone.</p>
                </div>
              </div>
              <div className={cn(NLM_GLASS_INSET, "mt-6 p-4 flex items-start gap-2")}>
                <Shield className="h-5 w-5 mt-0.5 flex-shrink-0 text-zinc-700 dark:text-zinc-300" />
                <p className="text-sm text-zinc-800 dark:text-zinc-200">
                  <strong>Key Design Constraint:</strong> NLM must be scientifically falsifiable and calibrated with explicit uncertainty, rather than &quot;story-like&quot; translation.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Abstract */}
        <section>
          <Card className={NLM_GLASS_CARD}>
            <CardHeader><CardTitle className="text-xl">Abstract</CardTitle></CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none space-y-3">
              <p>
                The <strong>Nature Learning Model (NLM)</strong> is a trained selective state-space model. Each observation
                is a 24-value input: 16 environmental features, 7 missingness flags, and one elapsed-time feature. Two
                state-space blocks emit 32 learned coordinates.
              </p>
              <p>
                On the controlled synthetic population, clean pattern and link scores reach F1 1.0. A +20 °C temperature
                bias drops those scores to 0.558 and 0.566. Erasing the discriminative information drops both to 0.
                Missing measurements or an unsupported observation contract cause abstention. These are fixture results,
                not a field calibration.
              </p>
              <p>
                The training loss combines pattern classification, next-observation prediction, and reconstruction of the
                observed channels. Temperature scaling is fit on the validation split. Comparative advantage on real
                devices, sites, and conditions remains an open test.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Why Fungi First + Training Phases */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className={cn(NLM_GLASS_CARD, "lg:col-span-2")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" /> Implemented reference</CardTitle>
              <CardDescription>Not a progress bar, and not a field claim.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {REFERENCE_MODEL.map((item) => (
                <div key={item.name} className="space-y-1">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">{item.detail}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className={NLM_GLASS_CARD}>
            <CardHeader><CardTitle className="flex items-center gap-2"><Microscope className="h-5 w-5 text-zinc-800 dark:text-zinc-200" /> Why Fungi First?</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p>Research indicates fungi exhibit <strong>extracellular electrical potential spikes</strong> and structured spiking activity, with researchers proposing &quot;fungal language&quot; interpretations.</p>
              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-2"><Network className="h-4 w-4 text-zinc-600 dark:text-zinc-400 mt-1" /><span><strong>Continuous substrate</strong> - Dense mycelial networks enable comprehensive sensing</span></div>
                <div className="flex items-start gap-2"><TreeDeciduous className="h-4 w-4 text-zinc-600 dark:text-zinc-400 mt-1" /><span><strong>Ecosystem coupling</strong> - Strong connection to soil microenvironments and plant roots</span></div>
                <div className="flex items-start gap-2"><GitBranch className="h-4 w-4 text-zinc-600 dark:text-zinc-400 mt-1" /><span><strong>Scalable pathway</strong> - Mycorrhizal networks enable cross-species modeling</span></div>
              </div>
              <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC10157304/" target="_blank" rel="noopener noreferrer" className="text-xs text-zinc-700 dark:text-zinc-300 hover:underline flex items-center gap-1">
                <ExternalLink className="h-3 w-3" /> View Research: Fungal Communication Signals
              </a>
            </CardContent>
          </Card>
        </div>

        <LiveTranslationDemo />

        <NLMTechnicalArchitecture />

        <section>
          <h2 className="text-2xl font-bold mb-6">Six-Layer Reference Architecture</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SIX_LAYERS.map((layer, i) => {
              const LayerIcon = layer.icon
              return (
              <Card key={i} className={NLM_GLASS_CARD}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <div className={cn(NLM_GLASS_ICON_WELL, "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold")}>{layer.layer}</div>
                    <LayerIcon className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />
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
          <Card className={NLM_GLASS_CARD}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-zinc-800 dark:text-zinc-200" /> Nature Message Frame (NMF)</CardTitle>
              <CardDescription>Versioned record format for model-ready data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={cn(NLM_GLASS_INSET, "p-4 font-mono text-xs overflow-x-auto")}>
                <pre className="text-zinc-800 dark:text-zinc-200">{`NMF v0.2 Record Format:
├── timestamp + location/lab context
├── sensor_identity + calibration_hash
├── taxonomy/strain + growth_stage + substrate
├── raw_waveform_blocks + derived_features
├── environmental_context_streams
├── experiment_protocol_metadata
│   ├── stimulus (type, magnitude, timing)
│   └── expected_response
├── data_quality_flags
├── provenance + permissions
├── consent_chain[]              (v0.2: permission grants from source → consumer)
├── model_version_tag            (v0.2: which NLM version produced/consumed this frame)
├── multi_species_linkage_id     (v0.2: cross-organism correlation key)
└── stimulation_response_envelope (v0.2: safety bounds for closed-loop experiments)`}</pre>
              </div>
              <p className="text-sm text-muted-foreground mt-3 italic">
                NMF is the canonical data format that ensures every observation entering the NLM pipeline carries full provenance, permissions, and scientific context. It is not just a schema — it is the trust layer.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Micro-speak + Translation Layer */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className={NLM_GLASS_CARD}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Cpu className="h-5 w-5 text-zinc-800 dark:text-zinc-200" /> Micro-speak: Bio-Token Vocabulary</CardTitle>
              <CardDescription>Tokenization without anthropomorphism</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Rather than claiming literal semantics, NLM defines bio-tokens as learned motifs over multi-channel windows.</p>
              <div className="space-y-2">
                {["Level 0: Spike Primitives", "Level 1: Burst \"Phrases\"", "Level 2: State Transitions", "Level 3: Ecosystem Dialogues"].map((title, idx) => (
                  <div key={title} className={cn(NLM_GLASS_INSET, "p-3")}>
                    <h4 className="font-medium text-sm text-zinc-800 dark:text-zinc-200">{title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {idx === 0 && "Basic electrical impulse patterns detected in mycelium"}
                      {idx === 1 && "Grouped spike patterns forming coherent signal units"}
                      {idx === 2 && "\"Messages\" as observable state change events"}
                      {idx === 3 && "Cross-organism signal correlation patterns spanning multiple species and environmental contexts"}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className={NLM_GLASS_CARD}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Layers className="h-5 w-5 text-zinc-800 dark:text-zinc-200" /> Translation Layer</CardTitle>
              <CardDescription>Funga → Ontology → Language</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">Output is structured and calibrated, then rendered into human language as a view of the structured state.</p>
              <div className={cn(NLM_GLASS_INSET, "p-4")}>
                <pre className="text-xs text-zinc-800 dark:text-zinc-200 overflow-x-auto">{`{"state":"nutrient_foraging_upshift","confidence":0.82,"evidence":["token_17_burst","soil_moisture_drop","CO2_rise"],"predicted_next":["growth_direction_change"],"recommended_action":["increase_sampling_rate"]}`}</pre>
              </div>
              <p className="text-xs text-muted-foreground italic mt-2">Human language summaries are a view of the structured state, not the ground truth.</p>
            </CardContent>
          </Card>
        </div>

        {/* Expansion Path */}
        <section>
          <Card className={NLM_GLASS_CARD}>
            <CardHeader><CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5 text-zinc-800 dark:text-zinc-200" /> Expansion Path Beyond Funga</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className={cn(NLM_GLASS_ICON_WELL, "w-10 h-10 flex items-center justify-center")}><TreeDeciduous className="h-5 w-5" /></div>
                    <h3 className="font-bold">Phase 2: Plants</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">Mycorrhizal networks + root zone chemistry + VOC sensing. Joint embeddings for fungi+plants+microbes. Initial mycorrhizal-root junction signal capture in progress with 2 plant species (wheat, pine seedling).</p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className={cn(NLM_GLASS_ICON_WELL, "w-10 h-10 flex items-center justify-center")}><Bug className="h-5 w-5" /></div>
                    <h3 className="font-bold">Phase 3: Multi-Species</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">Non-invasive animal/insect modalities: acoustics, movement, environmental DNA in permitted contexts.</p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className={cn(NLM_GLASS_ICON_WELL, "w-10 h-10 flex items-center justify-center")}><Globe className="h-5 w-5" /></div>
                    <h3 className="font-bold">Phase 4: Earth Systems</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">Fuse with physical telemetry: meteorology, hydrology, geophysics, remote sensing for world modeling.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Training Strategy */}
        <section>
          <Card className={NLM_GLASS_CARD}>
            <CardHeader><CardTitle className="text-2xl">NLM-Funga Training Strategy</CardTitle><CardDescription>Scientifically grounded approach to model training</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2"><Badge className={cn(NLM_GLASS_CHIP, "px-2")}>1</Badge><h3 className="text-lg font-medium">Self-Supervised Pretraining (Unlabeled)</h3></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className={cn(NLM_GLASS_INSET, "p-4")}><h4 className="font-medium mb-2">Masked Time-Series Modeling</h4><p className="text-sm text-muted-foreground">Learn patterns by predicting masked portions of signal sequences</p></div>
                  <div className={cn(NLM_GLASS_INSET, "p-4")}><h4 className="font-medium mb-2">Next-Event Prediction</h4><p className="text-sm text-muted-foreground">Spike/burst forecasting from signal history</p></div>
                  <div className={cn(NLM_GLASS_INSET, "p-4")}><h4 className="font-medium mb-2">Cross-Modal Contrastive</h4><p className="text-sm text-muted-foreground">Align electrical ↔ environment ↔ chemistry ↔ imaging</p></div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-2"><Badge className={cn(NLM_GLASS_CHIP, "px-2")}>2</Badge><h3 className="text-lg font-medium">Supervised Alignment (Labeled)</h3></div>
                <p className="text-sm text-muted-foreground">Labels are functional states: Foraging Drive, Stress Response, Resource Reallocation, Boundary Encounter, Host Association, Nutrient Seeking.</p>
                <p className="text-sm text-muted-foreground">Controlled perturbations: nutrient gradients, osmotic stress, temperature shifts, pH changes, mechanical perturbation, inhibitory exposures.</p>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-2"><Badge className={cn(NLM_GLASS_CHIP, "px-2")}>3</Badge><h3 className="text-lg font-medium">Causal Identification (Closed-Loop)</h3></div>
                <p className="text-sm text-muted-foreground">Use stimulation/perturbation to distinguish correlation vs causation. Validate token stability under interventions. Cross-validate across labs, devices, substrates.</p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Validation Benchmarks */}
        <section>
          <Card className={NLM_GLASS_CARD}>
            <CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-zinc-800 dark:text-zinc-200" /> Validation Benchmarks</CardTitle><CardDescription>Every claim needs a benchmark for scientific rigor</CardDescription></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {[{ name: "Instrumentation", desc: "SNR, drift, impedance stability" }, { name: "Stimulus Inference", desc: "Predict stimulus from signals" }, { name: "Response Forecasting", desc: "Predict near-future signals" }, { name: "Generalization", desc: "Cross-lab/device/species transfer" }, { name: "Safety", desc: "Stimulation envelopes & constraints" }].map((bench, i) => (
                  <div key={i} className={cn(NLM_GLASS_INSET, "p-4 text-center")}><h4 className="font-medium text-sm">{bench.name}</h4><p className="text-xs text-muted-foreground mt-1">{bench.desc}</p></div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Development Roadmap */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Development Roadmap</h2>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-zinc-800 via-zinc-500 to-zinc-300 dark:from-zinc-200 dark:via-zinc-500 dark:to-zinc-700" />
            <div className="space-y-8">
              {NLM_PHASES.map((phase, i) => (
                <div key={i} className="relative pl-12">
                  <div className={cn("absolute left-0 w-8 h-8 rounded-full flex items-center justify-center", phaseDotClass(phase.status))}>
                    {phase.status === "active" ? <Activity className="h-4 w-4" /> : phase.status === "upcoming" ? <ArrowRight className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                  </div>
                  <Card className={cn(NLM_GLASS_CARD, phase.status === "active" && "ring-1 ring-zinc-900/20 dark:ring-white/20")}>
                    <CardHeader className="pb-2">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Badge variant={phase.status === "active" ? "default" : "outline"}>{phase.phase}</Badge>
                          {phase.name}
                        </CardTitle>
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
          <Card className={cn(NLM_GLASS_CARD, "border-dashed")}>
            <CardContent className="pt-6">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Wrench className="h-6 w-6 text-zinc-800 dark:text-zinc-200" />
                How the NLM Training Dashboard Works
              </h2>
              <p className="text-muted-foreground mb-4">
                The <Link href="/natureos/model-training" className="text-zinc-900 dark:text-zinc-100 underline underline-offset-2 hover:opacity-80">NLM Training Dashboard</Link> at <code className="text-sm bg-muted px-1 rounded">/natureos/model-training</code> is the operational interface for NLM-Funga development.
                It evolved from early NatureOS model-training prototypes and now serves as the primary tool for monitoring training progress, viewing live translation demos, and accessing experiment controls.
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className={cn(NLM_GLASS_INSET, "p-4")}>
                  <h4 className="font-medium mb-2">What the Dashboard Does</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Displays model status, translation accuracy, and training data metrics</li>
                    <li>• Provides Pause/Resume and Export Model controls (wired to NLM API when available)</li>
                    <li>• Shows live raw signal input → structured translation output (simulated or real FCI streams)</li>
                    <li>• Organizes content into tabs: Overview, About NLM, Architecture, Training, Roadmap</li>
                    <li>• Links to Smell Training tools (Wizard, Blob Manager, Smell Encyclopedia)</li>
                  </ul>
                </div>
                <div className={cn(NLM_GLASS_INSET, "p-4")}>
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
            </CardContent>
          </Card>
        </section>

        {/* Smell Training Apps */}
        <section>
          <Card className={NLM_GLASS_CARD}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Wind className="h-5 w-5 text-zinc-800 dark:text-zinc-200" /> Smell Training Applications</CardTitle>
              <CardDescription>BME688/690 gas sensor training for MINDEX fungal smell detection</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link href="/natureos/smell-training">
                  <Card className={cn(NLM_GLASS_CARD, "h-full hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors cursor-pointer group")}>
                    <CardContent className="p-4 flex flex-col items-center text-center">
                      <div className={cn(NLM_GLASS_ICON_WELL, "p-3 mb-3")}><Beaker className="h-8 w-8" /></div>
                      <h4 className="font-semibold">Smell Training Wizard</h4>
                      <p className="text-xs text-muted-foreground mt-1">Record fungal specimens and export training data for Bosch SI-Studio</p>
                    </CardContent>
                  </Card>
                </Link>
                <Link href="/natureos/smell-training?tab=blobs">
                  <Card className={cn(NLM_GLASS_CARD, "h-full hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors cursor-pointer group")}>
                    <CardContent className="p-4 flex flex-col items-center text-center">
                      <div className={cn(NLM_GLASS_ICON_WELL, "p-3 mb-3")}><Upload className="h-8 w-8" /></div>
                      <h4 className="font-semibold">Blob Manager</h4>
                      <p className="text-xs text-muted-foreground mt-1">Upload and manage BSEC selectivity blobs for smell classification</p>
                    </CardContent>
                  </Card>
                </Link>
                <Link href="/natureos/mindex?tab=smells">
                  <Card className={cn(NLM_GLASS_CARD, "h-full hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors cursor-pointer group")}>
                    <CardContent className="p-4 flex flex-col items-center text-center">
                      <div className={cn(NLM_GLASS_ICON_WELL, "p-3 mb-3")}><BookMarked className="h-8 w-8" /></div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {RESEARCH_PAPERS.map((paper, i) => (
              <Card
                key={i}
                className={cn(NLM_GLASS_CARD, "hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors cursor-pointer")}
                onClick={() => paper.url !== "#" && window.open(paper.url, "_blank")}
              >
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
        <section className="py-12 border-t border-zinc-200/80 dark:border-zinc-800">
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
  )
}
