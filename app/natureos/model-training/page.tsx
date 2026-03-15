"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Brain, Dna, Activity, Zap, Database, LineChart, Play, Pause, RefreshCw, Download, BookOpen, 
  Microscope, Leaf, Globe, FlaskConical, Network, Cpu, Layers, Shield, Target, ArrowRight,
  Sparkles, TreeDeciduous, Bug, Bird, ChevronRight, ExternalLink, FileText, GitBranch,
  Wind, Beaker, Upload, BookMarked
} from "lucide-react"
import Link from "next/link"

const NLM_PHASES = [
  { 
    phase: "Phase 0", 
    name: "Foundations", 
    timeline: "0-6 months",
    status: "active",
    items: [
      "NMF v0.1 + ingestion pipeline",
      "Lab rigs for 3-5 fungal species",
      "Baseline dataset + calibration logs",
      "Baseline NLM-Funga: denoiser + event detector",
      "Benchmark harness"
    ]
  },
  { 
    phase: "Phase 1", 
    name: "Funga Decoding", 
    timeline: "6-18 months",
    status: "upcoming",
    items: [
      "Scale to 10-20 species",
      "FungaLex v0.5 probabilistic lexicon",
      "NatureOS dashboards integration",
      "Closed-loop stimulation-response protocols"
    ]
  },
  { 
    phase: "Phase 2", 
    name: "Cross-Species Translation", 
    timeline: "18-36 months",
    status: "planned",
    items: [
      "Plant root-zone + VOC/hormone sensing",
      "Interaction graph learning",
      "Causal hypothesis generation",
      "Regional pilots"
    ]
  },
  { 
    phase: "Phase 3", 
    name: "Nature Intelligence at Scale", 
    timeline: "36+ months",
    status: "vision",
    items: [
      "Earth observation integration",
      "Data-assimilating world model",
      "Open benchmarks ecosystem",
      "Global nature translation network"
    ]
  },
]

