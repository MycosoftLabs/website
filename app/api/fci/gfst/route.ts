/**
 * GFST Pattern Library API Route
 * 
 * Provides access to the Global Fungi Symbiosis Theory pattern library
 * 
 * GET /api/fci/gfst - Get all GFST patterns
 */

import { NextRequest, NextResponse } from "next/server"

const MINDEX_API_URL = process.env.MINDEX_API_URL || "http://192.168.0.189:8000"

// Fallback GFST patterns if MINDEX is unavailable
const FALLBACK_GFST_PATTERNS = [
  {
    pattern_name: "baseline",
    category: "metabolic",
    description: "Normal resting state with minimal external stimulation",
    frequency_min: 0.1,
    frequency_max: 0.5,
    amplitude_min: 0.1,
    amplitude_max: 0.5,
    duration_min: 60.0,
    duration_max: null,
    physics_basis: "Low K+ channel activity, stable membrane potential ~-70mV",
    biology_basis: "Maintenance metabolism, no active growth or stress",
    references: ["Olsson & Hansson 1995", "Adamatzky 2018"],
  },
  {
    pattern_name: "active_growth",
    category: "metabolic",
    description: "Nutrient uptake and hyphal extension phase",
    frequency_min: 0.5,
    frequency_max: 2.0,
    amplitude_min: 0.5,
    amplitude_max: 2.0,
    duration_min: 300.0,
    duration_max: 3600.0,
    physics_basis: "Increased Ca2+ influx driving tip growth, H+ ATPase activity",
    biology_basis: "Active colonization of substrate, carbon allocation to tips",
    references: ["Riquelme et al. 2011"],
  },
  {
    pattern_name: "nutrient_seeking",
    category: "metabolic",
    description: "Increased frequency during active foraging",
    frequency_min: 1.0,
    frequency_max: 5.0,
    amplitude_min: 1.0,
    amplitude_max: 3.0,
    duration_min: 60.0,
    duration_max: 600.0,
    physics_basis: "Oscillating Ca2+ waves guiding directional growth",
    biology_basis: "Chemotropism toward nutrient gradients",
    references: ["Lew 2011"],
  },
  {
    pattern_name: "temperature_stress",
    category: "environmental",
    description: "Response to thermal changes outside optimal range",
    frequency_min: 0.2,
    frequency_max: 1.0,
    amplitude_min: 1.0,
    amplitude_max: 5.0,
    duration_min: 120.0,
    duration_max: 1800.0,
    physics_basis: "Membrane fluidity changes affecting ion channel kinetics",
    biology_basis: "Heat shock protein expression, metabolic adjustment",
    references: ["Morano et al. 2012"],
  },
  {
    pattern_name: "moisture_stress",
    category: "environmental",
    description: "Drought or waterlogging response patterns",
    frequency_min: 0.5,
    frequency_max: 3.0,
    amplitude_min: 1.0,
    amplitude_max: 4.0,
    duration_min: 180.0,
    duration_max: 3600.0,
    physics_basis: "Osmotic pressure changes affecting turgor and ion balance",
    biology_basis: "Compatible solute accumulation, aquaporin regulation",
    references: ["Jennings 1995"],
  },
  {
    pattern_name: "chemical_stress",
    category: "environmental",
    description: "Toxin, pollutant, or pH imbalance detection",
    frequency_min: 2.0,
    frequency_max: 10.0,
    amplitude_min: 2.0,
    amplitude_max: 8.0,
    duration_min: 30.0,
    duration_max: 600.0,
    physics_basis: "Rapid membrane depolarization from toxin binding",
    biology_basis: "Detoxification enzyme activation, efflux pump upregulation",
    references: ["Naranjo-Ortiz & Gabaldon 2019"],
  },
  {
    pattern_name: "network_communication",
    category: "communication",
    description: "Long-range signaling between mycelial colonies",
    frequency_min: 0.1,
    frequency_max: 1.0,
    amplitude_min: 0.5,
    amplitude_max: 2.0,
    duration_min: 10.0,
    duration_max: 120.0,
    physics_basis: "Propagating Ca2+ waves along hyphae at 0.5-50 mm/min",
    biology_basis: "Resource allocation signals, warning transmission to connected plants",
    references: ["Simard 2018", "Gorzelak et al. 2015"],
  },
  {
    pattern_name: "action_potential",
    category: "communication",
    description: "Rapid spike signals, fast propagation",
    frequency_min: 5.0,
    frequency_max: 20.0,
    amplitude_min: 5.0,
    amplitude_max: 20.0,
    duration_min: 0.1,
    duration_max: 2.0,
    physics_basis: "All-or-nothing depolarization via voltage-gated channels",
    biology_basis: "Rapid response coordination, possibly learning/memory",
    references: ["Adamatzky 2018", "Olsson & Hansson 1995"],
  },
  {
    pattern_name: "seismic_precursor",
    category: "predictive",
    description: "Ultra-low frequency preceding geological events",
    frequency_min: 0.01,
    frequency_max: 0.1,
    amplitude_min: 0.2,
    amplitude_max: 1.0,
    duration_min: 3600.0,
    duration_max: 86400.0,
    physics_basis: "Piezoelectric response to subsurface pressure waves",
    biology_basis: "Unknown sensitivity mechanism, possibly electrochemical gradient detection",
    references: ["GFST Hypothesis - Mycosoft Labs 2026"],
  },
  {
    pattern_name: "defense_activation",
    category: "defensive",
    description: "Pathogen or predator detection response",
    frequency_min: 2.0,
    frequency_max: 8.0,
    amplitude_min: 2.0,
    amplitude_max: 6.0,
    duration_min: 60.0,
    duration_max: 1800.0,
    physics_basis: "Oxidative burst generating ion flux",
    biology_basis: "Secondary metabolite production, cell wall reinforcement",
    references: ["Heller & Tudzynski 2011"],
  },
  {
    pattern_name: "sporulation_initiation",
    category: "reproductive",
    description: "Pre-reproductive signaling cascade",
    frequency_min: 0.5,
    frequency_max: 2.0,
    amplitude_min: 1.0,
    amplitude_max: 3.0,
    duration_min: 3600.0,
    duration_max: 86400.0,
    physics_basis: "Ca2+ signaling cascade activating sporulation genes",
    biology_basis: "Light, nutrient, or density-triggered reproduction",
    references: ["Fischer & Kues 2006"],
  },
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")
    
    // Try MINDEX first
    try {
      const params = new URLSearchParams()
      if (category) params.append("category", category)
      
      const response = await fetch(
        `${MINDEX_API_URL}/api/fci/gfst/patterns${params.toString() ? `?${params.toString()}` : ""}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          // Short timeout for MINDEX
          signal: AbortSignal.timeout(5000),
        }
      )
      
      if (response.ok) {
        const data = await response.json()
        return NextResponse.json(data)
      }
    } catch {
      // MINDEX unavailable, use fallback
      console.log("MINDEX unavailable, using fallback GFST patterns")
    }
    
    // Use fallback patterns
    let patterns = FALLBACK_GFST_PATTERNS
    if (category) {
      patterns = patterns.filter((p) => p.category === category)
    }
    
    return NextResponse.json(patterns)
  } catch (error) {
    console.error("GFST patterns fetch error:", error)
    return NextResponse.json(
      { error: "Failed to fetch GFST patterns" },
      { status: 500 }
    )
  }
}
