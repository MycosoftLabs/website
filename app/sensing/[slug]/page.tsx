import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeft,
  ArrowRight,
  Activity,
  Atom,
  Brain,
  Camera,
  Cpu,
  Database,
  Eye,
  FlaskConical,
  Gauge,
  Leaf,
  Map,
  Mic,
  Network,
  Radio,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Thermometer,
  Waves,
  Wind,
  Zap,
} from "lucide-react"
import {
  NeuBadge,
  NeuButton,
  NeuCard,
  NeuromorphicProvider,
} from "@/components/ui/neuromorphic"
import { SineAcousticPlayer } from "@/components/sensing/sine-acoustic-player"

type SensingPageConfig = {
  title: string
  eyebrow: string
  tagline: string
  icon: typeof Cpu
  accent: string
  summary: string
  heroImage?: string
  appCallout?: {
    title: string
    description: string
    href: string
    image: string
    cta: string
  }
  metrics: { label: string; value: string }[]
  pillars: { title: string; body: string; icon: typeof Cpu }[]
  workflow: string[]
  dataProducts: string[]
  useCases: string[]
  softwarePlan?: {
    title: string
    intro: string
    phases: { title: string; body: string; bullets: string[] }[]
    petriDish: { title: string; body: string; bullets: string[] }
    edgeRuntime: { title: string; body: string; bullets: string[] }
    references: { label: string; href: string }[]
  }
  related: { label: string; href: string }[]
}

