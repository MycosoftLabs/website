import { NextRequest, NextResponse } from "next/server"

// Smell signature interface
interface SmellSignature {
  id: string
  name: string
  category: "fungal" | "plant" | "chemical" | "animal" | "fire" | "decay" | "clean"
  subcategory: string
  description: string
  bsec_class_id: number
  voc_pattern: Record<string, number>
  icon_type: string
  color_hex: string
  species_id?: string
  species_name?: string
  training_samples: number
  confidence_threshold: number
}

// Fungal smell database - matches the firmware BSEC2 gas classification
const SMELL_DATABASE: SmellSignature[] = [
  {
    id: "smell-001",
    name: "Fresh Mushroom Fruiting",
    category: "fungal",
    subcategory: "basidiomycete",
    description: "The characteristic earthy, umami smell of fresh mushroom fruiting bodies. Dominated by 1-octen-3-ol (mushroom alcohol).",
    bsec_class_id: 0,
    voc_pattern: { octanol: 0.45, ethanol: 0.25, acetaldehyde: 0.15, other: 0.15 },
    icon_type: "mushroom",
    color_hex: "#8B4513",
    training_samples: 0,
    confidence_threshold: 0.75
  },
  {
    id: "smell-002",
    name: "Active Mycelium Growth",
    category: "fungal",
    subcategory: "mycelial",
    description: "Earthy, musty smell of actively growing mycelium colonizing substrate.",
    bsec_class_id: 1,
    voc_pattern: { ethanol: 0.30, octanol: 0.20, co2: 0.25, other: 0.25 },
    icon_type: "mycelium",
    color_hex: "#F5F5DC",
    training_samples: 0,
    confidence_threshold: 0.70
  },
  {
    id: "smell-003",
    name: "Substrate Decomposition",
    category: "decay",
    subcategory: "fermentation",
    description: "Fermentation and decomposition smell from substrate breakdown.",
    bsec_class_id: 2,
    voc_pattern: { ethanol: 0.20, ammonia: 0.25, hydrogen_sulfide: 0.15, co2: 0.20, other: 0.20 },
    icon_type: "decay",
    color_hex: "#654321",
    training_samples: 0,
    confidence_threshold: 0.65
  },
  {
    id: "smell-004",
    name: "Contamination Alert",
    category: "fungal",
    subcategory: "contamination",
    description: "Unusual VOC profile indicating possible contamination (Trichoderma, bacteria, mold).",
    bsec_class_id: 3,
    voc_pattern: { acetaldehyde: 0.30, ammonia: 0.20, hydrogen_sulfide: 0.20, other: 0.30 },
    icon_type: "warning",
    color_hex: "#FF4500",
    training_samples: 0,
    confidence_threshold: 0.60
  },
  {
    id: "smell-010",
    name: "Agaricus bisporus",
    category: "fungal",
    subcategory: "basidiomycete",
    description: "Common white/brown button mushroom. Mild, slightly sweet earthy smell.",
    bsec_class_id: 0,
    voc_pattern: { octanol: 0.50, ethanol: 0.20, acetaldehyde: 0.10, other: 0.20 },
    icon_type: "mushroom",
    color_hex: "#F5DEB3",
    species_id: "species-agaricus-bisporus",
    species_name: "Agaricus bisporus",
    training_samples: 0,
    confidence_threshold: 0.80
  },
  {
    id: "smell-011",
    name: "Pleurotus ostreatus",
    category: "fungal",
    subcategory: "basidiomycete",
    description: "Oyster mushroom. Mild anise-like undertones with classic mushroom earthiness.",
    bsec_class_id: 0,
    voc_pattern: { octanol: 0.40, ethanol: 0.25, acetaldehyde: 0.15, other: 0.20 },
    icon_type: "mushroom",
    color_hex: "#D3D3D3",
    species_id: "species-pleurotus-ostreatus",
    species_name: "Pleurotus ostreatus",
    training_samples: 0,
    confidence_threshold: 0.80
  },
  {
    id: "smell-012",
    name: "Lentinula edodes",
    category: "fungal",
    subcategory: "basidiomycete",
    description: "Shiitake mushroom. Strong umami with woody, smoky undertones.",
    bsec_class_id: 0,
    voc_pattern: { octanol: 0.35, ethanol: 0.30, acetaldehyde: 0.20, other: 0.15 },
    icon_type: "mushroom",
    color_hex: "#8B4513",
    species_id: "species-lentinula-edodes",
    species_name: "Lentinula edodes",
    training_samples: 0,
    confidence_threshold: 0.80
  },
  {
    id: "smell-020",
    name: "Trichoderma viride",
    category: "fungal",
    subcategory: "contamination",
    description: "Green mold contamination. Coconut-like sweet smell that indicates crop loss.",
    bsec_class_id: 3,
    voc_pattern: { ethanol: 0.35, acetaldehyde: 0.25, other: 0.40 },
    icon_type: "warning",
    color_hex: "#228B22",
    species_id: "species-trichoderma-viride",
    species_name: "Trichoderma viride",
    training_samples: 0,
    confidence_threshold: 0.70
  },
  {
    id: "smell-000",
    name: "Clean Air Baseline",
    category: "clean",
    subcategory: "baseline",
    description: "Clean ambient air with no significant VOC signatures. Used as reference.",
    bsec_class_id: -1,
    voc_pattern: { co2: 0.05, other: 0.05 },
    icon_type: "clean",
    color_hex: "#87CEEB",
    training_samples: 0,
    confidence_threshold: 0.90
  }
]

