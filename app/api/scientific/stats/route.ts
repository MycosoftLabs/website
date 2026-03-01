import { NextResponse } from 'next/server'

const MAS_URL = process.env.MAS_API_URL || process.env.NEXT_PUBLIC_MAS_API_URL

export async function GET() {
  if (!MAS_URL)
    return NextResponse.json({ error: 'MAS_API_URL not configured' }, { status: 503 })

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
        running: experiments.filter((e: { status?: string }) => e.status === 'running').length,
        pending: experiments.filter((e: { status?: string }) => e.status === 'pending').length,
      },
      simulations: {
        total: simulations.length,
        running: simulations.filter((s: { status?: string }) => s.status === 'running').length,
        byType: {
          alphafold: simulations.filter((s: { type?: string }) => s.type === 'alphafold').length,
          mycelium: simulations.filter((s: { type?: string }) => s.type === 'mycelium').length,
        },
      },
      instruments: {
        total: instruments.length,
        online: instruments.filter((i: { status?: string }) => i.status === 'online').length,
        maintenance: instruments.filter((i: { status?: string }) => i.status === 'maintenance').length,
      },
      hypotheses: {
        total: hypotheses.length,
        validated: hypotheses.filter((h: { status?: string }) => h.status === 'validated').length,
        testing: hypotheses.filter((h: { status?: string }) => h.status === 'testing').length,
      },
      source: labRes?.ok ? 'live' : 'partial',
    })
  } catch (error) {
    console.error('Stats API Error:', error)
    return NextResponse.json({ error: 'Scientific stats unavailable' }, { status: 502 })
  }
}