const sensingPages = {
  "fungi-compute-fci": {
    title: "Fungi Compute + FCI",
    eyebrow: "Biological Interface",
    tagline: "Living signals become computable environmental intelligence.",
    icon: Cpu,
    accent: "emerald",
    heroImage: "/assets/mushroom1/scientific-research-web-poster.jpg",
    summary:
      "Fungi Compute and the Fungal Computer Interface turn fungal bioelectric activity, substrate contact, soil state, stimulation response, and mycelium-network behavior into structured data for NatureOS, MINDEX, MYCA, and field operations.",
    appCallout: {
      title: "Fungi Compute in NatureOS",
      description:
        "Open the live Fungi Compute app for FCI device status, waveform inspection, stimulation design, event mempool, signal fingerprints, NLM panels, and Earth correlation workflows.",
      href: "/natureos/fungi-compute",
      image: "/assets/mushroom1/scientific-research-web-poster.jpg",
      cta: "Open Fungi Compute",
    },
    metrics: [
      { label: "Primary channel", value: "Bioelectric + substrate response" },
      { label: "Interface", value: "FCI probe / fungal contact array" },
      { label: "Destination", value: "MINDEX + NLM + MYCA" },
      { label: "Operating layer", value: "NatureOS field intelligence" },
    ],
    pillars: [
      {
        title: "Fungal Computer Interface",
        icon: FlaskConical,
        body:
          "FCI is the physical bridge between electronics and fungal or soil systems. It is designed for contact-state verification, multi-electrode bioelectric capture, stimulation experiments, substrate response, moisture context, and temporal fingerprinting of biological signals.",
      },
      {
        title: "Fungi Compute runtime",
        icon: Activity,
        body:
          "The runtime interprets fungal signals as a biological sensing layer, not as decorative telemetry. It streams signal windows, detects spikes, tracks response after stimulation, builds fingerprints, and keeps experiment metadata attached to every event.",
      },
      {
        title: "M-Wave correlation",
        icon: Waves,
        body:
          "M-Wave links biological and geophysical response: pressure waves, seismic context, environmental shocks, field readings, and synchronized bioelectric changes can be correlated with external feeds such as USGS earthquake data and MINDEX anomaly analysis.",
      },
      {
        title: "Model-ready observations",
        icon: Brain,
        body:
          "Every useful observation can become training material for Nature Learning Models. The goal is not to dump raw noise; it is to preserve clean event windows, calibration state, device identity, substrate context, and confidence fields.",
      },
      {
        title: "Edge device integration",
        icon: Network,
        body:
          "Mushroom 1, MycoBrain, SporeBase, Hyphae 1, and future field nodes can use Fungi Compute + FCI beside cameras, gas sensors, acoustic systems, particle counters, thermal channels, and mesh networking.",
      },
      {
        title: "Operational biology",
        icon: ShieldCheck,
        body:
          "The system turns living response into admissible operational context: what changed, where it changed, what the environment was doing, whether the signal repeated, and whether MYCA or a human operator should act.",
      },
    ],
    workflow: [
      "FCI verifies contact with substrate, soil, culture, or mycelium.",
      "The device captures bioelectric windows and stimulation-response sequences.",
      "NatureOS normalizes signal data with pH, humidity, temperature, agar or substrate, device state, and time.",
      "MINDEX stores the observation with provenance, sensor metadata, and chain-of-custody context.",
      "MYCA compares the event against prior patterns and creates follow-up tasks, model prompts, or field alerts.",
    ],
    dataProducts: [
      "Bioelectric waveform windows",
      "Stimulation response profiles",
      "Fungal signal fingerprints",
      "Substrate contact confidence",
      "M-Wave anomaly correlations",
      "NLM training records",
    ],
    useCases: [
      "Soil and mycelium network monitoring",
      "Fungal response studies",
      "Petri dish and culture experiments",
      "Environmental stress detection",
      "Biointerface device validation",
      "Living sensor field deployments",
    ],
    related: [
      { label: "Fungi Compute App", href: "/natureos/fungi-compute" },
      { label: "FCI Monitor", href: "/natureos/fci" },
      { label: "Public MINDEX", href: "/mindex" },
      { label: "Mushroom 1", href: "/devices/mushroom-1" },
    ],
  },
  bluesight: {
    title: "BlueSight",
    eyebrow: "Visual Sensing",
    tagline: "A visual perception stack for biological, machine, and environmental awareness.",
    icon: Eye,
    accent: "cyan",
    heroImage: "/assets/myconode/myconode blue.jpg",
    summary:
      "BlueSight is Mycosoft's visual sensing package: optical, spatial, and scene-intelligence systems that combine cameras, blue-light biological response, LiDAR, radar, WiFiSense, and edge AI into one perception fabric.",
    metrics: [
      { label: "Visual coverage", value: "Directional + panoramic" },
      { label: "Spatial channels", value: "LiDAR / radar / WiFiSense" },
      { label: "Biological mode", value: "Blue-light response capture" },
      { label: "Output", value: "Scene + anomaly intelligence" },
    ],
    pillars: [
      {
        title: "Multi-camera perception",
        icon: Camera,
        body:
          "BlueSight supports 8K 360-degree visual context for scene awareness and 4K directional inspection for targeted observation. The stack is built for field devices that need both wide situational awareness and high-resolution evidence capture.",
      },
      {
        title: "Blue-light biological sensing",
        icon: Sparkles,
        body:
          "Controlled blue-light exposure can reveal fungal and biological response patterns. BlueSight treats light response as a measurable biological signal that can be compared with FCI, gas, humidity, temperature, and culture context.",
      },
      {
        title: "Depth and geometry",
        icon: ScanLine,
        body:
          "LiDAR and structured spatial readings add geometry: surface shape, canopy structure, growth forms, obstacles, device surroundings, and physical changes that a flat image alone cannot prove.",
      },
      {
        title: "Motion and presence",
        icon: Radio,
        body:
          "Radar and WiFiSense add motion, range, and presence signals. This lets MYCA distinguish visual anomalies from movement, occupancy, vibration, weather, or occlusion.",
      },
      {
        title: "Edge visual AI",
        icon: Brain,
        body:
          "On-device classifiers can segment colonies, detect growth edges, spot contamination, read device scenes, classify organisms, detect smoke or dust, and prepare model-ready observations before bandwidth is wasted.",
      },
      {
        title: "Evidence chain",
        icon: Database,
        body:
          "Images, detections, bounding boxes, embeddings, calibration state, and environmental readings can be stored in MINDEX so visual evidence stays searchable, repeatable, and tied to its sensor source.",
      },
    ],
    workflow: [
      "Capture wide, directional, depth, and presence channels from the field device.",
      "Align timestamps, device pose, calibration state, and environmental context.",
      "Run local visual models for segmentation, detection, optical change, and anomaly scoring.",
      "Attach evidence to a MINDEX observation with media, metadata, and confidence fields.",
      "MYCA routes follow-up: inspect, notify, retrain, compare with prior observations, or render in NatureOS.",
    ],
    dataProducts: [
      "Scene captures and evidence frames",
      "Growth-edge detections",
      "Depth maps and spatial context",
      "Presence and motion overlays",
      "Contamination and anomaly flags",
      "Visual embeddings for MINDEX search",
    ],
    useCases: [
      "Petri and culture inspection",
      "Field organism detection",
      "Device situational awareness",
      "Smoke, dust, and plume observation",
      "Growth monitoring",
      "Infrastructure and habitat surveys",
    ],
    softwarePlan: {
      title: "BlueSight AI Sensing Software Plan",
      intro:
        "BlueSight should become the reusable vision service that lets MYCA see live camera feeds, Petri dish simulations, field devices, and saved media through the same detection, segmentation, tracking, and MINDEX recording pipeline.",
      phases: [
        {
          title: "1. Open-vocabulary detection layer",
          body:
            "Start with YOLO-World-style open-vocabulary detection so MYCA can ask for new targets without waiting for a custom training run. This is how an operator or agent can say: find contamination, aerial hyphae, bacterial colonies, cracks, condensation, droplets, spores, insects, tools, labels, or unknown growth edges.",
          bullets: [
            "Expose a MYCA prompt vocabulary: organism, colony, contamination, droplet, agar edge, scalpel mark, dust, smoke, insect, tool, label, device LED, cable, corrosion, and unknown anomaly.",
            "Pre-encode common BlueSight vocabularies per app so inference does not wait on text encoding every frame.",
            "Use open-vocabulary detection for discovery, then promote repeated detections into a supervised BlueSight dataset for smaller device-specific models.",
          ],
        },
        {
          title: "2. YOLO26 + SAHI high-resolution pass",
          body:
            "Use YOLO26 with SAHI tiled inference when the source is high resolution or when targets are tiny. Petri dishes, microscope-like frames, drone footage, 8K 360 frames, and field imagery can hide important objects when downscaled to a single model input.",
          bullets: [
            "Slice high-resolution frames into overlapping 512 or 640 pixel tiles, run detection per tile, then merge boxes back into the original frame.",
            "Default overlap should start around 0.2 so objects on tile edges are not missed.",
            "Use tiled inference on demand, on keyframes, or when MYCA requests a detailed inspection, because it costs more than a single fast pass.",
          ],
        },
        {
          title: "3. Segmentation and tracking",
          body:
            "Detection is not enough for fungal biology. BlueSight needs masks, edge tracking, growth area estimates, and temporal history so MYCA can tell what changed instead of only what appeared in one frame.",
          bullets: [
            "Add instance masks for colonies, contamination, droplets, agar zones, and tool marks.",
            "Track object IDs across time so growth rate, spread direction, merging, and disappearance can be measured.",
            "Store per-object time series in MINDEX: class, mask area, bounding box, confidence, position, color, texture, and change rate.",
          ],
        },
        {
          title: "4. BlueSight service API",
          body:
            "Create a local service that accepts frames from browsers, cameras, video files, simulated canvases, Jetson devices, and Raspberry Pi/Hailo nodes, then returns detections in one common schema.",
          bullets: [
            "API shape: POST /api/bluesight/analyze-frame, WebSocket /api/bluesight/live, and a device-side MQTT or NATS event stream.",
            "Return normalized JSON: frame_id, source_id, timestamp, model, classes, boxes, masks, tracks, confidence, latency, and MINDEX candidate metadata.",
            "Keep raw frames optional. Store useful frames and event windows; discard debug frames unless the user explicitly saves them.",
          ],
        },
        {
          title: "5. MINDEX and MYCA loop",
          body:
            "Every useful visual event must be recordable into MINDEX so search, MYCA, NatureOS widgets, and future model training can instantly reuse it.",
          bullets: [
            "Save event metadata, selected frames, masks, embeddings, model versions, and device calibration state.",
            "Let MYCA generate follow-up tasks: inspect more, ask for SAHI detail pass, compare against prior observations, save artifact, or create model-improvement prompt.",
            "Use the same artifact storage workflow created for the Petri app: local download or gated NatureOS storage.",
          ],
        },
      ],
      petriDish: {
        title: "How BlueSight plugs into the Petri Dish",
        body:
          "The Petri dish app should export its visible dish as a live video frame source. MYCA should see the same layered visual state the user sees: glass dish, agar, mycelium, contamination, chemical overlays, tool marks, and time-lapse history.",
        bullets: [
          "Add a hidden capture canvas that composites agar, growth canvas, chemical overlay, rim, and optional labels at a fixed analysis frame rate.",
          "Run a fast pass every few seconds for live feedback and a SAHI detail pass on pause, save, record stop, or MYCA request.",
          "Detect and track colony boundaries, hyphal tips, contamination regions, bacterial blobs, mold/mildew growth, droplets, scalpel tissue chunks, and abnormal color/texture.",
          "Display BlueSight overlays in the app: boxes, masks, labels, confidence, growth arrows, and event markers that can be toggled on/off.",
          "Send detections to MYCA as structured events so chat can answer questions like: what is growing fastest, where is contamination, did pH change the growth edge, and what should I inspect next?",
          "Save the timelapse plus JSON detections together so future MYCA/NLM training can learn from both video and structured observations.",
        ],
      },
      edgeRuntime: {
        title: "MycoBrain + Jetson + Hailo-8 deployment path",
        body:
          "BlueSight should run on the device when possible. MycoBrain plus Jetson handles heavier vision and orchestration; Raspberry Pi HATs with Hailo-8 can run efficient detection pipelines close to the sensor.",
        bullets: [
          "Use Jetson for flexible CUDA/TensorRT experiments, multi-camera capture, segmentation, tracking, and heavier open-vocabulary workflows.",
          "Use Hailo-8 for compiled low-latency detection pipelines through GStreamer/TAPPAS-style apps and HEF model files.",
          "Convert promoted BlueSight models into edge formats per target: ONNX/TensorRT for Jetson, HEF for Hailo, and browser/WASM only for lightweight previews.",
          "Run edge inference first, then send compact detections and selected frames to NatureOS/MINDEX instead of streaming every raw frame.",
          "Expose device health: FPS, latency, model name, accelerator temperature, power, frame drops, and last MINDEX sync.",
        ],
      },
      references: [
        { label: "YOLO-World open-vocabulary detection", href: "https://github.com/ailab-cvc/yolo-world" },
        { label: "Roboflow YOLO-World overview", href: "https://blog.roboflow.com/what-is-yolo-world/" },
        { label: "Ultralytics YOLO26 + SAHI guide", href: "https://docs.ultralytics.com/guides/sahi-tiled-inference" },
        { label: "Hailo-8 GStreamer detection example", href: "https://github.com/hailo-ai/hailo-apps-core/tree/4327923422ababaf3a9395f86bf39f5b34dcfd83/apps/h8/gstreamer/general/detection" },
        { label: "Hailo-8 accelerator", href: "https://hailo.ai/products/ai-accelerators/hailo-8-ai-accelerator/#hailo-8-specification" },
      ],
    },
    related: [
      { label: "NatureOS", href: "/natureos" },
      { label: "Earth Simulator", href: "/earth" },
      { label: "AGARIC", href: "/devices/agaric" },
      { label: "Public MINDEX", href: "/mindex" },
    ],
  },
  sine: {
    title: "SINE",
    eyebrow: "Acoustic Sensing",
    tagline: "Listening, localization, and acoustic intelligence for air, land, sea, and infrastructure.",
    icon: Radio,
    accent: "blue",
    heroImage: "/assets/psathyrella/sphere-acoustic.png",
    summary:
      "SINE is Mycosoft's acoustic and auditory sensing package: hydrophones, transducers, microphones, triangulation, sound libraries, acoustic communications, and model-ready listening pipelines for environmental intelligence.",
    metrics: [
      { label: "Capture", value: "Hydrophone / microphone / transducer" },
      { label: "Analysis", value: "Triangulation + fingerprinting" },
      { label: "Libraries", value: "Species / machine / event sounds" },
      { label: "Domain", value: "Air / land / water" },
    ],
    pillars: [
      {
        title: "Hydrophone intelligence",
        icon: Waves,
        body:
          "SINE listens underwater for vessels, marine life, propellers, wave state, subsurface events, infrastructure noise, and acoustic signatures that cameras cannot capture below the surface.",
      },
      {
        title: "Microphone arrays",
        icon: Mic,
        body:
          "Directional microphones and MEMS arrays capture airside soundscapes: birds, insects, human activity, machinery, impacts, explosions, drones, weather, and site-specific acoustic baselines.",
      },
      {
        title: "Transducers and acoustic comms",
        icon: Radio,
        body:
          "Transducers allow acoustic signaling, testing, pings, controlled excitation, and device-to-device communication experiments where radio is limited or where sound propagation is the subject of study.",
      },
      {
        title: "Triangulation and localization",
        icon: Map,
        body:
          "Multiple SINE nodes can compare time-of-arrival, amplitude, frequency profile, and known station position to estimate source location, direction, speed, and confidence.",
      },
      {
        title: "Sound library matching",
        icon: Database,
        body:
          "Field audio is compared against curated libraries of marine life, birds, insects, human sounds, machinery, propellers, explosions, weather, and environmental acoustic events.",
      },
      {
        title: "MYCA listening loops",
        icon: Brain,
        body:
          "MYCA can subscribe to acoustic events, request longer captures, compare against MINDEX history, open a map widget, or dispatch agents when a pattern is novel, risky, or operationally important.",
      },
    ],
    workflow: [
      "Capture raw acoustic windows from microphones, hydrophones, or transducers.",
      "Extract spectrograms, frequency bands, harmonics, amplitude envelopes, and event timestamps.",
      "Cross-reference nearby nodes for triangulation and source confidence.",
      "Compare against sound libraries and prior MINDEX observations.",
      "Store event clips, fingerprints, labels, and location context for MYCA and model training.",
    ],
    dataProducts: [
      "Audio clips and spectrograms",
      "Acoustic fingerprints",
      "Triangulated source estimates",
      "Hydrophone event records",
      "Sound-library matches",
      "Acoustic anomaly timelines",
    ],
    useCases: [
      "Marine life and vessel monitoring",
      "Drone, propeller, and machinery detection",
      "Bird and insect bioacoustics",
      "Explosion, impact, or event detection",
      "Underwater device communications",
      "Infrastructure acoustic baselines",
    ],
    related: [
      { label: "Psathyrella-M", href: "/devices/psathyrella" },
      { label: "NatureOS", href: "/natureos" },
      { label: "Public MINDEX", href: "/mindex" },
      { label: "Device Network", href: "/devices" },
    ],
  },
  gandha: {
    title: "GANDHA",
    eyebrow: "Smell + Gas Sensing",
    tagline: "A chemical sense layer for gases, odors, particulates, and environmental signatures.",
    icon: Wind,
    accent: "amber",
    heroImage: "/assets/sporebase/interactive-schematic.jpg",
    summary:
      "GANDHA is Mycosoft's smell intelligence package: gas verification, VOC and VSC sensing, humidity, temperature, particulate counters, spectroscopy and spectrometry options, Bosch smell training workflows, and field odor signatures.",
    metrics: [
      { label: "Chemical channels", value: "VOC / VSC / gas / particles" },
      { label: "Environment", value: "Humidity + temperature + pressure" },
      { label: "Sensors", value: "BME680 / BME688 / BME690 / BMV080" },
      { label: "Output", value: "Smell signatures + alerts" },
    ],
    pillars: [
      {
        title: "VOC and VSC detection",
        icon: Wind,
        body:
          "GANDHA detects volatile organic compounds and volatile sulfur compounds that can indicate fungi, decay, contamination, fire precursors, biological activity, industrial leakage, or indoor air events.",
      },
      {
        title: "Gas verification packages",
        icon: Gauge,
        body:
          "Gas channels can be configured for verification workflows where an alert needs context from multiple sensors rather than one isolated reading. The goal is confidence, not a single noisy threshold.",
      },
      {
        title: "Humidity and temperature context",
        icon: Thermometer,
        body:
          "Odor signatures are environmental. GANDHA ties gas readings to humidity, temperature, pressure, airflow, substrate, and time so MINDEX can compare like with like.",
      },
      {
        title: "Particulate sensing",
        icon: Atom,
        body:
          "Particle counters such as BMV080-class sensors help distinguish smoke, spores, dust, aerosols, and particulate events that may accompany smell or chemical anomalies.",
      },
      {
        title: "Spectroscopy and spectrometry",
        icon: ScanLine,
        body:
          "Where higher specificity is needed, spectroscopy and spectrometry-style integrations can add deeper chemical identification and help validate gas-sensor inference.",
      },
      {
        title: "Smell library training",
        icon: Brain,
        body:
          "Bosch-style smell-blob training and Mycosoft odor libraries turn repeated field signatures into model-ready classes so MYCA can recognize normal, suspicious, and novel smell events.",
      },
    ],
    workflow: [
      "Capture VOC, VSC, gas, humidity, temperature, pressure, and particulate readings.",
      "Normalize the readings against device calibration and environmental context.",
      "Compare the pattern against smell libraries and site baselines.",
      "Save signatures, raw windows, and confidence scores to MINDEX.",
      "MYCA routes alerts, sampling tasks, ventilation checks, or model-improvement prompts.",
    ],
    dataProducts: [
      "Smell signatures",
      "Gas verification records",
      "VOC and VSC timelines",
      "Particle event overlays",
      "Odor-library labels",
      "Contamination and air-quality alerts",
    ],
    useCases: [
      "Fungal culture and contamination monitoring",
      "Spore and aerosol context",
      "Fire, smoke, and decay precursors",
      "Indoor air quality",
      "Industrial leakage detection",
      "Habitat and soil chemistry shifts",
    ],
    related: [
      { label: "SporeBase", href: "/devices/sporebase" },
      { label: "MycoBrain", href: "/devices/mycobrain" },
      { label: "Public MINDEX", href: "/mindex" },
      { label: "NatureOS", href: "/natureos" },
    ],
  },
} as const satisfies Record<string, SensingPageConfig>