const RESEARCH_PAPERS = [
  { title: "Fungal Electrical Signaling Patterns", authors: "Adamatzky et al.", year: 2022, citations: 156, url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10157304/" },
  { title: "Inter-plant Communication via Mycorrhizal Networks", authors: "Gorzelak et al.", year: 2015, citations: 892, url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4497361/" },
  { title: "Mycelial Intelligence: A New Paradigm", authors: "Stamets & Trappe", year: 2023, citations: 342, url: "#" },
  { title: "Chemical Signaling in Fungal Networks", authors: "Boddy et al.", year: 2024, citations: 89, url: "#" },
]

export default function ModelTrainingPage() {
  const [activeTab, setActiveTab] = useState("overview")
  const [nlmStatus, setNlmStatus] = useState<"loading" | "degraded" | "live">("degraded")
  const [trainingSummary, setTrainingSummary] = useState<{ epoch?: number; accuracy?: number; signalSamples?: number; overallProgress?: number } | null>(null)

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_MAS_API_URL || ""
    if (!base) {
      setNlmStatus("degraded")
      return
    }
    setNlmStatus("loading")
    fetch(`${base}/api/nlm/status`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        setTrainingSummary(data.training_summary ?? null)
        setNlmStatus(data.training_summary ? "live" : "degraded")
      })
      .catch(() => {
        setNlmStatus("degraded")
        setTrainingSummary(null)
      })
  }, [])

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-900/30 via-green-900/20 to-emerald-900/30 border border-purple-500/20 p-8">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="bg-purple-500/20 border-purple-400 text-purple-300">
                  <Sparkles className="h-3 w-3 mr-1" /> Foundation Model
                </Badge>
                <Badge variant="outline" className={nlmStatus === "live" ? "bg-green-500/20 border-green-400 text-green-300" : "bg-muted text-muted-foreground"}>
                  {nlmStatus === "loading" ? "Checking…" : nlmStatus === "live" ? "Live" : "No live data"}
                </Badge>
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-green-400 to-emerald-400 bg-clip-text text-transparent">
                Nature Learning Model
              </h1>
              <p className="text-lg text-muted-foreground mt-2 max-w-2xl">
                The world's first multi-modal foundation model that learns the information-bearing signals of living Earth systems 
                and translates them into operational representations for humans, machines, and scientific workflows.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={nlmStatus !== "live"}
                title={nlmStatus !== "live" ? "Connect NLM API to control training" : "Pause or resume training"}
              >
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </Button>
              <Button 
                className="bg-gradient-to-r from-purple-600 to-green-600"
                onClick={() => {
                  // TODO: Connect to real model export when NLM-Funga is ready
                  alert("Model export will be available when NLM-Funga Phase 0 is complete.\n\nCurrent status: Foundations phase (0-6 months)")
                }}
                title="Export will be available when training is complete"
              >
                <Download className="h-4 w-4 mr-2" /> Export Model
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Brain className="h-4 w-4" /> Model Status</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-400">
              {nlmStatus === "loading" ? "Checking…" : nlmStatus === "live" && trainingSummary?.epoch != null ? "Training" : nlmStatus === "live" ? "Connected" : "No live data"}
            </div>
            <p className="text-sm text-muted-foreground">
              {nlmStatus === "live" && trainingSummary?.epoch != null ? `Epoch ${trainingSummary.epoch.toLocaleString()}` : "Connect NLM API for status"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Translation Accuracy</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {nlmStatus === "live" && trainingSummary?.accuracy != null ? `${trainingSummary.accuracy.toFixed(2)}%` : "—"}
            </div>
            {nlmStatus === "live" && trainingSummary?.accuracy != null ? (
              <Progress value={trainingSummary.accuracy} className="h-2 mt-2" />
            ) : (
              <p className="text-sm text-muted-foreground mt-2">No live data</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Training Data</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {nlmStatus === "live" && trainingSummary?.signalSamples != null ? `${(trainingSummary.signalSamples / 1e6).toFixed(1)}M` : "—"}
            </div>
            <p className="text-sm text-muted-foreground">Signal samples from NLM API</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Overall Progress</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {nlmStatus === "live" && trainingSummary?.overallProgress != null ? `${trainingSummary.overallProgress.toFixed(0)}%` : "—"}
            </div>
            {nlmStatus === "live" && trainingSummary?.overallProgress != null ? (
              <Progress value={trainingSummary.overallProgress} className="h-2 mt-2" />
            ) : (
              <p className="text-sm text-muted-foreground mt-2">No live data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="about">About NLM</TabsTrigger>
          <TabsTrigger value="architecture">Architecture</TabsTrigger>
          <TabsTrigger value="training">Training</TabsTrigger>
          <TabsTrigger value="roadmap">Roadmap</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* What Makes NLM Different */}
          <Card className="border-2 border-dashed border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-green-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Sparkles className="h-6 w-6 text-purple-400" />
                What Makes NLM Different from Traditional AI?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <Brain className="h-5 w-5 text-blue-400" /> Large Language Models (LLM)
                  </h3>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 mt-1 text-blue-400" />
                      <span>Primary signal: <strong>human text</strong> (plus images/audio)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 mt-1 text-blue-400" />
                      <span>Core objective: predict/produce language tokens</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 mt-1 text-blue-400" />
                      <span>Ground truth: human-written corpora and supervised labels</span>
                    </li>
                  </ul>
                </div>
                <div className="space-y-4">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <Leaf className="h-5 w-5 text-green-400" /> Nature Learning Model (NLM)
                  </h3>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 mt-1 text-green-400" />
                      <span>Primary signal: <strong>synchronized nature telemetry</strong> (time series + chemistry + imagery)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 mt-1 text-green-400" />
                      <span>Core objective: learn latent state + interaction dynamics of ecosystems</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 mt-1 text-green-400" />
                      <span>Ground truth: <strong>causal experiments</strong>, field observations, physical/biological assays</span>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <p className="text-sm text-amber-200 flex items-start gap-2">
                  <Shield className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <span><strong>Key Design Constraint:</strong> NLM must be scientifically falsifiable and calibrated with explicit uncertainty, rather than "story-like" translation.</span>
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Training Phases */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Dna className="h-5 w-5" /> Training Phases</CardTitle>
                <CardDescription>Progressive learning stages for Mycospeak translation</CardDescription>
              </CardHeader>
              <CardContent>
                {nlmStatus === "live" && trainingSummary ? (
                  <p className="text-sm text-muted-foreground">
                    Live phase data is provided by the NLM training API. Connect the service to view current phases and progress.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Live training phase data is not available. Connect the NLM training API to view current phases and progress.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Why Fungi First */}
            <Card className="bg-gradient-to-br from-amber-500/5 to-orange-500/5 border-amber-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Microscope className="h-5 w-5 text-amber-400" /> Why Fungi First?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <p>
                  Research indicates fungi exhibit <strong>extracellular electrical potential spikes</strong> and structured 
                  spiking activity, with researchers proposing "fungal language" interpretations.
                </p>
                <div className="space-y-3 pt-2">
                  <div className="flex items-start gap-2">
                    <Network className="h-4 w-4 text-amber-400 mt-1" />
                    <span><strong>Continuous substrate</strong> - Dense mycelial networks enable comprehensive sensing</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <TreeDeciduous className="h-4 w-4 text-green-400 mt-1" />
                    <span><strong>Ecosystem coupling</strong> - Strong connection to soil microenvironments and plant roots</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <GitBranch className="h-4 w-4 text-blue-400 mt-1" />
                    <span><strong>Scalable pathway</strong> - Mycorrhizal networks enable cross-species modeling</span>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <a 
                    href="https://pmc.ncbi.nlm.nih.gov/articles/PMC10157304/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-amber-400 hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" /> View Research: Fungal Communication Signals
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Live Translation */}
          <Card className="bg-gradient-to-br from-green-500/5 to-emerald-500/5 border-green-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-green-500" /> Live Translation</CardTitle>
              <CardDescription>Real-time Mycospeak translation from NLM runtime</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Live translation is available when the NLM runtime is connected. Raw signals and structured translation are provided by the NLM service only; no simulated data is shown.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* About NLM Tab */}
        <TabsContent value="about" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Abstract */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-2xl">Abstract</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <p className="text-lg leading-relaxed">
                  The <strong>Nature Learning Model (NLM)</strong> is a proposed class of multi-modal foundation models that learn 
                  the <strong>information-bearing signals of living and non-living Earth systems</strong> and translate them into 
                  operational representations usable by humans, machines, and scientific workflows.
                </p>
                <p className="leading-relaxed">
                  Unlike a Large Language Model (LLM) trained primarily on human text, the NLM is trained on synchronized observations 
                  across biology and geophysics: <strong>bioelectric activity, chemical gradients, volatile compounds, growth dynamics, 
                  genomics, microbiome profiles, imagery, acoustics, and physical environmental telemetry</strong>.
                </p>
                <p className="leading-relaxed">
                  The program starts with <strong>fungi ("funga")</strong> because fungal mycelia are ubiquitous, form dense networks, 
                  and show measurable electrical spiking activity. The initial deliverable is <strong>NLM‑Funga</strong>, trained on 
                  standardized fungal input-output datasets captured with Mycosoft's Fungal Computer Interface (FCI), producing a 
                  compact <strong>bio-token</strong> vocabulary ("micro-speak") aligned to scientific ontologies.
                </p>
              </CardContent>
            </Card>

            {/* Micro-speak Tokenization */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-purple-400" /> Micro-speak: Bio-Token Vocabulary
                </CardTitle>
                <CardDescription>Tokenization without anthropomorphism</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Rather than claiming literal semantics, NLM defines bio-tokens as learned motifs over multi-channel windows.
                </p>
                <div className="space-y-3">
                  <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                    <h4 className="font-medium text-sm text-purple-300">Level 0: Spike Primitives</h4>
                    <p className="text-xs text-muted-foreground mt-1">Basic electrical impulse patterns detected in mycelium</p>
                  </div>
                  <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                    <h4 className="font-medium text-sm text-purple-300">Level 1: Burst "Phrases"</h4>
                    <p className="text-xs text-muted-foreground mt-1">Grouped spike patterns forming coherent signal units</p>
                  </div>
                  <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                    <h4 className="font-medium text-sm text-purple-300">Level 2: State Transitions</h4>
                    <p className="text-xs text-muted-foreground mt-1">"Messages" as observable state change events</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Translation Layer */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-green-400" /> Translation Layer
                </CardTitle>
                <CardDescription>Funga → Ontology → Language</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Output is structured and calibrated, then rendered into human language as a view of the structured state.
                </p>
                <div className="bg-background p-4 rounded-lg">
                  <pre className="text-xs text-green-300 overflow-x-auto">
{`{
  "state": "nutrient_foraging_upshift",
  "confidence": 0.82,
  "evidence": [
    "token_17_burst",
    "soil_moisture_drop", 
    "CO2_rise"
  ],
  "predicted_next": [
    "growth_direction_change",
    "resource_allocation_shift"
  ],
  "recommended_action": [
    "increase_sampling_rate",
    "run_stimulus_protocol_3"
  ]
}`}
                  </pre>
                </div>
                <p className="text-xs text-muted-foreground italic">
                  Human language summaries are rendered as a <em>view</em> of the structured state, not the ground truth itself.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Expansion Path */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-400" /> Expansion Path Beyond Funga
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                      <TreeDeciduous className="h-5 w-5 text-green-400" />
                    </div>
                    <h3 className="font-bold">Phase 2: Plants</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Mycorrhizal networks + root zone chemistry + VOC sensing. Joint embeddings for fungi+plants+microbes.
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <Bug className="h-5 w-5 text-amber-400" />
                    </div>
                    <h3 className="font-bold">Phase 3: Multi-Species</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Non-invasive animal/insect modalities: acoustics, movement, environmental DNA in permitted contexts.
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <Globe className="h-5 w-5 text-blue-400" />
                    </div>
                    <h3 className="font-bold">Phase 4: Earth Systems</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Fuse with physical telemetry: meteorology, hydrology, geophysics, remote sensing for world modeling.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Architecture Tab */}
        <TabsContent value="architecture" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">NLM Reference Architecture</CardTitle>
              <CardDescription>Six-layer architecture from sensing to application</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  {
                    layer: "1",
                    title: "Sensing & Acquisition",
                    icon: Activity,
                    color: "purple",
                    items: ["Fungal electrophysiology (FCI)", "Chemical & environmental sensors", "Time-lapse imaging"]
                  },
                  {
                    layer: "2",
                    title: "Edge Processing",
                    icon: Cpu,
                    color: "blue",
                    items: ["Denoising & artifact removal", "Spike/event detection", "On-device compression"]
                  },
                  {
                    layer: "3",
                    title: "Transport",
                    icon: Network,
                    color: "cyan",
                    items: ["Mesh/gateway architecture", "Store-and-forward", "Mycorrhizae Protocol alignment"]
                  },
                  {
                    layer: "4",
                    title: "Data Integrity & Indexing",
                    icon: Database,
                    color: "green",
                    items: ["MINDEX provenance layer", "Dataset lakehouse", "Feature derivation"]
                  },
                  {
                    layer: "5",
                    title: "Model Layer (NLM)",
                    icon: Brain,
                    color: "amber",
                    items: ["NLM-Funga foundation model", "Translation services", "Forecasting & anomaly detection"]
                  },
                  {
                    layer: "6",
                    title: "Application (NatureOS)",
                    icon: Layers,
                    color: "pink",
                    items: ["Dashboards & APIs", "Experiment orchestration", "Stimulation loops"]
                  },
                ].map((layer, i) => (
                  <Card key={i} className={`bg-${layer.color}-500/5 border-${layer.color}-500/20`}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full bg-${layer.color}-500/20 flex items-center justify-center text-xs font-bold`}>
                          {layer.layer}
                        </div>
                        <layer.icon className={`h-4 w-4 text-${layer.color}-400`} />
                        {layer.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="text-xs space-y-1 text-muted-foreground">
                        {layer.items.map((item, j) => (
                          <li key={j} className="flex items-start gap-1">
                            <ChevronRight className="h-3 w-3 mt-0.5" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Nature Message Frame */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-400" /> Nature Message Frame (NMF)
              </CardTitle>
              <CardDescription>Versioned record format for model-ready data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-background p-4 rounded-lg font-mono text-xs overflow-x-auto">
                <pre className="text-green-300">
{`NMF v0.1 Record Format:
├── timestamp + location/lab context
├── sensor_identity + calibration_hash
├── taxonomy/strain + growth_stage + substrate
├── raw_waveform_blocks + derived_features
├── environmental_context_streams
├── experiment_protocol_metadata
│   ├── stimulus (type, magnitude, timing)
│   └── expected_response
├── data_quality_flags
└── provenance + permissions`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Training Tab */}
        <TabsContent value="training" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">NLM-Funga Training Strategy</CardTitle>
              <CardDescription>Scientifically grounded approach to model training</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step 1 */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-500">1</Badge>
                  <h3 className="text-lg font-medium">Self-Supervised Pretraining (Unlabeled)</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-500/10 rounded-lg">
                    <h4 className="font-medium mb-2">Masked Time-Series Modeling</h4>
                    <p className="text-sm text-muted-foreground">Learn patterns by predicting masked portions of signal sequences</p>
                  </div>
                  <div className="p-4 bg-blue-500/10 rounded-lg">
                    <h4 className="font-medium mb-2">Next-Event Prediction</h4>
                    <p className="text-sm text-muted-foreground">Spike/burst forecasting from signal history</p>
                  </div>
                  <div className="p-4 bg-blue-500/10 rounded-lg">
                    <h4 className="font-medium mb-2">Cross-Modal Contrastive</h4>
                    <p className="text-sm text-muted-foreground">Align electrical ↔ environment ↔ chemistry ↔ imaging</p>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-500">2</Badge>
                  <h3 className="text-lg font-medium">Supervised Alignment (Labeled)</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Labels are not "words," but <strong>functional states and transitions</strong>:
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {["Foraging Drive", "Stress Response", "Resource Reallocation", "Boundary Encounter", "Host Association", "Nutrient Seeking"].map((state, i) => (
                    <div key={i} className="p-3 bg-green-500/10 rounded-lg text-center">
                      <p className="text-xs font-medium">{state}</p>
                    </div>
                  ))}
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">Controlled Perturbations:</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-muted-foreground">
                    <span>• Nutrient gradients</span>
                    <span>• Osmotic stress</span>
                    <span>• Temperature shifts</span>
                    <span>• pH changes</span>
                    <span>• Mechanical perturbation</span>
                    <span>• Inhibitory exposures</span>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className="bg-purple-500">3</Badge>
                  <h3 className="text-lg font-medium">Causal Identification (Closed-Loop)</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Use stimulation/perturbation to distinguish correlation vs causation. Evaluate whether inferred 
                  "tokens" are stable under interventions.
                </p>
                <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                  <h4 className="font-medium mb-2">Validation Approach:</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Apply stimulus → Record response → Verify prediction</li>
                    <li>• Test token stability across different perturbation types</li>
                    <li>• Cross-validate across labs, devices, and substrates</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Benchmarks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-green-400" /> Validation Benchmarks
              </CardTitle>
              <CardDescription>Every claim needs a benchmark for scientific rigor</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                  { name: "Instrumentation", desc: "SNR, drift, impedance stability" },
                  { name: "Stimulus Inference", desc: "Predict stimulus from signals" },
                  { name: "Response Forecasting", desc: "Predict near-future signals" },
                  { name: "Generalization", desc: "Cross-lab/device/species transfer" },
                  { name: "Safety", desc: "Stimulation envelopes & constraints" },
                ].map((bench, i) => (
                  <div key={i} className="p-4 bg-green-500/10 rounded-lg border border-green-500/20 text-center">
                    <h4 className="font-medium text-sm">{bench.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{bench.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Roadmap Tab */}
        <TabsContent value="roadmap" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">NLM Development Roadmap</CardTitle>
              <CardDescription>From foundations to nature intelligence at scale</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-green-500 via-amber-500 to-purple-500" />
                <div className="space-y-8">
                  {NLM_PHASES.map((phase, i) => (
                    <div key={i} className="relative pl-12">
                      <div className={`absolute left-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        phase.status === "active" ? "bg-green-500" :
                        phase.status === "upcoming" ? "bg-amber-500" :
                        phase.status === "planned" ? "bg-blue-500" : "bg-purple-500"
                      }`}>
                        {phase.status === "active" ? <Activity className="h-4 w-4 text-white" /> :
                         phase.status === "upcoming" ? <ArrowRight className="h-4 w-4 text-white" /> :
                         <Sparkles className="h-4 w-4 text-white" />}
                      </div>
                      <Card className={phase.status === "active" ? "border-green-500/50 bg-green-500/5" : ""}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Badge variant={phase.status === "active" ? "default" : "outline"}>
                                {phase.phase}
                              </Badge>
                              {phase.name}
                            </CardTitle>
                            <span className="text-sm text-muted-foreground">{phase.timeline}</span>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {phase.items.map((item, j) => (
                              <li key={j} className="flex items-center gap-2 text-sm">
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Smell Training Apps */}
      <Card className="border-green-500/30 bg-gradient-to-br from-green-950/20 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wind className="h-5 w-5 text-green-500" />
            Smell Training Applications
          </CardTitle>
          <CardDescription>
            BME688/690 gas sensor training for MINDEX fungal smell detection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Smell Training Wizard */}
            <Link href="/natureos/smell-training">
              <Card className="h-full hover:border-green-500/50 hover:bg-green-500/5 transition-colors cursor-pointer group">
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <div className="p-3 rounded-xl bg-green-500/20 group-hover:bg-green-500/30 transition-colors mb-3">
                    <Beaker className="h-8 w-8 text-green-500" />
                  </div>
                  <h4 className="font-semibold">Smell Training Wizard</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Record fungal specimens and export training data for Bosch AI-Studio
                  </p>
                </CardContent>
              </Card>
            </Link>
            
            {/* Blob Manager */}
            <Link href="/natureos/smell-training?tab=blobs">
              <Card className="h-full hover:border-amber-500/50 hover:bg-amber-500/5 transition-colors cursor-pointer group">
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <div className="p-3 rounded-xl bg-amber-500/20 group-hover:bg-amber-500/30 transition-colors mb-3">
                    <Upload className="h-8 w-8 text-amber-500" />
                  </div>
                  <h4 className="font-semibold">Blob Manager</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload and manage BSEC selectivity blobs for smell classification
                  </p>
                </CardContent>
              </Card>
            </Link>
            
            {/* Smell Encyclopedia */}
            <Link href="/natureos/mindex?tab=smells">
              <Card className="h-full hover:border-purple-500/50 hover:bg-purple-500/5 transition-colors cursor-pointer group">
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <div className="p-3 rounded-xl bg-purple-500/20 group-hover:bg-purple-500/30 transition-colors mb-3">
                    <BookMarked className="h-8 w-8 text-purple-500" />
                  </div>
                  <h4 className="font-semibold">Smell Encyclopedia</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Browse MINDEX smell signatures with fungal species and VOC profiles
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>
          
          {/* Training Status Summary */}
          <div className="mt-4 p-3 rounded-lg bg-muted/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm">Smell Trainer Agent</span>
              <Badge variant="outline" className="text-xs">Port 8042</Badge>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>BME688/690 Support</span>
              <span>BSEC 2.x Compatible</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Research Papers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5" /> Research Foundation</CardTitle>
          <CardDescription>Scientific papers informing NLM development</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {RESEARCH_PAPERS.map((paper, i) => (
              <Card key={i} className="bg-muted/50 hover:bg-muted/70 transition-colors cursor-pointer" onClick={() => paper.url !== "#" && window.open(paper.url, "_blank")}>
                <CardContent className="p-4">
                  <h4 className="font-medium text-sm line-clamp-2">{paper.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{paper.authors} ({paper.year})</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-muted-foreground">{paper.citations} citations</p>
                    {paper.url !== "#" && <ExternalLink className="h-3 w-3 text-muted-foreground" />}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
