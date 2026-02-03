'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LabMonitor } from '@/components/scientific/lab-monitor'
import { SimulationPanel } from '@/components/scientific/simulation-panel'
import { ExperimentTracker } from '@/components/scientific/experiment-tracker'
import { HypothesisBoard } from '@/components/scientific/hypothesis-board'
import { RefreshCw, Activity, FlaskConical, Cpu, Lightbulb } from 'lucide-react'

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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Scientific Dashboard</h1>
          <p className="text-muted-foreground">Autonomous scientific research and experimentation</p>
        </div>
        <div className="flex items-center gap-2">
          {stats?.source === 'live' ? (
            <Badge variant="default" className="bg-green-500">
              <Activity className="h-3 w-3 mr-1" /> Live
            </Badge>
          ) : (
            <Badge variant="outline" className="text-yellow-500 border-yellow-500">
              Cached
            </Badge>
          )}
          <Button size="sm" variant="outline" onClick={fetchStats} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-blue-500" />
              Active Experiments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.experiments.total ?? '...'}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.experiments.running ?? 0} running, {stats?.experiments.pending ?? 0} pending
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Cpu className="h-4 w-4 text-purple-500" />
              Simulations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.simulations.total ?? '...'}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.simulations.byType?.alphafold ?? 0} AlphaFold, {stats?.simulations.byType?.mycelium ?? 0} Mycelium
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-500" />
              Lab Instruments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.instruments.total ?? '...'}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.instruments.online ?? 0} online, {stats?.instruments.maintenance ?? 0} maintenance
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              Hypotheses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.hypotheses.total ?? '...'}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.hypotheses.validated ?? 0} validated, {stats?.hypotheses.testing ?? 0} testing
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="lab">Lab</TabsTrigger>
          <TabsTrigger value="simulations">Simulations</TabsTrigger>
          <TabsTrigger value="experiments">Experiments</TabsTrigger>
          <TabsTrigger value="hypotheses">Hypotheses</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <LabMonitor />
            <SimulationPanel />
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
  )
}
