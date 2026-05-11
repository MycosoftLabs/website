import {
  Antenna,
  Radio,
  Radar,
  FlaskRoundIcon as Flask,
  Wifi,
  Microscope,
  Smartphone,
  Cpu,
  Network,
  Building,
  Map,
  Car,
  AlertCircle,
  Activity,
  Bell,
  Shield,
  Box,
  Waves,
  Brain,
  type LucideIcon,
} from "lucide-react"

interface Feature {
  icon: LucideIcon
  title: string
  description: string
}

interface DetailedFeature {
  title: string
  description: string
  bulletPoints: string[]
  image: string
}

export interface Device {
  id: string
  name: string
  tagline: string
  description: string
  price: number
  status: string
  image: string
  video?: string
  videoTitle?: string
  videoDescription?: string
  features: Feature[]
  detailedFeatures: DetailedFeature[]
  specifications: Record<string, string>
}

export const DEVICES: Device[] = [
  {
    id: "mushroom-1",
    name: "Mushroom 1",
    tagline: "Walking Ground Droid",
    description: "A stationary ground buoy that monitors underground fungal networks and soil conditions in real-time.",
    price: 0,
    status: "Development",
    image: "/assets/mushroom1/Main A.jpg",
    video: "/assets/mushroom1/mushroom1-hero-2026-fast-web.mp4",
    videoTitle: "Discover the Underground Network",
    videoDescription: "Experience real-time monitoring of mycelial networks with unprecedented precision and insight.",
    features: [
      {
        icon: Antenna,
        title: "Deep Soil Monitoring",
        description: "Monitors up to 2 meters below ground",
      },
      {
        icon: Radio,
        title: "Wireless Mesh Network",
        description: "Connects with other Mushroom 1 units",
      },
      {
        icon: Wifi,
        title: "Long-Range Communication",
        description: "5km range in optimal conditions",
      },
    ],
    detailedFeatures: [
      {
        title: "Advanced Sensing Technology",
        description: "Utilizing cutting-edge bioelectric sensors to detect and measure mycelial network activity.",
        bulletPoints: [
          "Multi-depth soil probes",
          "Real-time bioelectric signal detection",
          "Environmental condition monitoring",
          "Automated data collection and analysis",
        ],
        image: "/placeholder.svg?height=400&width=600",
      },
      {
        title: "Mesh Networking Capabilities",
        description: "Create an interconnected network of sensors to map fungal networks across large areas.",
        bulletPoints: [
          "Automatic node discovery",
          "Self-healing network topology",
          "Low-power long-range communication",
          "Encrypted data transmission",
        ],
        image: "/placeholder.svg?height=400&width=600",
      },
    ],
    specifications: {
      "Sensor Depth": "Up to 2 meters",
      "Battery Life": "6 months (solar rechargeable)",
      "Wireless Range": "5km line of sight",
      "Data Storage": "32GB local + cloud sync",
      "Environmental Rating": "IP67 waterproof",
      "Operating Temperature": "-20°C to 60°C",
      Dimensions: "30cm x 30cm x 100cm",
      Weight: "4.5kg",
    },
  },
  {
    id: "sporebase",
    name: "SporeBase",
    tagline: "Breathing Aerosol Collector",
    description: "The world's most advanced bioaerosol collector. Time-indexed spore capture for research and monitoring.",
    price: 0,
    status: "In Stock",
    image: "/assets/sporebase/sporebase main2.jpg",
    video: "/assets/sporebase/sporebase1publish.mp4",
    videoTitle: "Map the Fungal Future",
    videoDescription: "Create a dynamic map of fungal activity with our distributed spore collection network.",
    features: [
      {
        icon: Network,
        title: "Mesh Network Integration",
        description: "Automatically connects to nearby units",
      },
      {
        icon: Building,
        title: "Versatile Mounting",
        description: "Installs on buildings, posts, and vehicles",
      },
      {
        icon: Car,
        title: "Mobile Collection",
        description: "Vehicle-mounted units for dynamic sampling",
      },
    ],
    detailedFeatures: [
      {
        title: "Versatile Deployment Options",
        description: "Install SporeBase units anywhere to create a comprehensive spore monitoring network.",
        bulletPoints: [
          "Building mount installation",
          "Vehicle integration kit",
          "Pole mount adapter",
          "Portable tripod option",
        ],
        image: "/placeholder.svg?height=400&width=600",
      },
      {
        title: "Advanced Analysis Capabilities",
        description: "Real-time spore identification and concentration monitoring.",
        bulletPoints: [
          "AI-powered spore recognition",
          "Environmental correlation",
          "Seasonal pattern detection",
          "Health impact assessment",
        ],
        image: "/placeholder.svg?height=400&width=600",
      },
    ],
    specifications: {
      "Collection Rate": "100L/min airflow",
      "Analysis Time": "Real-time + lab verification",
      "Network Range": "1km between nodes",
      "Power Source": "Solar + Battery backup",
      "Data Storage": "16GB local + cloud sync",
      "Weather Resistance": "IP65 rated",
      Dimensions: "20cm x 15cm x 40cm",
      Weight: "2.8kg",
    },
  },
  {
    id: "hyphae-1",
    name: "Hyphae 1",
    tagline: "Modular Data Center",
    description: "Industrial-grade modular I/O for building automation, agriculture, and industrial monitoring. Three sizes to fit any deployment.",
    price: 0,
    status: "In Stock",
    image: "/assets/hyphae1/hyphae1-lab-prototype.png",
    video: "/assets/hyphae1/hero.mp4",
    videoTitle: "Industrial Standard",
    videoDescription: "Modular I/O platform designed for decades of reliable operation.",
    features: [
      {
        icon: Shield,
        title: "IP66 Rated",
        description: "Dust-tight and water-resistant",
      },
      {
        icon: Network,
        title: "Multi-Protocol",
        description: "Modbus, MQTT, REST API support",
      },
      {
        icon: Cpu,
        title: "Edge Computing",
        description: "Local processing and analytics",
      },
    ],
    detailedFeatures: [
      {
        title: "Flexible I/O Configuration",
        description: "Mix and match analog, digital, and relay modules for any application.",
        bulletPoints: [
          "4-20mA analog inputs",
          "0-10V voltage inputs",
          "Digital I/O cards",
          "Relay output modules",
        ],
        image: "/assets/hyphae1/schematic-view.jpg",
      },
      {
        title: "Industrial Connectivity",
        description: "Connect to any building management or SCADA system.",
        bulletPoints: [
          "Modbus RTU/TCP",
          "MQTT pub/sub",
          "REST API",
          "BACnet optional",
        ],
        image: "/assets/hyphae1/hyphae1-lab-prototype.png",
      },
    ],
    specifications: {
      "Enclosure Rating": "IP66 / NEMA 4X",
      "Operating Temp": "-40°C to 70°C",
      "Housing Material": "UV-stabilized FRP",
      "Sensor Channels": "4 / 8 / 16 (by variant)",
      "Communication": "Ethernet, WiFi, LoRa, LTE",
      "Power Input": "24V DC or 120-240V AC",
      Dimensions: "15-40cm (variant dependent)",
      Weight: "0.8-2.5kg",
    },
  },
  {
    id: "myconode",
    name: "MycoNode",
    tagline: "Mesh Network Probe",
    description: "Buried sensor nodes that detect bioelectric signals from mycelial networks and monitor soil conditions at the microvolt level.",
    price: 0,
    status: "Contact Sales",
    image: "/assets/myconode/myconode-main.png",
    video: "/assets/myconode/myconode hero1.mp4",
    videoTitle: "Listening to the Underground",
    videoDescription: "Decode the bioelectric whispers of fungal networks.",
    features: [
      {
        icon: Microscope,
        title: "0.1μV Resolution",
        description: "Ultra-sensitive bioelectric detection",
      },
      {
        icon: Radio,
        title: "10km LoRa Mesh",
        description: "Long-range mesh networking",
      },
      {
        icon: Shield,
        title: "5-Year Battery",
        description: "Deploy and forget operation",
      },
    ],
    detailedFeatures: [
      {
        title: "Multi-Modal Sensing",
        description: "Eight sensor modalities create a complete picture of underground dynamics.",
        bulletPoints: [
          "Bioelectric voltage detection",
          "Soil moisture profiling",
          "Temperature gradients",
          "pH and conductivity",
        ],
        image: "/placeholder.svg?height=400&width=600",
      },
      {
        title: "Edge ML Processing",
        description: "Onboard machine learning for pattern recognition.",
        bulletPoints: [
          "TinyML inference",
          "Mycelial activity detection",
          "Anomaly identification",
          "Stress signature recognition",
        ],
        image: "/placeholder.svg?height=400&width=600",
      },
    ],
    specifications: {
      "Bioelectric Resolution": "0.1 μV",
      "Deployment Depth": "10-50 cm",
      "Sampling Rate": "0.1-10 Hz",
      "Battery Life": "5+ years",
      "Communication": "LoRa 915MHz mesh",
      "IP Rating": "IP68 fully sealed",
      Dimensions: "Ø 5cm × 25cm",
      Weight: "450g",
    },
  },
  {
    id: "alarm",
    name: "ALARM",
    tagline: "Biological Home Alarm",
    description:
      "A next-generation environmental sensing device engineered to replace every smoke alarm on Earth—with identical size, cost, and mounting, but exponentially more intelligent.",
    price: 49.99,
    status: "Coming Soon",
    image:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT%20Image%20Apr%208%2C%202025%2C%2004_02_32%20PM-cWILDVnWKhQEz6toW0Y161OJRUMnyq.png",
    video: "https://mycosoft.org/videos/alarm-promo.mp4",
    videoTitle: "Protect Your Air. Protect Your Loved Ones.",
    videoDescription: "Know what's coming—before it arrives.",
    features: [
      {
        icon: AlertCircle,
        title: "Next-Gen Safety",
        description: "Detects smoke, fire, mold, and more",
      },
      {
        icon: Activity,
        title: "Health Protection",
        description: "Monitors air quality and pathogens",
      },
      {
        icon: Network,
        title: "Mesh Community Mode",
        description: "Forms real-time danger web with nearby units",
      },
    ],
    detailedFeatures: [
      {
        title: "Advanced Sensor Suite",
        description:
          "ALARM is equipped with a highly advanced multi-sensor array, all inside the size of a regular smoke detector.",
        bulletPoints: [
          "Dual-mode smoke detection (Ionization & Photoelectric)",
          "VOC sensor for detecting volatile organic compounds",
          "PM1.0/PM2.5/PM10 particulate matter detection",
          "Mold spore detection before visual evidence appears",
          "Virus/bacteria detection via bioaerosol density estimation",
        ],
        image:
          "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT%20Image%20Apr%208%2C%202025%2C%2004_16_38%20PM-n9ikxJQXXXXXXXXXXXXXXXXXXXXXXXX.png",
      },
      {
        title: "Smart AI Onboard",
        description: "Edge AI module on ESP32-S3 with TinyML inference for pattern recognition.",
        bulletPoints: [
          "Recognizes multi-sensor 'danger fingerprints'",
          "Differentiates mold from smoke, or virus from pollen",
          "Updates itself over the air (OTA)",
          "Learns your space and watches your air",
        ],
        image:
          "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT%20Image%20Apr%208%2C%202025%2C%2004_02_28%20PM-sEBbNvWaCUqNGunqZ6cKe3gzu4qc1A.png",
      },
      {
        title: "Environmental Awareness",
        description: "Pulls in outdoor air quality data, storm movement, and wildfire zones via API.",
        bulletPoints: [
          "Advanced alerts when dangerous particles are moving toward your home",
          "Neighborhood Mesh Mode for community-wide threat detection",
          "Real-time risk profiling updated every 5 seconds",
          "Cloud context for predictive warnings",
        ],
        image:
          "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT%20Image%20Apr%208%2C%202025%2C%2004_26_04%20PM-aQHd9vC39SMpNbpiZkCtNdipuXKvXe.png",
      },
    ],
    specifications: {
      "Form Factor": "Circular mount, standard US/North American smoke detector shell",
      Dimensions: '5.5" diameter x 1.8" height',
      Weight: "128 grams",
      "Power Source": "3.7V 2000mAh lithium rechargeable battery",
      "Battery Life": "2 months on battery-only, continuous with AC",
      Connectivity: "Wi-Fi 802.11b/g/n, Bluetooth LE 5.0, LoRa optional",
      Sensors: "Smoke, CO₂, VOC, PM, Temperature, Humidity, Barometric Pressure, Light",
      "Alert System": "85 dB Piezo buzzer, RGB LED ring indicator",
      Price: "Standard: $49.99, Pro: $79.99",
      Availability: "Pre-orders Q3 2025, Shipping Q4 2025",
    },
  },
  // Hero/media: add files under public/assets/psathyrella/ (NAS: website/assets/psathyrella/)
  {
    id: "psathyrella",
    name: "Psathyrella",
    tagline: "Swimming Sensor Buoy",
    description:
      "Named for Psathyrella aquatica — the only known underwater mushroom — Psathyrella is a biologically inspired autonomous buoy for passive acoustic monitoring and multi-modal ocean sensing. Each node combines MycoBrain acquisition with an edge NLM pipeline (SSM/Mamba-class temporal modeling) so classification runs at the buoy: shallow-water complexity, biological clutter, and evolving signatures meet continuous learning from live waveforms, not static web corpora. Arrays mesh via Mycorrhizae, fuse into CREP on NatureOS, and lift into FUSARIUM for defense-grade situational awareness — with AVANI governance on every inference.",
    price: 0,
    status: "Program",
    image: "/assets/psathyrella/hero.png",
    video: "/assets/psathyrella/psathyrella-hero-2026.mp4",
    videoTitle:
      "A fully autonomous, AI-driven, self-propelled buoy with acoustic and atmospheric sensors processed at the edge, and mesh connectivity to manned and unmanned systems.",
    videoDescription:
      "Persistent littoral and coastal observation — edge-native passive acoustics, multi-modal context, and mesh survivability with cryptographic provenance from hydrophone to operator displays.",
    features: [
      {
        icon: Brain,
        title: "NLM acoustic core",
        description:
          "Nature Learning Model on buoy compute: long-sequence hydrophone streams with efficient temporal backbone, graph/hypergraph spatial structure across array elements, and sparse attention for transient events — tuned for real-world ocean noise.",
      },
      {
        icon: Waves,
        title: "Underwater acoustic stack",
        description:
          "Broadband hydrophone chain (0.10 Hz–250 kHz), 24-bit ADC, configurable gain — passive acoustic classification and vessel/biologic discrimination as the primary sense.",
      },
      {
        icon: Cpu,
        title: "MycoBrain + Jetson edge",
        description:
          "ESP32-S3 MycoBrain for acquisition, environmental sensing, and control; NVIDIA Jetson Orin Nano co-processor for NLM inference — tactical relevance without waiting on shore processing.",
      },
      {
        icon: Activity,
        title: "Six-sense fusion",
        description:
          "Acoustic hearing plus spectral, bioelectric, thermal, chemical, and mechanical modalities — correlated contacts to cut false alarms versus single-modality sonobuoy-style pipelines.",
      },
      {
        icon: Network,
        title: "Mycorrhizae mesh",
        description:
          "Self-organizing links over LoRa, satellite (e.g. Iridium SBD), and acoustic modem paths for submerged relays — relay, aggregate, and prioritize through node loss.",
      },
      {
        icon: Shield,
        title: "AVANI + integrity",
        description:
          "Governance and auditability over AI outputs; cryptographic provenance (hash chains, Merkle-rooted trails) for observations, classifications, and calibration events via MINDEX patterns.",
      },
    ],
    detailedFeatures: [
      {
        title: "Psathyrella-M buoy — edge sensing & mobility",
        description:
          "Hardware follows a MIL-STD-810G-oriented, pressure-rated enclosure (target depth rating 200 m) with solar and battery power for sustained autonomous operation.",
        bulletPoints: [
          "Processor: ESP32-S3 dual-core @ 240 MHz, 512 KB SRAM, 8 MB PSRAM",
          "AI co-processor: NVIDIA Jetson Orin Nano (~40 TOPS INT8) for NLM inference",
          "Propulsion: four turbopropellers for omnidirectional translation, rotation, and autonomous repositioning",
          "Onboard environmental sensing: temperature, humidity, pressure, VOCs, CO₂ — fused with acoustics for context",
        ],
        image: "/assets/psathyrella/wild-field-wide.png",
      },
      {
        title: "Five-layer stack — from hydrophone to COP",
        description:
          "Edge acquisition and Jetson inference; NLM + AVANI; Mycorrhizae mesh; NatureOS + CREP common operating picture; FUSARIUM for integrated defense and biosecurity workflows alongside civilian operators.",
        bulletPoints: [
          "Layer 1 — MycoBrain nodes + Jetson: ingest, preprocess, classify at the edge",
          "Layer 2 — NLM + AVANI: acoustic AI with policy, audit, and tamper-evident records",
          "Layer 3 — Mycorrhizae: pub/sub mesh routing and resilient array behavior",
          "Layer 4 — NatureOS + CREP + AI Studio: fusion, 3D COP, continuous model improvement",
          "Layer 5 — FUSARIUM: defense-grade fusion with OEI correlation and tactical interoperability",
        ],
        image: "/assets/psathyrella/waterline-split.png",
      },
      {
        title: "MINDEX, OEI, MYCA",
        description:
          "MINDEX-backed integrity for chain-of-custody over acoustic observations and decisions; OEI enriches contacts with sea state, biology, and shipping context; MYCA orchestrates agents for operations, retraining workflows, and integration tasks.",
        bulletPoints: [
          "Vector signature libraries (e.g. Qdrant) for rapid similarity and library lookup",
          "CREP device type psathyrella for live map and device federation",
          "Optional federated learning patterns — improve models without centralizing all raw hydrophone data",
        ],
        image: "/assets/psathyrella/internals-ring.png",
      },
    ],
    specifications: {
      Etymology: "Psathyrella aquatica — underwater mushroom species",
      "Edge MCU": "ESP32-S3 dual-core Xtensa LX7 @ 240 MHz, 512 KB SRAM, 8 MB PSRAM",
      "Edge AI": "NVIDIA Jetson Orin Nano (~40 TOPS INT8)",
      Hydrophone: "Broadband 0.10 Hz–250 kHz, 24-bit ADC, configurable gain",
      Propulsion: "Four turbopropellers — omnidirectional buoy mobility",
      Power: "Solar + battery — autonomous sustained operation",
      Enclosure: "Ruggedized (MIL-STD-810G-oriented); pressure-rated to 200 m (design target)",
      "Mesh & backhaul": "Mycorrhizae — LoRa, satellite (Iridium SBD-class), acoustic modem (submerged relay)",
      "CREP device type": "psathyrella",
      "Platform integration": "NatureOS, CREP, FUSARIUM, MINDEX, OEI, AI Studio, MAS / MYCA",
    },
  },
]
