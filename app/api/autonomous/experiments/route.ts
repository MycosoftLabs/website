import { NextResponse } from 'next/server'

const MAS_URL = process.env.NEXT_PUBLIC_MAS_URL || 'http://192.168.0.188:8001'

export async function GET() {
  try {
    const res = await fetch(\\/autonomous/experiments\, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    })
    
    if (!res.ok) {
      // Return fallback data for development
      return NextResponse.json({
        experiments: [
          {
            id: 'auto-001',
            name: 'Growth Rate Optimization',
            hypothesis: 'Electrical stimulation at 0.5Hz increases P. ostreatus growth rate by 15-20%',
            status: 'running',
            currentStep: 4,
            totalSteps: 8,
            progress: 50,
            startedAt: new Date().toISOString(),
            adaptations: 2,
          },
        ],
        steps: [
          { id: 's1', name: 'Initialize Environment', type: 'setup', status: 'completed', duration: 120 },
          { id: 's2', name: 'Calibrate Instruments', type: 'setup', status: 'completed', duration: 180 },
          { id: 's3', name: 'Prepare Samples', type: 'setup', status: 'completed', duration: 300 },
          { id: 's4', name: 'Apply Treatment', type: 'execute', status: 'running' },
          { id: 's5', name: 'Measure Growth', type: 'measure', status: 'pending' },
          { id: 's6', name: 'Analyze Data', type: 'analyze', status: 'pending' },
          { id: 's7', name: 'Validate Hypothesis', type: 'decide', status: 'pending' },
          { id: 's8', name: 'Generate Report', type: 'decide', status: 'pending' },
        ],
        source: 'fallback',
      })
    }
    
    const data = await res.json()
    return NextResponse.json({ ...data, source: 'api' })
  } catch (error) {
    // Return fallback data on error
    return NextResponse.json({
      experiments: [],
      steps: [],
      source: 'error',
      error: 'MAS backend not available',
    })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    const res = await fetch(\\/autonomous/experiments\, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    
    if (!res.ok) {
      // Simulate creation for development
      return NextResponse.json({
        id: \uto-\\,
        name: 'New Autonomous Experiment',
        hypothesis: body.hypothesis,
        status: 'planning',
        currentStep: 0,
        totalSteps: 6,
        progress: 0,
        adaptations: 0,
        source: 'simulated',
      })
    }
    
    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create experiment' },
      { status: 500 }
    )
  }
}