// GET: List all smells or filter by query
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const category = searchParams.get("category")
  const query = searchParams.get("q")
  const gasClass = searchParams.get("gas_class")
  const id = searchParams.get("id")
  
  try {
    let results = [...SMELL_DATABASE]
    
    // Filter by ID
    if (id) {
      const smell = results.find(s => s.id === id)
      if (smell) {
        return NextResponse.json({ ok: true, smell })
      }
      return NextResponse.json({ ok: false, error: "Smell not found" }, { status: 404 })
    }
    
    // Filter by category
    if (category) {
      results = results.filter(s => s.category === category)
    }
    
    // Filter by gas class
    if (gasClass !== null) {
      const classNum = parseInt(gasClass)
      results = results.filter(s => s.bsec_class_id === classNum)
    }
    
    // Search by query
    if (query) {
      const lowerQuery = query.toLowerCase()
      results = results.filter(s =>
        s.name.toLowerCase().includes(lowerQuery) ||
        s.description.toLowerCase().includes(lowerQuery) ||
        s.species_name?.toLowerCase().includes(lowerQuery)
      )
    }
    
    return NextResponse.json({
      ok: true,
      smells: results,
      count: results.length,
      categories: [...new Set(SMELL_DATABASE.map(s => s.category))]
    })
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 })
  }
}

// POST: Match gas data to smell signature
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { gas_class, gas_probability, gas_estimates } = body
    
    if (typeof gas_class !== "number") {
      return NextResponse.json({ ok: false, error: "gas_class required" }, { status: 400 })
    }
    
    const probability = gas_probability || 0
    
    // Find matching smells for this gas class
    const matches = SMELL_DATABASE.filter(s => s.bsec_class_id === gas_class)
    
    if (matches.length === 0) {
      return NextResponse.json({
        ok: true,
        matched: false,
        message: "No smell signature found for gas class",
        gas_class
      })
    }
    
    // Find best match above threshold
    const bestMatch = matches.find(s => probability >= s.confidence_threshold) || matches[0]
    
    return NextResponse.json({
      ok: true,
      matched: true,
      smell: bestMatch,
      confidence: probability,
      above_threshold: probability >= bestMatch.confidence_threshold,
      all_matches: matches
    })
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 })
  }
}
