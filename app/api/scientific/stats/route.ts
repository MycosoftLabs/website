import { NextResponse } from 'next/server'

const MAS_URL = process.env.MAS_ORCHESTRATOR_URL || process.env.NEXT_PUBLIC_MAS_URL || 'http://192.168.0.188:8001'

export async function GET() {
  try {
    // Fetch all stats in parallel
    const [labRes, simRes, expRes, hypRes] = await Promise.all([
      fetch(`${MAS_URL}/scientific/lab/instruments`, { cache: 'no-store' }).catch(() => null),
      fetch(`${MAS_URL}/scientific/simulation/jobs`, { cache: 'no-store' }).catch(() => null),
      fetch(`${MAS_URL}/scientific/experiments`, { cache: 'no-store' }).catch(() => null),
      fetch(`${MAS_URL}/scientific/hypotheses`, { cache: 'no-store' }).catch(() => null),
    ])
    
    const lab = labRes?.ok ? await labRes.json() : { instruments: [] }
    const sim = simRes?.ok ? await simRes.json() : { simulations: [] }
    const exp = expRes?.ok ? await expRes.json() : { experiments: [], stats: {} }
    const hyp = hypRes?.ok ? await hypRes.json() : { hypotheses: [], stats: {} }
    
    const instruments = lab.instruments || []
    const simulations = sim.simulations || []
    const experiments = exp.experiments || []
    const hypotheses = hyp.hypotheses || []
    
    return NextResponse.json({
      experiments: {
        total: experiments.length,
        running: experiments.filter((e: any) => e.status === 'running').length,
        pending: experiments.filter((e: any) => e.status === 'pending').length,
      },
      simulations: {
        total: simulations.length,
        running: simulations.filter((s: any) => s.status === 'running').length,
        byType: {
          alphafold: simulations.filter((s: any) => s.type === 'alphafold').length,
          mycelium: simulations.filter((s: any) => s.type === 'mycelium').length,
        },
      },
      instruments: {
        total: instruments.length,
        online: instruments.filter((i: any) => i.status === 'online').length,
        maintenance: instruments.filter((i: any) => i.status === 'maintenance').length,
      },
      hypotheses: {
        total: hypotheses.length,
        validated: hypotheses.filter((h: any) => h.status === 'validated').length,
        testing: hypotheses.filter((h: any) => h.status === 'testing').length,
      },
      source: labRes?.ok ? 'live' : 'fallback',
    })
  } catch (error) {
    console.error('Stats API Error:', error)
    return NextResponse.json({
      experiments: { total: 12, running: 3, pending: 9 },
      simulations: { total: 5, running: 2, byType: { alphafold: 2, mycelium: 3 } },
      instruments: { total: 8, online: 7, maintenance: 1 },
      hypotheses: { total: 24, validated: 6, testing: 4 },
      source: 'fallback',
    })
  }
}
