import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// In-memory store for demo (use database in production)
const simulations: any[] = []

/**
 * Simulation Storage API
 * 
 * Stores simulation results for model training and research
 */
export async function GET() {
  return NextResponse.json({
    simulations: simulations.slice(-50), // Last 50 simulations
    count: simulations.length,
  })
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    const simulation = {
      id: `sim-${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString(),
    }
    
    simulations.push(simulation)
    
    // In production, save to database and trigger ML training pipeline
    
    return NextResponse.json({
      success: true,
      simulationId: simulation.id,
      message: "Simulation saved successfully",
    })
  } catch (error) {
    console.error("Save error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to save simulation",
    }, { status: 500 })
  }
}
