import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const MINDEX_API_URL = process.env.MINDEX_API_URL || "http://localhost:8000"

/**
 * Compound Simulation API - Real MINDEX Integration
 * 
 * Queries compound data from MINDEX and simulates molecular interactions.
 * For full simulation, connect to:
 * - AutoDock for binding simulations
 * - GROMACS for molecular dynamics
 * - RDKit for property prediction
 */
export async function POST(request: NextRequest) {
  try {
    const { compoundId, formula, type } = await request.json()

    if (!compoundId && !formula) {
      return NextResponse.json(
        { success: false, error: "compoundId or formula required" },
        { status: 400 }
      )
    }

    // Query MINDEX for compound data
    let compoundData = null
    try {
      const mindexRes = await fetch(
        `${MINDEX_API_URL}/api/compounds/${encodeURIComponent(compoundId || formula)}`,
        { signal: AbortSignal.timeout(5000) }
      )
      if (mindexRes.ok) {
        compoundData = await mindexRes.json()
      }
    } catch {
      // MINDEX not available - continue with input parameters
    }

    // Build results from MINDEX data or return placeholder
    const results = {
      compoundId: compoundId || compoundData?.id || formula,
      formula: formula || compoundData?.formula,
      type: type || compoundData?.type || "unknown",
      // Real data from MINDEX if available
      bindingAffinity: compoundData?.binding_affinity || null,
      stability: compoundData?.stability || null,
      lipophilicity: compoundData?.logp || null,
      solubility: compoundData?.solubility || null,
      toxicity: compoundData?.toxicity_class || null,
      bioavailability: compoundData?.bioavailability || null,
      halfLife: compoundData?.half_life || null,
      metabolites: compoundData?.metabolites || [],
      targetProteins: compoundData?.targets || [],
      source: compoundData ? "mindex" : "input",
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json({
      success: true,
      results,
      note: compoundData
        ? "Data retrieved from MINDEX"
        : "Compound not found in MINDEX - connect simulation backend for full analysis",
    })
  } catch (error) {
    console.error("Simulation error:", error)
    return NextResponse.json({
      success: false,
      error: "Simulation failed",
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 })
  }
}






























