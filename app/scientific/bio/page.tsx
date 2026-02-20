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
import { Progress } from '@/components/ui/progress'
import { FCIMonitor } from '@/components/scientific/fci-monitor'
import { ElectrodeMap } from '@/components/scientific/electrode-map'
import { useFCI } from '@/hooks/scientific'
import { Activity, Cpu, Zap, Brain, RefreshCw } from 'lucide-react'

interface MycoBrainStatus {
  status: string
  health: number
  activeJobs: number
  queuedJobs: number
  completedToday: number
  capabilities: string[]
  source: string
}

export default function BioPage() {
  const { sessions, signalQuality, electrodeStatus, isLive } = useFCI()
  const [mycobrain, setMycobrain] = useState<MycoBrainStatus | null>(null)
  const [mycoLoading, setMycoLoading] = useState(true)

  const fetchMycoBrain = async () => {
    try {
      const res = await fetch('/api/bio/mycobrain')
      if (res.ok) {
        setMycobrain(await res.json())
      }
    } catch (error) {
      console.error('Failed to fetch MycoBrain status:', error)
    } finally {
      setMycoLoading(false)
    }
  }

  useEffect(() => {
    fetchMycoBrain()
    const interval = setInterval(fetchMycoBrain, 10000)
    return () => clearInterval(interval)
  }, [])

  const activeElectrodes = electrodeStatus.filter(e => e.active).length
  const totalElectrodes = electrodeStatus.length || 64

  return (
    <NeuromorphicProvider>
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Biological Interfaces</h1>
          <p className="text-muted-foreground">FCI, MycoBrain, and genomic systems</p>
        </div>
        <div className="flex items-center gap-2">
          {isLive ? (
            <NeuBadge variant="success"><Activity className="h-3 w-3 mr-1" /> Live</NeuBadge>
          ) : (
            <NeuBadge variant="warning">Cached</NeuBadge>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <NeuCard className="hover:shadow-md transition-shadow">
          <NeuCardHeader className="pb-2">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              FCI Sessions
            </h3>
          </NeuCardHeader>
          <NeuCardContent>
            <div className="text-2xl font-bold">{sessions.length}</div>
            <p className="text-xs text-muted-foreground">
              {sessions.filter(s => s.status === 'recording').length} recording
            </p>
          </NeuCardContent>
        </NeuCard>

        <NeuCard className="hover:shadow-md transition-shadow">
          <NeuCardHeader className="pb-2">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-500" />
              Electrodes
            </h3>
          </NeuCardHeader>
          <NeuCardContent>
            <div className="text-2xl font-bold">{totalElectrodes}</div>
            <p className="text-xs text-muted-foreground">{activeElectrodes} active</p>
          </NeuCardContent>
        </NeuCard>

        <NeuCard className="hover:shadow-md transition-shadow">
          <NeuCardHeader className="pb-2">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-500" />
              MycoBrain
            </h3>
          </NeuCardHeader>
          <NeuCardContent>
            <div className={`text-2xl font-bold ${mycobrain?.status === 'online' ? 'text-green-500' : 'text-gray-500'}`}>
              {mycobrain?.status || 'Loading...'}
            </div>
            <p className="text-xs text-muted-foreground">
              {mycobrain?.queuedJobs || 0} computations queued
            </p>
          </NeuCardContent>
        </NeuCard>

        <NeuCard className="hover:shadow-md transition-shadow">
          <NeuCardHeader className="pb-2">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Cpu className="h-4 w-4 text-blue-500" />
              Signal Quality
            </h3>
          </NeuCardHeader>
          <NeuCardContent>
            <div className="text-2xl font-bold">{signalQuality}%</div>
            <Progress value={signalQuality} className="mt-1 h-2" />
          </NeuCardContent>
        </NeuCard>
      </div>

      <Tabs defaultValue="fci" className="space-y-4">
        <TabsList>
          <TabsTrigger value="fci">FCI Control</TabsTrigger>
          <TabsTrigger value="electrodes">Electrode Array</TabsTrigger>
          <TabsTrigger value="mycobrain">MycoBrain</TabsTrigger>
          <TabsTrigger value="signals">Signal Analysis</TabsTrigger>
        </TabsList>
        
        <TabsContent value="fci">
          <FCIMonitor />
        </TabsContent>
        
        <TabsContent value="electrodes">
          <ElectrodeMap />
        </TabsContent>
        
        <TabsContent value="mycobrain">
          <NeuCard>
            <NeuCardHeader className="flex flex-row items-center justify-between">
              <h3>MycoBrain Neuromorphic Processor</h3>
              <div className="flex items-center gap-2">
                <NeuBadge variant={mycobrain?.status === 'online' ? 'success' : 'default'}>
                  {mycobrain?.status || 'Loading'}
                </NeuBadge>
                <NeuButton variant="default" onClick={fetchMycoBrain} className="py-2 px-3">
                  <RefreshCw className="h-4 w-4" />
                </NeuButton>
              </div>
            </NeuCardHeader>
            <NeuCardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
                <div className="p-4 border rounded-lg text-center">
                  <p className="text-3xl font-bold text-blue-500">{mycobrain?.activeJobs || 0}</p>
                  <p className="text-sm text-muted-foreground">Active Jobs</p>
                </div>
                <div className="p-4 border rounded-lg text-center">
                  <p className="text-3xl font-bold text-yellow-500">{mycobrain?.queuedJobs || 0}</p>
                  <p className="text-sm text-muted-foreground">Queued</p>
                </div>
                <div className="p-4 border rounded-lg text-center">
                  <p className="text-3xl font-bold text-green-500">{mycobrain?.completedToday || 0}</p>
                  <p className="text-sm text-muted-foreground">Completed Today</p>
                </div>
                <div className="p-4 border rounded-lg text-center">
                  <p className="text-3xl font-bold text-purple-500">{mycobrain?.health || 0}%</p>
                  <p className="text-sm text-muted-foreground">Health</p>
                </div>
              </div>
              
              <div className="grid gap-4 md:grid-cols-3 mb-4">
                {(mycobrain?.capabilities || ['graph_solving', 'pattern_recognition', 'optimization']).map(cap => (
                  <div key={cap} className="p-4 border rounded-lg text-center hover:bg-accent transition-colors cursor-pointer">
                    <p className="text-lg font-bold capitalize">{cap.replace('_', ' ')}</p>
                    <p className="text-sm text-muted-foreground">Available</p>
                  </div>
                ))}
              </div>
              
              <NeuButton className="w-full" fullWidth>Submit Computation</NeuButton>
            </NeuCardContent>
          </NeuCard>
        </TabsContent>
        
        <TabsContent value="signals">
          <NeuCard>
            <NeuCardHeader>
              <h3>Signal Visualization</h3>
            </NeuCardHeader>
            <NeuCardContent>
              <div className="h-64 bg-muted rounded flex items-center justify-center border-2 border-dashed">
                <div className="text-center">
                  <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Real-time signal visualization</p>
                  <p className="text-sm text-muted-foreground">Connect to WebSocket for live data</p>
                </div>
              </div>
            </NeuCardContent>
          </NeuCard>
        </TabsContent>
      </Tabs>
    </div>
    </NeuromorphicProvider>
  )
}
