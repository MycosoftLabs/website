'use client'

import { useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  NeuCard,
  NeuCardContent,
  NeuCardHeader,
  NeuButton,
  NeuBadge,
  NeuromorphicProvider,
} from '@/components/ui/neuromorphic'
import { LabMonitor } from '@/components/scientific/lab-monitor'
import { SimulationPanel } from '@/components/scientific/simulation-panel'
import { ExperimentTracker } from '@/components/scientific/experiment-tracker'
import { HypothesisBoard } from '@/components/scientific/hypothesis-board'
import { RefreshCw, Activity, FlaskConical, Cpu, Lightbulb, Dna, Atom } from 'lucide-react'
import { DNASequenceViewer, DNAHelixBanner } from '@/components/visualizations/DNASequenceViewer'
import { MoleculeViewer } from '@/components/visualizations/MoleculeViewer'

// Sample reference sequences and molecules for the visualization tab
const DEMO_SEQUENCES = [
  { name: "ITS1-5.8S-ITS2 (Amanita muscaria)", accession: "LN877747.1", seq: "GATCATTATTGAAAGAAACCTCAGGCAGGGGGAGATGGTTGTAGCTGGCCTCTAGGGGCATGTGCACACTGTGTCTCTCT" },
  { name: "18S rRNA (Amanita muscaria)", accession: "AJ549964.1", seq: "AAGGATCATTATTGAAAGAAACCTCAGGCAGGGGGAGATGGTTGTAGCTGGCCTCTAGGGGCATGTGCACACTGTGTCTCTCTCTAGACTAGTATTACGAGCTA" },
]
const DEMO_COMPOUNDS = [
  { name: "Psilocybin", formula: "C12H17N2O4P" },
  { name: "Muscimol", formula: "C4H6N2O2" },
  { name: "Amanita Toxin", formula: "C39H54N10O14S" },
]

interface DashboardStats {
  experiments: { total: number; running: number; pending: number }
  simulations: { total: number; running: number; byType: { alphafold: number; mycelium: number } }
  instruments: { total: number; online: number; maintenance: number }
  hypotheses: { total: number; validated: number; testing: number }
  source: string
}