type SensingSlug = keyof typeof sensingPages

export function generateStaticParams() {
  return Object.keys(sensingPages).map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const page = sensingPages[slug as SensingSlug] as SensingPageConfig | undefined
  if (!page) return {}

  return {
    title: `${page.title} | Mycosoft Sensing`,
    description: page.summary,
  }
}

export default async function SensingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const page = sensingPages[slug as SensingSlug] as SensingPageConfig | undefined
  if (!page) notFound()

  const Icon = page.icon
  const isSinePage = slug === "sine"

  if (isSinePage) {
    return <SineAcousticPlayer />
  }

  return (
    <NeuromorphicProvider>
      <main className={`sensing-glass-page sensing-${page.accent} min-h-screen overflow-hidden bg-white text-slate-950 dark:bg-black dark:text-white`}>
        <section className="relative overflow-hidden border-b border-white/20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(14,165,233,0.22),transparent_32%),radial-gradient(circle_at_78%_8%,rgba(16,185,129,0.2),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,245,249,0.88))] dark:bg-[radial-gradient(circle_at_18%_12%,rgba(34,211,238,0.13),transparent_34%),radial-gradient(circle_at_78%_8%,rgba(16,185,129,0.13),transparent_32%),linear-gradient(180deg,rgba(3,7,18,0.98),rgba(2,6,23,0.9))]" />
          <div className="absolute inset-0 opacity-[0.16] dark:opacity-[0.22] bg-[linear-gradient(rgba(15,23,42,0.22)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.22)_1px,transparent_1px)] bg-[size:48px_48px]" />

          <div className="relative container mx-auto grid gap-10 px-4 py-16 md:grid-cols-[1.05fr_0.95fr] md:px-6 md:py-24">
            <div>
              <Link href="/about" className="mb-8 inline-flex items-center gap-2 text-sm text-slate-700 transition hover:text-slate-950 dark:text-white/70 dark:hover:text-white">
                <ArrowLeft className="h-4 w-4" />
                About sensing
              </Link>
              <NeuBadge variant="default" className="mb-5 border-white/35 bg-white/30 text-slate-900 backdrop-blur-xl dark:border-white/20 dark:bg-white/10 dark:text-white">
                {page.eyebrow}
              </NeuBadge>
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/45 bg-white/35 shadow-2xl backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
                <Icon className="h-8 w-8" />
              </div>
              <h1 className="max-w-4xl text-4xl font-bold tracking-tight md:text-6xl">{page.title}</h1>
              <p className="mt-4 max-w-3xl text-xl font-medium text-slate-700 dark:text-white/82">{page.tagline}</p>
              <p className="mt-6 max-w-3xl text-base leading-relaxed text-slate-700 dark:text-white/72 md:text-lg">{page.summary}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                {page.related.slice(0, 3).map((link) => (
                  <NeuButton key={link.href} asChild variant="default" className="min-h-[44px] border border-white/35 bg-white/28 text-slate-950 backdrop-blur-xl dark:border-white/20 dark:bg-white/10 dark:text-white">
                    <Link href={link.href}>
                      {link.label}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </NeuButton>
                ))}
              </div>
            </div>

            <NeuCard className="sensing-hero-card relative min-h-[420px] overflow-hidden p-0">
              {page.heroImage ? (
                <Image src={page.heroImage} alt={`${page.title} sensing system`} fill className="object-cover" priority />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/28 to-white/8" />
              <div className="absolute inset-x-0 bottom-0 z-10 p-6 text-white">
                <div className="mb-4 grid grid-cols-2 gap-3">
                  {page.metrics.map((metric) => (
                    <div key={metric.label} className="rounded-2xl border border-white/20 bg-white/12 p-3 backdrop-blur-xl">
                      <div className="text-xs uppercase tracking-[0.18em] text-white/62">{metric.label}</div>
                      <div className="mt-1 text-sm font-semibold">{metric.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </NeuCard>
          </div>
        </section>

        {page.appCallout ? (
          <section className="container mx-auto px-4 py-10 md:px-6">
            <Link href={page.appCallout.href} className="group block">
              <NeuCard className="grid gap-6 overflow-hidden p-4 md:grid-cols-[0.85fr_1.15fr] md:p-5">
                <div className="relative min-h-[240px] overflow-hidden rounded-2xl">
                  <Image src={page.appCallout.image} alt={page.appCallout.title} fill className="object-cover transition duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                </div>
                <div className="flex flex-col justify-center p-2 md:p-4">
                  <NeuBadge variant="default" className="mb-4 w-fit border-white/35 bg-white/25 text-slate-900 dark:border-white/20 dark:bg-white/10 dark:text-white">NatureOS App</NeuBadge>
                  <h2 className="text-2xl font-bold md:text-3xl">{page.appCallout.title}</h2>
                  <p className="mt-4 text-sm leading-relaxed text-slate-700 dark:text-white/72 md:text-base">{page.appCallout.description}</p>
                  <div className="mt-6">
                    <NeuButton variant="default" className="min-h-[44px] border border-white/35 bg-white/28 text-slate-950 backdrop-blur-xl dark:border-white/20 dark:bg-white/10 dark:text-white">
                      {page.appCallout.cta}
                      <ArrowRight className="h-4 w-4" />
                    </NeuButton>
                  </div>
                </div>
              </NeuCard>
            </Link>
          </section>
        ) : null}

        <section className="container mx-auto px-4 py-12 md:px-6 md:py-16">
          <div className="mb-8 max-w-3xl">
            <NeuBadge variant="default" className="mb-4 border-white/35 bg-white/25 text-slate-900 dark:border-white/20 dark:bg-white/10 dark:text-white">System</NeuBadge>
            <h2 className="text-3xl font-bold md:text-4xl">Sensing Architecture</h2>
            <p className="mt-3 text-slate-700 dark:text-white/70">
              Each page uses the same operational template: hardware channels, normalized context, MINDEX memory, MYCA orchestration, and model-ready outputs.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {page.pillars.map((pillar) => (
              <NeuCard key={pillar.title} className="h-full">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/35 bg-white/25 backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
                    <pillar.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold">{pillar.title}</h3>
                </div>
                <p className="text-sm leading-relaxed text-slate-700 dark:text-white/72">{pillar.body}</p>
              </NeuCard>
            ))}
          </div>
        </section>

        <section className="container mx-auto grid gap-6 px-4 pb-16 md:grid-cols-[1fr_0.9fr] md:px-6 md:pb-24">
          <NeuCard className="h-full">
            <div className="mb-5 flex items-center gap-3">
              <Zap className="h-5 w-5" />
              <h2 className="text-2xl font-bold">Signal Flow</h2>
            </div>
            <div className="space-y-3">
              {page.workflow.map((step, index) => (
                <div key={step} className="flex gap-3 rounded-2xl border border-white/25 bg-white/18 p-3 backdrop-blur-xl dark:border-white/10 dark:bg-white/7">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/25 text-sm font-bold dark:border-white/15 dark:bg-white/10">
                    {index + 1}
                  </div>
                  <p className="text-sm leading-relaxed text-slate-700 dark:text-white/74">{step}</p>
                </div>
              ))}
            </div>
          </NeuCard>

          <div className="grid gap-6">
            <NeuCard>
              <div className="mb-4 flex items-center gap-3">
                <Database className="h-5 w-5" />
                <h2 className="text-2xl font-bold">Data Products</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {page.dataProducts.map((item) => (
                  <span key={item} className="rounded-full border border-white/30 bg-white/25 px-3 py-1 text-sm text-slate-800 backdrop-blur-xl dark:border-white/15 dark:bg-white/10 dark:text-white/78">
                    {item}
                  </span>
                ))}
              </div>
            </NeuCard>
            <NeuCard>
              <div className="mb-4 flex items-center gap-3">
                <Leaf className="h-5 w-5" />
                <h2 className="text-2xl font-bold">Use Cases</h2>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {page.useCases.map((item) => (
                  <div key={item} className="rounded-2xl border border-white/25 bg-white/18 p-3 text-sm text-slate-700 backdrop-blur-xl dark:border-white/10 dark:bg-white/7 dark:text-white/74">
                    {item}
                  </div>
                ))}
              </div>
            </NeuCard>
          </div>
        </section>

        {page.softwarePlan ? (
          <section className="container mx-auto px-4 pb-16 md:px-6 md:pb-24">
            <NeuCard className="overflow-hidden">
              <div className="mb-8 max-w-4xl">
                <NeuBadge variant="default" className="mb-4 border-white/35 bg-white/25 text-slate-900 dark:border-white/20 dark:bg-white/10 dark:text-white">
                  Software Roadmap
                </NeuBadge>
                <h2 className="text-3xl font-bold md:text-4xl">{page.softwarePlan.title}</h2>
                <p className="mt-4 text-sm leading-relaxed text-slate-700 dark:text-white/72 md:text-base">
                  {page.softwarePlan.intro}
                </p>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {page.softwarePlan.phases.map((phase) => (
                  <div key={phase.title} className="rounded-3xl border border-white/25 bg-white/18 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-white/7">
                    <h3 className="text-lg font-semibold">{phase.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-white/72">{phase.body}</p>
                    <ul className="mt-4 space-y-2">
                      {phase.bullets.map((bullet) => (
                        <li key={bullet} className="flex gap-2 text-sm leading-relaxed text-slate-700 dark:text-white/72">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500 dark:bg-cyan-300" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div className="rounded-3xl border border-cyan-400/30 bg-cyan-400/10 p-5 backdrop-blur-xl">
                  <h3 className="text-xl font-semibold">{page.softwarePlan.petriDish.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-white/72">{page.softwarePlan.petriDish.body}</p>
                  <ul className="mt-4 space-y-2">
                    {page.softwarePlan.petriDish.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-2 text-sm leading-relaxed text-slate-700 dark:text-white/72">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500 dark:bg-cyan-300" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-3xl border border-emerald-400/30 bg-emerald-400/10 p-5 backdrop-blur-xl">
                  <h3 className="text-xl font-semibold">{page.softwarePlan.edgeRuntime.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-white/72">{page.softwarePlan.edgeRuntime.body}</p>
                  <ul className="mt-4 space-y-2">
                    {page.softwarePlan.edgeRuntime.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-2 text-sm leading-relaxed text-slate-700 dark:text-white/72">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500 dark:bg-emerald-300" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                {page.softwarePlan.references.map((reference) => (
                  <NeuButton key={reference.href} asChild variant="default" className="min-h-[44px] border border-white/35 bg-white/28 text-slate-950 backdrop-blur-xl dark:border-white/20 dark:bg-white/10 dark:text-white">
                    <a href={reference.href} target="_blank" rel="noopener noreferrer">
                      {reference.label}
                      <ArrowRight className="h-4 w-4" />
                    </a>
                  </NeuButton>
                ))}
              </div>
            </NeuCard>
          </section>
        ) : null}

        <section className="border-t border-white/20 bg-white/40 py-12 backdrop-blur-xl dark:bg-white/[0.03]">
          <div className="container mx-auto flex flex-col gap-5 px-4 md:flex-row md:items-center md:justify-between md:px-6">
            <div>
              <h2 className="text-2xl font-bold">Connected Mycosoft systems</h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-700 dark:text-white/70">
                Sensing pages remain public, while operational apps, device consoles, and protected data flows can be gated in NatureOS.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {page.related.map((link) => (
                <NeuButton key={link.href} asChild variant="default" className="min-h-[44px] border border-white/35 bg-white/28 text-slate-950 backdrop-blur-xl dark:border-white/20 dark:bg-white/10 dark:text-white">
                  <Link href={link.href}>
                    {link.label}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </NeuButton>
              ))}
            </div>
          </div>
        </section>

      </main>
    </NeuromorphicProvider>
  )
}
