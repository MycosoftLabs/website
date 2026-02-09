'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Play, Pause, Square, RotateCcw, Plus, Zap, Brain, FlaskConical,
  CheckCircle, XCircle, Clock, AlertTriangle, Lightbulb, RefreshCw, Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import { useAutonomousExperiments } from '@/hooks/scientific'

export function AutonomousExperimentDashboard() {
  const { experiments, steps, isLoading, isLive, createExperiment, controlExperiment, refresh } = useAutonomousExperiments()
  const [selectedExperiment, setSelectedExperiment] = useState<string | null>(null)
  const [newHypothesis, setNewHypothesis] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [controllingId, setControllingId] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const statusColors = {
    planning: 'bg-gray-500',
    running: 'bg-blue-500 animate-pulse',
    paused: 'bg-yellow-500',
    completed: 'bg-green-500',
    failed: 'bg-red-500',
  }

  const stepIcons: Record<string, React.ReactNode> = {
    setup: <FlaskConical className="h-4 w-4" />,
    execute: <Zap className="h-4 w-4" />,
    measure: <Clock className="h-4 w-4" />,
    analyze: <Brain className="h-4 w-4" />,
    decide: <Lightbulb className="h-4 w-4" />,
  }

  const handleCreateExperiment = async () => {
    if (!newHypothesis) {
      toast.error('Please enter a hypothesis')
      return
    }
    setIsCreating(true)
    const toastId = toast.loading('Creating autonomous experiment...')
    try {
      await createExperiment(newHypothesis)
      toast.success('Autonomous experiment created', { id: toastId })
      setNewHypothesis('')
      setIsDialogOpen(false)
    } catch (error) {
      toast.error('Failed to create experiment', { id: toastId })
    } finally {
      setIsCreating(false)
    }
  }

  const handleControl = async (id: string, action: 'start' | 'pause' | 'stop' | 'reset') => {
    setControllingId(id)
    const actionLabels = { start: 'Starting', pause: 'Pausing', stop: 'Stopping', reset: 'Resetting' }
    const toastId = toast.loading(`${actionLabels[action]} experiment...`)
    try {
      await controlExperiment(id, action)
      toast.success(`Experiment ${action === 'start' ? 'started' : action + 'ed'} successfully`, { id: toastId })
    } catch (error) {
      toast.error(`Failed to ${action} experiment`, { id: toastId })
    } finally {
      setControllingId(null)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    const toastId = toast.loading('Refreshing experiments...')
    try {
      await refresh()
      toast.success('Experiments refreshed', { id: toastId })
    } catch (error) {
      toast.error('Failed to refresh', { id: toastId })
    } finally {
      setIsRefreshing(false)
    }
  }

  const runningCount = experiments.filter(e => e.status === 'running').length
  const completedCount = experiments.filter(e => e.status === 'completed').length

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{experiments.length}</div>
            <p className="text-xs text-muted-foreground">Total Experiments</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-500">{runningCount}</div>
            <p className="text-xs text-muted-foreground">Running</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-500">{completedCount}</div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-purple-500">
              {experiments.reduce((sum, e) => sum + e.adaptations, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Auto-Adaptations</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-3 gap-6">
        {/* Experiment List */}
        <Card className="col-span-1">
          <CardHeader className="flex flex-row items-center justify-between py-3">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Autonomous Experiments</CardTitle>
              {!isLive && (
                <Badge variant="outline" className="text-yellow-500 border-yellow-500">
                  <AlertTriangle className="h-3 w-3 mr-1" /> Cached
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={handleRefresh} disabled={isRefreshing}>
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Autonomous Experiment</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium">Hypothesis</label>
                    <Textarea
                      value={newHypothesis}
                      onChange={(e) => setNewHypothesis(e.target.value)}
                      placeholder="State your scientific hypothesis..."
                      rows={4}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    AI will automatically generate an experiment protocol and execute it with minimal human intervention.
                  </p>
                  <Button onClick={handleCreateExperiment} className="w-full" disabled={isCreating}>
                    {isCreating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Brain className="h-4 w-4 mr-2" />}
                    Generate & Start
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-96">
              <div className="divide-y">
                {experiments.map((exp) => (
                  <div
                    key={exp.id}
                    className={`p-3 cursor-pointer hover:bg-accent/50 ${selectedExperiment === exp.id ? 'bg-accent' : ''}`}
                    onClick={() => setSelectedExperiment(exp.id)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm truncate">{exp.name}</span>
                      <Badge className={statusColors[exp.status]}>{exp.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{exp.hypothesis}</p>
                    {exp.status === 'running' && (
                      <Progress value={exp.progress} className="h-1" />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Experiment Details */}
        <Card className="col-span-2">
          <CardHeader className="py-3">
            <CardTitle className="text-base">
              {selectedExperiment ? experiments.find(e => e.id === selectedExperiment)?.name : 'Select an Experiment'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedExperiment ? (
              <Tabs defaultValue="steps">
                <TabsList>
                  <TabsTrigger value="steps">Steps</TabsTrigger>
                  <TabsTrigger value="adaptations">Adaptations</TabsTrigger>
                  <TabsTrigger value="results">Results</TabsTrigger>
                </TabsList>
                <TabsContent value="steps" className="mt-4">
                  <div className="space-y-2">
                    {steps.map((step, i) => (
                      <div key={step.id} className="flex items-center gap-3 p-2 border rounded">
                        <div className={`p-1 rounded ${step.status === 'completed' ? 'bg-green-500/20' : step.status === 'running' ? 'bg-blue-500/20' : 'bg-gray-500/20'}`}>
                          {stepIcons[step.type]}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{step.name}</span>
                            <Badge variant="outline" className="text-xs capitalize">{step.type}</Badge>
                          </div>
                          {step.duration && step.status === 'completed' && (
                            <span className="text-xs text-muted-foreground">{step.duration}s</span>
                          )}
                        </div>
                        <div>
                          {step.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-500" />}
                          {step.status === 'running' && <Clock className="h-4 w-4 text-blue-500 animate-spin" />}
                          {step.status === 'failed' && <XCircle className="h-4 w-4 text-red-500" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="adaptations" className="mt-4">
                  <div className="space-y-2">
                    <div className="p-3 border rounded bg-yellow-500/10">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        <span className="font-medium text-sm">Temperature Adjustment</span>
                        <Badge variant="outline">Auto</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Detected suboptimal growth rate. Adjusted incubator temperature from 25Â°C to 24Â°C.
                      </p>
                    </div>
                    <div className="p-3 border rounded bg-yellow-500/10">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        <span className="font-medium text-sm">Extended Measurement Period</span>
                        <Badge variant="outline">Auto</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Variance in initial measurements too high. Extended data collection by 2 hours.
                      </p>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="results" className="mt-4">
                  <div className="text-center text-muted-foreground py-8">
                    Results will be available when experiment completes
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="text-center text-muted-foreground py-16">
                Select an experiment to view details
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
