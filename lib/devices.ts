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
    tagline: "Ground-Based Fungal Intelligence Station",
    description: "A stationary ground buoy that monitors underground fungal networks and soil conditions in real-time.",
    price: 599,
    status: "Pre-order",
    image:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Mushroom%201%20website-XBl4pAt7OdoBb53OzZjjnar9FBtckr.png",
    video: "https://mycosoft.org/videos/mushroom1-promo.mp4",
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
    id: "alarm",
    name: "ALARM",
    tagline: "The Smartest Safety Device Ever Built for Earth",
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
  {
    id: "sporebase",
    name: "SporeBase",
    tagline: "Distributed Spore Collection Network",
    description:
      "An adaptable spore collection and analysis system that can be mounted on buildings, vehicles, and infrastructure.",
    price: 299,
    status: "In Stock",
    image:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/SporeBase%20%20website-HFUWL3s1Ga7G7AZOnbrzy2YQoahLYu.png",
    video: "https://mycosoft.org/videos/sporebase-promo.mp4",
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
    id: "trufflebot",
    name: "TruffleBot",
    tagline: "Handheld Fungal Detection System",
    description:
      "A portable device that detects and analyzes fungal compounds and organisms in nature using advanced sensor arrays.",
    price: 799,
    status: "Pre-order",
    image:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/trufflebot%20website-w8BPrI8Okq8LZgXgIFCxS87gDFl7Nh.png",
    video: "https://mycosoft.org/videos/trufflebot-promo.mp4",
    videoTitle: "Your Personal Fungal Guide",
    videoDescription: "Explore and identify fungi in the wild with professional-grade sensing technology.",
    features: [
      {
        icon: Radar,
        title: "Multi-Spectrum Analysis",
        description: "Detects volatile organic compounds",
      },
      {
        icon: Smartphone,
        title: "Mobile App Integration",
        description: "Real-time analysis on your phone",
      },
      {
        icon: Map,
        title: "GPS Mapping",
        description: "Records find locations automatically",
      },
    ],
    detailedFeatures: [
      {
        title: "Professional-Grade Sensing",
        description: "Multiple sensor arrays for comprehensive fungal detection.",
        bulletPoints: [
          "VOC detection array",
          "Soil composition analysis",
          "Mycelial network mapping",
          "Species identification",
        ],
        image: "/placeholder.svg?height=400&width=600",
      },
      {
        title: "Mobile Integration",
        description: "Seamless connection with your smartphone for enhanced functionality.",
        bulletPoints: [
          "Real-time data visualization",
          "Cloud sync and sharing",
          "Community features",
          "Offline operation mode",
        ],
        image: "/placeholder.svg?height=400&width=600",
      },
    ],
    specifications: {
      "Sensor Types": "VOC, pH, moisture, temperature",
      "Battery Life": "12 hours continuous use",
      Connectivity: "Bluetooth 5.0, WiFi",
      "App Compatibility": "iOS 13+, Android 10+",
      "Detection Range": "Up to 1 meter depth",
      "Response Time": "<2 seconds",
      Dimensions: "15cm x 8cm x 25cm",
      Weight: "0.8kg",
    },
  },
  {
    id: "petreus",
    name: "Petreus",
    tagline: "Computational Petri Dish Platform",
    description:
      "A smart, connected petri dish system that transforms traditional lab equipment into a biological computing platform.",
    price: 1299,
    status: "Coming Soon",
    image:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Petreus%20website-p1GnQdGl7bH0QtfRrUozdfbEADofEm.png",
    video: "https://mycosoft.org/videos/petreus-promo.mp4",
    videoTitle: "The Future of Biological Computing",
    videoDescription: "Transform your lab into a biological computing powerhouse with our smart petri dish system.",
    features: [
      {
        icon: Microscope,
        title: "Real-time Imaging",
        description: "24/7 growth monitoring",
      },
      {
        icon: Cpu,
        title: "Bio-Computing",
        description: "Parallel processing capabilities",
      },
      {
        icon: Flask,
        title: "Environmental Control",
        description: "Precise condition management",
      },
    ],
    detailedFeatures: [
      {
        title: "Advanced Imaging System",
        description: "Continuous monitoring and analysis of fungal growth patterns.",
        bulletPoints: [
          "4K time-lapse recording",
          "AI-powered growth analysis",
          "Pattern recognition",
          "Automated documentation",
        ],
        image: "/placeholder.svg?height=400&width=600",
      },
      {
        title: "Environmental Control",
        description: "Precise management of growing conditions for optimal results.",
        bulletPoints: ["Temperature regulation", "Humidity control", "Nutrient delivery", "Contamination prevention"],
        image: "/placeholder.svg?height=400&width=600",
      },
    ],
    specifications: {
      "Imaging Resolution": "4K (3840 x 2160)",
      "Frame Rate": "60 fps max",
      "Temperature Control": "15-40°C ±0.1°C",
      "Humidity Control": "20-99% RH ±1%",
      "Network Interface": "WiFi 6, Ethernet",
      "Storage Capacity": "1TB SSD",
      Dimensions: "45cm x 45cm x 30cm",
      Weight: "5.2kg",
    },
  },
  {
    id: "mycotenna",
    name: "MycoTenna",
    tagline: "Fungal Network Communication System",
    description:
      "A revolutionary device that enables communication through mycelial networks, allowing for data transmission through soil and organic matter.",
    price: 899,
    status: "Coming Soon",
    image: "/placeholder.svg?height=600&width=800&text=MycoTenna",
    video: "https://mycosoft.org/videos/mycotenna-promo.mp4",
    videoTitle: "Connect Through Nature",
    videoDescription: "Harness the power of fungal networks for a new kind of communication technology.",
    features: [
      {
        icon: Network,
        title: "Mycelial Transmission",
        description: "Sends data through fungal networks",
      },
      {
        icon: Wifi,
        title: "Long-Distance Signaling",
        description: "Communicates over vast underground networks",
      },
      {
        icon: Shield,
        title: "Encrypted Transmission",
        description: "Secure, nature-based communication",
      },
    ],
    detailedFeatures: [
      {
        title: "Fungal Network Integration",
        description: "Connects directly to existing mycelial networks in soil for data transmission.",
        bulletPoints: [
          "Compatible with various fungal species",
          "Non-disruptive to natural networks",
          "Self-healing connection pathways",
          "Adaptive signal strength",
        ],
        image: "/placeholder.svg?height=400&width=600",
      },
      {
        title: "Sustainable Communication",
        description: "Leverages natural systems for low-energy, environmentally friendly data transmission.",
        bulletPoints: [
          "Ultra-low power consumption",
          "Solar rechargeable battery",
          "Biodegradable components",
          "Carbon-negative operation",
        ],
        image: "/placeholder.svg?height=400&width=600",
      },
    ],
    specifications: {
      "Transmission Range": "Up to 1km through connected mycelium",
      "Data Rate": "10-100 bps depending on network density",
      "Power Source": "Solar with battery backup",
      "Battery Life": "3 months on full charge",
      "Environmental Rating": "IP68 waterproof",
      "Operating Temperature": "-10°C to 50°C",
      Dimensions: "15cm x 15cm x 40cm",
      Weight: "1.2kg",
    },
  },
  {
    id: "mycoalarm",
    name: "MycoAlarm",
    tagline: "Fungal Network Early Warning System",
    description:
      "An environmental monitoring system that detects ecological changes and threats through mycelial network analysis.",
    price: 499,
    status: "Pre-order",
    image: "/placeholder.svg?height=600&width=800&text=MycoAlarm",
    video: "https://mycosoft.org/videos/mycoalarm-promo.mp4",
    videoTitle: "Nature's Warning System",
    videoDescription:
      "Detect environmental changes before they become visible through the intelligence of fungal networks.",
    features: [
      {
        icon: AlertCircle,
        title: "Early Detection",
        description: "Identifies environmental changes weeks in advance",
      },
      {
        icon: Activity,
        title: "Ecosystem Monitoring",
        description: "Tracks soil health and biodiversity",
      },
      {
        icon: Bell,
        title: "Alert System",
        description: "Customizable notifications for various threats",
      },
    ],
    detailedFeatures: [
      {
        title: "Predictive Environmental Analysis",
        description:
          "Uses fungal network responses to predict environmental changes before they're detectable by conventional means.",
        bulletPoints: [
          "Pollution detection",
          "Pathogen early warning",
          "Soil nutrient depletion alerts",
          "Climate impact assessment",
        ],
        image: "/placeholder.svg?height=400&width=600",
      },
      {
        title: "Integrated Alert System",
        description: "Provides timely notifications through multiple channels when environmental threats are detected.",
        bulletPoints: [
          "Mobile app notifications",
          "Email alerts",
          "SMS messaging",
          "API integration with other systems",
        ],
        image: "/placeholder.svg?height=400&width=600",
      },
    ],
    specifications: {
      "Detection Range": "100m radius from device",
      "Alert Lead Time": "1-4 weeks before conventional detection",
      "Sensor Types": "Bioelectric, chemical, moisture, temperature",
      "Power Source": "Solar with battery backup",
      "Data Storage": "32GB local + cloud sync",
      Connectivity: "WiFi, Bluetooth, LoRa",
      Dimensions: "20cm x 20cm x 30cm",
      Weight: "2.1kg",
    },
  },
]
