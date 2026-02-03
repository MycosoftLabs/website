'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Brain, Dna, Activity, Zap, Clock, CheckCircle, XCircle, 
  Plus, RefreshCw, Thermometer, Droplets, Network
} from 'lucide-react'

interface ComputeJob {
  id: string
  mode: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  priority: string
  processingTime?: number
  confidence?: number
  submittedAt: string
}

interface DNAStorageItem {
  id: string
  name: string
  size: number
  storedAt: string
  verified: boolean
}

interface MycoBrainStats {
  status: string
  health: number
  activeJobs: number
  queuedJobs: number
  completedToday: number
  avgProcessingTime: number
  temperature: number
  humidity: number
  nodeCount: number
}

export function BioComputeDashboard() {
  const [stats, setStats] = useState<MycoBrainStats>({
    status: 'online',
    health: 94,
    activeJobs: 3,
    queuedJobs: 7,
    completedToday: 42,
    avgProcessingTime: 2.3,
    temperature: 24.5,
    humidity: 85,
    nodeCount: 1247,
  })
  const [jobs, setJobs] = useState<ComputeJob[]>([])
  const [dnaStorage, setDnaStorage] = useState<DNAStorageItem[]>([])
  const [newJobMode, setNewJobMode] = useState('graph_solving')
  const [newJobInput, setNewJobInput] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Simulate data
  useEffect(() => {
    setJobs([
      { id: 'job-001', mode: 'graph_solving', status: 'processing', priority: 'high', submittedAt: '2026-02-03T10:00:00Z' },
      { id: 'job-002', mode: 'pattern_recognition', status: 'processing', priority: 'normal', submittedAt: '2026-02-03T10:05:00Z' },
      { id: 'job-003', mode: 'optimization', status: 'queued', priority: 'high', submittedAt: '2026-02-03T10:10:00Z' },
      { id: 'job-004', mode: 'analog_compute', status: 'completed', priority: 'normal', processingTime: 1.8, confidence: 0.96, submittedAt: '2026-02-03T09:30:00Z' },
      { id: 'job-005', mode: 'graph_solving', status: 'completed', priority: 'low', processingTime: 3.2, confidence: 0.92, submittedAt: '2026-02-03T09:00:00Z' },
    ])

    setDnaStorage([
      { id: 'dna-001', name: 'Genome Backup v3', size: 1024 * 1024 * 50, storedAt: '2026-01-15', verified: true },
      { id: 'dna-002', name: 'Research Dataset Alpha', size: 1024 * 1024 * 120, storedAt: '2026-01-20', verified: true },
      { id: 'dna-003', name: 'Protocol Archive', size: 1024 * 1024 * 8, storedAt: '2026-02-01', verified: false },
    ])

    // Simulate real-time updates
    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        temperature: 24 + Math.random() * 1.5,
        humidity: 83 + Math.random() * 5,
        health: Math.min(100, prev.health + (Math.random() - 0.5) * 2),
      }))
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${bytes} B`
  }

  const handleSubmitJob = () => {
    const newJob: ComputeJob = {
      id: `job-${Date.now()}`,
      mode: newJobMode,
      status: 'queued',
      priority: 'normal',
      submittedAt: new Date().toISOString(),
    }
    setJobs([newJob, ...jobs])
    setNewJobInput('')
    setIsDialogOpen(false)
  }

  const statusColors = {
    queued: 'bg-gray-500',
    processing: 'bg-blue-500 animate-pulse',
    completed: 'bg-green-500',
    failed: 'bg-red-500',
  }

  const modeIcons: Record<string, React.ReactNode> = {
    graph_solving: <Network className="h-4 w-4" />,
    pattern_recognition: <Brain className="h-4 w-4" />,
    optimization: <Zap className="h-4 w-4" />,
    analog_compute: <Activity className="h-4 w-4" />,
  }

  return (
    <div className="space-y-6">
      {/* MycoBrain Status */}
      <div className="grid grid-cols-6 gap-4">
        <Card className="col-span-2">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${stats.status === 'online' ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                <Brain className={`h-8 w-8 ${stats.status === 'online' ? 'text-green-500' : 'text-red-500'}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">MycoBrain</p>
                <div className="flex items-center gap-2">
                  <Badge variant={stats.status === 'online' ? 'default' : 'destructive'}>{stats.status}</Badge>
                  <span className="text-sm text-muted-foreground">Health: {stats.health.toFixed(0)}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6 text-center">
            <Activity className="h-5 w-5 mx-auto mb-2 text-blue-500" />
            <div className="text-2xl font-bold">{stats.activeJobs}</div>
            <p className="text-xs text-muted-foreground">Active Jobs</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <Clock className="h-5 w-5 mx-auto mb-2 text-gray-500" />
            <div className="text-2xl font-bold">{stats.queuedJobs}</div>
            <p className="text-xs text-muted-foreground">Queued</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <Thermometer className="h-5 w-5 mx-auto mb-2 text-orange-500" />
            <div className="text-2xl font-bold">{stats.temperature.toFixed(1)}Â°C</div>
            <p className="text-xs text-muted-foreground">Temperature</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <Droplets className="h-5 w-5 mx-auto mb-2 text-cyan-500" />
            <div className="text-2xl font-bold">{stats.humidity.toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground">Humidity</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="compute">
        <TabsList>
          <TabsTrigger value="compute">
            <Brain className="h-4 w-4 mr-2" /> Compute Jobs
          </TabsTrigger>
          <TabsTrigger value="storage">
            <Dna className="h-4 w-4 mr-2" /> DNA Storage
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compute" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-3">
              <CardTitle className="text-base">Bio-Compute Jobs</CardTitle>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Job</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Submit Bio-Compute Job</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <label className="text-sm font-medium">Computation Mode</label>
                      <Select value={newJobMode} onValueChange={setNewJobMode}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="graph_solving">Graph Solving</SelectItem>
                          <SelectItem value="pattern_recognition">Pattern Recognition</SelectItem>
                          <SelectItem value="optimization">Optimization</SelectItem>
                          <SelectItem value="analog_compute">Analog Compute</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Input Data (JSON)</label>
                      <Textarea
                        value={newJobInput}
                        onChange={(e) => setNewJobInput(e.target.value)}
                        placeholder='{"nodes": [...], "edges": [...]}'
                        rows={4}
                      />
                    </div>
                    <Button onClick={handleSubmitJob} className="w-full">
                      <Brain className="h-4 w-4 mr-2" /> Submit to MycoBrain
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-80">
                <div className="space-y-2">
                  {jobs.map((job) => (
                    <div key={job.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className={`p-2 rounded ${job.status === 'completed' ? 'bg-green-500/20' : job.status === 'processing' ? 'bg-blue-500/20' : 'bg-gray-500/20'}`}>
                        {modeIcons[job.mode]}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{job.id}</span>
                          <Badge variant="outline" className="text-xs capitalize">{job.mode.replace('_', ' ')}</Badge>
                          <Badge variant="outline" className="text-xs">{job.priority}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {job.processingTime ? `${job.processingTime}s` : 'Pending'} 
                          {job.confidence ? ` â€¢ ${(job.confidence * 100).toFixed(0)}% confidence` : ''}
                        </div>
                      </div>
                      <Badge className={statusColors[job.status]}>{job.status}</Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="storage" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-3">
              <CardTitle className="text-base">DNA Data Storage</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline">178 MB / 1 GB used</Badge>
                <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Store Data</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {dnaStorage.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="p-2 rounded bg-purple-500/20">
                      <Dna className="h-4 w-4 text-purple-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{item.name}</span>
                        {item.verified && <CheckCircle className="h-3 w-3 text-green-500" />}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatSize(item.size)} â€¢ Stored {item.storedAt}
                      </div>
                    </div>
                    <Button size="sm" variant="outline">Retrieve</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