export default function ScientificPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/scientific/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
        setError(null)
      } else {
        setError('Failed to fetch stats')
      }
    } catch (err) {
      setError('Network error')
      console.error('Stats fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 10000) // Refresh every 10 seconds
    return () => clearInterval(interval)
  }, [])

  return (
    <NeuromorphicProvider>
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Scientific Dashboard</h1>
          <p className="text-muted-foreground">Autonomous scientific research and experimentation</p>
        </div>
        <div className="flex items-center gap-2">
          {stats?.source === 'live' ? (
            <NeuBadge variant="default" className="bg-green-500">
              <Activity className="h-3 w-3 mr-1" /> Live
            </NeuBadge>
          ) : (
            <NeuBadge variant="warning" className="text-yellow-500 border border-yellow-500">
              Cached
            </NeuBadge>
          )}
          <NeuButton variant="default" onClick={fetchStats} disabled={loading} className="min-h-[44px] py-2 px-4">
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </NeuButton>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <NeuCard className="hover:shadow-md transition-shadow cursor-pointer">
          <NeuCardHeader className="pb-2">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-blue-500" />
              Active Experiments
            </h3>
          </NeuCardHeader>
          <NeuCardContent>
            <div className="text-2xl font-bold">{stats?.experiments.total ?? '...'}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.experiments.running ?? 0} running, {stats?.experiments.pending ?? 0} pending
            </p>
          </NeuCardContent>
        </NeuCard>

        <NeuCard className="hover:shadow-md transition-shadow cursor-pointer">
          <NeuCardHeader className="pb-2">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Cpu className="h-4 w-4 text-purple-500" />
              Simulations
            </h3>
          </NeuCardHeader>
          <NeuCardContent>
            <div className="text-2xl font-bold">{stats?.simulations.total ?? '...'}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.simulations.byType?.alphafold ?? 0} AlphaFold, {stats?.simulations.byType?.mycelium ?? 0} Mycelium
            </p>
          </NeuCardContent>
        </NeuCard>

        <NeuCard className="hover:shadow-md transition-shadow cursor-pointer">
          <NeuCardHeader className="pb-2">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-500" />
              Lab Instruments
            </h3>
          </NeuCardHeader>
          <NeuCardContent>
            <div className="text-2xl font-bold">{stats?.instruments.total ?? '...'}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.instruments.online ?? 0} online, {stats?.instruments.maintenance ?? 0} maintenance
            </p>
          </NeuCardContent>
        </NeuCard>

        <NeuCard className="hover:shadow-md transition-shadow cursor-pointer">
          <NeuCardHeader className="pb-2">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              Hypotheses
            </h3>
          </NeuCardHeader>
          <NeuCardContent>
            <div className="text-2xl font-bold">{stats?.hypotheses.total ?? '...'}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.hypotheses.validated ?? 0} validated, {stats?.hypotheses.testing ?? 0} testing
            </p>
          </NeuCardContent>
        </NeuCard>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <div className="overflow-x-auto">
          <TabsList className="w-max min-w-full">
            <TabsTrigger value="overview" className="min-h-[44px] whitespace-nowrap">Overview</TabsTrigger>
            <TabsTrigger value="genomics" className="min-h-[44px] whitespace-nowrap">
              <Dna className="h-3.5 w-3.5 mr-1.5" />Genomics
            </TabsTrigger>
            <TabsTrigger value="chemistry" className="min-h-[44px] whitespace-nowrap">
              <Atom className="h-3.5 w-3.5 mr-1.5" />Chemistry
            </TabsTrigger>
            <TabsTrigger value="lab" className="min-h-[44px] whitespace-nowrap">Lab</TabsTrigger>
            <TabsTrigger value="simulations" className="min-h-[44px] whitespace-nowrap">Simulations</TabsTrigger>
            <TabsTrigger value="experiments" className="min-h-[44px] whitespace-nowrap">Experiments</TabsTrigger>
            <TabsTrigger value="hypotheses" className="min-h-[44px] whitespace-nowrap">Hypotheses</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <LabMonitor />
            <SimulationPanel />
          </div>
        </TabsContent>

        {/* ── Genomics visualization tab ──────────────────────────── */}
        <TabsContent value="genomics" className="space-y-4">
          <div className="relative rounded-xl overflow-hidden border border-green-500/20 bg-gradient-to-r from-green-950/40 via-black/10 to-blue-950/30 p-4 mb-2">
            <DNAHelixBanner className="absolute inset-0 opacity-30 pointer-events-none" />
            <div className="relative z-10">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Dna className="h-5 w-5 text-green-400" />
                Nucleotide Sequence Visualization
              </h2>
              <p className="text-sm text-muted-foreground">A=green · T=red · G=blue · C=amber</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {DEMO_SEQUENCES.map((s) => (
              <NeuCard key={s.accession} className="border-green-500/20">
                <NeuCardHeader className="pb-2">
                  <h3 className="text-sm font-medium italic">{s.name}</h3>
                  <p className="text-[10px] font-mono text-muted-foreground">{s.accession}</p>
                </NeuCardHeader>
                <NeuCardContent>
                  <DNASequenceViewer sequence={s.seq} maxBarBases={100} textPreview={100} />
                </NeuCardContent>
              </NeuCard>
            ))}
          </div>
        </TabsContent>

        {/* ── Chemistry visualization tab ─────────────────────────── */}
        <TabsContent value="chemistry" className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Atom className="h-5 w-5 text-purple-400" />
            Molecular Structure Viewer
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {DEMO_COMPOUNDS.map((c) => (
              <NeuCard key={c.name} className="border-purple-500/20">
                <NeuCardHeader className="pb-2">
                  <h3 className="text-sm font-medium">{c.name}</h3>
                  <p className="text-xs font-mono text-muted-foreground">{c.formula}</p>
                </NeuCardHeader>
                <NeuCardContent className="flex justify-center">
                  <MoleculeViewer name={c.name} size="md" showLink />
                </NeuCardContent>
              </NeuCard>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="lab">
          <LabMonitor />
        </TabsContent>
        
        <TabsContent value="simulations">
          <SimulationPanel />
        </TabsContent>
        
        <TabsContent value="experiments">
          <ExperimentTracker />
        </TabsContent>
        
        <TabsContent value="hypotheses">
          <HypothesisBoard />
        </TabsContent>
      </Tabs>
    </div>
    </NeuromorphicProvider>
  )
}
