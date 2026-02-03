'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Biological Interfaces</h1>
          <p className="text-muted-foreground">FCI, MycoBrain, and genomic systems</p>
        </div>
        <div className="flex items-center gap-2">
          {isLive ? (
            <Badge className="bg-green-500"><Activity className="h-3 w-3 mr-1" /> Live</Badge>
          ) : (
            <Badge variant="outline">Cached</Badge>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              FCI Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sessions.length}</div>
            <p className="text-xs text-muted-foreground">
              {sessions.filter(s => s.status === 'recording').length} recording
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-500" />
              Electrodes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalElectrodes}</div>
            <p className="text-xs text-muted-foreground">{activeElectrodes} active</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-500" />
              MycoBrain
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${mycobrain?.status === 'online' ? 'text-green-500' : 'text-gray-500'}`}>
              {mycobrain?.status || 'Loading...'}
            </div>
            <p className="text-xs text-muted-foreground">
              {mycobrain?.queuedJobs || 0} computations queued
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Cpu className="h-4 w-4 text-blue-500" />
              Signal Quality
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{signalQuality}%</div>
            <Progress value={signalQuality} className="mt-1 h-2" />
          </CardContent>
        </Card>
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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>MycoBrain Neuromorphic Processor</CardTitle>
              <div className="flex items-center gap-2">
                <Badge className={mycobrain?.status === 'online' ? 'bg-green-500' : 'bg-gray-500'}>
                  {mycobrain?.status || 'Loading'}
                </Badge>
                <Button size="sm" variant="ghost" onClick={fetchMycoBrain}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
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
              
              <Button className="w-full">Submit Computation</Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="signals">
          <Card>
            <CardHeader>
              <CardTitle>Signal Visualization</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-muted rounded flex items-center justify-center border-2 border-dashed">
                <div className="text-center">
                  <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Real-time signal visualization</p>
                  <p className="text-sm text-muted-foreground">Connect to WebSocket for live data</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
